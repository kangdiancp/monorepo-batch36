import 'dotenv/config';

import { startPayrollRunWorkers } from './modules/payroll-run/generate/payroll-generate.worker';

/*
============================================================================
 worker.ts — EntryPoint dipisah dari  dari server.ts (HTTP API).
 Run:  dev -> tsx src/worker.ts   |   prod -> node dist/worker.js

 Proses ini (semua long-running & independen dari HTTP API):
   1. Payroll run worker (BullMQ)  -> generate payroll: plan-run, calc-*, finalize-run
 ============================================================================
*/

let payrollWorkers: ReturnType<typeof startPayrollRunWorkers> | undefined;
let shuttingDown = false;

async function main(): Promise<void> {
    console.log('[worker] starting payroll-service-api worker process...');

    // 1. Payroll worker (BullMQ). Butuh Redis saja.
    payrollWorkers = startPayrollRunWorkers();

}

async function shutdown(signal: string): Promise<void> {
    if (shuttingDown) return;
    shuttingDown = true;
    console.log(`[worker] ${signal} diterima, shutting down...`);

    try {
        // Tunggu job BullMQ yang sedang aktif selesai, setelah itu tutup koneksi Redis.
        await payrollWorkers?.close();
    } catch (err) {
        console.error('[worker] gagal menutup payroll worker:', err);
    }
    process.exit(0);
}

process.on('SIGTERM', () => void shutdown('SIGTERM'));
process.on('SIGINT', () => void shutdown('SIGINT'));

// don't let error pass silently
process.on('unhandledRejection', (reason) => {
    console.error('[worker] unhandledRejection:', reason);
});
process.on('uncaughtException', (err) => {
    console.error('[worker] uncaughtException:', err);
});

main().catch((err) => {
    console.error('[worker] fatal error saat start worker:', err);
    process.exit(1);
});