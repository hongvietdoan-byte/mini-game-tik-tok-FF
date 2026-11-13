"""Shared scratch-directory helper for repository tests."""
from pathlib import Path
from contextlib import contextmanager
import tempfile

ROOT = Path(__file__).resolve().parents[1]
TEST_TEMP_ROOT = ROOT / ".tmp-test"


@contextmanager
def repo_temp_directory(*, prefix="quiz-test-", suffix=""):
    """Return an auto-cleaned TemporaryDirectory under the ignored repo scratch root."""
    TEST_TEMP_ROOT.mkdir(parents=True, exist_ok=True)
    try:
        with tempfile.TemporaryDirectory(prefix=prefix, suffix=suffix, dir=TEST_TEMP_ROOT) as temporary:
            yield temporary
    finally:
        try:
            TEST_TEMP_ROOT.rmdir()
        except OSError:
            # Another test still owns a child, or setup has recreated the directory.
            pass
