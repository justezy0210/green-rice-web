"""
Python mirror of src/types/orthogroup.ts.
Must stay in sync with the TypeScript canonical source.
"""

from dataclasses import dataclass, field
from typing import Literal

Strand = Literal["+", "-", "."]
OrthofinderStatus = Literal["idle", "uploading", "processing", "complete", "error"]
LockStatus = Literal["idle", "running"]
RepresentativeSource = Literal["baegilmi_gff3"]


@dataclass
class OrthogroupRepresentative:
    source: RepresentativeSource
    geneId: str
    chromosome: str
    start: int
    end: int
    strand: Strand
    attributes: dict  # str → str


@dataclass
class OrthogroupDiffEntry:
    orthogroup: str
    meansByGroup: dict  # str → float
    presenceByGroup: dict  # str → float
    cultivarCountsByGroup: dict  # str → int
    meanDiff: float
    presenceDiff: float
    log2FoldChange: float | None
    uStatistic: float
    pValue: float
    qValue: float
    representative: OrthogroupRepresentative | None = None


SelectionMode = Literal["strict", "relaxed", "top_n_fallback"]


@dataclass
class OrthogroupDiffDocument:
    traitId: str
    groupLabels: list
    top: list  # OrthogroupDiffEntry
    selectionMode: SelectionMode
    thresholds: dict   # {"qValue": float, "meanDiff": float}
    totalTested: int
    passedCount: int
    computedAt: str
    groupingVersion: int
    orthofinderVersion: int


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
        "uStatistic": e.uStatistic,
        "pValue": e.pValue,
        "qValue": e.qValue,
    }
    if e.representative is not None:
        r = e.representative
        d["representative"] = {
            "source": r.source,
            "geneId": r.geneId,
            "chromosome": r.chromosome,
            "start": r.start,
            "end": r.end,
            "strand": r.strand,
            "attributes": r.attributes,
        }
    return d


def diff_document_to_dict(doc: OrthogroupDiffDocument) -> dict:
    return {
        "traitId": doc.traitId,
        "groupLabels": doc.groupLabels,
        "top": [diff_entry_to_dict(e) for e in doc.top],
        "selectionMode": doc.selectionMode,
        "thresholds": doc.thresholds,
        "totalTested": doc.totalTested,
        "passedCount": doc.passedCount,
        "computedAt": doc.computedAt,
        "groupingVersion": doc.groupingVersion,
        "orthofinderVersion": doc.orthofinderVersion,
    }
