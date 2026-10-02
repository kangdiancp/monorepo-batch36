export interface UploadResult {
  /**
   * Untuk LOCAL: path relatif di disk (mis. "employees/3/uuid-cv.pdf").
   * Untuk CLOUDINARY: secure_url penuh yang bisa diakses publik.
   * Kolom ini yang disimpan ke `file_path` di DB — bentuknya beda-beda
   * tergantung provider, dan itu memang disengaja (masing-masing provider
   * tahu cara pakai path/URL miliknya sendiri).
   */
  filePath: string;

  /**
   * ID internal milik provider (mis. Cloudinary public_id) yang dibutuhkan
   * untuk operasi delete/manage lewat API provider tsb. LOCAL tidak butuh
   * ini (null) — path saja cukup untuk fs.unlink.
   */
  providerFileId: string | null;
}

export interface StorageProvider {
  saveFile(buffer: Buffer, employeeId: number, fileName: string, mimeType: string): Promise<UploadResult>;
  readFile(filePath: string, providerFileId: string | null): Promise<Buffer>;
  /**
   * `mimeType` opsional — LOCAL tidak butuh ini, tapi Cloudinary butuh untuk
   * menentukan `resource_type` ('image' vs 'raw') yang benar saat delete,
   * karena Cloudinary API mewajibkan resource_type yang SAMA PERSIS dengan
   * saat upload, atau operasi destroy akan gagal/salah sasaran.
   */
  deleteFile(filePath: string, providerFileId: string | null, mimeType?: string): Promise<void>;
}