#!/usr/bin/env bash
#
# Security regression suite - automates the manual attack checks we ran by
# hand during the security review (tenant-header spoofing, IDOR on bug/
# incident write endpoints, auth bypass, rate limiting, password policy,
# SQL-injection-style input). Run this after any change touching auth,
# tenancy, or the Bugs/Incidents controllers to confirm nothing regressed.
#
# This is a standalone dev tool, deliberately NOT part of the deployed app -
# it exists to be run manually or from CI against a target you control, not
# shipped to end users.
#
# Usage:
#   BASE_URL=http://localhost:5288 ./security-tests/security-check.sh
#   BASE_URL=https://bugtracker-api-....azurewebsites.net ./security-tests/security-check.sh
#
# Needs two existing seed accounts on the target: an Admin and a regular
# User in the same tenant (defaults match this repo's seed data).

set -uo pipefail

BASE_URL="${BASE_URL:-http://localhost:5288}"
TENANT_ID="${TENANT_ID:-default-tenant}"
ADMIN_EMAIL="${ADMIN_EMAIL:-aharon.halevy@lawfirm.co.il}"
ADMIN_PASSWORD="${ADMIN_PASSWORD:-123456}"
USER_EMAIL="${USER_EMAIL:-noa.cohen@lawfirm.co.il}"
USER_PASSWORD="${USER_PASSWORD:-123456}"

PASS_COUNT=0
FAIL_COUNT=0

pass() { echo "  PASS - $1"; PASS_COUNT=$((PASS_COUNT + 1)); }
fail() { echo "  FAIL - $1"; FAIL_COUNT=$((FAIL_COUNT + 1)); }

json_get() { python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('$1',''))" 2>/dev/null; }

login() {
  local email="$1" password="$2"
  curl -sS -X POST "$BASE_URL/api/Auth/login" \
    -H "Content-Type: application/json" -H "X-Tenant-Id: $TENANT_ID" \
    -d "{\"email\":\"$email\",\"password\":\"$password\"}" \
    | json_get token
}

echo "=== Security regression suite ==="
echo "Target: $BASE_URL"
echo ""

echo "--- Setup: logging in as admin and as a regular user ---"
ADMIN_TOKEN=$(login "$ADMIN_EMAIL" "$ADMIN_PASSWORD")
USER_TOKEN=$(login "$USER_EMAIL" "$USER_PASSWORD")

if [ -z "$ADMIN_TOKEN" ] || [ -z "$USER_TOKEN" ]; then
  echo "FATAL: could not log in with the configured seed accounts - aborting."
  exit 2
fi
echo "  logged in OK (admin + regular user)"
echo ""

# ---------------------------------------------------------------------------
echo "--- 1. Auth required on protected endpoints ---"
CODE=$(curl -sS -o /dev/null -w "%{http_code}" "$BASE_URL/api/Bugs" -H "X-Tenant-Id: $TENANT_ID")
[ "$CODE" = "401" ] && pass "GET /api/Bugs with no token -> 401" || fail "GET /api/Bugs with no token -> got $CODE, expected 401"
echo ""

# ---------------------------------------------------------------------------
echo "--- 2. Tenant-header spoofing is ignored when a JWT is present ---"
# The fix this session: tenant comes from the signed JWT claim, never from a
# client-supplied header, once the caller is authenticated. A request with a
# bogus X-Tenant-Id alongside a valid token must behave identically to one
# with the correct header - proving the header is ignored, not trusted.
REAL_HEADER_RESP=$(curl -sS "$BASE_URL/api/Bugs?pageSize=1" -H "X-Tenant-Id: $TENANT_ID" -H "Authorization: Bearer $USER_TOKEN")
SPOOFED_HEADER_RESP=$(curl -sS "$BASE_URL/api/Bugs?pageSize=1" -H "X-Tenant-Id: evil-tenant-should-be-ignored" -H "Authorization: Bearer $USER_TOKEN")
REAL_TOTAL=$(echo "$REAL_HEADER_RESP" | json_get totalCount)
SPOOFED_TOTAL=$(echo "$SPOOFED_HEADER_RESP" | json_get totalCount)
if [ -n "$REAL_TOTAL" ] && [ "$REAL_TOTAL" = "$SPOOFED_TOTAL" ]; then
  pass "spoofed X-Tenant-Id header had zero effect (totalCount identical: $REAL_TOTAL)"
else
  fail "spoofed X-Tenant-Id header changed the response (real=$REAL_TOTAL, spoofed=$SPOOFED_TOTAL) - header may be overriding the JWT claim"
fi
echo ""

# ---------------------------------------------------------------------------
echo "--- 3. IDOR: non-owner cannot modify or delete another user's bug ---"
CREATE_RESP=$(curl -sS -X POST "$BASE_URL/api/Bugs" \
  -H "Content-Type: application/json" -H "X-Tenant-Id: $TENANT_ID" -H "Authorization: Bearer $ADMIN_TOKEN" \
  -d '{"title":"SECURITY_CHECK bug owned by admin","description":"automated security-check.sh run","systemModule":"SecurityCheck","priority":1}')
BUG_ID=$(echo "$CREATE_RESP" | json_get id)

if [ -z "$BUG_ID" ]; then
  fail "setup: could not create a test bug as admin - skipping IDOR bug checks"
else
  CODE=$(curl -sS -o /dev/null -w "%{http_code}" -X PATCH "$BASE_URL/api/Bugs/$BUG_ID/status" \
    -H "Content-Type: application/json" -H "X-Tenant-Id: $TENANT_ID" -H "Authorization: Bearer $USER_TOKEN" \
    -d '{"status":6}')
  [ "$CODE" = "404" ] && pass "non-owner PATCH /api/Bugs/{id}/status -> 404" || fail "non-owner PATCH /api/Bugs/{id}/status -> got $CODE, expected 404"

  CODE=$(curl -sS -o /dev/null -w "%{http_code}" -X DELETE "$BASE_URL/api/Bugs/$BUG_ID" \
    -H "X-Tenant-Id: $TENANT_ID" -H "Authorization: Bearer $USER_TOKEN")
  [ "$CODE" = "404" ] && pass "non-owner DELETE /api/Bugs/{id} -> 404" || fail "non-owner DELETE /api/Bugs/{id} -> got $CODE, expected 404"

  # sanity: admin (the owner) must still be able to manage it - this isn't
  # meant to be locked down entirely, just scoped to owner-or-admin
  CODE=$(curl -sS -o /dev/null -w "%{http_code}" -X DELETE "$BASE_URL/api/Bugs/$BUG_ID" \
    -H "X-Tenant-Id: $TENANT_ID" -H "Authorization: Bearer $ADMIN_TOKEN")
  [ "$CODE" = "204" ] && pass "owner/admin DELETE /api/Bugs/{id} still works -> 204 (not over-restricted)" || fail "owner/admin DELETE /api/Bugs/{id} -> got $CODE, expected 204"
fi
echo ""

# ---------------------------------------------------------------------------
echo "--- 4. IDOR: non-reporter cannot resolve another user's incident ---"
INGEST_RESP=$(curl -sS -X POST "$BASE_URL/api/Incidents/ingest" \
  -H "Content-Type: application/json" -H "X-Tenant-Id: $TENANT_ID" \
  -d "{\"tenantId\":\"$TENANT_ID\",\"errorCode\":\"SECURITY_CHECK_INCIDENT\",\"errorMessage\":\"automated security-check.sh run\",\"stackTrace\":null,\"reportedByUserId\":1}")
sleep 2  # ingestion is async via the queue - give the worker a moment to process it

INCIDENTS_RESP=$(curl -sS "$BASE_URL/api/Incidents?pageSize=200" -H "X-Tenant-Id: $TENANT_ID" -H "Authorization: Bearer $ADMIN_TOKEN")
INCIDENT_ID=$(echo "$INCIDENTS_RESP" | python3 -c "
import sys, json
data = json.load(sys.stdin)
items = data.get('items', data) if isinstance(data, dict) else data
matches = [i for i in items if i.get('errorCode') == 'SECURITY_CHECK_INCIDENT']
print(matches[-1]['incidentId'] if matches else '')
" 2>/dev/null)

if [ -z "$INCIDENT_ID" ]; then
  fail "setup: could not find the ingested test incident - skipping IDOR incident check"
else
  CODE=$(curl -sS -o /dev/null -w "%{http_code}" -X PATCH "$BASE_URL/api/Incidents/$INCIDENT_ID/resolve" \
    -H "X-Tenant-Id: $TENANT_ID" -H "Authorization: Bearer $USER_TOKEN")
  [ "$CODE" = "404" ] && pass "non-reporter PATCH /api/Incidents/{id}/resolve -> 404" || fail "non-reporter PATCH /api/Incidents/{id}/resolve -> got $CODE, expected 404"

  CODE=$(curl -sS -o /dev/null -w "%{http_code}" -X PATCH "$BASE_URL/api/Incidents/$INCIDENT_ID/resolve" \
    -H "X-Tenant-Id: $TENANT_ID" -H "Authorization: Bearer $ADMIN_TOKEN")
  [ "$CODE" = "204" ] && pass "admin PATCH /api/Incidents/{id}/resolve still works -> 204 (cleaned up)" || fail "admin PATCH /api/Incidents/{id}/resolve -> got $CODE, expected 204"
fi
echo ""

# ---------------------------------------------------------------------------
echo "--- 5. Password policy enforced on registration ---"
CODE=$(curl -sS -o /dev/null -w "%{http_code}" -X POST "$BASE_URL/api/Auth/register" \
  -H "Content-Type: application/json" -H "X-Tenant-Id: $TENANT_ID" \
  -d '{"fullName":"Security Check","email":"security-check-short-pw@lawfirm.co.il","password":"short1"}')
[ "$CODE" = "400" ] && pass "registration with a too-short password -> 400" || fail "registration with a too-short password -> got $CODE, expected 400"
echo ""

# ---------------------------------------------------------------------------
echo "--- 6. SQL-injection-style input is handled safely (not a 500) ---"
CODE=$(curl -sS -o /dev/null -w "%{http_code}" -X POST "$BASE_URL/api/Auth/login" \
  -H "Content-Type: application/json" -H "X-Tenant-Id: $TENANT_ID" \
  -d "{\"email\":\"' OR '1'='1\",\"password\":\"' OR '1'='1\"}")
[ "$CODE" = "401" ] && pass "classic SQLi payload in login -> 401 (handled, not 500)" || fail "classic SQLi payload in login -> got $CODE, expected 401"
echo ""

# ---------------------------------------------------------------------------
# Runs LAST on purpose: this deliberately exhausts the auth endpoint's
# shared rate-limit bucket for our IP, which would make every check after it
# fail with 429 instead of the status code it's actually testing for.
echo "--- 7. Auth endpoint rate limiting (brute-force protection) ---"
# Policy is 10/min per IP - fire 15 bad-password attempts and expect at
# least one 429 before we run out
GOT_429=0
for i in $(seq 1 15); do
  CODE=$(curl -sS -o /dev/null -w "%{http_code}" -X POST "$BASE_URL/api/Auth/login" \
    -H "Content-Type: application/json" -H "X-Tenant-Id: $TENANT_ID" \
    -d "{\"email\":\"$ADMIN_EMAIL\",\"password\":\"definitely-wrong-password\"}")
  [ "$CODE" = "429" ] && GOT_429=1 && break
done
[ "$GOT_429" = "1" ] && pass "15 rapid bad-password attempts triggered a 429 (rate limiter engaged)" || fail "15 rapid bad-password attempts never got a 429 - brute-force protection may not be active"
echo ""

# ---------------------------------------------------------------------------
echo "=== Summary: $PASS_COUNT passed, $FAIL_COUNT failed ==="
[ "$FAIL_COUNT" -eq 0 ] && exit 0 || exit 1
