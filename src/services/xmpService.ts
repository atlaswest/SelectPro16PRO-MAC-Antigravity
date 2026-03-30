import { PhotoItem } from '../types';

export const generateXMP = (photo: PhotoItem): string => {
  const isRejected = photo.manualRejected || photo.isRejected;
  const rating = isRejected ? -1 : (photo.rating || 0);
  const label = photo.colorTag || "";
  const allTags = Array.from(new Set([...(photo.result?.tags || []), ...photo.tags]));
  const people = photo.result?.people?.map((p: any) => p.name) || [];
  const fileName = photo.file?.name || photo.id;
  const extension = fileName.split('.').pop() || 'jpg';
  
  const xmp = `<?xpacket begin="" id="W5M0MpCehiHzreSzNTczkc9d"?>
<x:xmpmeta xmlns:x="adobe:ns:meta/" x:xmptk="SelectPro v1.0">
 <rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#">
  <rdf:Description rdf:about=""
    xmlns:xmp="http://ns.adobe.com/xap/1.0/"
    xmlns:photoshop="http://ns.adobe.com/photoshop/1.0/"
    xmlns:dc="http://purl.org/dc/elements/1.1/"
    xmlns:aux="http://ns.adobe.com/exif/1.0/aux/"
    xmlns:exif="http://ns.adobe.com/exif/1.0/"
    xmlns:tiff="http://ns.adobe.com/tiff/1.0/"
    xmlns:xmpMM="http://ns.adobe.com/xap/1.0/mm/"
    xmlns:stEvt="http://ns.adobe.com/xap/1.0/s/event#"
    xmlns:crs="http://ns.adobe.com/camera-raw-settings/1.0/"
   xmp:Rating="${rating}"
   xmp:Label="${label}"
   photoshop:SidecarForExtension="${extension}"
   crs:HasSettings="False"
   crs:HasCrop="False"
   crs:AlreadyApplied="False">
   <dc:subject>
    <rdf:Bag>
     ${allTags.map(tag => `<rdf:li>${tag}</rdf:li>`).join('\n     ')}
     ${people.map(person => `<rdf:li>Person: ${person}</rdf:li>`).join('\n     ')}
    </rdf:Bag>
   </dc:subject>
  </rdf:Description>
 </rdf:RDF>
</x:xmpmeta>
<?xpacket end="w"?>`;

  return xmp;
};

export const downloadXMP = (photo: PhotoItem) => {
  const xmp = generateXMP(photo);
  const fileName = photo.file?.name || photo.id;
  const baseName = fileName.substring(0, fileName.lastIndexOf('.')) || fileName;
  const blob = new Blob([xmp], { type: 'application/xml' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${baseName}.xmp`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};
