# BugReports

A multi-tenant incident tracking platform built for Israeli law firms. Client applications report errors and performance signals, which land in a deduplicated incident queue backed by an AI-assisted root-cause agent, alongside live Azure infrastructure monitoring for the platform itself.

**Live app:** https://victorious-coast-0cafbc110.1.azurestaticapps.net

## What it does

- **Incident ingestion & deduplication** - client/server errors are fingerprinted (error code + message + stack trace prefix) so repeat occurrences of the same problem merge into one incident instead of flooding the table.
- **Strict multi-tenant isolation** - every tenant's data is scoped via EF Core Global Query Filters resolved from the authenticated user's JWT claim, never from a client-supplied header once a session exists.
- **AI root-cause assistant** - an Azure OpenAI-backed agent investigates an incident using its stack trace, code location, and live Azure platform signals (Service Health, Resource Health) as grounded context.
- **Azure infrastructure monitoring, not just app-level errors** - Service Health and Resource Health (pull + push via Azure Monitor Alert webhooks), SQL diagnostic failures (deadlocks/blocks/timeouts), and performance metric alerts (CPU/Memory/response time/SQL DTU) all auto-create incidents, with live dashboards and a monthly trend view.
- **Security hardening** - per-IP rate limiting, account lockout after repeated failed logins, secrets in Azure Key Vault via managed identity (never in config files), exact code-location links back to GitHub for every incident.

## Tech stack

**Backend** - ASP.NET Core 8 (`backend/`), EF Core 8 + SQL Server, JWT auth, SignalR-free REST API, Azure.Monitor.Query / Azure.Identity for live infrastructure metrics, Azure OpenAI for the RCA agent.

**Frontend** - React 19 + TypeScript + Vite (`frontend/`), no router (single-tenant-per-deployment app, state-driven navigation), hand-rolled SVG charts (no charting library dependency).

**Infrastructure** - Azure App Service (Linux), Azure SQL Database, Azure Static Web Apps, Key Vault, Application Insights + Log Analytics, defined as code in `infra/main.bicep`.

## Project structure

```
backend/
  1-Models/        DTOs, entities, enums
  2-Exceptions/     Typed exceptions for Azure/infra failures
  3-Data/           EF Core DbContext + entity configurations
  4-Services/       Business logic (auth, incidents, Azure readers, RCA agent, deduplication)
  5-Middleware/      Global exception handling
  6-Controllers/     API endpoints
  Migrations/        EF Core migrations

frontend/
  src/components/    UI components (cards, charts, forms)
  src/pages/         Top-level views
  src/hooks/         Data-fetching hooks
  src/api/           Backend API clients

infra/
  main.bicep         All Azure resources as code

backend.Tests/        Backend unit tests (xUnit)
```

## Running locally

**Prerequisites:** .NET 8 SDK, Node 20+, a SQL Server instance (LocalDB, Docker, or Azure SQL).

**Backend:**
```bash
cd backend
dotnet user-secrets set "ConnectionStrings:DefaultConnection" "<your SQL Server connection string>"
dotnet ef database update
dotnet run
```
API runs at `http://localhost:5279`, with Swagger UI at `/swagger` (Development environment only).

**Frontend:**
```bash
cd frontend
npm install
npm run dev
```

Both apps read their remaining configuration (JWT secret, Azure OpenAI, Azure Monitor credentials, etc.) from `appsettings.Development.json` / `.env.development`, which are intentionally not committed - use `dotnet user-secrets` or environment variables for anything sensitive.

## Testing

```bash
# Backend
dotnet test backend.Tests

# Frontend
cd frontend && npm test
```

Both suites run automatically on every push and pull request via GitHub Actions, before any deploy is allowed to proceed.

## Deployment

Pushes to `main` trigger independent GitHub Actions workflows for the backend (`backend-deploy.yml`) and frontend (`frontend-deploy.yml`) - each only runs when files under its own directory change. Both run type-check/build/test before deploying; a failing test blocks the deploy.
