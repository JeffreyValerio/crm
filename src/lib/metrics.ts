import { Registry, collectDefaultMetrics, Counter, Histogram } from 'prom-client';

// Singleton — evita duplicar registros en hot-reload de Next.js
const g = globalThis as typeof globalThis & { _metricsRegistry?: Registry };

if (!g._metricsRegistry) {
  const registry = new Registry();
  registry.setDefaultLabels({ app: 'crm' });
  collectDefaultMetrics({ register: registry, prefix: 'crm_node_' });
  g._metricsRegistry = registry;
}

export const metricsRegistry = g._metricsRegistry!;

// ── Contadores HTTP ───────────────────────────────────────────────────────────

export const httpRequestsTotal = (() => {
  const existing = metricsRegistry.getSingleMetric('crm_http_requests_total');
  if (existing) return existing as Counter;
  return new Counter({
    name: 'crm_http_requests_total',
    help: 'Total de requests HTTP al CRM',
    labelNames: ['method', 'route', 'status'] as const,
    registers: [metricsRegistry],
  });
})();

export const httpDuration = (() => {
  const existing = metricsRegistry.getSingleMetric('crm_http_duration_seconds');
  if (existing) return existing as Histogram;
  return new Histogram({
    name: 'crm_http_duration_seconds',
    help: 'Duración de requests HTTP en segundos',
    labelNames: ['method', 'route', 'status'] as const,
    buckets: [0.01, 0.05, 0.1, 0.25, 0.5, 1, 2, 5],
    registers: [metricsRegistry],
  });
})();

// ── Contadores de negocio ─────────────────────────────────────────────────────

export const clientesCreados = (() => {
  const existing = metricsRegistry.getSingleMetric('crm_clientes_creados_total');
  if (existing) return existing as Counter;
  return new Counter({
    name: 'crm_clientes_creados_total',
    help: 'Total de clientes creados',
    labelNames: ['tipo'] as const,   // FIBRA | POSTPAGO
    registers: [metricsRegistry],
  });
})();

export const prospectosSolicitados = (() => {
  const existing = metricsRegistry.getSingleMetric('crm_prospectos_solicitados_total');
  if (existing) return existing as Counter;
  return new Counter({
    name: 'crm_prospectos_solicitados_total',
    help: 'Total de lotes de prospectos solicitados',
    labelNames: ['tipo'] as const,   // GPON | POSTPAGO | META
    registers: [metricsRegistry],
  });
})();
