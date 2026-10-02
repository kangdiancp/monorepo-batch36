import type { StorageProvider } from './storage.interface';
import { localStorageProvider } from './storage-local';
import { cloudinaryStorageProvider } from './storage-cloudinary';

// Provider default untuk UPLOAD BARU — file lama tetap pakai provider yang
// tersimpan di kolom `storage_provider` masing-masing record (lihat
// employee-files.service.ts), jadi ganti default ini TIDAK mempengaruhi
// file yang sudah pernah di-upload sebelumnya.
export const DEFAULT_STORAGE_PROVIDER = (process.env.DEFAULT_STORAGE_PROVIDER ?? 'CLOUDINARY') as
  | 'LOCAL'
  | 'CLOUDINARY';

export function getStorageProvider(providerName: string): StorageProvider {
  switch (providerName) {
    case 'CLOUDINARY':
      return cloudinaryStorageProvider;
    case 'LOCAL':
      return localStorageProvider;
    case 'S3':
    case 'GCS':
      throw new Error(`Storage provider "${providerName}" belum diimplementasikan.`);
    default:
      throw new Error(`Storage provider "${providerName}" tidak dikenali.`);
  }
}

// Provider yang filenya bisa diakses langsung lewat URL publik (tanpa proxy
// lewat server kita) — controller pakai ini untuk putuskan redirect vs
// stream buffer. LOCAL tidak masuk sini karena file-nya cuma bisa diakses
// lewat filesystem server, tidak ada URL publik.
const PUBLICLY_REDIRECTABLE_PROVIDERS = new Set(['CLOUDINARY']);

export function isPubliclyRedirectable(providerName: string): boolean {
  return PUBLICLY_REDIRECTABLE_PROVIDERS.has(providerName);
}