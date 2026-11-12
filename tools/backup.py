#!/usr/bin/env python3
"""Sao lưu/kiểm tra/khôi phục dữ liệu source-run của TikTok LIVE Quiz."""

from __future__ import annotations

import argparse
from datetime import datetime, timezone
import hashlib
import json
import os
from pathlib import Path, PurePosixPath
import shutil
import subprocess
import sys
import tempfile


MANIFEST_NAME = "manifest.json"
MANIFEST_VERSION = 1
BACKUP_EXCLUDES = {"_backup", "review"}


class BackupError(RuntimeError):
    pass


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def relative_path(value: str) -> PurePosixPath:
    rel = PurePosixPath(value)
    if rel.is_absolute() or not rel.parts or any(part in {"", ".", ".."} for part in rel.parts):
        raise BackupError(f"Đường dẫn trong manifest không an toàn: {value!r}")
    if rel.parts[0] not in {"data", "assets-local"}:
        raise BackupError(f"Đường dẫn ngoài phạm vi backup: {value!r}")
    if rel.parts[0] == "data" and rel.as_posix() != "data/quiz.db":
        raise BackupError(f"Chỉ chấp nhận DB data/quiz.db, nhận {value!r}")
    if rel.parts[0] == "assets-local" and any(part.lower() in BACKUP_EXCLUDES for part in rel.parts[1:-1]):
        raise BackupError(f"Asset nằm trong thư mục loại trừ: {value!r}")
    return rel


def resolved_child(root: Path, rel: PurePosixPath) -> Path:
    candidate = root.joinpath(*rel.parts).resolve()
    if not candidate.is_relative_to(root.resolve()):
        raise BackupError(f"Đường dẫn thoát khỏi thư mục cho phép: {rel.as_posix()}")
    return candidate


def read_manifest(backup: Path) -> dict:
    manifest_path = backup / MANIFEST_NAME
    try:
        manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as error:
        raise BackupError(f"Không đọc được {manifest_path}: {error}") from error
    if not isinstance(manifest, dict) or manifest.get("version") != MANIFEST_VERSION or not isinstance(manifest.get("files"), list):
        raise BackupError("Manifest sai phiên bản hoặc thiếu danh sách files.")
    if not manifest["files"]:
        raise BackupError("Manifest không có file nào để xác minh.")
    return manifest


def verify_backup(backup: Path, *, quiet: bool = False) -> tuple[bool, list[str]]:
    backup = backup.resolve()
    manifest = read_manifest(backup)
    errors: list[str] = []
    seen: set[str] = set()
    for record in manifest["files"]:
        if not isinstance(record, dict) or not isinstance(record.get("path"), str):
            errors.append("Manifest có bản ghi file sai cấu trúc.")
            continue
        try:
            rel = relative_path(record["path"])
            key = rel.as_posix()
            if key in seen:
                errors.append(f"Manifest lặp đường dẫn {key}.")
                continue
            seen.add(key)
            path = resolved_child(backup, rel)
            if not path.is_file():
                errors.append(f"Thiếu file: {key}")
                continue
            actual_size = path.stat().st_size
            if actual_size != record.get("sizeBytes"):
                errors.append(f"Sai kích thước {key}: manifest={record.get('sizeBytes')} thực={actual_size}")
            actual_hash = sha256_file(path)
            if actual_hash != record.get("sha256"):
                errors.append(f"Sai SHA-256: {key}")
        except (OSError, BackupError) as error:
            errors.append(str(error))

    if not any(key == "data/quiz.db" for key in seen):
        errors.append("Manifest thiếu data/quiz.db.")
    if not quiet:
        if errors:
            print("verify FAIL:")
            for error in errors:
                print(f"  - {error}")
        else:
            print(f"verify PASS: {len(seen)} tệp, SHA-256 và kích thước khớp.")
    return not errors, errors


def sqlite_backup(source_path: Path, destination_path: Path) -> None:
    """Gọi Store.backup(), dùng SQLite Online Backup API để gồm cả WAL đã commit."""
    if not source_path.is_file():
        raise BackupError(f"Không tìm thấy database: {source_path}")
    destination_path.parent.mkdir(parents=True, exist_ok=True)
    helper = Path(__file__).resolve().with_name("backup_db.ts")
    repo_root = helper.parent.parent
    try:
        subprocess.run(
            ["node", "--import", "tsx", str(helper), str(source_path.resolve()), str(destination_path.resolve())],
            cwd=repo_root,
            check=True,
        )
    except (OSError, subprocess.CalledProcessError) as error:
        raise BackupError(f"Store.backup() không hoàn tất: {error}") from error
    if not destination_path.is_file():
        raise BackupError(f"SQLite không tạo được bản sao: {destination_path}")


def asset_files(assets_root: Path) -> list[tuple[Path, str]]:
    files: list[tuple[Path, str]] = []
    if not assets_root.exists():
        return files
    for directory, names, filenames in os.walk(assets_root, followlinks=False):
        names[:] = [name for name in names if name.lower() not in BACKUP_EXCLUDES and not (Path(directory) / name).is_symlink()]
        for filename in filenames:
            source = Path(directory) / filename
            if source.is_symlink() or not source.is_file():
                continue
            relative = source.relative_to(assets_root.parent).as_posix()
            files.append((source, relative))
    return sorted(files, key=lambda pair: pair[1])


def make_backup(root: Path, output_dir: Path | None = None) -> Path | None:
    root = root.resolve()
    database = root / "data" / "quiz.db"
    assets_root = root / "assets-local"
    if not database.is_file():
        print(f"backup SKIP: chưa có database source-run: {database}; bỏ qua backup ở lần khởi động đầu.")
        return None
    if not assets_root.is_dir():
        raise BackupError(f"Không tìm thấy thư mục asset cục bộ: {assets_root}")

    backup_base = (output_dir or (root / "backups")).resolve()
    stamp = datetime.now().strftime("%Y%m%d-%H%M%S")
    destination = backup_base / stamp
    suffix = 1
    while destination.exists():
        destination = backup_base / f"{stamp}-{suffix:02d}"
        suffix += 1
    destination.mkdir(parents=True, exist_ok=False)

    try:
        records: list[dict[str, object]] = []
        db_copy = destination / "data" / "quiz.db"
        sqlite_backup(database, db_copy)
        records.append({
            "path": "data/quiz.db",
            "sizeBytes": db_copy.stat().st_size,
            "sha256": sha256_file(db_copy),
        })

        for source, relative in asset_files(assets_root):
            rel = relative_path(relative)
            target = resolved_child(destination, rel)
            target.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(source, target)
            records.append({"path": rel.as_posix(), "sizeBytes": target.stat().st_size, "sha256": sha256_file(target)})

        manifest = {
            "version": MANIFEST_VERSION,
            "createdAtUtc": datetime.now(timezone.utc).isoformat(),
            "sourceRoot": str(root),
            "files": records,
        }
        (destination / MANIFEST_NAME).write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        print(f"backup PASS: {len(records)} tệp → {destination}")
        return destination
    except (BackupError, OSError, subprocess.SubprocessError):
        shutil.rmtree(destination, ignore_errors=True)
        raise


def confirm_restore(backup: Path, root: Path, assume_yes: bool) -> None:
    if assume_yes:
        return
    print(f"Nguồn backup: {backup.resolve()}")
    print(f"Đích khôi phục: {root.resolve() / 'data' / 'quiz.db'} và assets-local/")
    print("Hãy đóng CHAY_GAME/server trước khi khôi phục để tránh mất ghi đang mở.")
    try:
        answer = input("Gõ KHÔI_PHỤC để xác nhận: ").strip()
    except EOFError as error:
        raise BackupError("Thiếu xác nhận tương tác; chỉ dùng --yes khi đã chủ động xác nhận.") from error
    if answer != "KHÔI_PHỤC":
        raise BackupError("Đã huỷ khôi phục; chưa thay đổi dữ liệu.")


def restore_database(source: Path, destination: Path) -> None:
    destination.parent.mkdir(parents=True, exist_ok=True)
    fd, temporary_name = tempfile.mkstemp(prefix="quiz-restore-", suffix=".db", dir=destination.parent)
    os.close(fd)
    temporary = Path(temporary_name)
    temporary.unlink(missing_ok=True)
    try:
        sqlite_backup(source, temporary)
        for suffix in ("-wal", "-shm"):
            sidecar = Path(str(destination) + suffix)
            if sidecar.exists():
                sidecar.unlink()
        os.replace(temporary, destination)
    finally:
        temporary.unlink(missing_ok=True)


def restore_backup(backup: Path, root: Path, assume_yes: bool) -> None:
    backup = backup.resolve()
    root = root.resolve()
    valid, errors = verify_backup(backup, quiet=True)
    if not valid:
        raise BackupError("Backup không hợp lệ; từ chối restore: " + "; ".join(errors))
    confirm_restore(backup, root, assume_yes)
    manifest = read_manifest(backup)
    restored = 0
    for record in manifest["files"]:
        rel = relative_path(record["path"])
        source = resolved_child(backup, rel)
        destination = resolved_child(root, rel)
        if rel.as_posix() == "data/quiz.db":
            restore_database(source, destination)
        else:
            destination.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(source, destination)
        restored += 1
    print(f"restore PASS: {restored} tệp → {root}")


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="Sao lưu nhất quán DB SQLite và assets-local.")
    subparsers = parser.add_subparsers(dest="command", required=True)

    create = subparsers.add_parser("create", help="Tạo backup có manifest SHA-256.")
    create.add_argument("--root", type=Path, default=Path.cwd(), help="Checkout có data/ và assets-local/ (mặc định: thư mục hiện tại).")
    create.add_argument("--output-dir", type=Path, help="Thư mục chứa backup (mặc định: <root>/backups; hữu ích cho kiểm thử).")

    verify = subparsers.add_parser("verify", help="Đối chiếu size/SHA-256 theo manifest.")
    verify.add_argument("--from", dest="backup", type=Path, required=True, help="Thư mục backup.")

    restore = subparsers.add_parser("restore", help="Khôi phục sau xác nhận tường minh.")
    restore.add_argument("--from", dest="backup", type=Path, required=True, help="Thư mục backup đã verify.")
    restore.add_argument("--root", type=Path, default=Path.cwd(), help="Đích checkout (mặc định: thư mục hiện tại).")
    restore.add_argument("--yes", action="store_true", help="Xác nhận có chủ đích cho chạy tự động/kiểm thử.")
    return parser


def main(argv: list[str] | None = None) -> int:
    for stream in (sys.stdout, sys.stderr):
        if hasattr(stream, "reconfigure"):
            stream.reconfigure(encoding="utf-8", errors="backslashreplace")
    args = build_parser().parse_args(argv)
    try:
        if args.command == "create":
            make_backup(args.root, args.output_dir)
            return 0
        if args.command == "verify":
            return 0 if verify_backup(args.backup)[0] else 1
        if args.command == "restore":
            restore_backup(args.backup, args.root, args.yes)
            return 0
    except (BackupError, OSError, subprocess.SubprocessError) as error:
        print(f"backup FAIL: {error}", file=sys.stderr)
        return 1
    return 2


if __name__ == "__main__":
    raise SystemExit(main())
