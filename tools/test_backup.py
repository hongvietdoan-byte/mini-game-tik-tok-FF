from __future__ import annotations

from contextlib import redirect_stderr, redirect_stdout
from io import StringIO
import os
from pathlib import Path
import shutil
import socket
import sqlite3
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


class RestoreSafetyTests(unittest.TestCase):
    def _create_backup(self, root: Path) -> Path:
        database = root / "data" / "quiz.db"
        database.parent.mkdir(parents=True)
        connection = sqlite3.connect(database)
        try:
            connection.execute("CREATE TABLE sample (value TEXT)")
            connection.execute("INSERT INTO sample VALUES ('backup')")
            connection.commit()
        finally:
            connection.close()
        assets = root / "assets-local"
        assets.mkdir()
        (assets / "logo.txt").write_text("asset", encoding="utf-8")
        output_dir = root / "backup-store"
        with patch.object(backup, "sqlite_backup", side_effect=lambda source, target: (target.parent.mkdir(parents=True, exist_ok=True), target.write_bytes(source.read_bytes()))), redirect_stdout(StringIO()):
            result = make_backup(root, output_dir)
        assert result is not None
        return result

    def test_refuses_restore_when_server_port_is_open(self) -> None:
        with tempfile.TemporaryDirectory(prefix="quiz-restore-port-") as temp:
            root = Path(temp)
            backup_dir = self._create_backup(root)
            with socket.socket() as listener:
                listener.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
                listener.bind(("127.0.0.1", 0))
                listener.listen(1)
                port = listener.getsockname()[1]
                with self.assertRaisesRegex(backup.BackupError, f"Cổng {port} đang mở"):
                    backup.restore_backup(backup_dir, root, assume_yes=True, port=port)

    def test_refuses_restore_when_database_is_locked(self) -> None:
        with tempfile.TemporaryDirectory(prefix="quiz-restore-lock-") as temp:
            root = Path(temp)
            backup_dir = self._create_backup(root)
            connection = sqlite3.connect(root / "data" / "quiz.db", timeout=0)
            try:
                connection.execute("BEGIN EXCLUSIVE")
                with patch.object(backup, "server_is_listening", return_value=False):
                    with self.assertRaisesRegex(backup.BackupError, "Database đang bị khóa"):
                        backup.restore_backup(backup_dir, root, assume_yes=True)
            finally:
                connection.rollback()
                connection.close()

    def test_mirror_restore_removes_extra_assets_but_keeps_excluded_folders(self) -> None:
        with tempfile.TemporaryDirectory(prefix="quiz-restore-mirror-") as temp:
            root = Path(temp)
            backup_dir = self._create_backup(root)
            assets = root / "assets-local"
            (assets / "extra").mkdir()
            (assets / "extra" / "old.png").write_bytes(b"extra")
            (assets / "review").mkdir()
            (assets / "review" / "keep.txt").write_text("review", encoding="utf-8")
            (assets / "_backup").mkdir()
            (assets / "_backup" / "keep.txt").write_text("backup", encoding="utf-8")

            with patch.object(backup, "server_is_listening", return_value=False), \
                    patch.object(backup, "restore_database", side_effect=lambda source, destination: (destination.parent.mkdir(parents=True, exist_ok=True), shutil.copy2(source, destination))), \
                    redirect_stdout(StringIO()):
                backup.restore_backup(backup_dir, root, assume_yes=True, mirror=True)

            self.assertFalse((assets / "extra" / "old.png").exists())
            self.assertFalse((assets / "extra").exists())
            self.assertEqual((assets / "review" / "keep.txt").read_text(encoding="utf-8"), "review")
            self.assertEqual((assets / "_backup" / "keep.txt").read_text(encoding="utf-8"), "backup")

    def test_default_restore_keeps_assets_not_in_manifest(self) -> None:
        with tempfile.TemporaryDirectory(prefix="quiz-restore-no-mirror-") as temp:
            root = Path(temp)
            backup_dir = self._create_backup(root)
            extra = root / "assets-local" / "extra.png"
            extra.write_bytes(b"extra")
            with patch.object(backup, "server_is_listening", return_value=False), \
                    patch.object(backup, "restore_database", side_effect=lambda source, destination: (destination.parent.mkdir(parents=True, exist_ok=True), shutil.copy2(source, destination))), \
                    redirect_stdout(StringIO()):
                backup.restore_backup(backup_dir, root, assume_yes=True)
            self.assertTrue(extra.exists())




if __name__ == "__main__":
    unittest.main()
