export type SupportedImageFormat = 'jpeg' | 'png' | 'webp';
export type ImageFormat = SupportedImageFormat | 'unsupported';

export interface GpsData {
  latitude: number; // Signed decimal degrees, negative for South
  longitude: number; // Signed decimal degrees, negative for West
  altitude?: number; // Meters above sea level, signed (negative if below sea level)
  formattedLat: string; // e.g. "37° 46' 29.76\" N"
  formattedLon: string; // e.g. "122° 25' 9.84\" W"
  formattedAltitude?: string; // e.g. "52.4 m above sea level"
  mapUrl?: string; // Pure external OpenStreetMap link
  timestamp?: string; // UTC time string e.g. "14:32:08"
  dateStamp?: string; // UTC date string e.g. "2026:09:19"
}

export interface CameraData {
  make?: string;
  model?: string;
  lensMake?: string;
  lensModel?: string;
  software?: string;
  serialNumber?: string;
  ownerName?: string;
}

export interface ShotDetails {
  dateTimeOriginal?: string;
  dateTimeDigitized?: string;
  dateTime?: string;
  exposureTime?: string; // e.g. "1/250s" or "2s"
  fNumber?: string; // e.g. "f/2.8"
  iso?: number;
  focalLength?: string; // e.g. "24.0 mm"
  width?: number;
  height?: number;
  orientation?: number; // EXIF orientation tag (1-8)
}

export interface RawTextEntry {
  key: string;
  value: string;
}

export interface ImageMetadataResult {
  format: ImageFormat;
  hasMetadata: boolean;
  camera: CameraData;
  shot: ShotDetails;
  gps?: GpsData;
  rawTextEntries: RawTextEntry[];
  warnings: string[];
}

export interface ImageStripResult {
  format: ImageFormat;
  success: boolean;
  cleanedBytes: Uint8Array;
  originalSize: number;
  cleanedSize: number;
  bytesSaved: number;
  removed: string[];
  kept: string[];
  warnings: string[];
}
