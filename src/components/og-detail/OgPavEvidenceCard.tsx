import { ScopeStrip } from '@/components/common/ScopeStrip';
import {
  summarizePav,
  type PavClass,
  type PavPerCultivar,
} from '@/lib/pav-evidence';

interface Props {
  rows: PavPerCultivar[];
  cultivarNameMap: Record<string, string>;
}

const CLASS_CHIP: Record<PavClass, { label: string; className: string }> = {
  present: {
    label: 'present',
    className: 'border-green-200 bg-green-50 text-green-700',
  },
  duplicated: {
    label: 'duplicated',
    className: 'border-violet-200 bg-violet-50 text-violet-700',
  },
  'absent-evidence-pending': {
    label: '— (annotation only)',
    className: 'border-gray-200 bg-gray-50 text-gray-500',
  },
};

export function OgPavEvidenceCard({ rows, cultivarNameMap }: Props) {
  if (rows.length === 0) return null;
  const summary = summarizePav(rows);

  return (
    <section className="rounded-lg border border-gray-200 bg-white px-4 py-3 space-y-2">
      <div className="flex items-baseline justify-between gap-2 flex-wrap">
        <h3 className="text-sm font-semibold text-gray-900">
          PAV evidence
          <span className="ml-2 text-[10px] uppercase tracking-wide text-gray-500">
            annotation only · not validation-grade
          </span>
        </h3>
        <div className="flex gap-3 text-[11px] text-gray-600 tabular-nums">
          <span>
            present <strong className="text-gray-900">{summary.present}</strong>
          </span>
          <span>
            duplicated <strong className="text-gray-900">{summary.duplicated}</strong>
          </span>
          <span>
            absent (evidence pending){' '}
            <strong className="text-gray-900">
              {summary.absentEvidencePending}
            </strong>
          </span>
          <span className="text-gray-400">/ {summary.total}</span>
        </div>
      </div>

      <ScopeStrip>
        Classes derived from annotation counts only. Absent rows may
        reflect annotation gaps rather than biological absence —
        resolving that requires synteny and gene-model evidence
        (deferred). See <code>docs/product-specs/scope.md</code>.
      </ScopeStrip>

      <div className="flex flex-wrap gap-1.5 pt-1">
        {rows.map((r) => {
          const chip = CLASS_CHIP[r.pavClass];
          const name = cultivarNameMap[r.cultivar] ?? r.cultivar;
          const tooltip =
            r.geneIds.length > 0
              ? `${r.geneCount} gene${r.geneCount > 1 ? 's' : ''}: ${r.geneIds.join(', ')}`
              : 'no OG member annotated in this cultivar GFF3';
          return (
            <span
              key={r.cultivar}
              title={tooltip}
              className={`text-[11px] inline-flex items-center gap-1 px-2 py-0.5 rounded border ${chip.className}`}
            >
              <span className="font-mono text-[10px]">{name}</span>
              <span className="opacity-60">·</span>
              <span>{chip.label}</span>
              {r.geneCount > 1 && (
                <span className="opacity-70 tabular-nums">×{r.geneCount}</span>
              )}
            </span>
          );
        })}
      </div>
    </section>
  );
}
