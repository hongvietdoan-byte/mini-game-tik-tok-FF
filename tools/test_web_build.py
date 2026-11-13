from __future__ import annotations

from pathlib import Path
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


if __name__ == "__main__":
    unittest.main()
