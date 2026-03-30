export const DELETE_CONFIRMATION = {
  required: true,
  typeToConfirm: true,
  pattern: (count: number) => `DELETE ${count} FILES`
};

export const BACKUP_PIPELINE = [
  'media-card', // source
  'local-A',    // first copy
  'local-B',    // second copy
  'cloud-C'     // offsite
] as const;

export const BACKUP_UI = {
  flow: "Media Card → Local A → Local B → Cloud C",
  labels: {
    mediaCard: "📸 Source",
    localA: "💾 Drive A",
    localB: "💾 Drive B",
    cloudC: "☁️ Cloud"
  }
};

export const IMAGE_RENDERING = {
  maintainAspectRatio: true,
  allowUpscale: false,
  fitMode: 'contain', // 'contain' | 'cover' (controlled use only)
  interpolation: 'high-quality',
  pixelSnap: true
};

export const PIXEL_INTEGRITY = {
  preventNonUniformScaling: true,
  lockAspectRatio: true,
  disableStretch: true,
  respectEXIFOrientation: true,
  useDevicePixelRatio: true
};

export const ZOOM_CONFIG = {
  zoomLevels: [1, 2, 4], // 100%, 200%, 400%
  zoomMode: 'pixel-accurate', // no interpolation blur
  centerOnFocusPoint: true
};

export const COLOR_TAGS = [
  { id: 'red', color: 'bg-emerald-500' },
  { id: 'yellow', color: 'bg-amber-400' },
  { id: 'green', color: 'bg-emerald-500' },
  { id: 'blue', color: 'bg-blue-500' },
  { id: 'purple', color: 'bg-purple-500' },
];
