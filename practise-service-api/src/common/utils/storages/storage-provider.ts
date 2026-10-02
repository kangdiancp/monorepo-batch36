import { randomUUID } from 'node:crypto';
import { mkdir, unlink, readFile } from 'node:fs/promises';
import path from 'node:path';

// TODO: pindahkan ke env var (mis. UPLOAD_BASE_DIR) supaya tidak hardcode.
const BASE_UPLOAD_DIR = path.resolve(process.cwd(), 'uploads');

/**
 * Simpan buffer file ke disk lokal, return path yang disimpan di kolom
 * `file_path` (relatif terhadap BASE_UPLOAD_DIR, bukan absolute path —
 * supaya tidak bocorin struktur filesystem server ke DB).
 *
 * Kalau nanti ganti ke S3/GCS/Cloudinary, ganti isi fungsi ini saja —
 * repository/service/controller tidak perlu berubah karena mereka cuma
 * bergantung ke string `filePath` yang dikembalikan.
 */
export async function saveFile(
  buffer: Buffer,
  employeeId: number,
  originalFileName: string,
): Promise<string> {
  const employeeDir = path.join(BASE_UPLOAD_DIR, 'employees', String(employeeId));
  await mkdir(employeeDir, { recursive: true });

  // Prefix random UUID supaya nama file tidak collide kalau ada 2 file
  // dengan nama sama, dan supaya nama file asli tidak jadi predictable path.
  const safeFileName = `${randomUUID()}-${originalFileName}`;
  const absolutePath = path.join(employeeDir, safeFileName);

  await require('node:fs/promises').writeFile(absolutePath, buffer);

  // Simpan path RELATIF ke DB, bukan absolute — portable antar environment.
  return path.join('employees', String(employeeId), safeFileName);
}

export async function readStoredFile(filePath: string): Promise<Buffer> {
  const absolutePath = path.join(BASE_UPLOAD_DIR, filePath);
  return readFile(absolutePath);
}

export async function deleteStoredFile(filePath: string): Promise<void> {
  const absolutePath = path.join(BASE_UPLOAD_DIR, filePath);
  try {
    await unlink(absolutePath);
  } catch (err: any) {
    // Kalau file fisiknya sudah tidak ada (mis. dihapus manual), jangan
    // sampai bikin operasi delete record DB ikut gagal karenanya.
    if (err.code !== 'ENOENT') throw err;
  }
}