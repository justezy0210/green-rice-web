import { useEffect, useState } from 'react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { GenomeSummary } from '@/types/genome';

export const GENOME_RADAR_LABELS = [
  'Total Size',
  'N50',
  'GC %',
  'Gene Count',
  'Avg Gene Length',
  'Repeat %',
];

export function extractGenomeValues(s: GenomeSummary): number[] {
  return [
    s.assembly.totalSize,
    s.assembly.n50,
    s.assembly.gcPercent,
    s.geneAnnotation.geneCount,
    s.geneAnnotation.avgGeneLength,
    s.repeatAnnotation.repeatPercent,
  ];
}

export function useGenomeAverages() {
  const [averages, setAverages] = useState<number[]>(GENOME_RADAR_LABELS.map(() => 0));
  const [count, setCount] = useState(0);

  useEffect(() => {
    const q = query(
      collection(db, 'cultivars'),
      where('genomeSummary.status', '==', 'complete'),
    );

    const unsub = onSnapshot(q, (snap) => {
      const summaries: GenomeSummary[] = [];
      snap.forEach((doc) => {
        const data = doc.data();
        if (data.genomeSummary) summaries.push(data.genomeSummary as GenomeSummary);
      });

      setCount(summaries.length);

      if (summaries.length === 0) {
        setAverages(GENOME_RADAR_LABELS.map(() => 0));
        return;
      }

      const all = summaries.map(extractGenomeValues);
      const avgs = GENOME_RADAR_LABELS.map((_, i) => {
        const vals = all.map((row) => row[i]);
        return vals.reduce((a, b) => a + b, 0) / vals.length;
      });
      setAverages(avgs);
    });

    return unsub;
  }, []);

  return { averages, count };
}
