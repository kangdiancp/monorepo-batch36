import type { regions } from '../../db/schema';

export type RegionRow = typeof regions.$inferSelect;
export type NewRegionRow = typeof regions.$inferInsert;


/*
//kalo ga gunakan #inferSelect, kita harus bikin interface, jika ada perubahan kolom di schema.ts, kita harus update
//juga interface nya

interface RegionRow  {
  regionId: number;        // notNull() → required
  regionName: string | null; // tidak ada notNull() → nullable
}

*/