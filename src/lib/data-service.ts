import Papa from 'papaparse';
import type { PhenotypeRecord, PhenotypeField, PhenotypeDatasetSummary } from '@/types/phenotype';
import { PHENOTYPE_FIELDS, computeDatasetSummary } from './utils';

interface DataService {
  getPhenotypeRecords(): Promise<PhenotypeRecord[]>;
  getPhenotypeFields(): PhenotypeField[];
  getDatasetSummary(): Promise<PhenotypeDatasetSummary>;
}

function parseNum(val: string): number | null {
  if (!val || val.trim() === '') return null;
  const n = parseFloat(val.trim());
  return isNaN(n) ? null : n;
}

type CsvRow = Record<string, string>;

function mapCsvRow(row: CsvRow): PhenotypeRecord {
  return {
    cultivar: row['Cultivar']?.trim() ?? '',
    daysToHeading: {
      earlyseason22: parseNum(row["22' Early season Days to heading (days)"]),
      lateseason22: parseNum(row["22' late season Days to heading (days)"]),
      earlyseason23: parseNum(row["23' early season Days to heading (days)"]),
      normalseason23: parseNum(row["23' normal season Days to heading (days)"]),
      lateseason23: parseNum(row["23' late season Days to heading (days)"]),
    },
    culmLength: parseNum(row['Culm Length (cm)']),
    panicleLength: parseNum(row['Panicle Length (cm)']),
    panicleNumber: parseNum(row['Panicle Number']),
    spikeletsPerPanicle: parseNum(row['Spikelets per Panicle']),
    ripeningRate: parseNum(row['Ripening Rate (%)']),
    grainWeight1000: parseNum(row['"1,000-Grain Weight of Brown Rice (g)"'] ?? row['1,000-Grain Weight of Brown Rice (g)']),
    preHarvestSprouting: parseNum(row['Pre-harvest Sprouting (%)']),
    bacterialLeafBlight: parseNum(row['Bacterial Leaf Blight (The number of resistant strains)']),
  };
}

class CsvDataService implements DataService {
  private cache: PhenotypeRecord[] | null = null;

  async getPhenotypeRecords(): Promise<PhenotypeRecord[]> {
    if (this.cache) return this.cache;

    const response = await fetch('/data/phenotype_table.csv');
    const text = await response.text();

    const result = Papa.parse<CsvRow>(text, {
      header: true,
      skipEmptyLines: true,
    });

    this.cache = result.data.map(mapCsvRow).filter((r) => r.cultivar !== '');
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

// Swap to FirestoreDataService when ready
export const dataService: DataService = new CsvDataService();
