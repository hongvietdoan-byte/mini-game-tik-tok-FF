from __future__ import annotations

from contextlib import redirect_stdout
from io import StringIO
import os
from pathlib import Path
import subprocess
import tempfile
import unittest

from tools import check_workspace_links


class WorkspaceLinkTests(unittest.TestCase):
    def _link(self, target: Path, link: Path) -> None:
        if os.name == "nt":
            result = subprocess.run(
                ["cmd.exe", "/d", "/c", "mklink", "/J", str(link), str(target)],
                capture_output=True,
                text=True,
                check=False,
            )
            if result.returncode == 0:
                return
        try:
            os.symlink(target, link, target_is_directory=True)
        except (OSError, NotImplementedError) as error:
            self.skipTest(f"directory symlinks are unavailable: {error}")

    def test_checkout_workspace_link_passes(self) -> None:
        with tempfile.TemporaryDirectory(prefix="quiz-link-checkout-") as temp:
            root = Path(temp)
            target = root / "packages" / "contracts"
            target.mkdir(parents=True)
            aliases = root / "node_modules" / "@quiz"
            aliases.mkdir(parents=True)
            self._link(target, aliases / "contracts")
            self.assertEqual(check_workspace_links.invalid_workspace_links(root), [])

    def test_fake_worktree_link_fails_and_prints_repair_command(self) -> None:
        with tempfile.TemporaryDirectory(prefix="quiz-link-fake-worktree-") as temp:
            root = Path(temp) / "checkout"
            outside = Path(temp) / "fake-worktree" / "packages" / "contracts"
            (root / "packages").mkdir(parents=True)
            outside.mkdir(parents=True)
            aliases = root / "node_modules" / "@quiz"
            aliases.mkdir(parents=True)
            self._link(outside, aliases / "contracts")
            errors = check_workspace_links.invalid_workspace_links(root)
            self.assertEqual(len(errors), 1)
            output = StringIO()
            with redirect_stdout(output):
                result = check_workspace_links.main(["--root", str(root)])
            self.assertEqual(result, 1)
            self.assertIn(check_workspace_links.REPAIR_COMMAND, output.getvalue())
            self.assertIn("LOI", output.getvalue())

    def test_pnpm_virtual_store_aliases_are_checked_too(self) -> None:
        with tempfile.TemporaryDirectory(prefix="quiz-link-pnpm-store-") as temp:
            root = Path(temp) / "checkout"
            outside = Path(temp) / "stale" / "apps" / "server"
            (root / "packages").mkdir(parents=True)
            outside.mkdir(parents=True)
            aliases = root / "node_modules" / ".pnpm" / "node_modules" / "@quiz"
            aliases.mkdir(parents=True)
            self._link(outside, aliases / "server")
            errors = check_workspace_links.invalid_workspace_links(root)
            self.assertEqual(len(errors), 1)
            self.assertIn(".pnpm", errors[0])


if __name__ == "__main__":
    unittest.main()
