import { PhotoItem } from '../types';

export interface PhotoMetadata {
  r?: number;      // rating
  t?: string[];    // tags
  x?: boolean;     // rejected
  c?: string;      // colour
  n?: string;      // notes
  ai?: number;     // aiScore
}

export interface NineShotCatalog {
  version: "v1";
  timestamp: number;
  photos: { [fileName: string]: PhotoMetadata };
}

export const CATALOG_FILENAME = "_9shot_catalog.json";

/**
 * Detects if a catalog file exists in the provided file list.
 */
export async function detectCatalogInFiles(files: File[]): Promise<NineShotCatalog | null> {
  const catalogFile = files.find(f => f.name === CATALOG_FILENAME);
  if (!catalogFile) return null;

  try {
    const text = await catalogFile.text();
    const catalog = JSON.parse(text) as NineShotCatalog;
    if (catalog.version === "v1") {
      return catalog;
    }
  } catch (error) {
    console.error("Failed to parse 9 Shot catalog:", error);
  }
  return null;
}

/**
 * Applies metadata from a catalog to a list of photos.
 */
export function applyCatalogToPhotos(photos: PhotoItem[], catalog: NineShotCatalog): PhotoItem[] {
  return photos.map(photo => {
    const fileName = photo.file?.name || photo.id;
    const meta = catalog.photos[fileName];
    if (!meta) return photo;

    return {
      ...photo,
      rating: meta.r ?? photo.rating,
      tags: meta.t ?? photo.tags,
      isRejected: meta.x ?? photo.isRejected,
      manualRejected: meta.x ?? photo.manualRejected,
      colorTag: meta.c ?? photo.colorTag,
      notes: meta.n ?? photo.notes,
      metadata: {
        ...photo.metadata,
        aiScore: meta.ai ?? photo.metadata.aiScore
      }
    };
  });
}

/**
 * Builds a catalog object from a list of photos, using sparse storage.
 */
export function buildCatalogFromPhotos(photos: PhotoItem[]): NineShotCatalog {
  const catalogPhotos: { [fileName: string]: PhotoMetadata } = {};

  photos.forEach(photo => {
    const meta: PhotoMetadata = {};
    let hasData = false;

    if (photo.rating > 0) {
      meta.r = photo.rating;
      hasData = true;
    }
    if (photo.tags && photo.tags.length > 0) {
      meta.t = photo.tags;
      hasData = true;
    }
    if (photo.isRejected || photo.manualRejected) {
      meta.x = true;
      hasData = true;
    }
    if (photo.colorTag) {
      meta.c = photo.colorTag;
      hasData = true;
    }
    if (photo.notes) {
      meta.n = photo.notes;
      hasData = true;
    }
    if (photo.metadata.aiScore !== undefined) {
      meta.ai = photo.metadata.aiScore;
      hasData = true;
    }

    if (hasData) {
      const fileName = photo.file?.name || photo.id;
      catalogPhotos[fileName] = meta;
    }
  });

  return {
    version: "v1",
    timestamp: Date.now(),
    photos: catalogPhotos
  };
}

/**
 * Writes the catalog to a folder using the File System Access API.
 */
export async function writeCatalogToFolder(catalog: NineShotCatalog, directoryHandle: any): Promise<boolean> {
  try {
    const fileHandle = await directoryHandle.getFileHandle(CATALOG_FILENAME, { create: true });
    const writable = await fileHandle.createWritable();
    await writable.write(JSON.stringify(catalog, null, 2));
    await writable.close();
    return true;
  } catch (error) {
    console.error("Failed to write catalog via FSA:", error);
    return false;
  }
}

/**
 * Triggers a browser download of the catalog file.
 */
export function downloadCatalog(catalog: NineShotCatalog) {
  const blob = new Blob([JSON.stringify(catalog, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = CATALOG_FILENAME;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Generates XMP sidecar content for a photo.
 */
export function generateXMP(photo: PhotoItem): string {
  const rating = photo.rating || 0;
  const label = photo.colorTag || "";
  
  // Basic XMP template compatible with Lightroom and Capture One
  return `<?xpacket begin="" id="W5M0MpCehiHzreSzNTczkc9d"?>
<x:xmpmeta xmlns:x="adobe:ns:meta/" x:xmptk="Adobe XMP Core 5.6-c140 79.160451, 2017/05/06-01:08:21        ">
 <rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#">
  <rdf:Description rdf:about=""
    xmlns:xmp="http://ns.adobe.com/xap/1.0/"
    xmlns:photoshop="http://ns.adobe.com/photoshop/1.0/"
    xmlns:xmpRights="http://ns.adobe.com/xap/1.0/rights/"
    xmlns:dc="http://purl.org/dc/elements/1.1/"
    xmlns:tiff="http://ns.adobe.com/tiff/1.0/"
    xmlns:exif="http://ns.adobe.com/exif/1.0/"
   xmp:Rating="${rating}"
   xmp:Label="${label}"
   photoshop:Urgency="${rating}">
   <dc:subject>
    <rdf:Bag>
     ${(photo.tags || []).map(t => `<rdf:li>${t}</rdf:li>`).join('\n     ')}
     <rdf:li>SelectPro</rdf:li>
     ${photo.aiScoreData ? `<rdf:li>Score: ${Math.round(photo.aiScoreData.finalScore * 100)}</rdf:li>` : ''}
    </rdf:Bag>
   </dc:subject>
  </rdf:Description>
 </rdf:RDF>
</x:xmpmeta>
<?xpacket end="w"?>`;
}

/**
 * Exports XMP sidecar files for a list of photos using the File System Access API.
 */
export async function exportXMPFiles(photos: PhotoItem[], directoryHandle: any): Promise<number> {
  let count = 0;
  for (const photo of photos) {
    try {
      const fileName = photo.file?.name || photo.id;
      const lastDotIndex = fileName.lastIndexOf('.');
      const baseName = lastDotIndex !== -1 ? fileName.substring(0, lastDotIndex) : fileName;
      const xmpName = `${baseName}.xmp`;
      
      const fileHandle = await directoryHandle.getFileHandle(xmpName, { create: true });
      const writable = await fileHandle.createWritable();
      await writable.write(generateXMP(photo));
      await writable.close();
      count++;
    } catch (error) {
      console.error(`Failed to export XMP for ${photo.id}:`, error);
    }
  }
  return count;
}
