import ExifReader from 'exifreader';

// Web Worker for processing EXIF and heavy image tasks
self.onmessage = async (e: MessageEvent) => {
  const { type, file, id } = e.data;

  if (type === 'PROCESS_EXIF') {
    try {
      // Retry logic for NotReadableError
      let arrayBuffer: ArrayBuffer | null = null;
      for (let i = 0; i < 5; i++) {
        try {
          arrayBuffer = await file.arrayBuffer();
          break;
        } catch (err: any) {
          const isReadableError = err?.name === 'NotReadableError' || 
                                 err?.message?.includes('could not be read') ||
                                 err?.message?.includes('permission problems');
          if (isReadableError) {
            if (i === 4) throw err;
            const delay = Math.pow(2, i) * 500;
            await new Promise(resolve => setTimeout(resolve, delay));
            continue;
          }
          throw err;
        }
      }

      if (!arrayBuffer) throw new Error('Failed to read file');

      const tags = ExifReader.load(arrayBuffer);

      // Simple hash for the file
      const hash = await crypto.subtle.digest('SHA-1', arrayBuffer)
        .then(buf => Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join(''));

      self.postMessage({
        type: 'EXIF_RESULT',
        id,
        metadata: {
          cameraSerial: tags['SerialNumber']?.description || 'UNKNOWN',
          cameraModel: tags['Model']?.description,
          lens: tags['LensModel']?.description,
          aperture: tags['ApertureValue']?.description,
          shutterSpeed: tags['ExposureTime']?.description,
          iso: tags['ISOSpeedRatings']?.description,
          focalLength: tags['FocalLength']?.description,
          timestamp: tags['DateTimeOriginal']?.description ? new Date(tags['DateTimeOriginal'].description).getTime() : Date.now(),
          width: tags['ImageWidth']?.value,
          height: tags['ImageHeight']?.value,
          hash
        }
      });
    } catch (error) {
      self.postMessage({ type: 'EXIF_ERROR', id, error: (error as Error).message });
    }
  }
};
