"""Minimum guarantees on shared.reference so parity cannot pass on both-sides-wrong."""

from shared.reference import IRGSP_DISPLAY_NAME, IRGSP_LONG_NAME, IRGSP_SAMPLE_ID


def test_reference_values_are_non_empty_strings():
    assert isinstance(IRGSP_SAMPLE_ID, str) and IRGSP_SAMPLE_ID
    assert isinstance(IRGSP_DISPLAY_NAME, str) and IRGSP_DISPLAY_NAME
    assert isinstance(IRGSP_LONG_NAME, str) and IRGSP_LONG_NAME


def test_sample_id_distinct_from_display_name():
    # `vg paths -L` returns the sample id without the `.0` suffix. If these
    # ever become the same string the path parsers in src/ would break.
    assert IRGSP_SAMPLE_ID != IRGSP_DISPLAY_NAME
