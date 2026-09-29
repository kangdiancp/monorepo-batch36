import 'dotenv/config';

import { NodeSDK } from '@opentelemetry/sdk-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { PrometheusExporter } from '@opentelemetry/exporter-prometheus';
import { HttpInstrumentation } from '@opentelemetry/instrumentation-http';
import { PgInstrumentation } from '@opentelemetry/instrumentation-pg';
import { PinoInstrumentation } from '@opentelemetry/instrumentation-pino';
import FastifyOtelInstrumentation from '@fastify/otel';
import { resourceFromAttributes } from '@opentelemetry/resources';
import { ATTR_SERVICE_NAME, ATTR_SERVICE_VERSION } from '@opentelemetry/semantic-conventions';

const prometheusExporter = new PrometheusExporter(
  { port: Number(process.env.OTEL_METRICS_PORT ?? 9464) },
  () => {
    console.log(`Prometheus metrics endpoint: http://localhost:${process.env.OTEL_METRICS_PORT ?? 9464}/metrics`);
  },
);

const sdk = new NodeSDK({
  resource: resourceFromAttributes({
    [ATTR_SERVICE_NAME]: process.env.OTEL_SERVICE_NAME ?? 'hr-service-api',
    [ATTR_SERVICE_VERSION]: '1.0.0',
  }),
  traceExporter: new OTLPTraceExporter({
    url: process.env.OTEL_EXPORTER_OTLP_ENDPOINT ?? 'http://localhost:4318/v1/traces',
  }),
  metricReader: prometheusExporter,
  instrumentations: [
    new HttpInstrumentation(),
    new PgInstrumentation(),
    new PinoInstrumentation(),
    new FastifyOtelInstrumentation({ registerOnInitialization: true }),
  ],
});

sdk.start();

// gunakan log untuk memastikan log jalan
console.log('[otel] instrumentation loaded', {
  serviceName: process.env.OTEL_SERVICE_NAME ?? 'hr-service-api',
  traceEndpoint: process.env.OTEL_EXPORTER_OTLP_ENDPOINT ?? 'http://localhost:4318/v1/traces (fallback)',
  metricsPort: process.env.OTEL_METRICS_PORT ?? '9464 (fallback)',
  logsEndpoint: process.env.OTEL_EXPORTER_OTLP_LOGS_ENDPOINT ?? '(TIDAK DI-SET — cek .env!)',
});

// Graceful shutdown — pastikan span yang masih di-buffer sempat terkirim
// sebelum proses benar-benar mati.
process.on('SIGTERM', () => {
  sdk.shutdown().finally(() => process.exit(0));
});