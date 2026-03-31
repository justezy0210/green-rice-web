export interface PhenotypeRecord {
  cultivar: string;
  daysToHeading: {
    early: number | null;
    normal: number | null;
    late: number | null;
  };
  culmLength: number | null;
  panicleLength: number | null;
  panicleNumber: number | null;
  spikeletsPerPanicle: number | null;
  ripeningRate: number | null;
  grainWeight1000: number | null;
  preHarvestSprouting: number | null;
  bacterialLeafBlight: number | null;
  bacterialLeafBlightDetail?: {
    k1: boolean | null;
    k2: boolean | null;
    k3: boolean | null;
    k3a: boolean | null;
  };
  crossInformation?: string;
}

export interface PhenotypeField {
  key: string;
  label: string;
  unit: string;
  category: 'heading' | 'morphology' | 'yield' | 'quality' | 'resistance';
  description?: string;
}

export interface PhenotypeDatasetSummary {
  totalCultivars: number;
  totalFields: number;
  missingRate: number;
  fieldSummaries: PhenotypeFieldSummary[];
}

export interface PhenotypeFieldSummary {
  field: PhenotypeField;
  validCount: number;
  missingCount: number;
  min: number;
  max: number;
  mean: number;
  stdDev: number;
}

// Flat record for table display
export interface PhenotypeFlat {
  cultivar: string;
  early: number | null;
  normal: number | null;
  late: number | null;
  culmLength: number | null;
  panicleLength: number | null;
  panicleNumber: number | null;
  spikeletsPerPanicle: number | null;
  ripeningRate: number | null;
  grainWeight1000: number | null;
  preHarvestSprouting: number | null;
  bacterialLeafBlight: number | null;
}
