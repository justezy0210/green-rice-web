const METADATA_ONLY_ROWS = [
  ['Cultivar name', 'identity record'],
  ['Basic description', 'static text'],
  ['Trait value table', 'separate data'],
] as const;
const CONNECTED_REVIEW_ROWS = [
  ['Genome context', 'assembly-level region and gene model view'],
  ['Gene family context', 'gene family and copy-pattern review'],
  ['Variant context', 'structural variant carrier review'],
] as const;
const DATA_SCOPE_CARDS = [
  ['Cultivar panel', '11 cultivars', 'Korean rice cultivar metadata'],
  ['Phenotype', '9 traits', 'Agronomic and disease-related trait values'],
  ['Assembly', '11 cultivars', 'Per-cultivar de novo genome assembly'],
  ['Gene annotation', '507,926 gene records', 'Gene models and functional annotation'],
  ['Gene families', '53,539 groups', 'Related genes grouped across cultivars'],
  ['Structural variants', '18,822 variant events', 'Large variants detected across cultivar assemblies'],
  ['Discovery evidence', '4,067 trait-hit gene families', 'Gene family, variant, and trait-group evidence'],
] as const;
const PROJECT_STEPS = [
  ['Assembly + annotation', 'Per-cultivar gene models'],
  ['Gene family matrix', 'Related genes and copy counts'],
  ['Structural variant layer', 'Variant events and carrier cultivars'],
  ['Phenotype overlay', 'Trait-group context for review'],
] as const;
const ENTITY_ROWS = [
  ['Cultivar', 'phenotype and assembly context'],
  ['Gene', 'annotation and local model'],
  ['Gene family', 'presence and copy pattern'],
  ['Structural variant', 'type, position, carrier cultivars'],
  ['Region', 'gene model and nearby variant context'],
  ['Discovery candidate', 'gene, variant, and trait evidence for review'],
] as const;

export function PangenomeOverviewFigure() {
  return (
    <figure className="rounded-lg border border-gray-200 bg-white p-3 md:p-4">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-[minmax(0,0.82fr)_minmax(0,1.18fr)]">
        <div className="rounded-md border border-gray-200 bg-gray-50 p-3 md:p-4">
          <div className="text-[11px] font-medium uppercase text-gray-500">Not only</div>
          <div className="mt-1 text-lg font-semibold text-gray-900">A static cultivar page</div>
          <div className="mt-4 space-y-2">
            {METADATA_ONLY_ROWS.map(([label, detail]) => (
              <div key={label} className="rounded border border-gray-200 bg-white px-3 py-2">
                <div className="text-sm font-medium text-gray-800">{label}</div>
                <div className="mt-0.5 text-xs text-gray-500">{detail}</div>
              </div>
            ))}
          </div>
          <div className="mt-4 rounded border border-dashed border-gray-300 bg-white px-3 py-2 text-xs leading-relaxed text-gray-500">
            Useful, but each information type remains isolated.
          </div>
        </div>

        <div className="rounded-md border border-green-200 bg-green-50/70 p-3 md:p-4">
          <div className="text-[11px] font-medium uppercase text-green-700">Green Rice DB</div>
          <div className="mt-1 text-xl font-semibold text-gray-900">Connected pangenome review database</div>

          <div className="mt-5 grid grid-cols-1 gap-2 sm:grid-cols-3">
            {CONNECTED_REVIEW_ROWS.map(([label, detail]) => (
              <div key={label} className="rounded border border-green-200 bg-white px-3 py-2">
                <div className="text-sm font-semibold text-gray-900">{label}</div>
                <div className="mt-1 text-xs leading-snug text-gray-600">{detail}</div>
              </div>
            ))}
          </div>

          <div className="mt-5 grid grid-cols-1 items-center gap-2 sm:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] sm:gap-3">
            <div className="rounded border border-green-200 bg-white px-3 py-2 text-xs leading-relaxed text-gray-700">
              cultivar-level diversity
            </div>
            <span className="hidden font-mono text-xs sm:block">→</span>
            <div className="rounded border border-green-200 bg-white px-3 py-2 text-xs leading-relaxed text-gray-700">
              candidate gene and variant evidence
            </div>
          </div>

          <div className="mt-4 rounded border border-amber-200 bg-amber-50 px-3 py-2 text-xs leading-relaxed text-amber-900">
            Evidence is connected for review; it is not presented as final causal proof.
          </div>
        </div>
      </div>
      <figcaption className="mt-3 text-[11px] leading-relaxed text-gray-500">
        Green Rice DB is designed as a connected review system, not as a simple
        cultivar metadata page.
      </figcaption>
    </figure>
  );
}

export function ReferenceBiasFigure() {
  return (
    <figure className="rounded-lg border border-gray-200 bg-white p-3 md:p-4">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="rounded-md border border-gray-200 bg-gray-50 p-3 md:p-4">
          <FigureTitle label="Reference-mapping" title="One coordinate system" />
          <svg
            role="img"
            aria-labelledby="reference-mapping-title"
            className="mt-5 h-auto w-full rounded border border-gray-200 bg-white"
            viewBox="0 0 560 300"
          >
            <title id="reference-mapping-title">
              Reference mapping leaves reference-missing sequence unmapped
            </title>
            <rect x="16" y="16" width="528" height="268" rx="14" fill="#f9fafb" />

            <text x="44" y="48" fill="#6b7280" fontSize="13" fontWeight="600">
              mapped reads
            </text>
            <rect x="58" y="72" width="126" height="8" rx="4" fill="#4b5563" />
            <rect x="204" y="92" width="142" height="8" rx="4" fill="#4b5563" />
            <rect x="96" y="112" width="104" height="8" rx="4" fill="#4b5563" />
            <rect x="284" y="120" width="92" height="8" rx="4" fill="#4b5563" />

            <rect x="52" y="166" width="330" height="14" rx="7" fill="#d1d5db" />
            <text x="52" y="202" fill="#6b7280" fontSize="13">
              reference
            </text>
            <circle cx="150" cy="173" r="5" fill="#ef4444" stroke="#ffffff" strokeWidth="3" />
            <circle cx="292" cy="173" r="5" fill="#ef4444" stroke="#ffffff" strokeWidth="3" />

            <g>
              <rect x="420" y="82" width="98" height="14" rx="7" fill="#fbbf24" />
              <rect x="456" y="82" width="24" height="14" rx="5" fill="#f59e0b" />
              <text x="420" y="118" fill="#92400e" fontSize="13" fontWeight="600">
                unmapped
              </text>
            </g>

            <path
              d="M 418 100 C 392 118 379 145 365 169"
              fill="none"
              stroke="#f59e0b"
              strokeDasharray="7 6"
              strokeLinecap="round"
              strokeWidth="2"
            />
            <g transform="translate(356 156)">
              <circle cx="10" cy="10" r="10" fill="#ffffff" stroke="#f59e0b" strokeWidth="2" />
              <path d="M 6 6 L 14 14 M 14 6 L 6 14" stroke="#92400e" strokeLinecap="round" strokeWidth="2" />
            </g>
          </svg>
          <p className="mt-2 text-[11px] leading-relaxed text-gray-500">
            Sequence absent from the reference has no coordinate to map onto, so it
            can be missed in a reference-mapping view.
          </p>
        </div>

        <div className="rounded-md border border-green-200 bg-green-50/60 p-3 md:p-4">
          <FigureTitle label="Assembly-based pangenome" title="Multiple cultivar paths" />
          <div className="mt-5 space-y-4">
            {['Cultivar A', 'Cultivar B', 'Cultivar C', 'Cultivar D'].map((name, index) => (
              <div key={name} className="grid grid-cols-[72px_minmax(0,1fr)] items-center gap-2">
                <span className="truncate text-[11px] text-gray-500">{name}</span>
                <div className="flex items-center gap-1">
                  <span className="h-3 flex-1 bg-green-700" />
                  {index !== 2 && <span className="h-3 w-9 bg-amber-500" />}
                  <span className="h-3 flex-1 bg-green-700" />
                  {index === 1 && <span className="h-3 w-12 bg-red-400" />}
                </div>
              </div>
            ))}
          </div>
          <p className="mt-5 text-xs leading-relaxed text-gray-700">
            Cultivar-specific sequence, gene presence or absence, and larger structural
            changes remain visible for manual review.
          </p>
        </div>
      </div>
      <figcaption className="mt-3 text-[11px] leading-relaxed text-gray-500">
        Assembly-level data helps represent variation that can be compressed or missed
        when all evidence is projected onto one reference genome.
      </figcaption>
    </figure>
  );
}

export function DataScopeFigure() {
  return (
    <figure className="rounded-lg border border-gray-200 bg-white p-2.5 md:p-3">
      <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2 xl:grid-cols-3">
        {DATA_SCOPE_CARDS.map(([layer, scope, content], index) => (
          <div
            key={layer}
            className={`flex flex-col justify-between rounded-md border px-3 py-2 ${
              index === DATA_SCOPE_CARDS.length - 1
                ? 'border-green-200 bg-green-50/60 xl:col-span-3'
                : 'border-gray-200 bg-white'
            }`}
          >
            <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between sm:gap-3">
              <div className="text-sm font-semibold text-gray-900">{layer}</div>
              <div className="font-mono text-[11px] leading-snug break-words text-gray-700 sm:max-w-[52%] sm:text-right">
                {scope}
              </div>
            </div>
            <p className="pt-2 text-xs leading-snug text-gray-600">{content}</p>
          </div>
        ))}
      </div>
      <figcaption className="mt-2.5 text-[11px] leading-relaxed text-gray-500">
        Current release scope is fixed to 11 Korean rice cultivars for this database view.
      </figcaption>
    </figure>
  );
}

export function ProjectObjectiveFigure() {
  return (
    <figure className="rounded-lg border border-gray-200 bg-white p-3 md:p-4">
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        {PROJECT_STEPS.map(([title, detail], index) => (
          <div key={title} className="rounded border border-gray-200 bg-gray-50 p-3">
            <div className="text-[11px] font-mono text-green-700">0{index + 1}</div>
            <h3 className="mt-1 text-sm font-semibold text-gray-900">{title}</h3>
            <p className="mt-2 text-xs leading-relaxed text-gray-600">{detail}</p>
          </div>
        ))}
      </div>
      <div className="mt-4 grid grid-cols-1 items-center gap-2 sm:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] sm:gap-3">
        <div className="rounded border border-green-200 bg-green-50 px-3 py-2 text-xs text-gray-700">
          Candidate gene and variant evidence
        </div>
        <div className="hidden font-mono text-xs text-gray-400 sm:block">→</div>
        <div className="rounded border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
          Follow-up validation needed
        </div>
      </div>
      <figcaption className="mt-3 text-[11px] leading-relaxed text-gray-500">
        The project links assemblies, gene families, structural variants, and
        phenotype groups to support candidate prioritization.
      </figcaption>
    </figure>
  );
}

export function EntityArchitectureFigure() {
  return (
    <figure className="rounded-lg border border-gray-200 bg-white p-3 md:p-4">
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {ENTITY_ROWS.map(([entity, detail]) => (
          <div key={entity} className="rounded border border-gray-200 bg-gray-50 px-3 py-2">
            <div className="text-sm font-semibold text-gray-900">{entity}</div>
            <div className="mt-1 text-xs leading-snug text-gray-500">{detail}</div>
          </div>
        ))}
      </div>
      <div className="mt-4 rounded border border-green-200 bg-green-50 px-3 py-2 text-xs leading-relaxed text-gray-700">
        Users can move between entities and compare multiple evidence layers before
        deciding whether a candidate needs deeper validation.
      </div>
      <figcaption className="mt-3 text-[11px] leading-relaxed text-gray-500">
        The database is organized as an entity-centered review system rather than a
        trait-first answer portal.
      </figcaption>
    </figure>
  );
}

function FigureTitle({ label, title }: { label: string; title: string }) {
  return (
    <div>
      <div className="text-[11px] font-medium uppercase text-gray-500">{label}</div>
      <h3 className="mt-1 text-base font-semibold text-gray-900">{title}</h3>
    </div>
  );
}
