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
}

export type CultivarForm = CultivarDoc;

export function emptyCultivarForm(): CultivarForm {
  return {
    name: '',
    daysToHeading: { early: null, normal: null, late: null },
    morphology: { culmLength: null, panicleLength: null, panicleNumber: null },
    yield: { spikeletsPerPanicle: null, ripeningRate: null },
    quality: { grainWeight: null, preHarvestSprouting: null },
    resistance: {
      bacterialLeafBlight: { k1: false, k2: false, k3: false, k3a: false },
    },
    crossInformation: '',
  };
}

export function cultivarNameToId(name: string): string {
  return name.toLowerCase().replace(/\s+/g, '-');
}
