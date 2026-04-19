import { useEffect, useMemo, useRef } from 'react';
import { Link } from 'react-router-dom';
import { OgDrawerHeader } from './OgDrawerHeader';
import { OgDrawerGroupSummary } from './OgDrawerGroupSummary';
import { buildGroupColorMap } from '@/components/dashboard/distribution-helpers';
import type {
  DiffEntriesState,
  OgAlleleFreqPayload,
  OrthogroupDiffDocument,
  OrthogroupDiffEntry,
} from '@/types/orthogroup';
import type { CultivarGroupAssignment } from '@/types/grouping';

interface Props {
  ogId: string | null;
  traitId: string | null;
  diffDoc: OrthogroupDiffDocument | null;
  entriesState: DiffEntriesState;
  alleleFreq: OgAlleleFreqPayload | null;
  groupByCultivar: Record<string, CultivarGroupAssignment> | null;
  onClose: () => void;
}

export function OgDrawer({
  ogId,
  traitId,
  diffDoc,
  entriesState,
  alleleFreq,
  groupByCultivar,
  onClose,
}: Props) {
  const open = !!ogId;
  const triggerRef = useRef<HTMLElement | null>(null);
  const drawerRef = useRef<HTMLDivElement>(null);

  // Scroll lock
  useEffect(() => {
    if (!open) return;
    triggerRef.current = (document.activeElement as HTMLElement | null) ?? null;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prevOverflow;
      const el = triggerRef.current;
      if (el && document.body.contains(el)) el.focus();
      else document.body.focus();
      triggerRef.current = null;
    };
  }, [open]);

  // ESC to close
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose();
      }
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  // Focus trap
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key !== 'Tab' || !drawerRef.current) return;
      const focusable = getFocusable(drawerRef.current);
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);

  const diffEntry: OrthogroupDiffEntry | undefined = useMemo(() => {
    if (!ogId) return undefined;
    if (entriesState.kind === 'ready') {
      return entriesState.payload.entries.find((e) => e.orthogroup === ogId);
    }
    if (entriesState.kind === 'legacy') {
      return entriesState.entries.find((e) => e.orthogroup === ogId);
    }
    return undefined;
  }, [entriesState, ogId]);

  const groupColorMap = useMemo(
    () => (groupByCultivar ? buildGroupColorMap(groupByCultivar) : {}),
    [groupByCultivar],
  );

  const rep = diffEntry?.representative;
  const primaryDesc = rep
    ? Object.values(rep.descriptions ?? {}).find((d) => d && d !== 'NA') ?? null
    : null;
  const afSummary = ogId ? alleleFreq?.ogs[ogId] ?? null : null;

  const detailUrl = ogId
    ? `/explore/og/${ogId}${traitId ? `?trait=${traitId}` : ''}`
    : '#';

  return (
    <>
      {open && (
        <div
          className="fixed top-0 left-0 w-screen h-screen bg-black/30 z-40 transition-opacity"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      <div
        ref={drawerRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="og-drawer-title"
        aria-hidden={!open}
        className={`fixed right-0 top-0 h-full w-full sm:w-[420px] bg-white shadow-xl z-50 flex flex-col transition-transform duration-200 ${
          open ? 'translate-x-0' : 'translate-x-full pointer-events-none'
        }`}
      >
        {ogId && (
          <>
            <OgDrawerHeader ogId={ogId} onClose={onClose} />

            <div className="flex-1 overflow-y-auto">
              {/* IRGSP representative */}
              <div className="px-4 py-3 border-b border-gray-100">
                {rep ? (
                  <div className="text-xs">
                    <span className="font-mono text-gray-500 text-[10px]">
                      {rep.transcripts?.[0] ?? ''}
                    </span>
                    {primaryDesc && (
                      <p className="text-gray-700 mt-0.5">{primaryDesc}</p>
                    )}
                    {!primaryDesc && (
                      <p className="text-gray-400 italic mt-0.5">No functional description</p>
                    )}
                  </div>
                ) : (
                  <p className="text-xs text-gray-400 italic">Non-IRGSP-linked orthogroup</p>
                )}
              </div>

              {/* Group summary */}
              {diffEntry && diffDoc && (
                <OgDrawerGroupSummary
                  entry={diffEntry}
                  groupLabels={diffDoc.groupLabels}
                  groupColorMap={groupColorMap}
                />
              )}

              {/* Evidence badges */}
              <div className="px-4 py-3 border-b border-gray-100 flex flex-wrap gap-2">
                <Badge label="AF" available={!!afSummary} detail={afSummary ? `${afSummary.totalVariants} var` : undefined} />
                <Badge label="Graph" available={false} />
                <Badge
                  label="Members"
                  available={!!diffEntry}
                  detail={diffEntry ? `${Object.keys(diffEntry.cultivarCountsByGroup).length} groups` : undefined}
                />
              </div>
            </div>

            {/* CTA */}
            <div className="px-4 py-3 border-t border-gray-200 bg-gray-50">
              <Link
                to={detailUrl}
                onClick={onClose}
                className="block w-full text-center px-4 py-2 text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 transition-colors"
              >
                View details →
              </Link>
            </div>
          </>
        )}
      </div>
    </>
  );
}

function Badge({
  label,
  available,
  detail,
}: {
  label: string;
  available: boolean;
  detail?: string;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded border ${
        available
          ? 'border-green-200 bg-green-50 text-green-700'
          : 'border-gray-200 bg-gray-50 text-gray-400'
      }`}
    >
      <span className="text-[10px]">{available ? '●' : '○'}</span>
      {label}
      {detail && <span className="text-[10px] text-gray-400 ml-0.5">({detail})</span>}
    </span>
  );
}

function getFocusable(root: HTMLElement): HTMLElement[] {
  const q =
    'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';
  return Array.from(root.querySelectorAll<HTMLElement>(q));
}
