"""Tách nền rembg cho kho chibi, giữ ảnh nguồn nguyên vẹn.

Mặc định đọc 2026-11-11_chibi_kho/ và ghi ra assets-local/chibi-clean/ cùng
assets-local/review/cutout-sheet.html. Dùng --workspace-root khi chạy từ worktree
nhưng assets-local và ảnh nguồn nằm trong checkout chính.

Chạy từ worktree:
  .claude/venv-rembg/Scripts/python.exe tools/cutout_chibi_bank.py --workspace-root "<checkout chính>"
"""
from __future__ import annotations

import argparse
import html
import json
import re
import unicodedata
from pathlib import Path

import numpy as np
from PIL import Image
from rembg import new_session, remove
from scipy import ndimage


def slug(value: str) -> str:
    normalized = unicodedata.normalize("NFKD", value.casefold().replace("đ", "d"))
    ascii_value = normalized.encode("ascii", "ignore").decode()
    return re.sub(r"[^a-z0-9]+", "-", ascii_value).strip("-")


def source_name(stem: str) -> str:
    if stem.casefold().startswith("_thu_v1_"):
        return f"{stem[len('_thu_v1_'):].replace('_', ' ')} (thử V1)"
    return re.sub(r"^\d+_", "", stem).replace("_", " ")


def border_background(rgb: np.ndarray) -> np.ndarray:
    height, width, _ = rgb.shape
    margin = max(2, min(height, width) // 100)
    edge = np.concatenate(
        (
            rgb[:margin, :, :].reshape(-1, 3),
            rgb[-margin:, :, :].reshape(-1, 3),
            rgb[:, :margin, :].reshape(-1, 3),
            rgb[:, -margin:, :].reshape(-1, 3),
        ),
        axis=0,
    )
    saturation = edge.max(axis=1) - edge.min(axis=1)
    gray_edges = edge[saturation <= 40]
    samples = gray_edges if len(gray_edges) >= 32 else edge
    return np.median(samples, axis=0).astype(np.float32)


def largest_component(alpha: np.ndarray, threshold: int = 48) -> np.ndarray:
    foreground = alpha >= threshold
    labels, count = ndimage.label(foreground, structure=np.ones((3, 3), dtype=np.uint8))
    if count == 0:
        foreground = alpha > 0
        labels, count = ndimage.label(foreground, structure=np.ones((3, 3), dtype=np.uint8))
    if count == 0:
        return np.zeros(alpha.shape, dtype=bool)
    sizes = np.bincount(labels.ravel())
    sizes[0] = 0
    keep_label = int(sizes.argmax())
    main = labels == keep_label
    return ndimage.binary_dilation(main, structure=np.ones((3, 3), dtype=bool), iterations=2)


def clean_alpha(alpha: np.ndarray, keep_largest: bool = True) -> np.ndarray:
    cleaned = np.asarray(alpha, dtype=np.uint8).copy()
    cleaned[cleaned < 24] = 0
    if keep_largest:
        cleaned[~largest_component(cleaned)] = 0
    return cleaned


def decontaminate(rgb: np.ndarray, alpha: np.ndarray) -> np.ndarray:
    colors = rgb.astype(np.float32)
    a = alpha.astype(np.float32) / 255.0
    background = border_background(rgb)
    safe_alpha = np.maximum(a, 0.12)[..., None]
    foreground = (colors - background[None, None, :] * (1.0 - a[..., None])) / safe_alpha
    foreground = np.clip(foreground, 0, 255)

    solid = a >= 0.96
    if solid.any():
        _, nearest = ndimage.distance_transform_edt(~solid, return_indices=True)
        nearest_rgb = colors[nearest[0], nearest[1]]
        weak = a < 0.16
        foreground[weak] = nearest_rgb[weak]
    return np.rint(foreground).astype(np.uint8)


def crop_and_resize(image: Image.Image, height: int, crop: bool = True) -> Image.Image:
    if crop:
        alpha = image.getchannel("A")
        bbox = alpha.point(lambda value: 255 if value > 8 else 0).getbbox()
        if bbox:
            image = image.crop(bbox)
    if height > 0 and image.height != height:
        width = max(1, round(image.width * height / image.height))
        image = image.resize((width, height), Image.Resampling.LANCZOS)
    return image


def rembg_cutout(src: Path, session, target_height: int, keep_largest: bool = True) -> tuple[Image.Image, dict]:
    source = Image.open(src).convert("RGB")
    rgb = np.asarray(source, dtype=np.uint8)
    result = remove(source, session=session, post_process_mask=True)
    if not isinstance(result, Image.Image):
        result = Image.open(result)
    raw_alpha = np.asarray(result.convert("RGBA").getchannel("A"), dtype=np.uint8)
    alpha = clean_alpha(raw_alpha, keep_largest=keep_largest)
    cleaned_rgb = decontaminate(rgb, alpha)
    output = Image.fromarray(np.dstack((cleaned_rgb, alpha)), mode="RGBA")
    output = crop_and_resize(output, target_height)
    return output, {
        "input": list(source.size),
        "retained": round(float((alpha > 0).mean()), 4),
        "model": session.name() if callable(getattr(session, "name", None)) else "isnet-general-use",
    }


def existing_cutout(src: Path, target_height: int, keep_largest: bool) -> Image.Image:
    source = Image.open(src).convert("RGBA")
    rgba = np.asarray(source, dtype=np.uint8)
    alpha = clean_alpha(rgba[:, :, 3], keep_largest=keep_largest)
    rgb = rgba[:, :, :3].copy()
    solid = alpha >= 245
    if solid.any():
        _, nearest = ndimage.distance_transform_edt(~solid, return_indices=True)
        weak = alpha < 16
        rgb[weak] = rgb[nearest[0][weak], nearest[1][weak]]
    output = Image.fromarray(np.dstack((rgb, alpha)), mode="RGBA")
    return crop_and_resize(output, target_height)


def render_contact_sheet(out_dir: Path, review_file: Path, manifest: list[dict]) -> None:
    cards = []
    for index, item in enumerate(manifest):
        filename = html.escape(Path(item["file"]).name, quote=True)
        label = html.escape(item["name"])
        cls = "dark" if index % 2 == 0 else "light"
        cards.append(
            f'<article class="card {cls}"><img src="../chibi-clean/{filename}" alt="{label}" '
            f'loading="lazy"><div><b>{label}</b><small>{html.escape(item["id"])}</small></div></article>'
        )

    extras = []
    for key, label in (("mc-kelly.png", "Kelly MC"), ("trophy-stage.png", "Cúp / sân khấu")):
        extras.append(
            f'<article class="card dark"><img src="../chibi-clean/{key}" alt="{label}" '
            f'loading="lazy"><div><b>{label}</b><small>{key}</small></div></article>'
        )

    doc = f"""<!doctype html>
<html lang="vi"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Soát cutout chibi</title><style>
*{{box-sizing:border-box}}body{{margin:0;background:#111827;color:#f8fafc;font:15px/1.4 system-ui,sans-serif;padding:24px}}
h1{{margin:0 0 8px}}p{{color:#cbd5e1;margin:0 0 22px}}h2{{margin:32px 0 12px}}
.grid{{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:12px}}
.card{{min-height:220px;border-radius:10px;overflow:hidden;display:flex;flex-direction:column;align-items:center;justify-content:space-between;padding:10px}}
.dark{{background:#172033}}.light{{background:#e5e7eb;color:#111827}}.card img{{max-width:100%;height:170px;object-fit:contain;image-rendering:auto}}
.card div{{width:100%;display:flex;flex-direction:column;overflow-wrap:anywhere}}small{{opacity:.72}}
</style></head><body><h1>Soát cutout — {len(manifest)} chibi</h1>
<p>Nền tối và sáng xen kẽ để rà viền, bóng và đốm. Ảnh giữ nguyên nguồn trong checkout; đầu ra là bản sạch riêng.</p>
<section class="grid">{''.join(cards)}</section><h2>Asset bổ sung</h2><section class="grid">{''.join(extras)}</section></body></html>"""
    review_file.parent.mkdir(parents=True, exist_ok=True)
    review_file.write_text(doc, encoding="utf-8")


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--workspace-root", type=Path, default=Path(__file__).resolve().parents[1])
    parser.add_argument("--model", default="isnet-general-use")
    parser.add_argument("--limit", type=int, default=0, help="Process only N chibi images.")
    parser.add_argument("--preview", action="store_true", help="Write samples under .preview without a manifest/review sheet.")
    parser.add_argument("--skip-existing", action="store_true", help="Keep existing PNGs and rebuild manifests/review outputs.")
    args = parser.parse_args()

    workspace = args.workspace_root.resolve()
    source_dir = workspace / "2026-11-11_chibi_kho"
    asset_root = workspace / "assets-local"
    output_dir = asset_root / "chibi-clean"
    preview_dir = output_dir / ".preview"
    destination = preview_dir if args.preview else output_dir
    destination.mkdir(parents=True, exist_ok=True)

    sources = [p for p in sorted(source_dir.glob("*.png")) if p.stem.casefold() != "kelly"]
    if args.limit > 0:
        sources = sources[: args.limit]
    if not sources:
        raise SystemExit(f"No character PNGs found in {source_dir}")

    session = new_session(args.model)
    manifest: list[dict] = []
    for src in sources:
        char_id = f"chibi-{slug(src.stem)}"
        out_name = f"{char_id}.png"
        out_path = destination / out_name
        if args.skip_existing and out_path.exists():
            manifest.append(
                {
                    "id": char_id,
                    "name": source_name(src.stem),
                    "file": out_name if args.preview else f"chibi-clean/{out_name}",
                }
            )
            print(f"skip existing: {char_id}")
            continue
        image, stats = rembg_cutout(src, session, target_height=360)
        image.save(out_path, format="PNG", optimize=True)
        item = {
            "id": char_id,
            "name": source_name(src.stem),
            "file": out_name if args.preview else f"chibi-clean/{out_name}",
        }
        manifest.append(item)
        print(f"{char_id} -> {out_path.name}: {image.width}x{image.height}, retained={stats['retained']:.1%}")

    if args.preview:
        print(f"preview: {len(manifest)} PNG -> {preview_dir}")
        return

    kelly_src = asset_root / "mc" / "kelly.png"
    kelly_out = destination / "mc-kelly.png"
    if not (args.skip_existing and kelly_out.exists()):
        kelly = existing_cutout(kelly_src, target_height=640, keep_largest=True)
        kelly.save(kelly_out, format="PNG", optimize=True)
        print(f"{kelly_src.name} -> {kelly_out.name}: {kelly.width}x{kelly.height}")

    trophy_src = asset_root / "victory" / "trophy-stage.png"
    trophy_out = destination / "trophy-stage.png"
    trophy = Image.open(trophy_src).convert("RGBA")
    # Nguồn đã có alpha và cao đúng 900 px; giữ nguyên toàn bộ khung hình/cúp.
    if trophy.height != 900:
        trophy = crop_and_resize(trophy, target_height=900, crop=False)
    trophy.save(trophy_out, format="PNG", optimize=True)
    print(f"{trophy_src.name} -> {trophy_out.name}: {trophy.width}x{trophy.height} (original alpha preserved)")

    (output_dir / "manifest.json").write_text(
        json.dumps({"characters": manifest}, ensure_ascii=False, indent=2), encoding="utf-8"
    )
    render_contact_sheet(output_dir, asset_root / "review" / "cutout-sheet.html", manifest)
    print(f"{len(manifest)} chibi -> {output_dir}")
    print(f"contact sheet -> {asset_root / 'review' / 'cutout-sheet.html'}")


if __name__ == "__main__":
    main()
