import { BackupLocation, DeletionConfidence, BackupPaths, BackupTier } from '../types';

async function verify(path: string, imagePath: string): Promise<boolean> {
  // Mock verification
  await new Promise(resolve => setTimeout(resolve, 200));
  return Math.random() > 0.1;
}

async function copyAndVerify(imagePath: string, destPath: string): Promise<boolean> {
  // Mock copy and verification
  await new Promise(resolve => setTimeout(resolve, 500));
  return Math.random() > 0.05;
}

export async function runBackup(imagePath: string, paths: BackupPaths) {
  return {
    mediaCard: await verify(paths.mediaCard, imagePath),
    localA: await copyAndVerify(imagePath, paths.localA),
    localB: await copyAndVerify(imagePath, paths.localB),
    cloudC: await copyAndVerify(imagePath, paths.cloudC)
  };
}

export function meetsThreeTwoOneRule(locations: BackupLocation[]): boolean {
  return validateBackupChain(locations).valid;
}

export function validateBackupChain(locations: BackupLocation[]) {
  const requiredTiers: BackupTier[] = ['media-card', 'local-A', 'local-B', 'cloud-C'];

  const verified = locations.filter(l => l.verified);

  const hasAllTargets =
    verified.some(l => l.tier === 'local-A') &&
    verified.some(l => l.tier === 'local-B') &&
    verified.some(l => l.tier === 'cloud-C');

  const fresh = verified.filter(l => {
    const age = (Date.now() - new Date(l.lastVerifiedAt).getTime()) / 3600000;
    return age <= 24;
  });

  const reliability = fresh.reduce((sum, l) => sum + l.reliabilityScore, 0);

  return {
    valid: hasAllTargets && reliability >= 2.5,
    hasAllTargets,
    reliability
  };
}

export function canDeletePermanently(
  validation: ReturnType<typeof validateBackupChain>
) {
  return validation.valid;
}

export function getBackupWarnings(validation: ReturnType<typeof validateBackupChain>) {
  if (!validation.hasAllTargets) {
    return "Missing required backup target (A, B, or C)";
  }

  if (validation.reliability < 2.5) {
    return "Backup reliability too low";
  }

  return null;
}

export function calculateDeletionConfidence(d: DeletionConfidence): number {
  return (
    d.imageScore * 0.4 +
    d.duplicateLikelihood * 0.3 +
    d.backupSafety * 0.3
  );
}

export function canPermanentlyDelete(
  mode: string,
  has3Sources: boolean,
  isFresh: boolean
) {
  return !(mode === 'trash-permanent' && (!has3Sources || !isFresh));
}

export class BackupManager {
  private locations: BackupLocation[] = [];

  constructor(initialLocations: BackupLocation[] = []) {
    this.locations = initialLocations;
  }

  async verifyBackupStatus(imagePath: string): Promise<BackupLocation[]> {
    // In a real app, this would check if the file exists at each location
    // For this demo, we'll simulate verification with a delay
    await new Promise(resolve => setTimeout(resolve, 500));
    
    return this.locations.map(location => ({
      ...location,
      verified: Math.random() > 0.3, // Simulate random verification
      lastVerifiedAt: new Date()
    }));
  }

  meetsThreeTwoOneRule(verifiedLocations: BackupLocation[]): boolean {
    return meetsThreeTwoOneRule(verifiedLocations);
  }

  getReliabilityStatus(verifiedLocations: BackupLocation[]): number {
    if (verifiedLocations.length === 0) return 0;
    const totalScore = verifiedLocations.reduce((sum, loc) => sum + (loc.verified ? loc.reliabilityScore : 0), 0);
    return totalScore / verifiedLocations.length;
  }
}
