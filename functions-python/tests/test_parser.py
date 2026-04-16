"""Tests for orthofinder.parser — TSV parsing + streaming iteration."""

import pytest

from orthofinder.parser import (
    iter_orthogroups_with_desc_rows,
    parse_gene_count_tsv,
)


@pytest.fixture
def gene_count_tsv() -> str:
    """Mock 5 OGs × 3 cultivars GeneCount.tsv."""
    return (
        "Orthogroup\tbaegilmi_longest\tilmi_longest\tsamgwang_longest\tTotal\n"
        "OG0000000\t21\t48\t38\t107\n"
        "OG0000001\t37\t1\t2\t40\n"
        "OG0000002\t0\t0\t0\t0\n"
        "OG0000003\t3\t2\t1\t6\n"
        "OG0000004\t1\tbad\t2\t5\n"  # malformed int → should default to 0
    )


@pytest.fixture
def orthogroups_with_desc_tsv() -> str:
    """Mock Orthogroups_with_description.tsv (IRGSP + cultivars + description)."""
    return (
        "Orthogroup\tIRGSP-1.0\tbaegilmi_longest\tilmi_longest\tsamgwang_longest\tIRGSP_description\n"
        "OG0000000\tOs01t0391600-00, Os05t0247400-01\tbaegilmi_g1.t1, baegilmi_g2.t1\tilmi_g1.t1\tsamgwang_g1.t1\tOs01t0391600-00: Conserved hypothetical protein.; Os05t0247400-01: NA\n"
        "OG0000001\tOs02t0100100-01\tbaegilmi_g3.t1\t\tsamgwang_g2.t1\tOs02t0100100-01: Protein kinase domain\n"
        "OG0000002\t\t\t\t\t\n"  # fully empty row → iter should skip
        "OG0000003\t\tbaegilmi_g4.t1\tilmi_g2.t1, ilmi_g3.t1\t\t\n"  # no IRGSP → still yields
        "OG0000004\tOs03t0123400-00\tbaegilmi_g5.t1\tilmi_g4.t1\tsamgwang_g3.t1\tOs03t0123400-00: Unknown gene; invalid_format\n"
    )


def test_parse_gene_count_tsv_basic(gene_count_tsv):
    cultivar_ids, ogs = parse_gene_count_tsv(gene_count_tsv)
    assert cultivar_ids == ["baegilmi", "ilmi", "samgwang"]
    assert ogs["OG0000000"] == {"baegilmi": 21, "ilmi": 48, "samgwang": 38}
    assert ogs["OG0000001"]["baegilmi"] == 37
    assert len(ogs) == 5


def test_parse_gene_count_tsv_malformed_int_defaults_zero(gene_count_tsv):
    _, ogs = parse_gene_count_tsv(gene_count_tsv)
    assert ogs["OG0000004"]["ilmi"] == 0
    assert ogs["OG0000004"]["baegilmi"] == 1


def test_parse_gene_count_tsv_rejects_bad_header():
    with pytest.raises(ValueError):
        parse_gene_count_tsv("WrongColumn\tfoo\n")


def test_iter_with_desc_yields_cultivars_and_irgsp(orthogroups_with_desc_tsv):
    rows = {og: (members, irgsp) for og, members, irgsp in iter_orthogroups_with_desc_rows(orthogroups_with_desc_tsv)}

    # Fully-empty row skipped
    assert "OG0000002" not in rows

    # OG0 has IRGSP + cultivar members + descriptions
    members0, irgsp0 = rows["OG0000000"]
    assert members0 == {
        "baegilmi": ["baegilmi_g1.t1", "baegilmi_g2.t1"],
        "ilmi": ["ilmi_g1.t1"],
        "samgwang": ["samgwang_g1.t1"],
    }
    assert irgsp0["transcripts"] == ["Os01t0391600-00", "Os05t0247400-01"]
    assert irgsp0["descriptions"]["Os01t0391600-00"] == "Conserved hypothetical protein."
    assert irgsp0["descriptions"]["Os05t0247400-01"] == "NA"

    # OG1 single IRGSP + single description
    _, irgsp1 = rows["OG0000001"]
    assert irgsp1["transcripts"] == ["Os02t0100100-01"]
    assert irgsp1["descriptions"]["Os02t0100100-01"] == "Protein kinase domain"

    # OG3 has cultivar members but no IRGSP transcripts/descriptions
    members3, irgsp3 = rows["OG0000003"]
    assert members3["baegilmi"] == ["baegilmi_g4.t1"]
    assert irgsp3["transcripts"] == []
    assert irgsp3["descriptions"] == {}

    # OG4: malformed trailing description segment ("invalid_format") skipped silently
    _, irgsp4 = rows["OG0000004"]
    assert irgsp4["descriptions"] == {"Os03t0123400-00": "Unknown gene"}


def test_iter_with_desc_is_streaming(orthogroups_with_desc_tsv):
    """Consuming one value at a time should not load the full dict."""
    gen = iter_orthogroups_with_desc_rows(orthogroups_with_desc_tsv)
    first = next(gen)
    assert first[0] == "OG0000000"


def test_iter_with_desc_percent_decodes_gff3_encoding():
    """GFF3 attribute values URL-encode reserved chars (%2C = ',', %3B = ';', %3D = '=')."""
    tsv = (
        "Orthogroup\tIRGSP-1.0\tbaegilmi_longest\tIRGSP_description\n"
        "OG0000000\tOs01t0001-00\tbaegilmi_g1.t1\t"
        "Os01t0001-00: Coiled-coil NBS-LRR protein%2C Blast resistance%2C Resistance to bacterial blight\n"
    )
    rows = {og: irgsp for og, _m, irgsp in iter_orthogroups_with_desc_rows(tsv)}
    desc = rows["OG0000000"]["descriptions"]["Os01t0001-00"]
    assert desc == "Coiled-coil NBS-LRR protein, Blast resistance, Resistance to bacterial blight"
