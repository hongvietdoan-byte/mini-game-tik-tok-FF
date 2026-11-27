#!/usr/bin/env python3
"""Fail fast when pnpm @quiz links escape the current checkout."""

from __future__ import annotations

import argparse
from pathlib import Path
import sys


REPAIR_COMMAND = "corepack pnpm install --frozen-lockfile --offline"


def invalid_workspace_links(root: Path) -> list[str]:
    root = root.resolve()
    allowed_roots = [(root / "packages").resolve(), (root / "apps").resolve()]
    alias_roots = (
        root / "node_modules" / "@quiz",
        root / "node_modules" / ".pnpm" / "node_modules" / "@quiz",
    )
    errors: list[str] = []
    found = False
    for alias_root in alias_roots:
        if not alias_root.exists():
            continue
        try:
            entries = list(alias_root.iterdir())
        except OSError as error:
            errors.append(f"{alias_root.relative_to(root)} không đọc được ({error}).")
            continue
        for entry in entries:
            found = True
            try:
                target = entry.resolve(strict=True)
            except (OSError, RuntimeError):
                errors.append(f"{entry.relative_to(root)} không có đích hợp lệ.")
                continue
            if not any(target.is_relative_to(allowed) for allowed in allowed_roots):
                errors.append(f"{entry.relative_to(root)} trỏ ra ngoài apps/ và packages/ của checkout này.")
    if not found and not errors:
        errors.append("không tìm thấy liên kết node_modules/@quiz/* của checkout này.")
    return errors


def main(argv: list[str] | None = None) -> int:
    for stream in (sys.stdout, sys.stderr):
        if hasattr(stream, "reconfigure"):
            stream.reconfigure(encoding="utf-8", errors="backslashreplace")
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--root", type=Path, default=Path(__file__).resolve().parents[1])
    args = parser.parse_args(argv)
    root = args.root.resolve()
    errors = invalid_workspace_links(root)
    if not errors:
        print("[links] các liên kết @quiz nằm trong apps/ hoặc packages/ của checkout.")
        return 0
    for error in errors:
        print(f"[links] LOI: {error}")
    print(f"[links] Hãy sửa bằng lệnh: {REPAIR_COMMAND}")
    return 1


if __name__ == "__main__":
    raise SystemExit(main())
