import { useEffect, useMemo, useRef, useState } from 'react';
import { useOgDrilldown } from '@/hooks/useOgDrilldown';
import { useAdminClaim } from '@/hooks/useAdminClaim';
import { OgDrawerHeader } from './OgDrawerHeader';
import { OgDrawerGroupSummary } from './OgDrawerGroupSummary';
import { OgDrawerCultivarSection } from './OgDrawerCultivarSection';
import { OgDrawerIrgspSection } from './OgDrawerIrgspSection';
import { OgDrawerSkeleton } from './OgDrawerSkeleton';
import { buildGroupColorMap } from '@/components/dashboard/distribution-helpers';
import type {
  DiffEntriesState,
  OrthogroupDiffDocument,
  OrthogroupDiffEntry,
} from '@/types/orthogroup';
import type { CultivarGroupAssignment } from '@/types/grouping';

interface Props {
  ogId: string | null;
  diffDoc: OrthogroupDiffDocument | null;
  entriesState: DiffEntriesState;
  cultivarNameMap: Record<string, string>;
  /** cultivarId → groupLabel ('borderline' included separately if applicable) */
  groupByCultivar: Record<string, CultivarGroupAssignment> | null;
  onClose: () => void;
}

export function OgDrawer({
  ogId,
  diffDoc,
  entriesState,
  cultivarNameMap,
  groupByCultivar,
  onClose,
}: Props) {
  const open = !!ogId;
  const version = diffDoc?.orthofinderVersion ?? null;
  const { members, annotation, loading, error } = useOgDrilldown(ogId, version);
  const { isAdmin } = useAdminClaim();

  const triggerRef = useRef<HTMLElement | null>(null);
  const drawerRef = useRef<HTMLDivElement>(null);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  // Scroll lock + remember trigger on open; restore focus on close
  useEffect(() => {
    if (!open) return;
    triggerRef.current = (document.activeElement as HTMLElement | null) ?? null;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prevOverflow;
      // Restore focus to trigger, fall back to body if trigger is gone
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

  // Focus trap — cycle Tab/Shift+Tab within the drawer
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

  // Reset expanded state on OG change
  useEffect(() => {
    setExpanded({});
  }, [ogId]);

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

  const cultivarIds = useMemo(() => {
    if (!members) return [] as string[];
    const ids = Object.keys(members);
    const groupLabels = diffDoc?.groupLabels ?? [];
    // Order: groups in groupLabels order → others (borderline/unassigned) → alphabetical within each bucket
    const rank = (cid: string): number => {
      const lbl = groupByCultivar?.[cid]?.groupLabel;
      if (!lbl) return groupLabels.length; // unassigned → last
      const idx = groupLabels.indexOf(lbl);
      return idx === -1 ? groupLabels.length : idx;
    };
    return ids.sort((a, b) => {
      const ra = rank(a);
      const rb = rank(b);
      if (ra !== rb) return ra - rb;
      return a.localeCompare(b);
    });
  }, [members, groupByCultivar, diffDoc]);

  return (
    <>
      {/* overlay */}
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
        className={`fixed right-0 top-0 h-full w-full sm:w-[520px] bg-white shadow-xl z-50 flex flex-col transition-transform duration-200 ${
          open ? 'translate-x-0' : 'translate-x-full pointer-events-none'
        }`}
      >
        {ogId && (
          <>
            <OgDrawerHeader ogId={ogId} onClose={onClose} />

            <div className="flex-1 overflow-y-auto relative">
              {diffEntry?.representative && (
                <OgDrawerIrgspSection rep={diffEntry.representative} />
              )}

              {diffEntry && diffDoc && (
                <OgDrawerGroupSummary
                  entry={diffEntry}
                  groupLabels={diffDoc.groupLabels}
                  groupColorMap={groupColorMap}
                />
              )}

              {error && (
                <p className="px-4 py-3 text-xs text-red-600 bg-red-50 border-b border-red-100">
                  {error}
                </p>
              )}

              {loading && <OgDrawerSkeleton />}

              {!loading && members && cultivarIds.length === 0 && (
                <p className="px-4 py-6 text-xs text-gray-400 text-center">
                  This orthogroup has no gene members in any cultivar.
                </p>
              )}

              {!loading && cultivarIds.map((cid) => (
                <OgDrawerCultivarSection
                  key={cid}
                  cultivarId={cid}
                  cultivarName={cultivarNameMap[cid] ?? cid}
                  geneIds={members?.[cid] ?? []}
                  groupLabel={groupByCultivar?.[cid]?.groupLabel}
                  groupColor={
                    groupByCultivar?.[cid]?.groupLabel
                      ? groupColorMap[groupByCultivar[cid].groupLabel] ?? null
                      : null
                  }
                  annotation={annotation}
                  expanded={!!expanded[cid]}
                  onToggleExpand={() =>
                    setExpanded((prev) => ({ ...prev, [cid]: !prev[cid] }))
                  }
                  showAdminHint={isAdmin}
                />
              ))}

              {/* spacer so last content isn't hidden behind fade */}
              <div className="h-12" />
            </div>

            {/* bottom fade-out overlay */}
            <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-white to-transparent" />
          </>
        )}
      </div>
    </>
  );
}

function getFocusable(root: HTMLElement): HTMLElement[] {
  const q =
    'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';
  return Array.from(root.querySelectorAll<HTMLElement>(q));
}
