import type { PhotoScore } from '../workers/analysisWorker';

const GRADE_STYLES = {
  hero:   'bg-[#E6F1FB] text-[#0C447C]',
  keep:   'bg-[#EAF3DE] text-[#27500A]',
  maybe:  'bg-[#FAEEDA] text-[#633806]',
  reject: 'bg-[#FCEBEB] text-[#791F1F]',
};

export function ScoreBadges({ score, visible }: { score: PhotoScore; visible: string[] }) {
  const { grade, finalScore, local, cloud } = score;
  const face = local?.faces[0];

  return (
    <div className="absolute bottom-1.5 left-1.5 right-1.5 flex flex-wrap gap-1 items-end pointer-events-none">
      {visible.includes('grade') && (
        <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${GRADE_STYLES[grade]}`}>
          {grade.charAt(0).toUpperCase() + grade.slice(1)}
        </span>
      )}
      {visible.includes('score') && (
        <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-black/50 text-white">
          {finalScore.toFixed(2)}
        </span>
      )}
      {visible.includes('eye') && face && (
        <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-[#EEEDFE] text-[#3C3489]">
          E {Math.round(face.eyeOpenScore * 100)}
        </span>
      )}
      {visible.includes('smile') && face && (
        <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-[#FBEAF0] text-[#72243E]">
          S {Math.round(face.smileScore * 100)}
        </span>
      )}
      {visible.includes('blur') && local?.blurry && (
        <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-[#FCEBEB] text-[#791F1F]">
          blurry
        </span>
      )}
    </div>
  );
}
