import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import type { PhenotypeRecord, PhenotypeField, PhenotypeDatasetSummary, PhenotypeFieldSummary } from '@/types/phenotype';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const PHENOTYPE_FIELDS: PhenotypeField[] = [
  { key: 'earlyseason22', label: "Days to Heading (2022 Early)", unit: 'days', category: 'heading' },
  { key: 'lateseason22', label: "Days to Heading (2022 Late)", unit: 'days', category: 'heading' },
  { key: 'earlyseason23', label: "Days to Heading (2023 Early)", unit: 'days', category: 'heading' },
  { key: 'normalseason23', label: "Days to Heading (2023 Normal)", unit: 'days', category: 'heading' },
  { key: 'lateseason23', label: "Days to Heading (2023 Late)", unit: 'days', category: 'heading' },
  { key: 'culmLength', label: 'Culm Length', unit: 'cm', category: 'morphology' },
  { key: 'panicleLength', label: 'Panicle Length', unit: 'cm', category: 'morphology' },
  { key: 'panicleNumber', label: 'Panicle Number', unit: '', category: 'morphology' },
  { key: 'spikeletsPerPanicle', label: 'Spikelets per Panicle', unit: '', category: 'yield' },
  { key: 'ripeningRate', label: 'Ripening Rate', unit: '%', category: 'yield' },
  { key: 'grainWeight1000', label: '1,000-Grain Weight', unit: 'g', category: 'yield' },
  { key: 'preHarvestSprouting', label: 'Pre-harvest Sprouting', unit: '%', category: 'quality' },
  { key: 'bacterialLeafBlight', label: 'Bacterial Leaf Blight', unit: '', category: 'resistance' },
];

export function getNumericValue(record: PhenotypeRecord, key: string): number | null {
  if (key.includes('season')) {
    return record.daysToHeading[key as keyof typeof record.daysToHeading] ?? null;
  }
  return record[key as keyof Omit<PhenotypeRecord, 'cultivar' | 'daysToHeading'>] ?? null;
}

export function computeDatasetSummary(records: PhenotypeRecord[]): PhenotypeDatasetSummary {
  const fieldSummaries: PhenotypeFieldSummary[] = PHENOTYPE_FIELDS.map((field) => {
    const values = records
      .map((r) => getNumericValue(r, field.key))
      .filter((v): v is number => v !== null && !isNaN(v));

    const validCount = values.length;
    const missingCount = records.length - validCount;
    const min = validCount > 0 ? Math.min(...values) : 0;
    const max = validCount > 0 ? Math.max(...values) : 0;
    const mean = validCount > 0 ? values.reduce((a, b) => a + b, 0) / validCount : 0;
    const variance = validCount > 0
      ? values.reduce((acc, v) => acc + (v - mean) ** 2, 0) / validCount
      : 0;
    const stdDev = Math.sqrt(variance);

    return { field, validCount, missingCount, min, max, mean, stdDev };
  });

  const totalCells = records.length * PHENOTYPE_FIELDS.length;
  const totalMissing = fieldSummaries.reduce((acc, s) => acc + s.missingCount, 0);

  // heading 5개를 1개 그룹으로 묶어 표현형 항목 수 계산
  const nonHeadingCount = PHENOTYPE_FIELDS.filter((f) => f.category !== 'heading').length;
  const totalFields = nonHeadingCount + 1; // +1 for 출수일 group

  return {
    totalCultivars: records.length,
    totalFields,
    missingRate: totalCells > 0 ? totalMissing / totalCells : 0,
    fieldSummaries,
  };
}

export function formatValue(value: number | null, unit: string): string {
  if (value === null || isNaN(value)) return '-';
  return `${value.toFixed(1)} ${unit}`;
}
