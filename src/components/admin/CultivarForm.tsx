import { useState } from 'react';
import type { CultivarForm as CultivarFormType } from '@/types/cultivar';
import { emptyCultivarForm } from '@/lib/cultivar-helpers';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface Props {
  initial?: CultivarFormType;
  isEdit?: boolean;
  onSubmit: (data: CultivarFormType) => Promise<void>;
  onCancel: () => void;
}

export function CultivarForm({ initial, isEdit, onSubmit, onCancel }: Props) {
  const [form, setForm] = useState<CultivarFormType>(initial ?? emptyCultivarForm());
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function setNum(path: string, value: string) {
    const num = value === '' ? null : Number(value);
    setForm((prev) => {
      const next = structuredClone(prev);
      const keys = path.split('.');
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let obj: any = next;
      for (let i = 0; i < keys.length - 1; i++) obj = obj[keys[i]];
      obj[keys[keys.length - 1]] = num;
      return next;
    });
  }

  function setBool(path: string, value: boolean) {
    setForm((prev) => {
      const next = structuredClone(prev);
      const keys = path.split('.');
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let obj: any = next;
      for (let i = 0; i < keys.length - 1; i++) obj = obj[keys[i]];
      obj[keys[keys.length - 1]] = value;
      return next;
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) {
      setError('Name is required');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await onSubmit(form);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded">{error}</p>
      )}

      {/* 기본 정보 */}
      <Section title="Basic Info">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Cultivar Name</label>
            <Input
              className="mt-1"
              value={form.name}
              onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
              disabled={isEdit}
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Cross Information</label>
            <Input
              className="mt-1"
              value={form.crossInformation}
              onChange={(e) => setForm((p) => ({ ...p, crossInformation: e.target.value }))}
              placeholder="e.g. Koshihikari mutant(EMS)"
            />
          </div>
        </div>
      </Section>

      {/* 출수일수 */}
      <Section title="Days to Heading">
        <div className="grid grid-cols-3 gap-4">
          <NumInput label="Early" value={form.daysToHeading.early} onChange={(v) => setNum('daysToHeading.early', v)} />
          <NumInput label="Normal" value={form.daysToHeading.normal} onChange={(v) => setNum('daysToHeading.normal', v)} />
          <NumInput label="Late" value={form.daysToHeading.late} onChange={(v) => setNum('daysToHeading.late', v)} />
        </div>
      </Section>

      {/* 형태 */}
      <Section title="Morphology">
        <div className="grid grid-cols-3 gap-4">
          <NumInput label="Culm Length (cm)" value={form.morphology.culmLength} onChange={(v) => setNum('morphology.culmLength', v)} />
          <NumInput label="Panicle Length (cm)" value={form.morphology.panicleLength} onChange={(v) => setNum('morphology.panicleLength', v)} />
          <NumInput label="Panicle Number" value={form.morphology.panicleNumber} onChange={(v) => setNum('morphology.panicleNumber', v)} />
        </div>
      </Section>

      {/* 수량 */}
      <Section title="Yield">
        <div className="grid grid-cols-2 gap-4">
          <NumInput label="Spikelets/Panicle" value={form.yield.spikeletsPerPanicle} onChange={(v) => setNum('yield.spikeletsPerPanicle', v)} />
          <NumInput label="Ripening Rate (%)" value={form.yield.ripeningRate} onChange={(v) => setNum('yield.ripeningRate', v)} />
        </div>
      </Section>

      {/* 품질 */}
      <Section title="Quality">
        <div className="grid grid-cols-2 gap-4">
          <NumInput label="1000-Grain Weight (g)" value={form.quality.grainWeight} onChange={(v) => setNum('quality.grainWeight', v)} />
          <NumInput label="Pre-harvest Sprouting" value={form.quality.preHarvestSprouting} onChange={(v) => setNum('quality.preHarvestSprouting', v)} />
        </div>
      </Section>

      {/* 저항성 */}
      <Section title="Resistance (Bacterial Leaf Blight)">
        <div className="flex gap-6">
          {(['k1', 'k2', 'k3', 'k3a'] as const).map((k) => (
            <label key={k} className="flex items-center gap-1.5 text-sm">
              {/* raw: shadcn Checkbox primitive not installed (Phase 5 follow-up). */}
              <input
                type="checkbox"
                checked={form.resistance.bacterialLeafBlight[k] ?? false}
                onChange={(e) => setBool(`resistance.bacterialLeafBlight.${k}`, e.target.checked)}
                className="rounded border-gray-300 text-green-600 focus:ring-green-500"
              />
              {k.toUpperCase()}
            </label>
          ))}
        </div>
      </Section>

      {/* Actions */}
      <div className="flex gap-3 pt-2">
        <Button type="submit" size="lg" disabled={submitting}>
          {submitting ? 'Saving…' : isEdit ? 'Update' : 'Add'}
        </Button>
        <Button type="button" variant="outline" size="lg" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </form>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <fieldset className="space-y-3">
      <legend className="text-sm font-semibold text-gray-900 border-b pb-1 w-full">{title}</legend>
      {children}
    </fieldset>
  );
}

function NumInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number | null;
  onChange: (v: string) => void;
}) {
  return (
    <div>
      <label className="block text-xs text-gray-600 mb-1">{label}</label>
      <Input
        type="number"
        step="any"
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}
