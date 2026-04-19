"""IRGSP reference identifiers, loaded from generated_manifests/reference.json."""

from .manifests import load_reference

_ref = load_reference()

IRGSP_SAMPLE_ID: str = _ref["sampleId"]
IRGSP_DISPLAY_NAME: str = _ref["displayName"]
IRGSP_LONG_NAME: str = _ref["longName"]
