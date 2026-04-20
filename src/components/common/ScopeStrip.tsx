import type { ReactNode } from 'react';

type Tone = 'neutral' | 'warn' | 'hold';

interface Props {
  children: ReactNode;
  tone?: Tone;
}

const TONE_CLASS: Record<Tone, string> = {
  neutral: 'bg-gray-50 border-gray-200 text-gray-600',
  warn: 'bg-amber-50 border-amber-200 text-amber-800',
  hold: 'bg-gray-100 border-gray-300 text-gray-700',
};

/**
 * Inline scope/inference notice. Used per-panel to make the analytical
 * unit explicit (OG-level vs locus-level vs candidate-level) without
 * relying on a collapsed help block that users never open.
 */
export function ScopeStrip({ children, tone = 'neutral' }: Props) {
  return (
    <p
      className={`text-[11px] leading-relaxed rounded border px-3 py-1.5 ${TONE_CLASS[tone]}`}
    >
      {children}
    </p>
  );
}
