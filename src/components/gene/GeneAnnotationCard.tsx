import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { GeneAnnotation } from '@/types/gene-model';

interface Props {
  annotation: GeneAnnotation;
}

export function GeneAnnotationCard({ annotation }: Props) {
  const hasAny =
    annotation.product ||
    (annotation.go && annotation.go.length > 0) ||
    (annotation.pfam && annotation.pfam.length > 0) ||
    (annotation.interpro && annotation.interpro.length > 0) ||
    annotation.cog ||
    annotation.eggnog;
  if (!hasAny) return null;
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Functional annotation</CardTitle>
      </CardHeader>
      <CardContent className="text-sm space-y-2">
        {annotation.product && (
          <Row label="Product">
            <span className="text-gray-800">{annotation.product}</span>
          </Row>
        )}
        {annotation.go && annotation.go.length > 0 && (
          <Row label="GO">
            <ChipList items={annotation.go} />
          </Row>
        )}
        {annotation.pfam && annotation.pfam.length > 0 && (
          <Row label="Pfam">
            <ChipList items={annotation.pfam} />
          </Row>
        )}
        {annotation.interpro && annotation.interpro.length > 0 && (
          <Row label="InterPro">
            <ChipList items={annotation.interpro} />
          </Row>
        )}
        {(annotation.cog || annotation.eggnog) && (
          <Row label="EggNOG / COG">
            <span className="font-mono text-[11px] text-gray-600">
              {annotation.eggnog ?? ''}
              {annotation.eggnog && annotation.cog ? ' · COG ' : ''}
              {annotation.cog ?? ''}
            </span>
          </Row>
        )}
      </CardContent>
    </Card>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-3">
      <span className="text-[10px] uppercase tracking-wide text-gray-500 w-20 pt-0.5 shrink-0">
        {label}
      </span>
      <div className="flex-1">{children}</div>
    </div>
  );
}

function ChipList({ items }: { items: string[] }) {
  return (
    <div className="flex flex-wrap gap-1">
      {items.map((x) => (
        <span
          key={x}
          className="text-[10px] font-mono px-1.5 py-0.5 rounded border border-gray-200 bg-gray-50 text-gray-600"
        >
          {x}
        </span>
      ))}
    </div>
  );
}

export function LegendSwatch({
  color,
  label,
  thin,
}: {
  color: string;
  label: string;
  thin?: boolean;
}) {
  return (
    <span className="inline-flex items-center gap-1">
      <span
        aria-hidden="true"
        className="inline-block"
        style={{
          width: 12,
          height: thin ? 2 : 10,
          background: color,
          borderRadius: 2,
        }}
      />
      {label}
    </span>
  );
}
