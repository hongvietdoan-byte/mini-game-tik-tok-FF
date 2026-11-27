#!/usr/bin/env python3
"""Build and preflight the single-file source-run server bundle."""

from __future__ import annotations

import argparse
from datetime import datetime, timezone
import hashlib
import json
from pathlib import Path
import re
import subprocess
import sys


SOURCE_DIRS = (
    "apps/server/src",
    "fixtures",
    "packages/audience-engine/src",
    "packages/contracts/src",
    "packages/live-adapters/src",
    "packages/name-filter/src",
    "packages/persistence/src",
    "packages/quiz-core/src",
)
SOURCE_SUFFIXES = {".ts", ".tsx", ".mts", ".cts", ".js", ".mjs"}
CONFIG_FILES = (
    "package.json",
    "pnpm-lock.yaml",
    "apps/server/package.json",
    "packages/audience-engine/package.json",
    "packages/contracts/package.json",
    "packages/live-adapters/package.json",
    "packages/name-filter/package.json",
    "packages/persistence/package.json",
    "packages/quiz-core/package.json",
)
ENTRY = "apps/server/src/main.ts"
OUTPUT = "apps/server/dist/main.js"
MARKER = "apps/server/dist/.build-server.json"


def production_sources(root: Path) -> list[Path]:
    files: set[Path] = set()
    for relative in SOURCE_DIRS:
        directory = root / relative
        if not directory.is_dir():
            continue
        for path in directory.rglob("*"):
            if not path.is_file() or path.suffix.lower() not in SOURCE_SUFFIXES:
                continue
            if path.name.endswith((".test.ts", ".spec.ts", ".test.tsx", ".spec.tsx")):
                continue
            files.add(path)
    files.update(root / relative for relative in CONFIG_FILES if (root / relative).is_file())
    return sorted(files, key=lambda path: path.relative_to(root).as_posix())


def source_hash(root: Path) -> str:
    digest = hashlib.sha256()
    for path in production_sources(root):
        relative = path.relative_to(root).as_posix().encode("utf-8")
        digest.update(len(relative).to_bytes(4, "big"))
        digest.update(relative)
        with path.open("rb") as stream:
            for chunk in iter(lambda: stream.read(1024 * 1024), b""):
                digest.update(chunk)
    return digest.hexdigest()


def current_git_head(root: Path) -> str | None:
    try:
        result = subprocess.run(
            ["git", "-C", str(root), "rev-parse", "--verify", "HEAD"],
            check=True,
            capture_output=True,
            text=True,
        )
    except (OSError, subprocess.CalledProcessError):
        return None
    value = result.stdout.strip()
    return value or None


def artifact_state(root: Path) -> tuple[bool, list[str]]:
    output = root / OUTPUT
    marker = root / MARKER
    stale: list[str] = []
    if not output.is_file() or output.stat().st_size == 0:
        stale.append(f"{OUTPUT} thiếu hoặc rỗng")
    try:
        metadata = json.loads(marker.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        metadata = None
        stale.append(f"{MARKER} thiếu hoặc không đọc được")

    if metadata is not None:
        try:
            if metadata.get("sourceHash") != source_hash(root):
                stale.append("source server/workspace đã đổi sau lần bundle")
        except (OSError, ValueError, TypeError) as error:
            stale.append(f"không thể xác minh hash source: {error}")
    return not stale, stale


def build_state(root: Path) -> tuple[bool, list[str]]:
    fresh, stale = artifact_state(root)
    head = current_git_head(root)
    if head is None:
        stale.append("không có Git/HEAD để xác minh; cần build lại mỗi lần")
    else:
        try:
            metadata = json.loads((root / MARKER).read_text(encoding="utf-8"))
            if metadata.get("gitHead") != head:
                stale.append("bundle không được tạo từ HEAD hiện tại")
        except (OSError, json.JSONDecodeError, AttributeError):
            pass
    return fresh and not stale, stale


def find_esbuild(root: Path) -> Path | None:
    store = root / "node_modules" / ".pnpm"
    candidates = list(store.glob("esbuild@*/node_modules/esbuild/bin/esbuild")) if store.is_dir() else []

    def version_key(path: Path) -> tuple[int, ...]:
        match = re.search(r"esbuild@([0-9]+(?:\.[0-9]+)*)", str(path))
        return tuple(int(part) for part in match.group(1).split(".")) if match else ()

    for candidate in sorted(candidates, key=version_key, reverse=True):
        if candidate.is_file():
            return candidate
    return None


def build_bundle(root: Path) -> int:
    entry = root / ENTRY
    if not entry.is_file():
        print(f"[server] không tìm thấy entry {ENTRY}.")
        return 1
    esbuild = find_esbuild(root)
    if esbuild is None:
        print("[server] node_modules không có esbuild đã cài; chạy corepack pnpm install --frozen-lockfile --offline.")
        return 1

    output = root / OUTPUT
    output.parent.mkdir(parents=True, exist_ok=True)
    command = [
        "node",
        str(esbuild),
        str(entry),
        "--bundle",
        "--platform=node",
        "--target=node22",
        "--format=esm",
        "--external:better-sqlite3",
        f"--outfile={output}",
        "--log-level=warning",
    ]
    try:
        result = subprocess.run(command, cwd=root, check=False)
    except OSError as error:
        print(f"[server] không chạy được esbuild: {error}")
        return 1
    if result.returncode != 0:
        print(f"[server] bundle thất bại (mã {result.returncode}).")
        return result.returncode or 1
    if not output.is_file() or output.stat().st_size == 0:
        print(f"[server] esbuild không tạo được {OUTPUT}.")
        return 1
    return 0


def write_marker(root: Path) -> int:
    output = root / OUTPUT
    if not output.is_file() or output.stat().st_size == 0:
        print(f"[server] không ghi marker vì {OUTPUT} thiếu hoặc rỗng.")
        return 1
    metadata = {
        "version": 1,
        "sourceHash": source_hash(root),
        "gitHead": current_git_head(root),
        "createdAtUtc": datetime.now(timezone.utc).isoformat(),
        "sizeBytes": output.stat().st_size,
    }
    marker = root / MARKER
    marker.parent.mkdir(parents=True, exist_ok=True)
    temporary = marker.with_suffix(marker.suffix + ".tmp")
    temporary.write_text(json.dumps(metadata, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    temporary.replace(marker)
    return 0


def ensure_build(root: Path, *, force: bool = False) -> int:
    fresh, stale = build_state(root)
    if fresh and not force:
        print("[server] bundle khớp source và HEAD; bỏ qua build.")
        return 0
    if force and fresh:
        print("[server] đang build lại bundle theo yêu cầu phục hồi.")
    for item in stale:
        print(f"[server] cần build lại: {item}")
    print("[server] đang bundle apps/server…", flush=True)
    result = build_bundle(root)
    if result != 0:
        return result
    marker = write_marker(root)
    if marker != 0:
        return marker
    if current_git_head(root) is None:
        fresh, stale = artifact_state(root)
    else:
        fresh, stale = build_state(root)
    if not fresh:
        for item in stale:
            print(f"[server] preflight FAIL: {item}")
        return 1
    print("[server] bundle và hash source đã được xác minh.")
    return 0


def main(argv: list[str] | None = None) -> int:
    for stream in (sys.stdout, sys.stderr):
        if hasattr(stream, "reconfigure"):
            stream.reconfigure(encoding="utf-8", errors="backslashreplace")
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("action", choices=("check", "verify", "ensure"))
    parser.add_argument("--root", type=Path, default=Path(__file__).resolve().parents[1])
    parser.add_argument("--force", action="store_true", help="Build lại kể cả khi marker hiện tại còn mới.")
    args = parser.parse_args(argv)
    root = args.root.resolve()

    if args.action == "ensure":
        return ensure_build(root, force=args.force)
    if args.action == "verify":
        return write_marker(root)

    fresh, stale = build_state(root)
    if fresh:
        print("[server] bundle khớp source apps/server và workspace.")
        return 0
    for item in stale:
        print(f"[server] preflight FAIL: {item}")
    return 1


if __name__ == "__main__":
    raise SystemExit(main())
