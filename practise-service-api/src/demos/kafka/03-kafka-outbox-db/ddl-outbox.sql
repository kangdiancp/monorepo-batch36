

CREATE TABLE hr.employee_events_outbox (
    outbox_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    aggregate_type VARCHAR(50) NOT NULL DEFAULT 'EMPLOYEE',
    aggregate_id INTEGER NOT NULL,
    event_type VARCHAR(50) NOT NULL, -- 'employee.created' | 'employee.updated' | 'employee.terminated'
    payload JSONB NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING', -- 'PENDING' | 'PUBLISHED' | 'FAILED'
    retry_count INTEGER NOT NULL DEFAULT 0,
    error_message TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    published_at TIMESTAMP,
    CONSTRAINT ck_outbox_status CHECK (status IN ('PENDING', 'PUBLISHED', 'FAILED'))
);

CREATE INDEX idx_employee_outbox_pending ON hr.employee_events_outbox (created_at)
    WHERE status = 'PENDING';