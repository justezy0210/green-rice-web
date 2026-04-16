"""Pytest configuration — make orthofinder package importable without firebase_admin."""

import os
import sys

# Allow imports like `from orthofinder.parser import ...`
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if ROOT not in sys.path:
    sys.path.insert(0, ROOT)
