#!/usr/bin/env python3
"""Kiểm tra hash build web và build lại khi source liên quan thay đổi."""

from __future__ import annotations

import argparse
from pathlib import Path
import subprocess
import sys


WEB_BUILDS = ("apps/dashboard/dist", "apps/overlay/dist")
BUILD_MARKER = ".build-commit"
RELEVANT_PATHS = ("apps", "packages", "pnpm-lock.yaml")
NO_GIT_MARKER = "NO_GIT"


def current_head_hash(root: Path) -> str:
    result = subprocess.run(
        ["git", "-C", str(root), "rev-parse", "--verify", "HEAD"],
        check=True,
        capture_output=True,
        text=True,
    )
    commit = result.stdout.strip()
    if not commit:
        raise ValueError("Git không trả hash HEAD")
    return commit


def relevant_changes_since(root: Path, built_hash: str, head_hash: str) -> bool:
    result = subprocess.run(
        ["git", "-C", str(root), "diff", "--quiet", built_hash, head_hash, "--", *RELEVANT_PATHS],
        check=False,
    )
    if result.returncode == 0:
        return False
    if result.returncode == 1:
        return True
    raise RuntimeError(f"git diff không kiểm tra được hash build ({result.returncode})")


def build_state(root: Path) -> tuple[bool, list[str]]:
    try:
        head_hash = current_head_hash(root)
    except (OSError, subprocess.CalledProcessError, ValueError):
        return False, ["Không có Git/HEAD để xác minh dist; luôn build lại."]

    stale: list[str] = []
    for relative in WEB_BUILDS:
        directory = root / relative
        index = directory / "index.html"
        marker = directory / BUILD_MARKER
        if not index.is_file():
            stale.append(f"{relative}/index.html thiếu")
            continue
        try:
            built_hash = marker.read_text(encoding="utf-8").strip()
        except OSError:
            stale.append(f"{relative}/{BUILD_MARKER} thiếu hoặc không đọc được")
            continue
        if not built_hash or built_hash == NO_GIT_MARKER:
            stale.append(f"{relative}: thiếu hash commit khi build")
            continue
        if built_hash == head_hash:
            continue
        try:
            changed = relevant_changes_since(root, built_hash, head_hash)
        except (OSError, subprocess.CalledProcessError, RuntimeError):
            stale.append(f"{relative}: không đối chiếu được {built_hash} với HEAD")
            continue
        if changed:
            stale.append(f"{relative}: apps/packages/pnpm-lock.yaml đã đổi sau khi build")
    return not stale, stale


def write_build_markers(root: Path) -> tuple[str | None, list[str]]:
    missing = [f"{relative}/index.html thiếu" for relative in WEB_BUILDS if not (root / relative / "index.html").is_file()]
    if missing:
        return None, missing
    try:
        marker = current_head_hash(root)
    except (OSError, subprocess.CalledProcessError, ValueError):
        marker = NO_GIT_MARKER
    for relative in WEB_BUILDS:
        (root / relative / BUILD_MARKER).write_text(marker + "\n", encoding="utf-8")
    return marker, []


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
        marker, errors = write_build_markers(root)
        if errors:
            for item in errors:
                print(f"[web] cần build lại: {item}")
            return 1
        if marker == NO_GIT_MARKER:
            print("[web] verify PASS: đã ghi dist; không có Git nên lần khởi động sau sẽ build lại.")
        else:
            print(f"[web] verify PASS: đã ghi hash {marker} vào hai dist.")
        return 0

    fresh, stale = build_state(root)
    if fresh:
        print("[web] dashboard/overlay dist khớp source apps/packages/pnpm-lock.yaml.")
        return 0
    for item in stale:
        print(f"[web] cần build lại: {item}")
    return 1


if __name__ == "__main__":
    raise SystemExit(main())
