import type { GenomeSummary } from './genome';

export interface CultivarDoc {
  name: string;
  daysToHeading: {
    early: number | null;
    normal: number | null;
    late: number | null;
  };
  morphology: {
    culmLength: number | null;
    panicleLength: number | null;
    panicleNumber: number | null;
  };
  yield: {
    spikeletsPerPanicle: number | null;
    ripeningRate: number | null;
  };
  quality: {
    grainWeight: number | null;
    preHarvestSprouting: number | null;
  };
  resistance: {
    bacterialLeafBlight: {
      k1: boolean | null;
      k2: boolean | null;
      k3: boolean | null;
      k3a: boolean | null;
    };
  };
  crossInformation: string;
  genomeSummary?: GenomeSummary;
}

export type CultivarForm = CultivarDoc;
