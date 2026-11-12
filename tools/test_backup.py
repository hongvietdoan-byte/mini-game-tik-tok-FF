from __future__ import annotations

from contextlib import redirect_stdout
from io import StringIO
from pathlib import Path
import tempfile
import unittest

from tools.backup import make_backup


class BackupFirstLaunchTests(unittest.TestCase):
    def test_no_database_skips_backup_without_blocking_first_launch(self) -> None:
        with tempfile.TemporaryDirectory(prefix="quiz-backup-first-launch-") as temp:
            root = Path(temp)
            output_dir = root / "backups"
            stdout = StringIO()

            with redirect_stdout(stdout):
                result = make_backup(root, output_dir)

            self.assertIsNone(result)
            self.assertIn("backup SKIP: chưa có database source-run", stdout.getvalue())
            self.assertFalse(output_dir.exists())


if __name__ == "__main__":
    unittest.main()
