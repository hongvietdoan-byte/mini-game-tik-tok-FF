from __future__ import annotations

from contextlib import redirect_stderr, redirect_stdout
from io import StringIO
import os
from pathlib import Path
import shutil
import socket
import sqlite3
try:
    from test_support import repo_temp_directory
except ImportError:
    from tools.test_support import repo_temp_directory
import unittest
from unittest.mock import patch

from tools import backup
from tools.backup import make_backup


class BackupFirstLaunchTests(unittest.TestCase):
    def test_no_database_skips_backup_without_blocking_first_launch(self) -> None:
        with repo_temp_directory(prefix="quiz-backup-first-launch-") as temp:
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
        with repo_temp_directory(prefix="quiz-backup-retention-") as temp:
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
        with repo_temp_directory(prefix="quiz-backup-low-space-") as temp:
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
        with repo_temp_directory(prefix="quiz-restore-port-") as temp:
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
        with repo_temp_directory(prefix="quiz-restore-lock-") as temp:
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
        with repo_temp_directory(prefix="quiz-restore-mirror-") as temp:
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
        with repo_temp_directory(prefix="quiz-restore-no-mirror-") as temp:
            root = Path(temp)
            backup_dir = self._create_backup(root)
            extra = root / "assets-local" / "extra.png"
            extra.write_bytes(b"extra")
            with patch.object(backup, "server_is_listening", return_value=False), \
                    patch.object(backup, "restore_database", side_effect=lambda source, destination: (destination.parent.mkdir(parents=True, exist_ok=True), shutil.copy2(source, destination))), \
                    redirect_stdout(StringIO()):
                backup.restore_backup(backup_dir, root, assume_yes=True)
            self.assertTrue(extra.exists())


class IncrementalBackupTests(unittest.TestCase):
    def _seed_checkout(self, root: Path) -> None:
        (root / "data").mkdir()
        (root / "data" / "quiz.db").write_bytes(b"sqlite snapshot bytes")
        (root / "assets-local" / "subfolder").mkdir(parents=True)
        (root / "assets-local" / "logo.txt").write_bytes(b"logo v1")
        (root / "assets-local" / "subfolder" / "music.txt").write_bytes(b"music v1")

    def _make(self, root: Path, output_dir: Path) -> Path:
        with patch.object(
            backup,
            "sqlite_backup",
            side_effect=lambda source, target: (target.parent.mkdir(parents=True, exist_ok=True), shutil.copy2(source, target)),
        ), redirect_stdout(StringIO()):
            result = make_backup(root, output_dir)
        assert result is not None
        return result

    def test_unchanged_assets_are_linked_and_remain_restorable_after_prune(self) -> None:
        with repo_temp_directory(prefix="quiz-backup-incremental-link-") as temp:
            root = Path(temp)
            self._seed_checkout(root)
            output_dir = root / "backup-store"
            first = self._make(root, output_dir)
            with patch.object(backup, "hardlinks_supported", return_value=True):
                second = self._make(root, output_dir)

            first_asset = first / "assets-local" / "logo.txt"
            second_asset = second / "assets-local" / "logo.txt"
            source_asset = root / "assets-local" / "logo.txt"
            self.assertFalse(os.path.samefile(source_asset, first_asset))
            self.assertTrue(os.path.samefile(first_asset, second_asset))
            self.assertFalse(os.path.samefile(first / "data" / "quiz.db", second / "data" / "quiz.db"))
            self.assertEqual(backup.verify_backup(second)[0], True)

            backup.prune_backups(output_dir, keep=1)
            self.assertFalse(first.exists())
            self.assertEqual(backup.verify_backup(second)[0], True)

            restored = root / "restored"
            with patch.object(backup, "server_is_listening", return_value=False), \
                    patch.object(backup, "restore_database", side_effect=lambda source, target: (target.parent.mkdir(parents=True, exist_ok=True), shutil.copy2(source, target))), \
                    redirect_stdout(StringIO()):
                backup.restore_backup(second, restored, assume_yes=True, mirror=True)
            for relative in ("data/quiz.db", "assets-local/logo.txt", "assets-local/subfolder/music.txt"):
                self.assertEqual((restored / relative).read_bytes(), (root / relative).read_bytes())

    def test_editing_source_asset_does_not_mutate_hardlinked_backup_snapshots(self) -> None:
        with repo_temp_directory(prefix="quiz-backup-source-edit-") as temp:
            root = Path(temp)
            self._seed_checkout(root)
            output_dir = root / "backup-store"
            first = self._make(root, output_dir)
            with patch.object(backup, "hardlinks_supported", return_value=True):
                second = self._make(root, output_dir)

            source = root / "assets-local" / "logo.txt"
            original_mtime = source.stat().st_mtime_ns
            source.write_bytes(b"logo changed in source")
            os.utime(source, ns=(source.stat().st_atime_ns, original_mtime + 2_000_000_000))

            self.assertEqual((first / "assets-local" / "logo.txt").read_bytes(), b"logo v1")
            self.assertEqual((second / "assets-local" / "logo.txt").read_bytes(), b"logo v1")
            self.assertTrue(backup.verify_backup(first)[0])
            self.assertTrue(backup.verify_backup(second)[0])
            with patch.object(backup, "hardlinks_supported", return_value=True):
                third = self._make(root, output_dir)
            self.assertEqual((third / "assets-local" / "logo.txt").read_bytes(), b"logo changed in source")
            self.assertTrue(backup.verify_backup(third)[0])

    def test_changed_added_and_deleted_assets_are_mirrored_independently(self) -> None:
        with repo_temp_directory(prefix="quiz-backup-incremental-changes-") as temp:
            root = Path(temp)
            self._seed_checkout(root)
            output_dir = root / "backup-store"
            first = self._make(root, output_dir)
            logo = root / "assets-local" / "logo.txt"
            logo.write_bytes(b"logo v2 changed")
            os.utime(logo, ns=(logo.stat().st_atime_ns, logo.stat().st_mtime_ns + 2_000_000_000))
            (root / "assets-local" / "new.txt").write_bytes(b"new asset")
            (root / "assets-local" / "subfolder" / "music.txt").unlink()

            with patch.object(backup, "hardlinks_supported", return_value=True):
                second = self._make(root, output_dir)
            self.assertEqual((second / "assets-local" / "logo.txt").read_bytes(), b"logo v2 changed")
            self.assertFalse((second / "assets-local" / "subfolder" / "music.txt").exists())
            self.assertEqual((second / "assets-local" / "new.txt").read_bytes(), b"new asset")
            self.assertEqual((first / "assets-local" / "logo.txt").read_bytes(), b"logo v1")
            self.assertEqual(backup.verify_backup(second)[0], True)

    def test_missing_or_corrupt_latest_manifest_forces_full_copy(self) -> None:
        for damage in ("missing-manifest", "bad-manifest", "missing-file"):
            with self.subTest(damage=damage), repo_temp_directory(prefix="quiz-backup-corrupt-latest-") as temp:
                root = Path(temp)
                self._seed_checkout(root)
                output_dir = root / "backup-store"
                first = self._make(root, output_dir)
                if damage == "missing-manifest":
                    (first / backup.MANIFEST_NAME).unlink()
                elif damage == "bad-manifest":
                    (first / backup.MANIFEST_NAME).write_text("{not-json", encoding="utf-8")
                else:
                    (first / "assets-local" / "logo.txt").unlink()

                with patch.object(backup, "hardlinks_supported", return_value=True):
                    second = self._make(root, output_dir)
                self.assertFalse(os.path.samefile(first / "assets-local" / "subfolder" / "music.txt", second / "assets-local" / "subfolder" / "music.txt"))
                self.assertEqual(backup.verify_backup(second)[0], True)

    def test_hardlink_failure_falls_back_to_copy(self) -> None:
        with repo_temp_directory(prefix="quiz-backup-hardlink-fallback-") as temp:
            root = Path(temp)
            self._seed_checkout(root)
            output_dir = root / "backup-store"
            first = self._make(root, output_dir)
            with patch.object(backup, "hardlinks_supported", return_value=True), \
                    patch.object(backup.os, "link", side_effect=OSError(18, "cross-device link")):
                second = self._make(root, output_dir)
            self.assertFalse(os.path.samefile(first / "assets-local" / "logo.txt", second / "assets-local" / "logo.txt"))
            self.assertEqual(backup.verify_backup(second)[0], True)

    def test_edge_profiles_and_admin_token_are_not_backup_inputs(self) -> None:
        with repo_temp_directory(prefix="quiz-backup-edge-profile-exclusion-") as temp:
            root = Path(temp)
            self._seed_checkout(root)
            profile = root / "data" / "edge-program-profile"
            profile.mkdir()
            (profile / "browser-state.txt").write_text("synthetic", encoding="utf-8")
            (root / "data" / "admin-token.txt").write_text("synthetic-token", encoding="utf-8")
            output_dir = root / "backup-store"
            created = self._make(root, output_dir)
            manifest = backup.read_manifest(created)
            paths = {record["path"] for record in manifest["files"]}
            self.assertEqual(paths, {"data/quiz.db", "assets-local/logo.txt", "assets-local/subfolder/music.txt"})
            self.assertFalse((created / "data" / "edge-program-profile").exists())
            self.assertFalse((created / "data" / "admin-token.txt").exists())




if __name__ == "__main__":
    unittest.main()
