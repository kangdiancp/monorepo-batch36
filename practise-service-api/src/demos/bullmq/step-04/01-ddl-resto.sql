CREATE SCHEMA IF NOT EXISTS resto;

CREATE TABLE resto.orders (
    order_id   VARCHAR(30) PRIMARY KEY,                -- key idempotensi: kirim ulang dengan id yg sama = ditolak
    meja       VARCHAR(30) NOT NULL,
    sumber     VARCHAR(20) NOT NULL,
    vip        BOOLEAN     NOT NULL DEFAULT FALSE,
    status     VARCHAR(20) NOT NULL DEFAULT 'RECEIVED',
    created_at TIMESTAMP   NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP   NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT ck_orders_sumber CHECK (sumber IN ('waiter', 'cashier', 'order-form')),
    CONSTRAINT ck_orders_status CHECK (status IN ('RECEIVED', 'IN_PROGRESS', 'READY', 'FAILED'))
);

CREATE TABLE resto.order_items (
    item_id        BIGSERIAL PRIMARY KEY,               -- dipakai sebagai jobId di BullMQ ("item-<id>")
    order_id       VARCHAR(30) NOT NULL REFERENCES resto.orders (order_id) ON DELETE CASCADE,
    menu           VARCHAR(60) NOT NULL,
    station        VARCHAR(20) NOT NULL,
    -- PENDING  : sudah tersimpan di DB, BELUM masuk BullMQ (berfungsi sebagai OUTBOX)
    -- QUEUED   : sudah masuk BullMQ
    -- COOKING  : sedang dikerjakan worker
    -- RETRYING : gagal, menunggu backoff lalu dicoba lagi
    -- DONE / FAILED : final
    status         VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    available_at   TIMESTAMP   NOT NULL DEFAULT CURRENT_TIMESTAMP,  
    attempts       INTEGER     NOT NULL DEFAULT 0,
    last_error     TEXT,
    cooked_by      VARCHAR(30),
    simulasi_gagal INTEGER,                             
    queued_at      TIMESTAMP,
    started_at     TIMESTAMP,
    finished_at    TIMESTAMP,
    created_at     TIMESTAMP   NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT ck_items_station CHECK (station IN ('makanan', 'minuman')),
    CONSTRAINT ck_items_status  CHECK (status IN ('PENDING', 'QUEUED', 'COOKING', 'RETRYING', 'DONE', 'FAILED'))
);

CREATE INDEX idx_items_order   ON resto.order_items (order_id);
CREATE INDEX idx_items_pending ON resto.order_items (item_id) WHERE status = 'PENDING';