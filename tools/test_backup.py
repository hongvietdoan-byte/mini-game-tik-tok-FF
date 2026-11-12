from __future__ import annotations

from contextlib import redirect_stderr, redirect_stdout
from io import StringIO
import os
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch

from tools import backup
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


class BackupRetentionTests(unittest.TestCase):
    def _seed_checkout(self, root: Path) -> None:
        (root / "data").mkdir()
        (root / "data" / "quiz.db").write_bytes(b"sqlite placeholder")
        (root / "assets-local").mkdir()
        (root / "assets-local" / "logo.txt").write_text("asset", encoding="utf-8")

    def test_keeps_only_newest_timestamp_backups(self) -> None:
        with tempfile.TemporaryDirectory(prefix="quiz-backup-retention-") as temp:
            root = Path(temp)
            self._seed_checkout(root)
            output_dir = root / "backups"
            output_dir.mkdir()
            for index in range(1, 4):
                old = output_dir / f"2026010{index}-000000"
                old.mkdir()
                old_time = 1_700_000_000 + index
                os.utime(old, (old_time, old_time))

            with patch.object(backup, "sqlite_backup", side_effect=lambda source, target: (target.parent.mkdir(parents=True, exist_ok=True), target.write_bytes(source.read_bytes()))), redirect_stdout(StringIO()):
                created = make_backup(root, output_dir, keep=2)

            self.assertIsNotNone(created)
            names = {path.name for path in output_dir.iterdir() if path.is_dir()}
            self.assertEqual(len(names), 2)
            self.assertNotIn("20260101-000000", names)
            self.assertIn("20260103-000000", names)
            self.assertIn(created.name, names)

    def test_low_disk_space_returns_distinct_cli_code_before_copy(self) -> None:
        with tempfile.TemporaryDirectory(prefix="quiz-backup-low-space-") as temp:
            root = Path(temp)
            self._seed_checkout(root)
            output_dir = root / "backups"
            stdout = StringIO()
            stderr = StringIO()

            with patch.object(backup.shutil, "disk_usage", return_value=backup.shutil._ntuple_diskusage(1_000_000, 1_000_000, 0)), \
                    patch.object(backup, "sqlite_backup") as sqlite_copy, \
                    redirect_stdout(stdout), redirect_stderr(stderr):
                result = backup.main(["create", "--root", str(root), "--output-dir", str(output_dir)])

            self.assertEqual(result, 2)
            self.assertIn("Không đủ dung lượng trống", stderr.getvalue())
            sqlite_copy.assert_not_called()




if __name__ == "__main__":
    unittest.main()
