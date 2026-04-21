import type {
  CopyArchitecture,
  CoreShellClass,
} from '@/lib/og-copy-architecture';

interface Props {
  architecture: CopyArchitecture;
}

const CLASS_STYLE: Record<CoreShellClass, string> = {
  core: 'border-green-300 bg-green-100 text-green-800',
  'soft-core': 'border-emerald-200 bg-emerald-50 text-emerald-700',
  shell: 'border-amber-200 bg-amber-50 text-amber-800',
  private: 'border-violet-200 bg-violet-50 text-violet-700',
  absent: 'border-gray-200 bg-gray-50 text-gray-500',
};

const CLASS_LABEL: Record<CoreShellClass, string> = {
  core: 'core',
  'soft-core': 'soft-core',
  shell: 'shell',
  private: 'private',
  absent: 'absent',
};

export function OgCoreShellBadge({ architecture }: Props) {
  const tip =
    `Panel-scoped: ${architecture.present}/${architecture.panelSize} cultivars present. ` +
    `${architecture.architectureLabel}. ` +
    `Not a biological validation — annotation-based count only.`;
  return (
    <span
      title={tip}
      className={`text-[10px] inline-flex items-center gap-1 px-2 py-0.5 rounded border ${CLASS_STYLE[architecture.coreClass]}`}
    >
      <span className="uppercase tracking-wide font-semibold">
        {CLASS_LABEL[architecture.coreClass]}
      </span>
      <span className="opacity-70 tabular-nums">
        {architecture.present}/{architecture.panelSize}
      </span>
    </span>
  );
}
