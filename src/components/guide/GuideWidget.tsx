import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import {
  BookOpenCheck,
  Compass,
  X,
} from 'lucide-react';
import { GUIDE_SCENARIOS, type GuideScenario } from '@/components/guide/guide-scenarios';
import { cn } from '@/lib/utils';

const STORAGE_KEY = 'green-rice-guide-seen';

export function GuideWidget() {
  const { pathname } = useLocation();
  const [open, setOpen] = useState(false);
  const [seen, setSeen] = useState(readGuideSeen);
  const [activeScenarioId, setActiveScenarioId] = useState(GUIDE_SCENARIOS[0].id);
  const activeScenario =
    GUIDE_SCENARIOS.find((scenario) => scenario.id === activeScenarioId) ?? GUIDE_SCENARIOS[0];

  useEffect(() => {
    if (!open) return undefined;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open]);

  if (pathname.startsWith('/admin') || pathname.startsWith('/login')) {
    return null;
  }

  const openGuide = () => {
    setOpen(true);
    setSeen(true);
    window.localStorage.setItem(STORAGE_KEY, 'true');
  };

  return (
    <div className="fixed bottom-4 right-4 z-50 sm:bottom-5 sm:right-5">
      {open ? (
        <aside
          className="w-[min(620px,calc(100vw-2rem))] overflow-hidden rounded-lg border border-gray-200 bg-white shadow-xl shadow-gray-900/10"
          aria-label="Green Rice DB guide"
        >
          <header className="flex items-start justify-between gap-3 border-b border-gray-100 px-4 py-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2 text-sm font-semibold text-gray-950">
                <Compass className="size-4 text-green-700" aria-hidden />
                Guide
              </div>
              <p className="mt-1 text-xs leading-relaxed text-gray-500">
                Start from a real question and follow one example workflow.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-md p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
              aria-label="Close guide"
            >
              <X className="size-4" aria-hidden />
            </button>
          </header>

          <div className="border-b border-gray-100 bg-gray-50 px-3 py-2">
            <div className="flex gap-1 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {GUIDE_SCENARIOS.map((scenario) => (
                <ScenarioTab
                  key={scenario.id}
                  scenario={scenario}
                  active={scenario.id === activeScenario.id}
                  onSelect={() => setActiveScenarioId(scenario.id)}
                />
              ))}
            </div>
          </div>

          <div className="max-h-[min(680px,calc(100vh-12rem))] overflow-y-auto p-4">
            <ScenarioGuide scenario={activeScenario} />
          </div>
        </aside>
      ) : (
        <button
          type="button"
          onClick={openGuide}
          className="group relative inline-flex h-10 items-center gap-2 rounded-lg border border-green-700 bg-green-700 px-3 text-sm font-medium text-white shadow-lg shadow-gray-900/15 transition-colors hover:bg-green-800 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-green-600/30"
        >
          <BookOpenCheck className="size-4" aria-hidden />
          Guide
          {!seen && (
            <span className="absolute -top-1 -right-1 size-2 rounded-full bg-amber-400 ring-2 ring-white" />
          )}
        </button>
      )}
    </div>
  );
}

function readGuideSeen() {
  if (typeof window === 'undefined') return true;
  return window.localStorage.getItem(STORAGE_KEY) === 'true';
}

function ScenarioTab({
  scenario,
  active,
  onSelect,
}: {
  scenario: GuideScenario;
  active: boolean;
  onSelect: () => void;
}) {
  const Icon = scenario.icon;
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        'flex h-8 shrink-0 items-center gap-1.5 rounded-md border px-2.5 text-xs font-medium transition-colors',
        active
          ? 'border-green-200 bg-white text-green-800 shadow-sm'
          : 'border-transparent text-gray-500 hover:bg-white hover:text-gray-900',
      )}
    >
      <Icon className="size-3.5" aria-hidden />
      {scenario.tabLabel}
    </button>
  );
}

function ScenarioGuide({ scenario }: { scenario: GuideScenario }) {
  const Icon = scenario.icon;
  return (
    <section className="space-y-4">
      <div className="flex items-start gap-3">
        <div className="flex size-9 shrink-0 items-center justify-center rounded-md border border-green-200 bg-green-50 text-green-700">
          <Icon className="size-5" aria-hidden />
        </div>
        <div className="min-w-0">
          <h3 className="text-base font-semibold text-gray-950">{scenario.title}</h3>
          <p className="mt-1 text-sm leading-relaxed text-gray-700">{scenario.question}</p>
          <p className="mt-2 text-xs leading-relaxed text-gray-500">{scenario.summary}</p>
        </div>
      </div>

      <div className="rounded-md border border-gray-200 bg-gray-50 p-3">
        <div className="text-[11px] font-medium uppercase tracking-wide text-gray-500">
          Workflow
        </div>
        <ol className="mt-3 space-y-2">
          {scenario.steps.map((step, index) => (
            <li key={step.label} className="grid grid-cols-[1.5rem_minmax(0,1fr)] gap-2">
              <span className="flex size-6 items-center justify-center rounded-full border border-gray-200 bg-white font-mono text-[10px] text-gray-600">
                {index + 1}
              </span>
              <div className="min-w-0 rounded border border-gray-200 bg-white px-3 py-2">
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                  <span className="text-sm font-semibold text-gray-900">{step.label}</span>
                </div>
                <p className="mt-1 text-xs leading-relaxed text-gray-600">{step.detail}</p>
                <div className="mt-2 grid grid-cols-1 gap-1.5 sm:grid-cols-2">
              <div className="rounded border border-gray-100 bg-gray-50 px-2 py-1.5">
                    <div className="text-[10px] font-medium uppercase tracking-wide text-gray-400">
                      Check
                    </div>
                    <p className="mt-0.5 text-[11px] leading-relaxed text-gray-600">
                      {step.inspect}
                    </p>
                  </div>
                  <div className="rounded border border-green-100 bg-green-50/60 px-2 py-1.5">
                    <div className="text-[10px] font-medium uppercase tracking-wide text-green-700">
                      You get
                    </div>
                    <p className="mt-0.5 text-[11px] leading-relaxed text-gray-700">
                      {step.result}
                    </p>
                  </div>
                </div>
              </div>
            </li>
          ))}
        </ol>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,0.9fr)]">
        <div className="rounded-md border border-gray-200 bg-white px-3 py-3">
          <div className="text-[11px] font-medium uppercase tracking-wide text-gray-500">
            What to watch
          </div>
          <ul className="mt-2 space-y-1.5 text-xs leading-relaxed text-gray-600">
            {scenario.notice.map((item) => (
              <li key={item} className="flex gap-2">
                <span className="mt-1 size-1.5 shrink-0 rounded-full bg-green-600" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-md border border-green-200 bg-green-50/60 px-3 py-3">
          <div className="text-[11px] font-medium uppercase tracking-wide text-green-700">
            Expected takeaway
          </div>
          <p className="mt-2 text-xs leading-relaxed text-gray-700">{scenario.outcome}</p>
        </div>
      </div>

      <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] leading-relaxed text-amber-900">
        Use these examples to learn the workflow. Discovery and SV evidence should
        be read as candidate review evidence, not causal proof.
      </div>
    </section>
  );
}
