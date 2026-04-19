"""
Python mirror of src/types/orthogroup.ts.
Must stay in sync with the TypeScript canonical source.
"""

from dataclasses import dataclass
from typing import Literal

Strand = Literal["+", "-", "."]
OrthofinderStatus = Literal["idle", "uploading", "processing", "complete", "error"]
LockStatus = Literal["idle", "running"]
RepresentativeSource = Literal["irgsp"]

DIFF_SCHEMA_VERSION = 1


@dataclass
class OrthogroupRepresentative:
    source: RepresentativeSource
    transcripts: list  # IRGSP transcript ids, e.g. ["Os01t0391600-00", ...]
    descriptions: dict  # transcript_id → description text (may include "NA")


@dataclass
class OrthogroupDiffEntry:
    orthogroup: str
    meansByGroup: dict  # str → float
    presenceByGroup: dict  # str → float
    cultivarCountsByGroup: dict  # str → int
    meanDiff: float
    presenceDiff: float
    log2FoldChange: float | None
    cliffsDelta: float | None
    uStatistic: float
    pValue: float
    qValue: float
    representative: OrthogroupRepresentative | None = None


SelectionMode = Literal["strict", "relaxed", "top_n_fallback"]


@dataclass
class OrthogroupDiffDocument:
    """Firestore-side metadata only. Full entries live in the Storage payload."""
    traitId: str
    groupLabels: list
    selectionMode: SelectionMode
    thresholds: dict   # {"pValue": float, "meanDiff": float}
    totalTested: int
    passedCount: int
    entryCount: int
    computedAt: str
    groupingVersion: int
    orthofinderVersion: int
    storagePath: str
    schemaVersion: int = DIFF_SCHEMA_VERSION


@dataclass
class OrthogroupDiffPayload:
    """Storage-side full entries bundle."""
    traitId: str
    groupLabels: list
    entries: list  # OrthogroupDiffEntry
    entryCount: int
    passedCount: int
    selectionMode: SelectionMode
    thresholds: dict
    computedAt: str
    groupingVersion: int
    orthofinderVersion: int
    schemaVersion: int = DIFF_SCHEMA_VERSION


@dataclass
class OrthofinderState:
    status: OrthofinderStatus
    activeVersion: int
    activeVersionUploadedAt: str | None
    totalOrthogroups: int
    cultivarIds: list
    geneCountPath: str
    genesPath: str
    matrixJsonPath: str
    errorMessage: str | None = None


@dataclass
class OrthofinderLock:
    status: LockStatus
    leaseExpiresAt: str | None
    version: int


@dataclass
class OrthogroupMatrixData:
    version: int
    cultivarIds: list
    totalOrthogroups: int
    ogs: dict  # str → dict[str, int]


def diff_entry_to_dict(e: OrthogroupDiffEntry) -> dict:
    d = {
        "orthogroup": e.orthogroup,
        "meansByGroup": e.meansByGroup,
        "presenceByGroup": e.presenceByGroup,
        "cultivarCountsByGroup": e.cultivarCountsByGroup,
        "meanDiff": e.meanDiff,
        "presenceDiff": e.presenceDiff,
        "log2FoldChange": e.log2FoldChange,
        "cliffsDelta": e.cliffsDelta,
        "uStatistic": e.uStatistic,
        "pValue": e.pValue,
        "qValue": e.qValue,
    }
    if e.representative is not None:
        r = e.representative
        d["representative"] = {
            "source": r.source,
            "transcripts": r.transcripts,
            "descriptions": r.descriptions,
        }
    return d


def diff_document_to_dict(doc: OrthogroupDiffDocument) -> dict:
    return {
        "traitId": doc.traitId,
        "groupLabels": doc.groupLabels,
        "selectionMode": doc.selectionMode,
        "thresholds": doc.thresholds,
        "totalTested": doc.totalTested,
        "passedCount": doc.passedCount,
        "entryCount": doc.entryCount,
        "computedAt": doc.computedAt,
        "groupingVersion": doc.groupingVersion,
        "orthofinderVersion": doc.orthofinderVersion,
        "storagePath": doc.storagePath,
        "schemaVersion": doc.schemaVersion,
    }


def diff_payload_to_dict(payload: OrthogroupDiffPayload) -> dict:
    return {
        "traitId": payload.traitId,
        "groupLabels": payload.groupLabels,
        "entries": [diff_entry_to_dict(e) for e in payload.entries],
        "entryCount": payload.entryCount,
        "passedCount": payload.passedCount,
        "selectionMode": payload.selectionMode,
        "thresholds": payload.thresholds,
        "computedAt": payload.computedAt,
        "groupingVersion": payload.groupingVersion,
        "orthofinderVersion": payload.orthofinderVersion,
        "schemaVersion": payload.schemaVersion,
    }


def diff_storage_path(orthofinder_version: int, grouping_version: int, trait_id: str) -> str:
    """Immutable versioned path for a diff payload."""
    return (
        f"orthogroup_diffs/v{orthofinder_version}/g{grouping_version}/{trait_id}.json"
    )
