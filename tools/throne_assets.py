#!/usr/bin/env python3
"""Kiểm tra và dựng contact sheet ngai vàng trong assets-local/throne."""
from __future__ import annotations

import argparse
import json
import re
import sys
from dataclasses import asdict, dataclass
from pathlib import Path
from typing import Any

import numpy as np
from PIL import Image, ImageDraw, ImageFont

CANVAS_SIZE = (800, 800)
CORNER_SIZE = 10
ALPHA_THRESHOLD = 128
SEARCH_RADIUS = 16
POSITION_OK_PX = 4
POSITION_REVIEW_PX = 8
COLOR_OK_MEAN_ABS_DIFF = 18.0
COLOR_REVIEW_MEAN_ABS_DIFF = 30.0
DEFAULT_CENTER = (200, 120, 600, 700)
SHEET_COLUMNS = 8
SHEET_CELL = 200
ID_PATTERN = re.compile(r"^[a-z0-9][a-z0-9-]{0,79}$")
THRONE_FILENAME = re.compile(r"^ngai-(?P<id>[a-z0-9][a-z0-9-]{0,79})\.png$", re.IGNORECASE)
ALLOWED_SUPPORT_FILES = {"ngai-trong.png", "manifest.json", "contact-sheet.png", "danh-sach.txt", "huong-dan.md"}


@dataclass
class AssetResult:
    filename: str
    character_id: str | None
    width: int | None
    height: int | None
    mode: str | None
    corner_alpha_clear: bool | None
    dx: int | None
    dy: int | None
    color_diff: float | None
    conclusion: str
    issues: list[str]

    @property
    def failed(self) -> bool:
        return "LỆCH" in self.conclusion or "KÍCH THƯỚC SAI" in self.conclusion


@dataclass
class CheckReport:
    asset_dir: Path
    manifest_path: Path
    center: tuple[int, int, int, int]
    expected_ids: list[str]
    results: list[AssetResult]
    missing: list[str]
    extras: list[str]
    summary: dict[str, int]
    exit_code: int


def workspace_root(start: Path | None = None) -> Path:
    current = (start or Path.cwd()).resolve()
    for candidate in (current, *current.parents):
        if (candidate / "assets-local" / "chibi" / "manifest.json").is_file():
            return candidate
    return current


def parse_center(value: str) -> tuple[int, int, int, int]:
    try:
        coords = tuple(int(part.strip()) for part in value.split(","))
    except ValueError as error:
        raise argparse.ArgumentTypeError("--center cần dạng x0,y0,x1,y1 với số nguyên.") from error
    if len(coords) != 4:
        raise argparse.ArgumentTypeError("--center cần đúng bốn tọa độ x0,y0,x1,y1.")
    x0, y0, x1, y1 = coords
    if not (0 <= x0 < x1 <= CANVAS_SIZE[0] and 0 <= y0 < y1 <= CANVAS_SIZE[1]):
        raise argparse.ArgumentTypeError("--center phải nằm trong khung 800×800 và có diện tích dương.")
    return coords  # type: ignore[return-value]


def read_manifest(path: Path) -> list[str]:
    data = json.loads(path.read_text(encoding="utf-8"))
    characters = data.get("characters") if isinstance(data, dict) else None
    if not isinstance(characters, list):
        raise ValueError("manifest chibi cần có mảng characters.")
    ids = [item.get("id") for item in characters if isinstance(item, dict)]
    if len(ids) != len(characters) or any(not isinstance(value, str) or not ID_PATTERN.fullmatch(value) for value in ids):
        raise ValueError("manifest chibi chứa id không hợp lệ.")
    if len(set(ids)) != len(ids):
        raise ValueError("manifest chibi có id trùng.")
    return sorted(ids)


def comparison_mask(reference: np.ndarray, center: tuple[int, int, int, int]) -> np.ndarray:
    x0, y0, x1, y1 = center
    mask = reference[:, :, 3] > ALPHA_THRESHOLD
    mask[y0:y1, x0:x1] = False
    return mask


def compare_throne(reference: Image.Image, candidate: Image.Image, center: tuple[int, int, int, int] = DEFAULT_CENTER) -> tuple[int, int, float]:
    """Tìm độ lệch căn chỉnh theo alpha trong mask; đo sai khác RGB sau khi căn chỉnh."""
    reference_rgba = np.asarray(reference.convert("RGBA"), dtype=np.uint8)
    candidate_rgba = np.asarray(candidate.convert("RGBA"), dtype=np.uint8)
    mask = comparison_mask(reference_rgba, center)
    reference_shape = reference_rgba[:, :, 3] > ALPHA_THRESHOLD
    if not mask.any():
        return 0, 0, 255.0
    padded = np.pad(reference_shape, 1, constant_values=False)
    eroded = np.ones_like(reference_shape)
    for y_shift in range(3):
        for x_shift in range(3):
            eroded &= padded[y_shift:y_shift + reference_shape.shape[0], x_shift:x_shift + reference_shape.shape[1]]
    edge_y, edge_x = np.nonzero(reference_shape & ~eroded & mask)
    if not len(edge_x):
        edge_y, edge_x = np.nonzero(mask)
    mask_y, mask_x = np.nonzero(mask)
    candidate_alpha = candidate_rgba[:, :, 3]
    height, width = candidate_alpha.shape
    best: tuple[float, int, int] | None = None
    for dy in range(-SEARCH_RADIUS, SEARCH_RADIUS + 1):
        for dx in range(-SEARCH_RADIUS, SEARCH_RADIUS + 1):
            source_x, source_y = edge_x - dx, edge_y - dy
            valid = (source_x >= 0) & (source_x < width) & (source_y >= 0) & (source_y < height)
            covered = np.zeros(len(edge_x), dtype=bool)
            covered[valid] = candidate_alpha[source_y[valid], source_x[valid]] > ALPHA_THRESHOLD
            mismatch = float(np.count_nonzero(~covered) / len(covered))
            key = (mismatch, abs(dx) + abs(dy), abs(dy), abs(dx))
            if best is None or key < (best[0], abs(best[1]) + abs(best[2]), abs(best[2]), abs(best[1])):
                best = (mismatch, dx, dy)
    assert best is not None
    dx, dy = best[1], best[2]
    source_x, source_y = mask_x - dx, mask_y - dy
    valid = (source_x >= 0) & (source_x < width) & (source_y >= 0) & (source_y < height)
    present = np.zeros(len(mask_x), dtype=bool)
    present[valid] = candidate_alpha[source_y[valid], source_x[valid]] > ALPHA_THRESHOLD
    candidate_rgb = np.zeros((len(mask_x), 3), dtype=np.int16)
    candidate_rgb[valid] = candidate_rgba[source_y[valid], source_x[valid], :3].astype(np.int16)
    reference_rgb = reference_rgba[mask_y, mask_x, :3].astype(np.int16)
    differences = np.abs(reference_rgb - candidate_rgb).astype(np.float32)
    differences[~present] = 255.0
    return dx, dy, float(differences.mean())


def corner_alpha_clear(image: Image.Image) -> bool:
    if image.mode != "RGBA" or image.size != CANVAS_SIZE:
        return False
    alpha = np.asarray(image.getchannel("A"), dtype=np.uint8)
    size = CORNER_SIZE
    return all(not alpha[y0:y1, x0:x1].any() for x0, y0, x1, y1 in (
        (0, 0, size, size), (CANVAS_SIZE[0] - size, 0, CANVAS_SIZE[0], size),
        (0, CANVAS_SIZE[1] - size, size, CANVAS_SIZE[1]),
        (CANVAS_SIZE[0] - size, CANVAS_SIZE[1] - size, CANVAS_SIZE[0], CANVAS_SIZE[1]),
    ))


def grade_asset(dx: int, dy: int, color_diff: float, issues: list[str]) -> str:
    if any(issue.startswith("Kích thước") for issue in issues):
        return "NGAI LỆCH — kích thước sai"
    if abs(dx) > POSITION_REVIEW_PX or abs(dy) > POSITION_REVIEW_PX or color_diff > COLOR_REVIEW_MEAN_ABS_DIFF:
        return "NGAI LỆCH — nên vẽ lại"
    if abs(dx) > POSITION_OK_PX or abs(dy) > POSITION_OK_PX or color_diff >= COLOR_OK_MEAN_ABS_DIFF or issues:
        return "CẦN XEM"
    return "OK"


def analyze_file(path: Path, character_id: str | None, reference: Image.Image | None, center: tuple[int, int, int, int]) -> AssetResult:
    try:
        with Image.open(path) as opened:
            width, height = opened.size
            mode = opened.mode
            issues: list[str] = []
            if opened.size != CANVAS_SIZE:
                issues.append(f"Kích thước {width}×{height}, cần 800×800")
                return AssetResult(path.name, character_id, width, height, mode, None, None, None, None,
                                   "NGAI LỆCH — kích thước sai", issues)
            if mode != "RGBA":
                issues.append(f"Mode {mode}, cần RGBA")
            rgba = opened.convert("RGBA")
            clear = corner_alpha_clear(rgba)
            if not clear:
                issues.append("4 góc 10×10 phải có alpha = 0")
            if reference is None:
                if character_id is not None:
                    issues.append("Không có ngai-trong.png hợp lệ để đối chiếu")
                return AssetResult(path.name, character_id, width, height, mode, clear, None, None, None,
                                   "CẦN XEM" if issues else "OK", issues)
            dx, dy, color_diff = compare_throne(reference, rgba, center)
            conclusion = grade_asset(dx, dy, color_diff, issues)
            return AssetResult(path.name, character_id, width, height, mode, clear, dx, dy, color_diff, conclusion, issues)
    except (OSError, ValueError) as error:
        return AssetResult(path.name, character_id, None, None, None, None, None, None, None,
                           "CẦN XEM", [f"Không đọc được ảnh: {error.__class__.__name__}"])


def resolve_asset_directory(value: str | None, root: Path) -> Path:
    if value is None:
        return root / "assets-local" / "throne"
    supplied = Path(value).expanduser()
    if supplied.is_absolute():
        return supplied.resolve()
    from_cwd = supplied.resolve()
    local = (root / supplied).resolve()
    if from_cwd.exists() or not local.exists():
        return from_cwd
    return local


def check_assets(asset_dir: Path, manifest_path: Path, center: tuple[int, int, int, int] = DEFAULT_CENTER) -> CheckReport:
    expected_ids = read_manifest(manifest_path)
    expected_names = {f"ngai-{character_id}.png": character_id for character_id in expected_ids}
    files = sorted((path for path in asset_dir.iterdir() if path.is_file()), key=lambda path: path.name.casefold()) if asset_dir.is_dir() else []
    actual_names = {path.name for path in files}
    missing = [character_id for filename, character_id in expected_names.items() if filename not in actual_names]
    extras: list[str] = []
    for path in files:
        if path.name.casefold() in ALLOWED_SUPPORT_FILES:
            continue
        match = THRONE_FILENAME.fullmatch(path.name)
        if not match or match.group("id") not in expected_ids or path.name not in expected_names:
            extras.append(path.name)

    reference_path = asset_dir / "ngai-trong.png"
    reference: Image.Image | None = None
    if reference_path.is_file():
        try:
            with Image.open(reference_path) as opened:
                if opened.size == CANVAS_SIZE and opened.mode == "RGBA":
                    candidate_reference = opened.copy()
                    if corner_alpha_clear(candidate_reference):
                        reference = candidate_reference
        except OSError:
            reference = None

    results: list[AssetResult] = []
    if reference_path.is_file():
        results.append(analyze_file(reference_path, None, None, center))
    else:
        results.append(AssetResult("ngai-trong.png", None, None, None, None, None, None, None, None,
                                   "CẦN XEM", ["Thiếu ảnh ngai-trong dùng làm mẫu đối chiếu"]))
    for character_id in expected_ids:
        path = asset_dir / f"ngai-{character_id}.png"
        if path.is_file():
            results.append(analyze_file(path, character_id, reference, center))
        else:
            results.append(AssetResult(path.name, character_id, None, None, None, None, None, None, None, "THIẾU", ["Không có ảnh ngai"] ))
    for name in extras:
        results.append(analyze_file(asset_dir / name, None, reference, center))

    summary = {
        "OK": sum(result.conclusion == "OK" for result in results),
        "CẦN XEM": sum(result.conclusion == "CẦN XEM" for result in results),
        "LỆCH": sum("NGAI LỆCH" in result.conclusion for result in results),
        "THIẾU": len(missing),
        "THỪA": len(extras),
    }
    failed = any(result.failed for result in results)
    return CheckReport(asset_dir, manifest_path, center, expected_ids, results, missing, extras, summary, 1 if failed else 0)


def format_table(report: CheckReport) -> str:
    headings = ("File", "ID", "Kích thước", "Mode/góc", "dx", "dy", "Sai khác RGB", "Kết luận")
    rows = [" | ".join(headings), " | ".join("---" for _ in headings)]
    for item in report.results:
        size = f"{item.width}×{item.height}" if item.width is not None else "—"
        alpha = "góc trong" if item.corner_alpha_clear is True else "góc đục" if item.corner_alpha_clear is False else "—"
        mode_alpha = f"{item.mode or '—'} / {alpha}"
        diff = f"{item.color_diff:.2f}" if item.color_diff is not None else "—"
        rows.append(" | ".join((item.filename, item.character_id or "—", size, mode_alpha,
                                str(item.dx) if item.dx is not None else "—", str(item.dy) if item.dy is not None else "—",
                                diff, item.conclusion)))
    rows.append("")
    rows.append("Tóm tắt: " + " · ".join(f"{key} {value}" for key, value in report.summary.items()))
    if report.missing:
        rows.append("ID thiếu: " + ", ".join(report.missing))
    if report.extras:
        rows.append("Tệp thừa/sai tên: " + ", ".join(report.extras))
    for item in report.results:
        if item.issues:
            rows.append(f"Ghi chú {item.filename}: " + "; ".join(item.issues))
    return "\n".join(rows)


def to_manifest(report: CheckReport) -> dict[str, Any]:
    by_id = {item.character_id: item for item in report.results if item.character_id}
    return {
        "version": 1,
        "characters": {
            character_id: {
                "file": f"ngai-{character_id}.png" if character_id in by_id else None,
                "conclusion": by_id[character_id].conclusion if character_id in by_id else "THIẾU",
                "dx": by_id[character_id].dx if character_id in by_id else None,
                "dy": by_id[character_id].dy if character_id in by_id else None,
                "colorDiff": round(by_id[character_id].color_diff, 2) if character_id in by_id and by_id[character_id].color_diff is not None else None,
            }
            for character_id in report.expected_ids
        },
    }


def build_contact_sheet(report: CheckReport, output_path: Path) -> None:
    tile_count = len(report.expected_ids) + 1 + len(report.extras)
    rows = max(1, (tile_count + SHEET_COLUMNS - 1) // SHEET_COLUMNS)
    sheet = Image.new("RGB", (SHEET_COLUMNS * SHEET_CELL, rows * SHEET_CELL), (28, 31, 42))
    draw = ImageDraw.Draw(sheet)
    try:
        font = ImageFont.truetype("arial.ttf", 13)
        small_font = ImageFont.truetype("arial.ttf", 11)
    except OSError:
        font = ImageFont.load_default()
        small_font = ImageFont.load_default()
    by_file = {item.filename: item for item in report.results}
    entries: list[tuple[str, str, AssetResult | None]] = [("ngai-trong.png", "REFERENCE", by_file.get("ngai-trong.png"))]
    entries.extend((f"ngai-{character_id}.png", character_id, by_file.get(f"ngai-{character_id}.png")) for character_id in report.expected_ids)
    entries.extend((name, name, by_file.get(name)) for name in report.extras)
    for index, (filename, label, result) in enumerate(entries):
        x, y = (index % SHEET_COLUMNS) * SHEET_CELL, (index // SHEET_COLUMNS) * SHEET_CELL
        tile = Image.new("RGBA", (SHEET_CELL, SHEET_CELL), (45, 48, 60, 255))
        checker = Image.new("RGBA", (SHEET_CELL - 8, SHEET_CELL - 34), (0, 0, 0, 0))
        checker_draw = ImageDraw.Draw(checker)
        for cy in range(0, checker.height, 16):
            for cx in range(0, checker.width, 16):
                checker_draw.rectangle((cx, cy, cx + 15, cy + 15), fill=(76, 80, 94, 255) if (cx // 16 + cy // 16) % 2 else (58, 62, 75, 255))
        if filename == "ngai-trong.png" or (report.asset_dir / filename).is_file():
            try:
                with Image.open(report.asset_dir / filename) as opened:
                    image = opened.convert("RGBA")
                    image.thumbnail((SHEET_CELL - 20, SHEET_CELL - 48), Image.Resampling.LANCZOS)
                    checker.alpha_composite(image, ((checker.width - image.width) // 2, (checker.height - image.height) // 2))
            except OSError:
                pass
        tile.alpha_composite(checker, (4, 4))
        label_top = SHEET_CELL - 28
        draw_label = ImageDraw.Draw(tile)
        conclusion = result.conclusion if result else "THIẾU"
        draw_label.rectangle((0, label_top, SHEET_CELL, SHEET_CELL), fill=(28, 31, 42, 255))
        draw_label.text((6, label_top + 2), label[:25], font=font, fill=(245, 245, 250, 255))
        draw_label.text((6, label_top + 15), conclusion[:27], font=small_font, fill=(235, 235, 235, 255))
        color = (42, 202, 116) if conclusion == "OK" else (240, 184, 48) if conclusion == "CẦN XEM" else (230, 60, 66)
        draw_label.rectangle((1, 1, SHEET_CELL - 2, SHEET_CELL - 2), outline=color, width=3)
        sheet.paste(tile.convert("RGB"), (x, y))
    output_path.parent.mkdir(parents=True, exist_ok=True)
    sheet.save(output_path, format="PNG", optimize=True)


def print_report(report: CheckReport) -> None:
    print(format_table(report))
    print(f"Exit code: {report.exit_code}")


def command_check(args: argparse.Namespace, root: Path) -> int:
    asset_dir = resolve_asset_directory(args.dir, root)
    manifest = Path(args.manifest).resolve() if args.manifest else root / "assets-local" / "chibi" / "manifest.json"
    report = check_assets(asset_dir, manifest, args.center)
    if args.json:
        print(json.dumps(asdict(report) | {"asset_dir": str(report.asset_dir), "manifest_path": str(report.manifest_path)}, ensure_ascii=False, indent=2))
    else:
        print_report(report)
    return report.exit_code


def command_build(args: argparse.Namespace, root: Path) -> int:
    asset_dir = resolve_asset_directory(args.dir, root)
    manifest = Path(args.manifest).resolve() if args.manifest else root / "assets-local" / "chibi" / "manifest.json"
    report = check_assets(asset_dir, manifest, args.center)
    asset_dir.mkdir(parents=True, exist_ok=True)
    manifest_out = asset_dir / "manifest.json"
    sheet_out = asset_dir / "contact-sheet.png"
    manifest_out.write_text(json.dumps(to_manifest(report), ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    build_contact_sheet(report, sheet_out)
    if args.json:
        print(json.dumps({"check": asdict(report) | {"asset_dir": str(report.asset_dir), "manifest_path": str(report.manifest_path)},
                          "outputs": {"manifest": str(manifest_out.resolve()), "contact_sheet": str(sheet_out.resolve())}}, ensure_ascii=False, indent=2))
    else:
        print_report(report)
        print(f"Manifest: {manifest_out.resolve()}")
        print(f"Contact sheet: {sheet_out.resolve()}")
    return report.exit_code


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="Kiểm tra ảnh ngai vàng theo manifest nhân vật và dựng contact sheet.")
    subparsers = parser.add_subparsers(dest="command", required=True)
    for command, handler in (("check", command_check), ("build", command_build)):
        sub = subparsers.add_parser(command)
        sub.add_argument("--dir", help="Thư mục ảnh ngai (mặc định assets-local/throne).")
        sub.add_argument("--manifest", help="Manifest nhân vật; mặc định assets-local/chibi/manifest.json.")
        sub.add_argument("--center", type=parse_center, default=DEFAULT_CENTER, help="Vùng nhân vật: x0,y0,x1,y1 (mặc định 200,120,600,700).")
        sub.add_argument("--json", action="store_true", help="In chi tiết JSON thay vì bảng.")
        sub.set_defaults(handler=handler)
    return parser


def main(argv: list[str] | None = None) -> int:
    parser = build_parser()
    args = parser.parse_args(argv)
    root = workspace_root()
    try:
        return args.handler(args, root)
    except (OSError, ValueError, json.JSONDecodeError) as error:
        print(f"Lỗi: {error}", file=sys.stderr)
        return 2


if __name__ == "__main__":
    raise SystemExit(main())
