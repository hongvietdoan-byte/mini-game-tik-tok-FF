#!/usr/bin/env python3
"""Kiểm tra dist web có hiện hữu và mới hơn commit HEAD hay không."""

from __future__ import annotations

import argparse
from pathlib import Path
import subprocess
import sys


WEB_BUILDS = ("apps/dashboard/dist", "apps/overlay/dist")


def head_timestamp(root: Path) -> float:
    result = subprocess.run(
        ["git", "-C", str(root), "log", "-1", "--format=%ct", "HEAD"],
        check=True,
        capture_output=True,
        text=True,
    )
    return float(result.stdout.strip())


def build_state(root: Path) -> tuple[bool, list[str]]:
    try:
        head = head_timestamp(root)
    except (OSError, subprocess.CalledProcessError, ValueError):
        return False, ["Không có Git/HEAD để xác minh dist; luôn build lại."]

    stale: list[str] = []
    for relative in WEB_BUILDS:
        directory = root / relative
        index = directory / "index.html"
        if not index.is_file():
            stale.append(f"{relative}/index.html thiếu")
            continue
        try:
            dist_mtime = directory.stat().st_mtime
        except OSError as error:
            stale.append(f"{relative}: không đọc được mtime ({error})")
            continue
        if dist_mtime < head:
            stale.append(f"{relative}: mtime cũ hơn HEAD")
    return not stale, stale


def main(argv: list[str] | None = None) -> int:
    for stream in (sys.stdout, sys.stderr):
        if hasattr(stream, "reconfigure"):
            stream.reconfigure(encoding="utf-8", errors="backslashreplace")
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("action", choices=("check", "verify"))
    parser.add_argument("--root", type=Path, default=Path(__file__).resolve().parents[1])
    args = parser.parse_args(argv)
    root = args.root.resolve()
    if args.action == "verify":
        missing = [f"{relative}/index.html thiếu" for relative in WEB_BUILDS if not (root / relative / "index.html").is_file()]
        if missing:
            for item in missing:
                print(f"[web] cần build lại: {item}")
            return 1
        try:
            head_timestamp(root)
        except (OSError, subprocess.CalledProcessError, ValueError):
            print("[web] verify PASS: dist tồn tại; không có Git nên lần khởi động sau sẽ build lại.")
            return 0
    try:
        fresh, stale = build_state(root)
    except RuntimeError as error:
        print(f"[web] lỗi kiểm tra dist: {error}", file=sys.stderr)
        return 2

    if fresh:
        print("[web] dashboard/overlay dist còn mới hơn HEAD.")
        return 0
    for item in stale:
        print(f"[web] cần build lại: {item}")
    return 1


if __name__ == "__main__":
    raise SystemExit(main())
