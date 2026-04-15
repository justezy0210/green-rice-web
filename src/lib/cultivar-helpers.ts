import type { CultivarForm } from '@/types/cultivar';

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
