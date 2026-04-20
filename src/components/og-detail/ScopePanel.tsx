import { useState } from 'react';
import { PANEL_LABEL } from '@/config/panel';

/**
 * Compact scope note for OG Detail. Always-visible line is a single
 * neutral sentence; the expandable section carries the full CAN/CANNOT
 * breakdown and next-step suggestions for anyone who wants the detail.
 *
 * Previous version led with a 4-bullet CANNOT list in amber/gray. That
 * read as an apology rather than a tool — compressed here.
 */
export function ScopePanel() {
  const [open, setOpen] = useState(false);
  return (
    <details
      className="border border-gray-200 rounded-lg bg-white text-[11px] text-gray-600"
      open={open}
      onToggle={(e) => setOpen((e.target as HTMLDetailsElement).open)}
    >
      <summary className="px-4 py-2 cursor-pointer select-none list-none flex items-center gap-2">
        <span className="text-gray-400">{open ? '▾' : '▸'}</span>
        <span>
          Scope: {PANEL_LABEL.panelSize} panel · proposed phenotype
          grouping (GMM)
        </span>
        <span className="ml-auto text-[10px] text-gray-400">
          what this page can / cannot tell you
        </span>
      </summary>
      <div className="px-4 py-3 border-t border-gray-100 leading-relaxed space-y-3">
        <section>
          <h4 className="font-medium text-gray-700 mb-1">What this page CAN tell you</h4>
          <ul className="list-disc list-outside ml-4 space-y-0.5">
            <li>Trait groups that differ by copy count / AF / graph context at this OG</li>
            <li>Annotated OG-member positions across the {PANEL_LABEL.panelSizeFull}</li>
            <li>Cluster-derived lifted IRGSP region and the variants observed there</li>
            <li>Panel-scoped evidence for prioritizing this OG as a follow-up candidate</li>
          </ul>
        </section>
        <section>
          <h4 className="font-medium text-gray-700 mb-1">Next recommended checks (for your own lab)</h4>
          <ul className="list-disc list-outside ml-4 space-y-0.5">
            <li>Reference CDS → cultivar-assembly reverse search (BLAST / minimap2) to separate annotation gaps from true absences</li>
            <li>ORF integrity inspection at the candidate locus per cultivar of interest</li>
            <li>Promoter / 5′ UTR / upstream variant scan (beyond the default gene-body window)</li>
            <li>Expression validation (RNA-seq / qPCR) if available</li>
            <li>Wider-panel genotyping before reading this as a population-level claim</li>
          </ul>
        </section>
        <section className="text-gray-500">
          See <code>docs/product-specs/scope.md</code> for the full
          framing. Short form: results are candidate-level evidence,
          not causal claims or marker-ready outputs.
        </section>
      </div>
    </details>
  );
}
