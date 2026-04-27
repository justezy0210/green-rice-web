import { useEffect, useMemo, useState } from 'react';
import { DEFAULT_TRAIT_ID } from '@/config/traits';
import { TOTAL_CULTIVARS } from '@/config/panel';
import { useAnalysisRuns } from '@/hooks/useAnalysisRuns';
import { useCultivars } from '@/hooks/useCultivars';
import { useGeneIndexManifest } from '@/hooks/useGeneIndex';
import { useGeneModelsManifest } from '@/hooks/useGeneModel';
import { useOgRegionPointer } from '@/hooks/useOgRegionPointer';
import { useOrthofinderStatus } from '@/hooks/useOrthofinderStatus';
import { useOrthogroupDiff } from '@/hooks/useOrthogroupDiff';
import { useSvManifest } from '@/hooks/useSvMatrix';
import { probeStorageArtifacts } from '@/lib/admin-readiness-service';
import { selectRepresentativeDiscoveryRuns } from '@/lib/discovery-runs';
import { SV_RELEASE_ID } from '@/lib/releases';
import {
  functionalIndexPath,
  geneIndexManifestPath,
  geneModelsManifestPath,
  geneSvIndexPath,
  ogRegionAfSummaryManifestPath,
  ogRegionGraphManifestPath,
  ogRegionPointerPath,
  orthofinderBaegilmiAnnotationPath,
  orthofinderOgCategoriesPath,
  orthofinderOgMembersPath,
  traitHitsIndexPath,
} from '@/lib/storage-paths';
import type {
  AdminReadinessItem,
  AdminReadinessSection,
  ReadinessStatus,
  StorageArtifactProbe,
} from '@/types/admin-readiness';

interface Result {
  sections: AdminReadinessSection[];
  loading: boolean;
  artifactLoading: boolean;
}

export function useAdminReadiness(): Result {
  const cultivarState = useCultivars();
  const orthofinderState = useOrthofinderStatus(true);
  const diffState = useOrthogroupDiff(DEFAULT_TRAIT_ID);
  const analysisState = useAnalysisRuns(100);
  const svState = useSvManifest(SV_RELEASE_ID);
  const geneIndexState = useGeneIndexManifest();
  const geneModelState = useGeneModelsManifest();
  const ogRegionState = useOgRegionPointer();
  const [artifactState, setArtifactState] = useState<{
    key: string;
    probes: StorageArtifactProbe[];
  }>({ key: '', probes: [] });

  const orthofinderVersion =
    diffState.doc?.orthofinderVersion ?? orthofinderState.state?.activeVersion ?? null;
  const groupingVersion =
    diffState.doc?.groupingVersion ?? diffState.groupingDoc?.summary.version ?? null;
  const artifactKey =
    orthofinderVersion && groupingVersion
      ? `v${orthofinderVersion}_g${groupingVersion}_${SV_RELEASE_ID}`
      : '';

  useEffect(() => {
    if (!artifactKey || !orthofinderVersion || !groupingVersion) return;
    let cancelled = false;
    probeStorageArtifacts([
      { id: 'og-members', label: 'OG member chunks', path: orthofinderOgMembersPath(orthofinderVersion, '000') },
      { id: 'baegilmi-annotation', label: 'Baegilmi annotation', path: orthofinderBaegilmiAnnotationPath(orthofinderVersion) },
      { id: 'og-categories', label: 'OG categories', path: orthofinderOgCategoriesPath(orthofinderVersion) },
      { id: 'gene-index', label: 'Gene index manifest', path: geneIndexManifestPath(orthofinderVersion) },
      { id: 'gene-models', label: 'Gene model manifest', path: geneModelsManifestPath(orthofinderVersion) },
      { id: 'functional-index', label: 'Functional index', path: functionalIndexPath(orthofinderVersion) },
      { id: 'trait-hits', label: 'Trait hit index', path: traitHitsIndexPath(orthofinderVersion, groupingVersion) },
      { id: 'gene-sv-index', label: 'Gene-SV index', path: geneSvIndexPath(orthofinderVersion, SV_RELEASE_ID) },
      { id: 'sv-manifest', label: 'SV manifest', path: `sv_matrix/${SV_RELEASE_ID}/manifest.json` },
      { id: 'og-region-pointer', label: 'OG region pointer', path: ogRegionPointerPath() },
      { id: 'og-region-graph', label: 'OG region graph manifest', path: ogRegionGraphManifestPath(orthofinderVersion, groupingVersion) },
      { id: 'og-region-af', label: 'OG region AF summary', path: ogRegionAfSummaryManifestPath(orthofinderVersion, groupingVersion) },
    ]).then((probes) => {
      if (!cancelled) setArtifactState({ key: artifactKey, probes });
    });
    return () => {
      cancelled = true;
    };
  }, [artifactKey, orthofinderVersion, groupingVersion]);

  const probeById = useMemo(() => {
    const probes = artifactState.key === artifactKey ? artifactState.probes : [];
    return new Map(probes.map((p) => [p.id, p]));
  }, [artifactKey, artifactState]);

  const sections = useMemo<AdminReadinessSection[]>(() => {
    const cultivars = cultivarState.cultivars;
    const completeGenomes = cultivars.filter((c) => c.genomeSummary?.status === 'complete').length;
    const completeFileSets = cultivars.filter((c) => {
      const files = c.genomeSummary?.files;
      return Boolean(files?.genomeFasta.uploaded && files.geneGff3.uploaded && files.repeatGff.uploaded);
    }).length;
    const representativeRuns = selectRepresentativeDiscoveryRuns(analysisState.runs);
    const stale = diffState.isStale;

    return [
      {
        id: 'source',
        title: 'Source Records',
        description: 'Manually curated records and uploaded cultivar files.',
        items: [
          item('cultivars', 'Cultivar metadata', 'Cultivars / Overview',
            countStatus(cultivars.length, TOTAL_CULTIVARS),
            `${cultivars.length}/${TOTAL_CULTIVARS} cultivar documents`),
          item('genome-files', 'Genome file sets', 'Cultivars / Downloads / Region',
            countStatus(completeFileSets, TOTAL_CULTIVARS),
            `${completeFileSets}/${TOTAL_CULTIVARS} cultivars have FASTA, GFF3, repeat files`,
            `${completeGenomes}/${TOTAL_CULTIVARS} parsed complete`),
        ],
      },
      {
        id: 'release',
        title: 'Active Releases',
        description: 'Version pointers that public pages use to choose derived data.',
        items: [
          item('orthofinder-release', 'OrthoFinder release', 'Orthogroups / Genes',
            orthofinderVersion ? 'ready' : orthofinderState.loading ? 'loading' : 'missing',
            orthofinderVersion ? `active v${orthofinderVersion}` : 'No active OrthoFinder version',
            orthofinderState.state ? `${orthofinderState.state.totalOrthogroups.toLocaleString()} OGs` : undefined),
          item('grouping-release', 'Phenotype grouping', 'Discovery / Trait overlays',
            groupingVersion ? (stale ? 'partial' : 'ready') : diffState.loading ? 'loading' : 'missing',
            groupingVersion ? `grouping v${groupingVersion}` : 'No grouping document',
            stale ? 'default diff doc and grouping version differ' : undefined),
          item('sv-release', 'SV matrix release', 'Structural Variants / Region',
            svState.loading ? 'loading' : svState.manifest ? 'ready' : 'missing',
            svState.manifest
              ? `${svState.manifest.eventCount.toLocaleString()} events · ${svState.manifest.sampleCount} samples`
              : `release ${SV_RELEASE_ID} not loaded`,
            SV_RELEASE_ID),
          item('discovery-runs', 'Discovery runs', 'Discovery / entity context',
            analysisState.loading ? 'loading' : representativeRuns.length > 0 ? 'ready' : 'missing',
            `${representativeRuns.length} representative runs from ${analysisState.runs.length} loaded runs`,
            analysisState.error?.message),
        ],
      },
      {
        id: 'indexes',
        title: 'Browse Indexes',
        description: 'Derived indexes required by entity browsing pages.',
        items: [
          artifactItem(probeById, 'og-members', 'OG member chunks', 'OG detail'),
          artifactItem(probeById, 'baegilmi-annotation', 'Reference annotation', 'OG detail'),
          artifactItem(probeById, 'og-categories', 'OG functional categories', 'Pangenome / OG browse'),
          manifestItem('gene-index-runtime', 'Gene index runtime', 'Genes', geneIndexState.loading,
            geneIndexState.manifest ? 'ready' : 'missing',
            geneIndexState.manifest ? `${geneIndexState.manifest.totalGenes.toLocaleString()} gene entries` : 'manifest unavailable'),
          manifestItem('gene-model-runtime', 'Gene model runtime', 'Genes / Region',
            geneModelState.loading,
            geneModelState.manifest ? 'ready' : 'missing',
            geneModelState.manifest ? `${geneModelState.manifest.totalGenes.toLocaleString()} gene models` : 'manifest unavailable'),
          artifactItem(probeById, 'functional-index', 'Functional search index', 'Genes'),
          artifactItem(probeById, 'trait-hits', 'Trait hit index', 'OG trait filter'),
          artifactItem(probeById, 'gene-sv-index', 'Gene-SV overlap index', 'Genes / SV context'),
        ],
      },
      {
        id: 'region',
        title: 'Region And Discovery Artifacts',
        description: 'Graph, AF, and SV artifacts that power locus detail views.',
        items: [
          artifactItem(probeById, 'sv-manifest', 'SV storage manifest', 'SV browse'),
          artifactItem(probeById, 'og-region-pointer', 'OG region pointer', 'OG / Region'),
          artifactItem(probeById, 'og-region-graph', 'OG region graph manifest', 'OG detail'),
          artifactItem(probeById, 'og-region-af', 'OG region AF summary', 'OG detail / Discovery'),
          item('og-region-runtime', 'OG region runtime pointer', 'OG detail',
            ogRegionState.loading ? 'loading' : ogRegionState.graph ? 'ready' : 'missing',
            ogRegionState.graph
              ? `${ogRegionState.graph.totals.ogsEmitted.toLocaleString()} OGs emitted`
              : ogRegionState.error ?? 'pointer unavailable'),
        ],
      },
    ];
  }, [
    analysisState,
    cultivarState.cultivars,
    diffState,
    geneIndexState,
    geneModelState,
    groupingVersion,
    ogRegionState,
    orthofinderState,
    orthofinderVersion,
    probeById,
    svState,
  ]);

  return {
    sections,
    loading: cultivarState.loading || diffState.loading || orthofinderState.loading,
    artifactLoading: Boolean(artifactKey && artifactState.key !== artifactKey),
  };
}

function item(
  id: string,
  label: string,
  surface: string,
  status: ReadinessStatus,
  detail: string,
  meta?: string,
): AdminReadinessItem {
  return { id, label, surface, status, detail, meta };
}

function artifactItem(
  probes: Map<string, StorageArtifactProbe>,
  id: string,
  label: string,
  surface: string,
): AdminReadinessItem {
  const probe = probes.get(id);
  if (!probe) return item(id, label, surface, 'loading', 'checking storage artifact');
  return {
    id,
    label,
    surface,
    status: probe.status,
    detail: probe.status === 'ready' ? 'artifact exists' : probe.error ?? 'artifact missing',
    meta: probe.statusCode ? `HTTP ${probe.statusCode}` : undefined,
    path: probe.path,
  };
}

function manifestItem(
  id: string,
  label: string,
  surface: string,
  loading: boolean,
  status: ReadinessStatus,
  detail: string,
): AdminReadinessItem {
  return item(id, label, surface, loading ? 'loading' : status, detail);
}

function countStatus(current: number, expected: number): ReadinessStatus {
  if (current >= expected) return 'ready';
  if (current > 0) return 'partial';
  return 'missing';
}
