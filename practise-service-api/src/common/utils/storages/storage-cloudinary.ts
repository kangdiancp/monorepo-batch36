import { v2 as cloudinary } from 'cloudinary';
import { Readable } from 'node:stream';
import type { StorageProvider, UploadResult } from './storage.interface';

// TODO: pastikan env var ini di-set (mis. lewat dotenv di config/env.ts):
//   CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

/**
 * Cloudinary punya `resource_type` berbeda tergantung jenis file:
 * - 'image' untuk jpeg/png (dapat manfaat transformasi/optimisasi Cloudinary)
 * - 'raw' untuk dokumen non-gambar (pdf, docx, dll) — disimpan apa adanya
 */
function resolveResourceType(mimeType: string): 'image' | 'raw' {
  return mimeType.startsWith('image/') ? 'image' : 'raw';
}

export const cloudinaryStorageProvider: StorageProvider = {
  async saveFile(buffer: Buffer, employeeId: number, fileName: string, mimeType: string): Promise<UploadResult> {
    const resourceType = resolveResourceType(mimeType);

    const result = await new Promise<{ secure_url: string; public_id: string }>((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          resource_type: resourceType,
          folder: `hr-employee-files/employees/${employeeId}`,
          // Cloudinary strip ekstensi file dari public_id secara default untuk
          // resource_type 'raw' kalau tidak eksplisit di-set use_filename.
          use_filename: true,
          unique_filename: true,
        },
        (error, uploadResult) => {
          if (error || !uploadResult) return reject(error ?? new Error('Cloudinary upload gagal tanpa error detail'));
          resolve(uploadResult);
        },
      );
      Readable.from(buffer).pipe(uploadStream);
    });

    return {
      filePath: result.secure_url, // URL publik lengkap, langsung bisa diakses
      providerFileId: result.public_id, // dibutuhkan untuk delete nanti
    };
  },

  async readFile(filePath: string): Promise<Buffer> {
    // File di Cloudinary diakses lewat URL publik (secure_url yang disimpan
    // sebagai filePath). Kita proxy download-nya lewat server supaya
    // controller.downloadEmployeeFile tetap seragam (selalu terima Buffer)
    // tanpa peduli providernya apa.
    //
    // CATATAN: untuk file besar/traffic tinggi, pertimbangkan redirect
    // langsung ke `filePath` (secure_url) di controller alih-alih proxy
    // lewat server — lebih hemat bandwidth server kamu.
    const response = await fetch(filePath);
    if (!response.ok) {
      throw new Error(`Gagal fetch file dari Cloudinary: ${response.status} ${response.statusText}`);
    }
    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer);
  },

  async deleteFile(_filePath: string, providerFileId: string | null, mimeType?: string): Promise<void> {
    if (!providerFileId) {
      throw new Error('providerFileId wajib ada untuk hapus file dari Cloudinary');
    }
    if (!mimeType) {
      throw new Error('mimeType wajib di-pass untuk hapus file dari Cloudinary (menentukan resource_type)');
    }
    // Deterministik — resource_type dihitung dari mimeType yang sama persis
    // dipakai saat upload (lihat saveFile di atas), bukan tebakan try/catch.
    const resourceType = resolveResourceType(mimeType);
    await cloudinary.uploader.destroy(providerFileId, { resource_type: resourceType });
  },
};