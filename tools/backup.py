#!/usr/bin/env python3
"""Sao lưu/kiểm tra/khôi phục dữ liệu source-run của TikTok LIVE Quiz."""

from __future__ import annotations

import argparse
import ctypes
from datetime import datetime, timezone
import hashlib
import json
import os
from pathlib import Path, PurePosixPath
import re
import shutil
import socket
import sqlite3
import subprocess
import sys
import tempfile
from ctypes import wintypes


MANIFEST_NAME = "manifest.json"
MANIFEST_VERSION = 2
SUPPORTED_MANIFEST_VERSIONS = {1, MANIFEST_VERSION}
BACKUP_EXCLUDES = {"_backup", "review"}


class BackupError(RuntimeError):
    pass


class InsufficientSpaceError(BackupError):
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
    if (
        not isinstance(manifest, dict)
        or manifest.get("version") not in SUPPORTED_MANIFEST_VERSIONS
        or not isinstance(manifest.get("files"), list)
    ):
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
            recorded_mtime = record.get("mtimeNs")
            if recorded_mtime is not None and path.stat().st_mtime_ns != recorded_mtime:
                errors.append(f"Sai thời gian sửa {key} so với manifest.")
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
    """Dùng SQLite Online Backup API qua connection readonly, gồm cả WAL đã commit."""
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
        raise BackupError(f"Sao lưu SQLite không hoàn tất: {error}") from error
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


def prune_backups(backup_base: Path, keep: int = 10) -> int:
    if keep < 1:
        raise BackupError("Số bản backup cần giữ phải từ 1 trở lên.")
    if not backup_base.is_dir():
        return 0
    valid_name = re.compile(r"^\d{8}-\d{6}(?:-\d+)?$")
    candidates = [
        path for path in backup_base.iterdir()
        if valid_name.fullmatch(path.name) and path.is_dir() and not path.is_symlink()
    ]
    candidates.sort(key=lambda path: (path.stat().st_mtime_ns, path.name))
    removed = 0
    for stale in candidates[:-keep]:
        shutil.rmtree(stale)
        removed += 1
    return removed


def _timestamp_backups(backup_base: Path) -> list[Path]:
    if not backup_base.is_dir():
        return []
    valid_name = re.compile(r"^\d{8}-\d{6}(?:-\d+)?$")
    candidates = [
        path for path in backup_base.iterdir()
        if valid_name.fullmatch(path.name) and path.is_dir() and not path.is_symlink()
    ]
    candidates.sort(key=lambda path: (path.stat().st_mtime_ns, path.name))
    return candidates


def _verified_incremental_base(backup_base: Path) -> tuple[Path | None, dict[str, dict[str, object]]]:
    """Use only the newest intact v2 backup; a damaged newest backup forces a full copy."""
    candidates = _timestamp_backups(backup_base)
    if not candidates:
        return None, {}

    latest = candidates[-1]
    try:
        manifest = read_manifest(latest)
        if manifest.get("version") != MANIFEST_VERSION:
            return None, {}

        indexed: dict[str, dict[str, object]] = {}
        for record in manifest["files"]:
            if not isinstance(record, dict) or not isinstance(record.get("path"), str):
                return None, {}
            rel = relative_path(record["path"])
            key = rel.as_posix()
            if key in indexed:
                return None, {}
            prior_file = resolved_child(latest, rel)
            if not prior_file.is_file():
                return None, {}
            stat = prior_file.stat()
            if stat.st_size != record.get("sizeBytes"):
                return None, {}
            if key.startswith("assets-local/"):
                mtime_ns = record.get("mtimeNs")
                sha256 = record.get("sha256")
                if not isinstance(mtime_ns, int) or not isinstance(sha256, str) or not sha256:
                    return None, {}
                if stat.st_mtime_ns != mtime_ns:
                    return None, {}
            indexed[key] = record

        if "data/quiz.db" not in indexed:
            return None, {}
        if manifest.get("assetCount") != len(indexed) - 1:
            return None, {}
        return latest, indexed
    except (OSError, BackupError, TypeError, ValueError):
        return None, {}


def _is_ntfs(path: Path) -> bool:
    if os.name != "nt":
        return False
    try:
        root = path.resolve().anchor
        filesystem = ctypes.create_unicode_buffer(64)
        get_volume_information = ctypes.WinDLL("kernel32", use_last_error=True).GetVolumeInformationW
        get_volume_information.argtypes = [
            wintypes.LPCWSTR,
            wintypes.LPWSTR,
            wintypes.DWORD,
            ctypes.POINTER(wintypes.DWORD),
            ctypes.POINTER(wintypes.DWORD),
            ctypes.POINTER(wintypes.DWORD),
            wintypes.LPWSTR,
            wintypes.DWORD,
        ]
        get_volume_information.restype = wintypes.BOOL
        if not get_volume_information(root, None, 0, None, None, None, filesystem, len(filesystem)):
            return False
        return filesystem.value.upper() == "NTFS"
    except (AttributeError, OSError, ValueError):
        return False


def hardlinks_supported(source_root: Path, backup_base: Path) -> bool:
    """Allow immutable snapshot-to-snapshot links on the same NTFS volume only.

    The live source is always copied into a backup first and is never a hardlink
    target, so edits to an asset in the checkout cannot mutate an older backup.
    """
    if os.name != "nt":
        return False
    try:
        if os.stat(source_root).st_dev != os.stat(backup_base).st_dev:
            return False
    except OSError:
        return False
    return _is_ntfs(source_root) and _is_ntfs(backup_base)


def _is_no_space(error: OSError) -> bool:
    return error.errno in {28, 39, 112} or getattr(error, "winerror", None) in {39, 112}


def make_backup(root: Path, output_dir: Path | None = None, *, keep: int = 10) -> Path | None:
    root = root.resolve()
    database = root / "data" / "quiz.db"
    assets_root = root / "assets-local"
    if not database.is_file():
        print(f"backup SKIP: chưa có database source-run: {database}; bỏ qua backup ở lần khởi động đầu.")
        return None
    if not assets_root.is_dir():
        raise BackupError(f"Không tìm thấy thư mục asset cục bộ: {assets_root}")
    if keep < 1:
        raise BackupError("Số bản backup cần giữ phải từ 1 trở lên.")

    backup_base = (output_dir or (root / "backups")).resolve()
    backup_base.mkdir(parents=True, exist_ok=True)
    assets = asset_files(assets_root)
    previous_backup, previous_records = _verified_incremental_base(backup_base)
    allow_hardlinks = bool(previous_backup and hardlinks_supported(assets_root, backup_base))
    required_bytes = database.stat().st_size + 64 * 1024
    for suffix in ("-wal", "-shm"):
        sidecar = Path(str(database) + suffix)
        if sidecar.is_file():
            required_bytes += sidecar.stat().st_size
    changed_assets: list[tuple[Path, str, os.stat_result, dict[str, object] | None]] = []
    for source, relative in assets:
        stat = source.stat()
        prior = previous_records.get(relative) if previous_backup else None
        unchanged = bool(
            prior
            and prior.get("sizeBytes") == stat.st_size
            and prior.get("mtimeNs") == stat.st_mtime_ns
        )
        prior_file = resolved_child(previous_backup, relative_path(relative)) if unchanged and previous_backup else None
        if prior_file is not None:
            try:
                prior_stat = prior_file.stat()
                unchanged = prior_file.is_file() and prior_stat.st_size == stat.st_size and prior_stat.st_mtime_ns == stat.st_mtime_ns
            except OSError:
                unchanged = False
        if not unchanged or not allow_hardlinks:
            required_bytes += stat.st_size
        changed_assets.append((source, relative, stat, prior if unchanged else None))
    free_bytes = shutil.disk_usage(backup_base).free
    if free_bytes < required_bytes:
        raise InsufficientSpaceError(
            f"Không đủ dung lượng trống: cần khoảng {required_bytes} byte, còn {free_bytes} byte."
        )

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

        for source, relative, source_stat, prior in changed_assets:
            rel = relative_path(relative)
            target = resolved_child(destination, rel)
            target.parent.mkdir(parents=True, exist_ok=True)
            sha256 = ""
            linked = False
            if prior is not None and previous_backup is not None and allow_hardlinks:
                prior_file = resolved_child(previous_backup, rel)
                try:
                    os.link(prior_file, target)
                    sha256 = str(prior["sha256"])
                    linked = True
                except OSError:
                    # FAT/exFAT, permissions, or filesystem policy: fall back to a normal copy.
                    pass
            if not linked:
                shutil.copy2(source, target)
                sha256 = sha256_file(target)
            records.append({
                "path": rel.as_posix(),
                "sizeBytes": source_stat.st_size,
                "mtimeNs": source_stat.st_mtime_ns,
                "sha256": sha256,
            })

        manifest = {
            "version": MANIFEST_VERSION,
            "createdAtUtc": datetime.now(timezone.utc).isoformat(),
            "sourceRoot": str(root),
            "assetCount": len(assets),
            "files": records,
        }
        (destination / MANIFEST_NAME).write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        try:
            prune_backups(backup_base, keep)
        except OSError as error:
            print(f"backup WARN: không dọn được bản cũ trong {backup_base}: {error}", file=sys.stderr)
        print(f"backup PASS: {len(records)} tệp → {destination}")
        return destination
    except (BackupError, OSError, subprocess.SubprocessError) as error:
        shutil.rmtree(destination, ignore_errors=True)
        if isinstance(error, OSError) and _is_no_space(error):
            raise InsufficientSpaceError("Không đủ dung lượng trống để hoàn tất bản backup.") from error
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


def server_is_listening(port: int = 8787) -> bool:
    try:
        with socket.create_connection(("127.0.0.1", port), timeout=0.3):
            return True
    except ConnectionRefusedError:
        return False
    except OSError as error:
        # Không thể xác minh trạng thái thì fail closed để tránh restore khi server còn hoạt động.
        raise BackupError(f"Không xác minh được cổng {port}; hãy đóng server rồi thử lại: {error}") from error


def database_is_locked(database: Path) -> bool:
    if not database.is_file():
        return False
    connection: sqlite3.Connection | None = None
    try:
        connection = sqlite3.connect(database.as_uri() + "?mode=rw", uri=True, timeout=0)
        connection.execute("BEGIN EXCLUSIVE")
        connection.rollback()
        return False
    except sqlite3.OperationalError as error:
        message = str(error).lower()
        if "locked" in message or "busy" in message:
            return True
        raise BackupError(f"Không xác minh được trạng thái khóa của DB {database}: {error}") from error
    finally:
        if connection is not None:
            connection.close()


def ensure_restore_safe(root: Path, port: int = 8787) -> None:
    if server_is_listening(port):
        raise BackupError(f"Cổng {port} đang mở; hãy tắt CHAY_GAME/server trước khi restore.")
    database = root / "data" / "quiz.db"
    if database_is_locked(database):
        raise BackupError(f"Database đang bị khóa: {database}; hãy đóng chương trình đang dùng DB trước khi restore.")


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


def prune_extra_assets(root: Path, manifest: dict) -> int:
    """Xóa asset không có trong manifest, không đi xuyên symlink hay thư mục bị loại trừ."""
    assets_root = root / "assets-local"
    if not assets_root.is_dir():
        return 0
    if assets_root.is_symlink():
        raise BackupError("Từ chối mirror assets-local vì thư mục đích là symlink.")
    expected = {
        relative_path(record["path"]).parts[1:]
        for record in manifest["files"]
        if isinstance(record, dict) and isinstance(record.get("path"), str)
        and relative_path(record["path"]).parts[0] == "assets-local"
    }
    removed = 0
    for directory, names, filenames in os.walk(assets_root, topdown=True, followlinks=False):
        names[:] = [
            name for name in names
            if name.lower() not in BACKUP_EXCLUDES and not (Path(directory) / name).is_symlink()
        ]
        for filename in filenames:
            candidate = Path(directory) / filename
            rel = candidate.relative_to(assets_root).parts
            if rel in expected:
                continue
            try:
                candidate.unlink()
                removed += 1
            except FileNotFoundError:
                pass

    for directory, names, _ in os.walk(assets_root, topdown=False, followlinks=False):
        candidate = Path(directory)
        if candidate == assets_root or candidate.name.lower() in BACKUP_EXCLUDES or candidate.is_symlink():
            continue
        try:
            candidate.rmdir()
        except OSError:
            pass
    return removed


def restore_backup(backup: Path, root: Path, assume_yes: bool, *, port: int = 8787, mirror: bool = False) -> None:
    backup = backup.resolve()
    root = root.resolve()
    valid, errors = verify_backup(backup, quiet=True)
    if not valid:
        raise BackupError("Backup không hợp lệ; từ chối restore: " + "; ".join(errors))
    ensure_restore_safe(root, port)
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
    removed = prune_extra_assets(root, manifest) if mirror else 0
    if mirror:
        print(f"restore mirror: đã xóa {removed} asset ngoài manifest (giữ _backup/ và review/).")
    print(f"restore PASS: {restored} tệp → {root}")


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="Sao lưu nhất quán DB SQLite và assets-local.")
    subparsers = parser.add_subparsers(dest="command", required=True)

    create = subparsers.add_parser("create", help="Tạo backup có manifest SHA-256.")
    create.add_argument("--root", type=Path, default=Path.cwd(), help="Checkout có data/ và assets-local/ (mặc định: thư mục hiện tại).")
    create.add_argument("--output-dir", type=Path, help="Thư mục chứa backup (mặc định: <root>/backups; hữu ích cho kiểm thử).")
    create.add_argument("--keep", type=int, default=10, help="Số bản backup gần nhất cần giữ (mặc định: 10).")

    verify = subparsers.add_parser("verify", help="Đối chiếu size/SHA-256 theo manifest.")
    verify.add_argument("--from", dest="backup", type=Path, required=True, help="Thư mục backup.")

    restore = subparsers.add_parser("restore", help="Khôi phục sau xác nhận tường minh.")
    restore.add_argument("--from", dest="backup", type=Path, required=True, help="Thư mục backup đã verify.")
    restore.add_argument("--root", type=Path, default=Path.cwd(), help="Đích checkout (mặc định: thư mục hiện tại).")
    restore.add_argument("--yes", action="store_true", help="Xác nhận có chủ đích cho chạy tự động/kiểm thử.")
    restore.add_argument("--mirror", action="store_true", help="Xóa asset-local ngoài manifest; giữ thư mục _backup/ và review/.")
    return parser


def main(argv: list[str] | None = None) -> int:
    for stream in (sys.stdout, sys.stderr):
        if hasattr(stream, "reconfigure"):
            stream.reconfigure(encoding="utf-8", errors="backslashreplace")
    args = build_parser().parse_args(argv)
    try:
        if args.command == "create":
            make_backup(args.root, args.output_dir, keep=args.keep)
            return 0
        if args.command == "verify":
            return 0 if verify_backup(args.backup)[0] else 1
        if args.command == "restore":
            restore_backup(args.backup, args.root, args.yes, mirror=args.mirror)
            return 0
    except InsufficientSpaceError as error:
        print(f"backup FAIL: {error}", file=sys.stderr)
        return 2
    except (BackupError, OSError, subprocess.SubprocessError) as error:
        print(f"backup FAIL: {error}", file=sys.stderr)
        return 1
    return 2


if __name__ == "__main__":
    raise SystemExit(main())
