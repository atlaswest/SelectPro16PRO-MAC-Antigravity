import { Top9Score } from './services/top9Analyzer';

export interface PhotoItem {
  id: string;
  file?: File;
  preview: string;
  status: 'pending' | 'analyzing' | 'completed' | 'error';
  rating: number;
  colorTag: string | null;
  tags: string[];
  isRejected?: boolean;
  rejectType?: number;
  manualRejected: boolean;
  notes?: string;
  result?: any;
  aiScoreData?: PhotoScore;
  renamedFilename?: string;
  rawFile?: File;
  socialHandles?: any;
  histogram?: number[];
  top9Score?: Top9Score;
  burstId?: string;
  isBurstLead?: boolean;
  metadata: {
    cameraSerial?: string;
    cameraModel?: string;
    lens?: string;
    aperture?: string | number;
    shutterSpeed?: string | number;
    timestamp?: string | number;
    hash: string;
    iso?: string | number;
    width?: number;
    height?: number;
    shutterCount?: string | number;
    focalLength?: string | number;
    gps?: { lat: number; lng: number };
    aiFlag?: 'primary' | 'alternate' | 'reject';
    aiScore?: number;
    aiReason?: string;
    recognizedPeople?: {
      name: string;
      confidence: number;
      boundingBox: {
        ymin: number;
        xmin: number;
        ymax: number;
        xmax: number;
      };
    }[];
    detectedObjects?: {
      label: string;
      confidence: number;
      boundingBox: {
        ymin: number;
        xmin: number;
        ymax: number;
        xmax: number;
      };
    }[];
    detectedPoses?: any[];
  };
}

export type ViewMode = 'import' | 'library' | 'image' | 'nineShot' | 'compare';
export type SortOption = 'default' | 'capture-time' | 'serial' | 'filename' | 'modification-time' | 'rating' | 'type' | 'custom';
export type SelectionStrategy = 'batch' | 'progressive' | 'manual' | 'auto-top';

export type BackupTier =
  | 'media-card'
  | 'local-A'
  | 'local-B'
  | 'cloud-C';

export interface BackupLocation {
  tier: BackupTier;
  path: string;
  verified: boolean;
  reliabilityScore: number; // 0–1
  lastVerifiedAt: Date;
}

export interface BackupPaths {
  mediaCard: string;   // e.g. /Volumes/DCIM
  localA: string;      // /Volumes/Drive_A/Photos
  localB: string;      // /Volumes/Drive_B/Photos
  cloudC: string;      // /Cloud/Photos (API or mounted)
}

export interface DeletionPreferences {
  mode: 'safe-folder' | 'trash-recoverable' | 'trash-permanent';
  requireConfirmation: boolean;
  clearHistory: 'never' | 'on-exit' | 'on-import';

  backupVerification: {
    enabled: boolean;
    require3Sources: boolean;
    verifyBeforeDelete: boolean;
    maxAgeHours: number; // freshness check
  };
}

export interface ProfessionalReview {
  score: number;
  keep: boolean;
  reason: string;
  technical_issues: string[];
}

export interface SequenceReviewItem {
  imageId: string;
  score: number;
  status: 'primary' | 'alternate' | 'reject';
}

export interface ImageEvaluation {
  score: number; // 1–10
  keep: boolean;
  reason: string;
  technical_issues: string[];

  metadata: {
    focusSharpness: number;
    exposure: number;
    composition: number;
    motionBlur: boolean;
    eyeDetectionConfidence: number;
  };
}

export interface SequenceResult {
  imageId: string;
  score: number;
  status: 'primary' | 'alternate' | 'reject';
}

export interface DeletionConfidence {
  imageScore: number;          // from AI evaluation
  duplicateLikelihood: number; // 0–1
  backupSafety: number;        // 0–1
  finalScore: number;          // weighted result
}

export interface RenamingSettings {
  pattern: 'simple' | 'advanced';
  prefix: string;
  subject: string;
  location: string;
  personPlace: string;
  event: string;
  separator: string;
  sequenceStart: number;
  applyAfterImport: boolean;
  useExifLocation: boolean;
  useFolderSubject: boolean;
}

export interface ShootingGoals {
  targetKeeperRate: number;
  minSharpnessThreshold: number;
  preferredFocalLength: string;
  shootingStyle: string;
  sessionGoal: string;
  temporalAwareness: {
    motordriveShooting: number;
    frameVariance: number;
  };
}

export interface FaceResult {
  bounds: { x: number; y: number; width: number; height: number };
  smileScore: number;       // 0–1  (from expression.happy)
  eyeOpenScore: number;     // 0–1  (derived from EAR landmark geometry)
  expression: string;       // dominant expression label
}

export interface LocalScores {
  faceCount: number;
  faces: FaceResult[];
  sharpnessScore: number;   // 0–1  (normalised Laplacian variance)
  blurry: boolean;
}

export interface GeminiScores {
  compositionScore: number; // 0–10
  lightingScore: number;
  subjectFocusScore: number;
  overallQuality: number;
  tags: string[];
  issues: string[];
  keep: boolean;
}

export type StarRating = 0 | 1 | 2 | 3 | 4 | 5;
export type FlagColor = 'none' | 'red' | 'yellow' | 'green' | 'blue' | 'purple';

export interface PhotoScore {
  finalScore: number;       // 0–1  weighted composite
  grade: 'hero' | 'keep' | 'maybe' | 'reject';
  local: LocalScores | null;
  cloud: GeminiScores | null;
  analysedAt: number;
  durationMs: number;
}

export interface HistoryAction {
  id: string;
  type: 'update_metadata' | 'delete' | 'restore';
  photoIds: string[];
  prevData: Partial<PhotoItem>[];
  newData: Partial<PhotoItem>[];
  timestamp: number;
}
