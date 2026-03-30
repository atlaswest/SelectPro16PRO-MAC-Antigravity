import ExifReader from 'exifreader';

export async function withFileRetry<T>(fn: () => Promise<T>, retries = 5): Promise<T> {
  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (err: any) {
      const isReadableError = err?.name === 'NotReadableError' || 
                             err?.message?.includes('could not be read') ||
                             err?.message?.includes('permission problems');
                             
      if (isReadableError) {
        if (i === retries - 1) throw err;
        const delay = Math.pow(2, i) * 500;
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      throw err;
    }
  }
  throw new Error('Operation failed after retries');
}

export async function loadExifWithRetry(file: File, retries = 5): Promise<any> {
  return withFileRetry(() => ExifReader.load(file), retries);
}
