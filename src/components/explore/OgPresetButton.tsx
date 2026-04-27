interface Props {
  label: string;
  active: boolean;
  onClick: () => void;
  overlay?: boolean;
}

export function OgPresetButton({ label, active, onClick, overlay }: Props) {
  const baseColor = overlay
    ? 'border-amber-200 bg-amber-50 text-amber-800 hover:bg-amber-100'
    : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50';
  const activeColor = overlay
    ? 'border-amber-400 bg-amber-100 text-amber-900 font-medium'
    : 'border-green-400 bg-green-50 text-green-800 font-medium';
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded border px-2 py-1 text-[11px] ${active ? activeColor : baseColor}`}
    >
      {label}
    </button>
  );
}
