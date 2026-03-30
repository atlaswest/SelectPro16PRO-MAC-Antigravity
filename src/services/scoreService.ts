import { LocalScores, GeminiScores, PhotoScore } from '../types';

/**
 * Merges local and cloud AI scores into a single final score.
 * Weights:
 * - Sharpness: 30% (objective - trust local)
 * - Eye Score: 20% (objective)
 * - Quality: 25% (subjective - Gemini)
 * - Composition: 15% (subjective)
 * - Smile Score: 10% (context-dependent)
 */
export function mergeScores(local: LocalScores | null, cloud: GeminiScores | null): PhotoScore {
  const eyeScore    = local?.faces[0]?.eyeOpenScore   ?? 0.5;
  const smileScore  = local?.faces[0]?.smileScore      ?? 0.5;
  const sharpness   = local?.sharpnessScore             ?? 0.5;
  const quality     = (cloud?.overallQuality ?? 5) / 10;
  const composition = (cloud?.compositionScore ?? 5) / 10;

  const finalScore = (
    sharpness   * 0.30 +  // objective — trust local completely
    eyeScore    * 0.20 +  // objective
    quality     * 0.25 +  // subjective — Gemini
    composition * 0.15 +  // subjective
    smileScore  * 0.10    // context-dependent
  );

  let grade: PhotoScore['grade'] = 'maybe';
  if (finalScore > 0.85) grade = 'hero';
  else if (finalScore > 0.6) grade = 'keep';
  else if (finalScore < 0.3 || local?.blurry) grade = 'reject';

  return {
    finalScore,
    grade,
    local,
    cloud,
    analysedAt: Date.now(),
    durationMs: 0, // Not available here
  };
}
