from __future__ import annotations

from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch

from tools import web_build


class WebBuildNoGitTests(unittest.TestCase):
    def test_missing_git_always_requests_a_rebuild(self) -> None:
        with tempfile.TemporaryDirectory(prefix="quiz-web-no-git-") as temp:
            root = Path(temp)
            for relative in web_build.WEB_BUILDS:
                index = root / relative / "index.html"
                index.parent.mkdir(parents=True)
                index.write_text("dist", encoding="utf-8")

            with patch.object(web_build, "head_timestamp", side_effect=FileNotFoundError("git")):
                fresh, reasons = web_build.build_state(root)

            self.assertFalse(fresh)
            self.assertIn("Không có Git/HEAD để xác minh dist; luôn build lại.", reasons)

    def test_verify_accepts_complete_build_without_git(self) -> None:
        with tempfile.TemporaryDirectory(prefix="quiz-web-verify-no-git-") as temp:
            root = Path(temp)
            for relative in web_build.WEB_BUILDS:
                index = root / relative / "index.html"
                index.parent.mkdir(parents=True)
                index.write_text("dist", encoding="utf-8")

            with patch.object(web_build, "head_timestamp", side_effect=FileNotFoundError("git")):
                self.assertEqual(web_build.main(["verify", "--root", str(root)]), 0)


if __name__ == "__main__":
    unittest.main()
