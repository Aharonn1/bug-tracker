import type { MetricPointDto } from '../types/telemetry.types';

// כולל תאריך ולא רק שעה - טווחי 24 שעות גורמים לנקודה הראשונה והאחרונה
// להיות בימים שונים, ובלי התאריך הן נראות כמעט זהות (רק שעה:דקה)
export function toMetricChartData(points: MetricPointDto[]) {
  return points.map((p) => ({
    label: new Date(p.timestamp).toLocaleString('he-IL', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }),
    value: p.value ?? 0,
  }));
}
