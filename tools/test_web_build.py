from __future__ import annotations

from contextlib import redirect_stdout
import io
from pathlib import Path
import subprocess
try:
    from test_support import repo_temp_directory
except ImportError:
    from tools.test_support import repo_temp_directory
import unittest
from unittest.mock import patch

from tools import web_build


class WebBuildNoGitTests(unittest.TestCase):
    def seed_dist(self, root: Path, marker: str) -> None:
        for relative in web_build.WEB_BUILDS:
            directory = root / relative
            directory.mkdir(parents=True)
            (directory / "index.html").write_text("dist", encoding="utf-8")
            (directory / web_build.BUILD_MARKER).write_text(marker + "\n", encoding="utf-8")

    def test_missing_git_always_requests_a_rebuild(self) -> None:
        with repo_temp_directory(prefix="quiz-web-no-git-") as temp:
            root = Path(temp)
            self.seed_dist(root, "old-build")

            with patch.object(web_build, "current_head_hash", side_effect=FileNotFoundError("git")):
                fresh, reasons = web_build.build_state(root)

            self.assertFalse(fresh)
            self.assertIn("Không có Git/HEAD để xác minh dist; luôn build lại.", reasons)

    def test_verify_accepts_complete_build_without_git(self) -> None:
        with repo_temp_directory(prefix="quiz-web-verify-no-git-") as temp:
            root = Path(temp)
            for relative in web_build.WEB_BUILDS:
                index = root / relative / "index.html"
                index.parent.mkdir(parents=True)
                index.write_text("dist", encoding="utf-8")

            with patch.object(web_build, "current_head_hash", side_effect=FileNotFoundError("git")):
                self.assertEqual(web_build.main(["verify", "--root", str(root)]), 0)
            for relative in web_build.WEB_BUILDS:
                self.assertEqual((root / relative / web_build.BUILD_MARKER).read_text(encoding="utf-8").strip(), web_build.NO_GIT_MARKER)


class WebBuildHashTests(unittest.TestCase):
    def seed_dist(self, root: Path, marker: str) -> None:
        for relative in web_build.WEB_BUILDS:
            directory = root / relative
            directory.mkdir(parents=True)
            (directory / "index.html").write_text("dist", encoding="utf-8")
            (directory / web_build.BUILD_MARKER).write_text(marker + "\n", encoding="utf-8")

    def test_same_hash_is_fresh(self) -> None:
        with repo_temp_directory(prefix="quiz-web-same-hash-") as temp:
            root = Path(temp)
            self.seed_dist(root, "head")
            with patch.object(web_build, "current_head_hash", return_value="head"):
                self.assertEqual(web_build.build_state(root), (True, []))

    def test_old_hash_without_relevant_changes_is_fresh(self) -> None:
        with repo_temp_directory(prefix="quiz-web-doc-change-") as temp:
            root = Path(temp)
            self.seed_dist(root, "built")
            with (
                patch.object(web_build, "current_head_hash", return_value="head"),
                patch.object(web_build, "relevant_changes_since", return_value=False),
            ):
                self.assertEqual(web_build.build_state(root), (True, []))

    def test_relevant_source_change_requires_build(self) -> None:
        with repo_temp_directory(prefix="quiz-web-source-change-") as temp:
            root = Path(temp)
            self.seed_dist(root, "built")
            with (
                patch.object(web_build, "current_head_hash", return_value="head"),
                patch.object(web_build, "relevant_changes_since", return_value=True),
            ):
                fresh, stale = web_build.build_state(root)
            self.assertFalse(fresh)
            self.assertEqual(len(stale), 2)
            self.assertTrue(all("apps/packages/pnpm-lock.yaml đã đổi" in item for item in stale))


class WebBuildEnsureTests(unittest.TestCase):
    def test_fresh_dist_skips_build_and_verify(self) -> None:
        with repo_temp_directory(prefix="quiz-web-ensure-fresh-") as temp:
            root = Path(temp)
            with (
                redirect_stdout(io.StringIO()) as output,
                patch.object(web_build, "build_state", return_value=(True, [])),
                patch.object(web_build.subprocess, "run") as run,
            ):
                self.assertEqual(web_build.ensure_build(root), 0)

            run.assert_not_called()
            self.assertIn("bỏ qua build", output.getvalue())

    def test_stale_dist_builds_then_verifies(self) -> None:
        with repo_temp_directory(prefix="quiz-web-ensure-stale-") as temp:
            root = Path(temp)
            with (
                redirect_stdout(io.StringIO()) as output,
                patch.object(web_build, "build_state", return_value=(False, ["overlay dist cũ"])),
                patch.object(
                    web_build.subprocess,
                    "run",
                    side_effect=[subprocess.CompletedProcess("build", 0), subprocess.CompletedProcess("verify", 0)],
                ) as run,
            ):
                self.assertEqual(web_build.ensure_build(root), 0)

            self.assertEqual(run.call_count, 2)
            self.assertEqual(run.call_args_list[0].args[0], "corepack pnpm build:web")
            self.assertTrue(run.call_args_list[0].kwargs["shell"])
            verify_command = run.call_args_list[1].args[0]
            self.assertEqual(verify_command[1], str(Path(web_build.__file__).resolve()))
            self.assertEqual(verify_command[2], "verify")
            self.assertEqual(verify_command[4], str(root))
            self.assertIn("Đang cập nhật giao diện…", output.getvalue())

    def test_build_failure_stops_before_verify(self) -> None:
        with repo_temp_directory(prefix="quiz-web-ensure-build-fail-") as temp:
            with (
                redirect_stdout(io.StringIO()),
                patch.object(web_build, "build_state", return_value=(False, ["dashboard dist thiếu"])),
                patch.object(
                    web_build.subprocess,
                    "run",
                    return_value=subprocess.CompletedProcess("build", 1),
                ) as run,
            ):
                self.assertEqual(web_build.ensure_build(Path(temp)), 1)

            run.assert_called_once()

    def test_verify_failure_is_returned_to_launcher(self) -> None:
        with repo_temp_directory(prefix="quiz-web-ensure-verify-fail-") as temp:
            with (
                redirect_stdout(io.StringIO()),
                patch.object(web_build, "build_state", return_value=(False, ["overlay dist thiếu"])),
                patch.object(
                    web_build.subprocess,
                    "run",
                    side_effect=[subprocess.CompletedProcess("build", 0), subprocess.CompletedProcess("verify", 1)],
                ) as run,
            ):
                self.assertEqual(web_build.ensure_build(Path(temp)), 1)

            self.assertEqual(run.call_count, 2)


if __name__ == "__main__":
    unittest.main()
