import 'dotenv/config';

import { runInitialSync, scheduleEmployeeReconcile } from './jobs/employee-reconcile.job';


async function main(): Promise<void> {
    console.log('[worker] starting payroll-service-api worker process...');

    // Initial sync sekali saat startup, spy replika hr.employee/hr.departments langsung diisi datanya.
    await runInitialSync().catch((err) => {
        console.error('[worker] initial sync gagal, lanjut start consumer & cron tetap jalan:', err);
    });


    scheduleEmployeeReconcile();

    console.log('[worker] semua job berjalan (consumer + cron reconcile).');
}

main().catch((err) => {
    console.error('[worker] fatal error saat start worker:', err);
    process.exit(1);
});


process.on('SIGTERM', () => {
    console.log('[worker] SIGTERM diterima, shutting down...');
    process.exit(0);
});

process.on('SIGINT', () => {
    console.log('[worker] SIGINT diterima, shutting down...');
    process.exit(0);
});