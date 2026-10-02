import { randomUUID } from 'node:crypto';
import { mkdir, unlink, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import type { StorageProvider, UploadResult } from './storage.interface';

// TODO: pindahkan ke env var (mis. UPLOAD_BASE_DIR) supaya tidak hardcode.
const BASE_UPLOAD_DIR = path.resolve(process.cwd(), 'uploads');

export const localStorageProvider: StorageProvider = {
  async saveFile(buffer: Buffer, employeeId: number, originalFileName: string): Promise<UploadResult> {
    const employeeDir = path.join(BASE_UPLOAD_DIR, 'employees', String(employeeId));
    await mkdir(employeeDir, { recursive: true });

    const safeFileName = `${randomUUID()}-${originalFileName}`;
    const absolutePath = path.join(employeeDir, safeFileName);
    await writeFile(absolutePath, buffer);

    return {
      filePath: path.join('employees', String(employeeId), safeFileName),
      providerFileId: null, // LOCAL tidak butuh id terpisah, path saja cukup
    };
  },

  async readFile(filePath: string): Promise<Buffer> {
    const absolutePath = path.join(BASE_UPLOAD_DIR, filePath);
    return readFile(absolutePath);
  },

  async deleteFile(filePath: string, _providerFileId: string | null, _mimeType?: string): Promise<void> {
    const absolutePath = path.join(BASE_UPLOAD_DIR, filePath);
    try {
      await unlink(absolutePath);
    } catch (err: any) {
      if (err.code !== 'ENOENT') throw err;
    }
  },
};