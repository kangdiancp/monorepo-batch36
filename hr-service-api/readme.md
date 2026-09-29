# Readme


### Install Dependencies

```bash
npm i @opentelemetry/sdk-node @opentelemetry/exporter-trace-otlp-http @opentelemetry/instrumentation-http @opentelemetry/instrumentation-pg @opentelemetry/resources @opentelemetry/semantic-conventions @fastify/otel
```

### Run Load Test

```bash
k6 run employees-load-test.js
```
---

## B. Part 2
### 1. Create data dummy

```bash
npm i -D @faker-js/faker tsx

# jalankan dengan default 50.000 employees
tsx scripts/seed.ts

# atau custom jumlah
EMPLOYEE_COUNT=100000 tsx scripts/seed.ts
```

### 2. Install OTel

```bash
npm i @opentelemetry/exporter-prometheus
docker compose -f docker-compose.otel.yml up -d
```

### 3. Verifikasi
```http
-- [checkk prometheus](http://localhost:9464/metrics)

http://localhost:9464/metrics

-- ceck prometheus
http://localhost:9090/targets
```

### 4. Query langusng
Query langsung di Prometheus (http://localhost:9090/graph):

```http
histogram_quantile(0.95, rate(employees_query_duration_ms_bucket[5m]))
```

### 5. Grafana

```http
http://localhost:3001
```

### Step By Step

1. Instrument
2. App logger
3. Prometheus
4. Loki Config
5. Docker compose.otel
