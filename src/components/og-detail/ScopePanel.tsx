import { useState } from 'react';
import { PANEL_LABEL } from '@/config/panel';

/**
 * Persistent "what this page can / cannot tell you" scope panel for OG Detail.
 * Always-visible 4-bullet summary above a collapsible detail section.
 * CANNOT claims first (per scope.md red-flag ordering).
 */
export function ScopePanel() {
  const [open, setOpen] = useState(false);
  return (
    <div className="border border-gray-200 rounded-lg bg-white">
      <ul className="flex flex-wrap items-center gap-x-4 gap-y-1 px-4 py-2 text-[11px] text-gray-600">
        <li><span className="text-gray-400">⊘</span> Not causal</li>
        <li><span className="text-gray-400">⊘</span> Not marker-ready</li>
        <li><span className="text-gray-400">⊘</span> {PANEL_LABEL.panelSize} panel only</li>
        <li><span className="text-gray-400">⊘</span> Phenotype grouping is proposed (GMM), not truth</li>
      </ul>
    <details
      className="border-t border-gray-100"
      open={open}
      onToggle={(e) => setOpen((e.target as HTMLDetailsElement).open)}
    >
      <summary className="px-4 py-2 text-xs text-gray-600 cursor-pointer select-none list-none flex items-center gap-2">
        <span className="text-gray-400">{open ? '▾' : '▸'}</span>
        <span className="font-medium">What this page can tell you · next recommended checks</span>
        <span className="ml-auto text-[10px] text-gray-400">(click to expand)</span>
      </summary>
      <div className="px-4 py-3 border-t border-gray-100 text-[11px] text-gray-600 leading-relaxed space-y-3">
        <section>
          <h4 className="font-medium text-gray-700 mb-1">What this page CAN tell you</h4>
          <ul className="list-disc list-outside ml-4 space-y-0.5 text-gray-600">
            <li>Trait groups that differ by copy count / AF / graph context at this OG</li>
            <li>Annotated OG-member positions across the {PANEL_LABEL.panelSizeFull}</li>
            <li>Cluster-derived lifted IRGSP region and the variants observed there</li>
            <li>Panel-scoped evidence for prioritizing this OG as a follow-up candidate</li>
          </ul>
        </section>
        <section>
          <h4 className="font-medium text-gray-700 mb-1">Next recommended checks (for your own lab)</h4>
          <ul className="list-disc list-outside ml-4 space-y-0.5 text-gray-600">
            <li>Reference CDS → cultivar-assembly reverse search (BLAST / minimap2) to separate annotation gaps from true absences</li>
            <li>ORF integrity inspection at the candidate locus per cultivar of interest</li>
            <li>Promoter / 5′ UTR / upstream variant scan (beyond the default gene-body window)</li>
            <li>Expression validation (RNA-seq / qPCR) if available</li>
            <li>Wider-panel genotyping before reading this as a population-level claim</li>
          </ul>
        </section>
        <section className="text-gray-500">
          See <code>docs/product-specs/scope.md</code> for the full CAN/CANNOT list. The four tags above summarise the CANNOT claims.
        </section>
      </div>
    </details>
    </div>
  );
}
