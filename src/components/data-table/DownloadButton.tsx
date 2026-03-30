import type { PhenotypeRecord } from '@/types/phenotype';
import { PHENOTYPE_FIELDS, getNumericValue } from '@/lib/utils';

interface DownloadButtonProps {
  records: PhenotypeRecord[];
  filename?: string;
}

export function DownloadButton({ records, filename = 'phenotype_data' }: DownloadButtonProps) {
  function handleDownload() {
    const headers = ['Cultivar', ...PHENOTYPE_FIELDS.map((f) => `${f.label} (${f.unit})`)];
    const rows = records.map((r) => [
      r.cultivar,
      ...PHENOTYPE_FIELDS.map((f) => {
        const v = getNumericValue(r, f.key);
        return v !== null ? String(v) : '';
      }),
    ]);

    const csv = [headers, ...rows].map((row) => row.join(',')).join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${filename}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <button
      onClick={handleDownload}
      className="px-3 py-1.5 text-sm bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
    >
      Download CSV
    </button>
  );
}
