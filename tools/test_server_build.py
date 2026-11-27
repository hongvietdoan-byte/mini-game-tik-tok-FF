from __future__ import annotations

import json
from pathlib import Path
import subprocess
import tempfile
import unittest
from unittest.mock import patch

from tools import server_build


class ServerBuildTests(unittest.TestCase):
    def _root(self, temp: str) -> Path:
        root = Path(temp)
        entry = root / "apps" / "server" / "src" / "main.ts"
        entry.parent.mkdir(parents=True)
        entry.write_text("export const version = 1;\n", encoding="utf-8")
        return root

    def _fake_build(self, root: Path) -> int:
        output = root / server_build.OUTPUT
        output.parent.mkdir(parents=True, exist_ok=True)
        output.write_text("// server bundle\n", encoding="utf-8")
        return 0

    def test_ensure_builds_missing_bundle_and_check_passes(self) -> None:
        with tempfile.TemporaryDirectory(prefix="quiz-server-build-") as temp:
            root = self._root(temp)
            with patch.object(server_build, "current_git_head", return_value="commit-a"), \
                    patch.object(server_build, "build_bundle", side_effect=self._fake_build):
                self.assertEqual(server_build.ensure_build(root), 0)
                self.assertEqual(server_build.build_state(root), (True, []))

    def test_source_change_marks_bundle_stale_until_rebuilt(self) -> None:
        with tempfile.TemporaryDirectory(prefix="quiz-server-stale-") as temp:
            root = self._root(temp)
            with patch.object(server_build, "current_git_head", return_value="commit-a"), \
                    patch.object(server_build, "build_bundle", side_effect=self._fake_build):
                self.assertEqual(server_build.ensure_build(root), 0)
                entry = root / server_build.ENTRY
                entry.write_text("export const version = 2;\n", encoding="utf-8")
                fresh, reasons = server_build.build_state(root)
                self.assertFalse(fresh)
                self.assertTrue(any("source" in reason for reason in reasons))
                self.assertEqual(server_build.ensure_build(root), 0)
                self.assertEqual(server_build.build_state(root), (True, []))

    def test_same_size_bundle_corruption_forces_rebuild(self) -> None:
        with tempfile.TemporaryDirectory(prefix="quiz-server-corrupt-") as temp:
            root = self._root(temp)
            with patch.object(server_build, "current_git_head", return_value="commit-a"), \
                    patch.object(server_build, "build_bundle", side_effect=self._fake_build) as build:
                self.assertEqual(server_build.ensure_build(root), 0)
                output = root / server_build.OUTPUT
                original = output.read_bytes()
                output.write_bytes(b"!" + original[1:])
                self.assertEqual(output.stat().st_size, len(original))
                fresh, reasons = server_build.build_state(root)
                self.assertFalse(fresh)
                self.assertTrue(any("hash bundle" in reason for reason in reasons))
                self.assertEqual(server_build.ensure_build(root), 0)
                self.assertEqual(build.call_count, 2)
                self.assertEqual(server_build.build_state(root), (True, []))

    def test_bundle_rewrites_external_sqlite_import_to_workspace_package(self) -> None:
        with tempfile.TemporaryDirectory(prefix="quiz-server-native-") as temp:
            root = self._root(temp)
            package = root / "packages" / "persistence" / "node_modules" / "better-sqlite3"
            (package / "lib").mkdir(parents=True)
            (package / "package.json").write_text(json.dumps({"main": "lib/index.js"}), encoding="utf-8")
            (package / "lib" / "index.js").write_text("export default class Database {}\n", encoding="utf-8")
            esbuild = root / "node_modules" / ".pnpm" / "esbuild@1" / "node_modules" / "esbuild" / "bin" / "esbuild"
            esbuild.parent.mkdir(parents=True)
            esbuild.write_text("", encoding="utf-8")

            def fake_esbuild(command: list[str], *, cwd: Path, check: bool) -> subprocess.CompletedProcess[str]:
                output_arg = next(value for value in command if value.startswith("--outfile="))
                Path(output_arg.split("=", 1)[1]).write_text('import Database from "better-sqlite3";\n', encoding="utf-8")
                return subprocess.CompletedProcess(command, 0)

            with patch.object(server_build.subprocess, "run", side_effect=fake_esbuild):
                self.assertEqual(server_build.build_bundle(root), 0)

            bundle = (root / server_build.OUTPUT).read_text(encoding="utf-8")
            self.assertIn('"../../../packages/persistence/node_modules/better-sqlite3/lib/index.js"', bundle)
            self.assertNotIn('"better-sqlite3"', bundle)

    def test_no_git_rebuilds_every_time_but_remains_runnable(self) -> None:
        with tempfile.TemporaryDirectory(prefix="quiz-server-no-git-") as temp:
            root = self._root(temp)
            with patch.object(server_build, "current_git_head", return_value=None), \
                    patch.object(server_build, "build_bundle", side_effect=self._fake_build) as build:
                self.assertEqual(server_build.ensure_build(root), 0)
                self.assertEqual(server_build.ensure_build(root), 0)
                self.assertEqual(build.call_count, 2)

    def test_missing_bundle_fails_preflight_even_if_marker_exists(self) -> None:
        with tempfile.TemporaryDirectory(prefix="quiz-server-missing-") as temp:
            root = self._root(temp)
            marker = root / server_build.MARKER
            marker.parent.mkdir(parents=True)
            marker.write_text(json.dumps({"sourceHash": server_build.source_hash(root), "gitHead": "commit-a"}), encoding="utf-8")
            with patch.object(server_build, "current_git_head", return_value="commit-a"):
                fresh, reasons = server_build.build_state(root)
            self.assertFalse(fresh)
            self.assertTrue(any("thiếu" in reason for reason in reasons))

    def test_force_rebuilds_even_when_current_marker_is_fresh(self) -> None:
        with tempfile.TemporaryDirectory(prefix="quiz-server-build-force-") as temp:
            root = self._root(temp)
            with patch.object(server_build, "current_git_head", return_value="commit-a"), \
                    patch.object(server_build, "build_bundle", side_effect=self._fake_build) as build:
                self.assertEqual(server_build.ensure_build(root), 0)
                self.assertEqual(server_build.ensure_build(root, force=True), 0)
                self.assertEqual(build.call_count, 2)


if __name__ == "__main__":
    unittest.main()
