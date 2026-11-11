// ============================================================================
// payroll-generate.worker.ts di panggil di worker bukan di HTTP API.
//
// Workflow:
// 1. POST /payroll-runs	-> Bikin	DRAFT
// 2. GET /payroll-runs/:id/eligible-employees	-> Opsional, preview employee ACTIVE	tidak berubah
// 3. PATCH /payroll-runs/:id	-> Opsional, edit field selama masih DRAFT	tetap DRAFT
// 4. POST /payroll-runs/:id/generate	-> Memulai generate di background	PROCESSING
// 5. GET /payroll-runs/:id/progress	-> Dipanggil berulang sampai selesai	PROCESSING lalu REVIEW
// 6. GET /payroll-runs/:id	-> Cek total gross, deduction, dan net	REVIEW
// 7. POST /payroll-runs/:id/approve	-> Menyetujui hasil	APPROVED
// ============================================================================
