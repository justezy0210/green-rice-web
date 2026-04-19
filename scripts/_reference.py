"""Re-export shim → functions-python/shared/reference.py (SSOT).

scripts/ and functions-python/ both read the same identifiers; this shim
keeps the scripts/ import surface stable while the canonical code lives
in the Cloud-Functions-reachable package.
"""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "functions-python"))

from shared.reference import IRGSP_DISPLAY_NAME, IRGSP_LONG_NAME, IRGSP_SAMPLE_ID  # noqa: E402

__all__ = ["IRGSP_SAMPLE_ID", "IRGSP_DISPLAY_NAME", "IRGSP_LONG_NAME"]
