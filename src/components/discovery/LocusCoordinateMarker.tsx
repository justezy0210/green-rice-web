import type { BlockRegion } from '@/types/candidate-block';

const CHR_LENGTH_BP: Record<string, number> = {
  chr01: 43_270_923,
  chr02: 35_937_250,
  chr03: 36_413_819,
  chr04: 35_502_694,
  chr05: 29_958_434,
  chr06: 31_248_787,
  chr07: 29_697_621,
  chr08: 28_443_022,
  chr09: 23_012_720,
  chr10: 23_207_287,
  chr11: 29_021_106,
  chr12: 27_531_856,
};

export function LocusCoordinateMarker({ region }: { region: BlockRegion }) {
  const length = CHR_LENGTH_BP[region.chr] ?? Math.max(region.end, 1);
  const x = Math.max(0, Math.min(100, (region.start / length) * 100));
  const width = Math.max(3, Math.min(100 - x, ((region.end - region.start) / length) * 100));

  return (
    <span className="relative h-1.5 w-20 rounded bg-gray-100" aria-hidden>
      <span
        className="absolute top-0 h-1.5 rounded bg-gray-500"
        style={{ left: `${x}%`, width: `${width}%` }}
      />
    </span>
  );
}
