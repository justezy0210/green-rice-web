import { useEffect, useRef } from 'react';

interface Props {
  ogId: string;
  onClose: () => void;
}

export function OgDrawerHeader({ ogId, onClose }: Props) {
  const closeBtnRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    closeBtnRef.current?.focus();
  }, []);

  return (
    <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3">
      <h2 id="og-drawer-title" className="font-mono text-base font-semibold text-gray-900">
        {ogId}
      </h2>
      <button
        ref={closeBtnRef}
        type="button"
        onClick={onClose}
        aria-label="Close drawer"
        className="text-gray-500 hover:text-gray-700 text-xl leading-none px-2 py-1 rounded hover:bg-gray-100"
      >
        ×
      </button>
    </div>
  );
}
