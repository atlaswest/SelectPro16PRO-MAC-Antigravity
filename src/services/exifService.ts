import ExifReader from 'exifreader';
import { loadExifWithRetry } from './fileHelper';

export interface ExifData {
  cameraSerial: string;
  cameraModel: string;
  lens: string;
  aperture: number;
  shutterSpeed: string;
  timestamp: number;
  width: number;
  height: number;
  iso: number;
  dpi: number;
  shutterCount?: number;
  gps?: {
    lat: number;
    lng: number;
  };
}

export async function getExifData(file: File, preLoadedTags?: any): Promise<ExifData> {
  const tags = preLoadedTags || await loadExifWithRetry(file);
  
  const cameraSerial = tags['SerialNumber']?.description || tags['InternalSerialNumber']?.description || 'Unknown';
  const cameraModel = tags['Model']?.description || 'Unknown';
  const lens = tags['LensModel']?.description || tags['Lens']?.description || 'Unknown';
  const aperture = tags['FNumber']?.value ? Number(tags['FNumber'].value) : 0;
  const shutterSpeed = tags['ExposureTime']?.description || 'Unknown';
  const timestamp = tags['DateTimeOriginal']?.description ? new Date(tags['DateTimeOriginal'].description).getTime() : file.lastModified;
  const width = tags['ImageWidth']?.value ? Number(tags['ImageWidth'].value) : 0;
  const height = tags['ImageHeight']?.value ? Number(tags['ImageHeight'].value) : 0;
  const iso = tags['ISOSpeedRatings']?.value ? Number(tags['ISOSpeedRatings'].value) : 0;
  const dpi = tags['XResolution']?.value ? Number(tags['XResolution'].value) : 72;
  
  // GPS Data
  let gps: { lat: number; lng: number } | undefined;
  if (tags['GPSLatitude'] && tags['GPSLongitude']) {
    gps = {
      lat: Number(tags['GPSLatitude'].description),
      lng: Number(tags['GPSLongitude'].description)
    };
  }

  // Try various tags for shutter count
  const shutterCount = tags['ShutterCount']?.value 
    || tags['ImageNumber']?.value 
    || tags['ImageCount']?.value 
    || tags['TotalShutterReleases']?.value;

  return {
    cameraSerial,
    cameraModel,
    lens,
    aperture,
    shutterSpeed,
    timestamp,
    width,
    height,
    iso,
    dpi,
    shutterCount: shutterCount ? Number(shutterCount) : undefined,
    gps
  };
}

export function calculateHistogram(img: HTMLImageElement): { r: number[], g: number[], b: number[] } {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) return { r: [], g: [], b: [] };

  // Resize for performance
  const scale = Math.min(1, 256 / Math.max(img.width, img.height));
  canvas.width = img.width * scale;
  canvas.height = img.height * scale;
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;
  const r = new Array(256).fill(0);
  const g = new Array(256).fill(0);
  const b = new Array(256).fill(0);

  for (let i = 0; i < data.length; i += 4) {
    r[data[i]]++;
    g[data[i + 1]]++;
    b[data[i + 2]]++;
  }

  // Normalize
  const max = Math.max(...r, ...g, ...b);
  return {
    r: r.map(v => (v / max) * 100),
    g: g.map(v => (v / max) * 100),
    b: b.map(v => (v / max) * 100)
  };
}
