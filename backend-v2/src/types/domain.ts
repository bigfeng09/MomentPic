export type UserRole = "admin" | "user";

export interface AuthUser {
  username: string;
  role: UserRole;
}

export interface Pagination {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface GalleryDto {
  id: string;
  name: string;
  path: string;
  enabled: boolean;
  albumCount: number;
  lastScannedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AlbumDto {
  id: string;
  galleryId: string;
  name: string;
  sourceType: string;
  sourcePath: string;
  coverAssetId: string | null;
  assetCount: number;
  scanStatus: string;
  errorMessage: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AssetDto {
  id: string;
  albumId: string;
  name: string;
  extension: string;
  sourceType: string;
  sourcePath: string;
  relativePath: string | null;
  zipEntryPath: string | null;
  sortIndex: number;
  width: number | null;
  height: number | null;
  sizeBytes: number | null;
  sourceMtime: string | null;
  thumbnailKey: string | null;
  createdAt: string;
  updatedAt: string;
}
