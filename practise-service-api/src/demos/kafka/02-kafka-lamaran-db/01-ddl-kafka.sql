CREATE SCHEMA IF NOT EXISTS kafka;

--1. OUTBOX (sisi producer) — diisi producer.ts, dibaca outbox-publisher.ts
CREATE TABLE kafka.surat_events_outbox (
    outbox_id     BIGSERIAL PRIMARY KEY,
    event_id      UUID NOT NULL DEFAULT gen_random_uuid(),  
    surat_id      VARCHAR(10)  NOT NULL,
    applicant_id  VARCHAR(50)  NOT NULL,                    
    company_code  VARCHAR(10)  NOT NULL,
    topic         VARCHAR(100) NOT NULL,
    payload       JSONB        NOT NULL,
    status        VARCHAR(20)  NOT NULL DEFAULT 'PENDING',
    retry_count   INTEGER      NOT NULL DEFAULT 0,
    error_message TEXT,
    created_at    TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    published_at  TIMESTAMP,
    CONSTRAINT uq_outbox_event_id UNIQUE (event_id),
    CONSTRAINT ck_outbox_status CHECK (status IN ('PENDING', 'PUBLISHED', 'FAILED'))
);
CREATE INDEX idx_outbox_pending ON kafka.surat_events_outbox (created_at) WHERE status = 'PENDING';

--2. SURAT_DITERIMA (di sisi consumer) — hasil proses consumer.ts
CREATE TABLE kafka.surat_diterima (
    id              BIGSERIAL PRIMARY KEY,
    event_id        UUID NOT NULL,
    surat_id        VARCHAR(10) NOT NULL,
    applicant_id    VARCHAR(50) NOT NULL,
    company_code    VARCHAR(10) NOT NULL,
    consumer_group  VARCHAR(100) NOT NULL,
    topic           VARCHAR(100) NOT NULL,
    partition_no    INTEGER NOT NULL,
    kafka_offset    BIGINT  NOT NULL,
    payload         JSONB   NOT NULL,
    received_at     TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    --dedupe: Kafka & relay at-least-once -> event yang sama bisa datang 2x
    CONSTRAINT uq_surat_diterima_event UNIQUE (consumer_group, event_id)
);

--3. CONSUMER_OFFSETS — offset terakhir yang SUDAH diproses, per group/topic/partisi.
--   Ditulis di TRANSAKSI YANG SAMA dengan insert surat_diterima.
CREATE TABLE kafka.consumer_offsets (
    consumer_group VARCHAR(100) NOT NULL,
    topic          VARCHAR(100) NOT NULL,
    partition_no   INTEGER NOT NULL,
    last_offset    BIGINT  NOT NULL,
    updated_at     TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (consumer_group, topic, partition_no)
);

