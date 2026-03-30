import ExifReader from 'exifreader';
import { getProxyFromCache, saveProxyToCache } from './dbService';
import { loadExifWithRetry, withFileRetry } from './fileHelper';

/**
 * Generates a low-resolution proxy for high-resolution images to improve UI performance.
 * If the file is a RAW file, it attempts to extract the embedded JPEG thumbnail.
 */
export async function generateProxy(file: File, id?: string, maxWidth = 1024, maxHeight = 1024, preLoadedTags?: any): Promise<string> {
  // Check cache first
  if (id) {
    const cachedBlob = await getProxyFromCache(id);
    if (cachedBlob) {
      return URL.createObjectURL(cachedBlob);
    }
  }

  // Ensure file is readable before proceeding
  // We only check the first byte to minimize performance impact
  await withFileRetry(() => file.slice(0, 1).arrayBuffer());

  let imageSource: string | Blob = file;

  // Check if it's a RAW file by extension
  const rawExtensions = ['.arw', '.cr2', '.cr3', '.nef', '.dng', '.orf', '.raf'];
  const ext = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();

  if (rawExtensions.includes(ext)) {
    try {
      const tags = preLoadedTags || await loadExifWithRetry(file);
      if (tags['Thumbnail'] && tags['Thumbnail'].image) {
        // Cast to any to avoid type mismatch with BlobPart
        const thumbnailData = tags['Thumbnail'].image as any;
        imageSource = new Blob([thumbnailData], { type: 'image/jpeg' });
      }
    } catch (e) {
      console.warn('Failed to extract thumbnail from RAW:', e);
    }
  }

  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(imageSource instanceof Blob ? imageSource : file);
    img.src = url;
    img.onload = () => {
      const canvas = document.createElement('canvas');
      let width = img.width;
      let height = img.height;

      if (width > height) {
        if (width > maxWidth) {
          height = Math.round(height * (maxWidth / width));
          width = maxWidth;
        }
      } else {
        if (height > maxHeight) {
          width = Math.round(width * (maxHeight / height));
          height = maxHeight;
        }
      }

      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(img.src);
        return;
      }

      ctx.drawImage(img, 0, 0, width, height);
      
      canvas.toBlob(async (blob) => {
        if (blob) {
          if (id) {
            await saveProxyToCache(id, blob);
          }
          resolve(URL.createObjectURL(blob));
        } else {
          resolve(img.src);
        }
        URL.revokeObjectURL(url);
      }, 'image/jpeg', 0.8);
    };
    img.onerror = (e) => {
      URL.revokeObjectURL(url);
      reject(e);
    };
  });
}

/**
 * Generates a base64 encoded proxy for AI analysis.
 */
export async function generateBase64Proxy(file: File, id?: string, maxWidth = 1024, maxHeight = 1024): Promise<string> {
  let imageSource: string | Blob = file;
  const rawExtensions = ['.arw', '.cr2', '.cr3', '.nef', '.dng', '.orf', '.raf'];
  const ext = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();

  if (rawExtensions.includes(ext)) {
    try {
      const tags = await loadExifWithRetry(file);
      if (tags['Thumbnail'] && tags['Thumbnail'].image) {
        const thumbnailData = tags['Thumbnail'].image as any;
        imageSource = new Blob([thumbnailData], { type: 'image/jpeg' });
      }
    } catch (e) {
      console.warn('Failed to extract thumbnail from RAW:', e);
    }
  }

  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(imageSource instanceof Blob ? imageSource : file);
    img.src = url;
    img.onload = () => {
      const canvas = document.createElement('canvas');
      let width = img.width;
      let height = img.height;

      if (width > height) {
        if (width > maxWidth) {
          height = Math.round(height * (maxWidth / width));
          width = maxWidth;
        }
      } else {
        if (height > maxHeight) {
          width = Math.round(width * (maxHeight / height));
          height = maxHeight;
        }
      }

      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(img.src);
        return;
      }

      ctx.drawImage(img, 0, 0, width, height);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
      
      if (id) {
        canvas.toBlob(async (blob) => {
          if (blob) await saveProxyToCache(id, blob);
        }, 'image/jpeg', 0.8);
      }
      
      resolve(dataUrl);
      URL.revokeObjectURL(url);
    };
    img.onerror = (e) => {
      URL.revokeObjectURL(url);
      reject(e);
    };
  });
}

/**
 * Calculates a sharpness score for an image using a Laplacian variance method.
 * This runs entirely locally in the browser.
 */
export async function calculateSharpness(imageSrc: string): Promise<number> {
  return new Promise(async (resolve) => {
    try {
      let img: HTMLImageElement | ImageBitmap;
      let canvas: HTMLCanvasElement | OffscreenCanvas;
      let ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D | null;
      const size = 300; // Use a fixed size for consistent scoring

      if (typeof document === 'undefined') {
        // Worker environment
        const response = await fetch(imageSrc);
        const blob = await response.blob();
        img = await createImageBitmap(blob);
        canvas = new OffscreenCanvas(size, size);
        ctx = canvas.getContext('2d');
      } else {
        // Main thread environment
        img = new Image();
        img.crossOrigin = "anonymous";
        img.src = imageSrc;
        await new Promise((res, rej) => {
          (img as HTMLImageElement).onload = res;
          (img as HTMLImageElement).onerror = rej;
        });
        canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        ctx = canvas.getContext('2d');
      }

      if (!ctx) {
        resolve(0);
        return;
      }

      ctx.drawImage(img, 0, 0, size, size);
      const imageData = ctx.getImageData(0, 0, size, size);
      const data = imageData.data;
      
      // Greyscale
      const grey = new Float32Array(size * size);
      for (let i = 0; i < data.length; i += 4) {
        grey[i / 4] = (data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114);
      }
      
      // Laplacian filter
      const laplacian = new Float32Array(size * size);
      for (let y = 1; y < size - 1; y++) {
        for (let x = 1; x < size - 1; x++) {
          const idx = y * size + x;
          laplacian[idx] = (
            -1 * grey[idx - size - 1] + -1 * grey[idx - size] + -1 * grey[idx - size + 1] +
            -1 * grey[idx - 1] + 8 * grey[idx] + -1 * grey[idx + 1] +
            -1 * grey[idx + size - 1] + -1 * grey[idx + size] + -1 * grey[idx + size + 1]
          );
        }
      }
      
      // Variance
      let sum = 0;
      for (let i = 0; i < laplacian.length; i++) {
        sum += laplacian[i];
      }
      const mean = sum / laplacian.length;
      let variance = 0;
      for (let i = 0; i < laplacian.length; i++) {
        variance += Math.pow(laplacian[i] - mean, 2);
      }
      
      const score = Math.sqrt(variance / laplacian.length);
      // Normalize roughly to 0-100 (Laplacian variance can vary widely, 
      // but for 300x300, 50 is usually quite sharp)
      // Professional spec: Sharp image (variance > 100)
      resolve(Math.round(score)); 
    } catch (e) {
      console.warn('Sharpness calculation failed:', e);
      resolve(0);
    }
  });
}

/**
 * Calculates the display dimensions for an image to fit within a container while maintaining aspect ratio.
 */
export function getDisplayDimensions(
  imgWidth: number,
  imgHeight: number,
  containerWidth: number,
  containerHeight: number
) {
  const aspect = imgWidth / imgHeight;
  const containerAspect = containerWidth / containerHeight;

  if (aspect > containerAspect) {
    // Fit to width
    return {
      width: containerWidth,
      height: containerWidth / aspect
    };
  } else {
    // Fit to height
    return {
      width: containerHeight * aspect,
      height: containerHeight
    };
  }
}

/**
 * Normalizes image rotation based on EXIF orientation before rendering.
 * Prevents perceived distortion from rotated dimensions.
 */
export function applyOrientation(image: HTMLImageElement, orientation: number): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');

  if (!ctx) return canvas;

  // Set canvas dimensions based on orientation
  if (orientation > 4 && orientation < 9) {
    canvas.width = image.height;
    canvas.height = image.width;
  } else {
    canvas.width = image.width;
    canvas.height = image.height;
  }

  // Apply transformation matrix
  switch (orientation) {
    case 2: ctx.transform(-1, 0, 0, 1, image.width, 0); break;
    case 3: ctx.transform(-1, 0, 0, -1, image.width, image.height); break;
    case 4: ctx.transform(1, 0, 0, -1, 0, image.height); break;
    case 5: ctx.transform(0, 1, 1, 0, 0, 0); break;
    case 6: ctx.transform(0, 1, -1, 0, image.height, 0); break;
    case 7: ctx.transform(0, -1, -1, 0, image.height, image.width); break;
    case 8: ctx.transform(0, -1, 1, 0, 0, image.width); break;
    default: ctx.transform(1, 0, 0, 1, 0, 0);
  }

  ctx.drawImage(image, 0, 0);
  return canvas;
}

/**
 * Strategy for Web-Ready Large File Handling:
 * 1. Proxy-First: Always work on 1200px proxies for UI feedback.
 * 2. Metadata-Only: Edits (curves, crops) are stored as JSON, not applied to pixels until export.
 * 3. Worker Threads: Offload histogram and analysis to Web Workers.
 * 4. Progressive Loading: Load full-res only when zooming > 100%.
 */
export const WEB_READY_PROMPT = `
Optimize this application for professional photography workflows involving 50MB+ RAW files:
1. Implement a Web Worker for 'calculateHistogram' to prevent UI jank.
2. Use IndexedDB (via 'idb' library) to cache generated proxies and metadata.
3. Implement 'Tiled Rendering' for the Loupe view to handle 45MP+ images efficiently.
4. Create a 'Non-Destructive Edit' pipeline where 'FilmicCurve' parameters are applied via CSS filters or WebGL shaders on the proxy.
`;
