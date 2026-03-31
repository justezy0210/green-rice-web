import { collection, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { CultivarDoc } from '@/types/cultivar';
import type { PhenotypeRecord, PhenotypeField, PhenotypeDatasetSummary } from '@/types/phenotype';
import { PHENOTYPE_FIELDS, computeDatasetSummary } from './utils';

interface DataService {
  getPhenotypeRecords(): Promise<PhenotypeRecord[]>;
  getPhenotypeFields(): PhenotypeField[];
  getDatasetSummary(): Promise<PhenotypeDatasetSummary>;
}

function cultivarToRecord(doc: CultivarDoc): PhenotypeRecord {
  const blb = doc.resistance.bacterialLeafBlight;
  const blbCount = [blb.k1, blb.k2, blb.k3, blb.k3a].filter(Boolean).length;

  return {
    cultivar: doc.name,
    daysToHeading: {
      early: doc.daysToHeading.early,
      normal: doc.daysToHeading.normal,
      late: doc.daysToHeading.late,
    },
    culmLength: doc.morphology.culmLength,
    panicleLength: doc.morphology.panicleLength,
    panicleNumber: doc.morphology.panicleNumber,
    spikeletsPerPanicle: doc.yield.spikeletsPerPanicle,
    ripeningRate: doc.yield.ripeningRate,
    grainWeight1000: doc.quality.grainWeight,
    preHarvestSprouting: doc.quality.preHarvestSprouting,
    bacterialLeafBlight: blbCount,
    bacterialLeafBlightDetail: {
      k1: blb.k1,
      k2: blb.k2,
      k3: blb.k3,
      k3a: blb.k3a,
    },
    crossInformation: doc.crossInformation ?? '',
  };
}

class FirestoreDataService implements DataService {
  private cache: PhenotypeRecord[] | null = null;

  async getPhenotypeRecords(): Promise<PhenotypeRecord[]> {
    if (this.cache) return this.cache;

    const snap = await getDocs(collection(db, 'cultivars'));
    this.cache = snap.docs
      .map((d) => cultivarToRecord(d.data() as CultivarDoc))
      .sort((a, b) => a.cultivar.localeCompare(b.cultivar));
    return this.cache;
  }

  getPhenotypeFields(): PhenotypeField[] {
    return PHENOTYPE_FIELDS;
  }

  async getDatasetSummary(): Promise<PhenotypeDatasetSummary> {
    const records = await this.getPhenotypeRecords();
    return computeDatasetSummary(records);
  }
}

export const dataService: DataService = new FirestoreDataService();
