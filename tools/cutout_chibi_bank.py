"""Tách nền rembg cho kho chibi, giữ ảnh nguồn nguyên vẹn.

Đọc 2026-11-11_chibi_kho/, ghi chibi runtime vào assets-local/chibi/ và bảng soát
vào assets-local/review/cutout-sheet.html. Kelly luôn được tách từ ảnh nguồn vào
assets-local/chibi-clean/; không ghi đè assets-local/mc/kelly.png. Dùng
--workspace-root khi chạy từ worktree nhưng ảnh nguồn và assets-local ở checkout chính.

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
from PIL import Image, ImageDraw, ImageFont
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


def rembg_cutout(
    src: Path,
    session,
    target_height: int,
    keep_largest: bool = True,
    *,
    alpha_matting: bool = False,
    foreground_threshold: int = 240,
    background_threshold: int = 15,
    erode_size: int = 8,
) -> tuple[Image.Image, dict]:
    source = Image.open(src).convert("RGB")
    rgb = np.asarray(source, dtype=np.uint8)
    result = remove(
        source,
        session=session,
        post_process_mask=True,
        alpha_matting=alpha_matting,
        alpha_matting_foreground_threshold=foreground_threshold,
        alpha_matting_background_threshold=background_threshold,
        alpha_matting_erode_size=erode_size,
    )
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


def render_contact_sheet(out_dir: Path, review_file: Path, manifest: list[dict]) -> None:
    cards = []
    for index, item in enumerate(manifest):
        image_path = html.escape(Path(item["file"]).as_posix(), quote=True)
        label = html.escape(item["name"])
        cls = "dark" if index % 2 == 0 else "light"
        cards.append(f'<article class="card {cls}"><img src="../{image_path}" alt="{label}" '
                     f'loading="lazy"><div><b>{label}</b><small>{html.escape(item["id"])}</small></div></article>')

    extras = []
    for key, label in (("../chibi-clean/mc-kelly.png", "Kelly MC · bản soát"),
                       ("../chibi-clean/trophy-stage.png", "Cúp / sân khấu")):
        extras.append(
            f'<article class="card dark"><img src="{key}" alt="{label}" '
            f'loading="lazy"><div><b>{label}</b><small>{Path(key).name}</small></div></article>'
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


def render_kelly_variants(review_file: Path, variants: list[tuple[str, Path]]) -> None:
    columns = 2
    cell_width, cell_height = 640, 760
    gap, header_height = 24, 88
    rows = (len(variants) + columns - 1) // columns
    canvas = Image.new(
        "RGB",
        (gap + columns * (cell_width + gap), header_height + gap + rows * (cell_height + gap)),
        "#0b1120",
    )
    draw = ImageDraw.Draw(canvas)
    font_candidates = (
        Path("C:/Windows/Fonts/arial.ttf"),
        Path("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"),
        Path("/System/Library/Fonts/Supplemental/Arial.ttf"),
    )

    def font(size: int):
        for font_path in font_candidates:
            if font_path.is_file():
                try:
                    return ImageFont.truetype(str(font_path), size=size)
                except OSError:
                    continue
        return ImageFont.load_default()

    title_font = font(24)
    label_font = font(18)
    detail_font = font(16)
    draw.text((gap, 12), "Kelly · so sánh tách nền", fill="#f8fafc", font=title_font)
    draw.text((gap, 46), "Nền tối để soát khe tay–thân, khoảng giữa chân và viền tóc/vai.", fill="#cbd5e1", font=detail_font)

    for index, (label, path) in enumerate(variants):
        x = gap + (index % columns) * (cell_width + gap)
        y = header_height + gap + (index // columns) * (cell_height + gap)
        draw.rounded_rectangle((x, y, x + cell_width, y + cell_height), radius=14, fill="#172033", outline="#475569", width=2)
        draw.text((x + 18, y + 12), label, fill="#f8fafc", font=label_font)
        draw.text((x + 18, y + 42), path.name, fill="#94a3b8", font=detail_font)
        with Image.open(path) as source:
            image = source.convert("RGBA")
        image.thumbnail((cell_width - 32, cell_height - 82), Image.Resampling.LANCZOS)
        tile = Image.new("RGBA", image.size, "#172033")
        tile.alpha_composite(image)
        canvas.paste(tile.convert("RGB"), (x + (cell_width - image.width) // 2, y + 70))

    review_file.parent.mkdir(parents=True, exist_ok=True)
    canvas.save(review_file, format="PNG", optimize=True)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--workspace-root", type=Path, default=Path(__file__).resolve().parents[1])
    parser.add_argument("--model", default="isnet-general-use")
    parser.add_argument("--limit", type=int, default=0, help="Process only N chibi images.")
    parser.add_argument("--preview", action="store_true", help="Write samples under .preview without a manifest/review sheet.")
    parser.add_argument("--skip-existing", action="store_true", help="Keep existing runtime chibis and rebuild manifests/review outputs.")
    parser.add_argument("--alpha-matting", action="store_true", help="Use alpha matting (foreground 240, background 15, erode 8) for chibi cutouts.")
    parser.add_argument("--kelly-variants", action="store_true", help="Write Kelly model comparisons to assets-local/review/kelly-variants.png; never changes the runtime Kelly.")
    args = parser.parse_args()

    workspace = args.workspace_root.resolve()
    source_dir = workspace / "2026-11-11_chibi_kho"
    asset_root = workspace / "assets-local"
    output_dir = asset_root / "chibi"
    staging_dir = asset_root / "chibi-clean"
    preview_dir = staging_dir / ".preview"
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
                    "file": out_name if args.preview else f"chibi/{out_name}",
                }
            )
            print(f"skip existing: {char_id}")
            continue
        image, stats = rembg_cutout(src, session, target_height=360, alpha_matting=args.alpha_matting)
        image.save(out_path, format="PNG", optimize=True)
        item = {
            "id": char_id,
            "name": source_name(src.stem),
            "file": out_name if args.preview else f"chibi/{out_name}",
        }
        manifest.append(item)
        print(f"{char_id} -> {out_path.name}: {image.width}x{image.height}, retained={stats['retained']:.1%}")

    if args.preview:
        print(f"preview: {len(manifest)} PNG -> {preview_dir}")
        return

    kelly_src = source_dir / "Kelly.png"
    if not kelly_src.is_file():
        raise SystemExit(f"Kelly source not found: {kelly_src}")
    staging_dir.mkdir(parents=True, exist_ok=True)
    kelly_session = session if args.model == "isnet-general-use" else new_session("isnet-general-use")
    kelly_out = staging_dir / "mc-kelly.png"
    kelly, _ = rembg_cutout(
        kelly_src,
        kelly_session,
        target_height=640,
        alpha_matting=True,
        foreground_threshold=240,
        background_threshold=15,
        erode_size=8,
    )
    kelly.save(kelly_out, format="PNG", optimize=True)
    print(f"Kelly source -> {kelly_out.name}: {kelly.width}x{kelly.height} (alpha matting 240/15/8; runtime Kelly unchanged)")

    if args.kelly_variants:
        variant_dir = asset_root / "review" / "kelly-variants"
        variant_dir.mkdir(parents=True, exist_ok=True)
        variants: list[tuple[str, Path]] = []
        current_kelly = asset_root / "mc" / "kelly.png"
        if current_kelly.is_file():
            variants.append(("Đang dùng · assets-local/mc/kelly.png", current_kelly))

        base_path = variant_dir / "isnet-general-use-fg240-bg15-erode08.png"
        kelly.save(base_path, format="PNG", optimize=True)
        variants.append(("isnet-general-use · alpha 240/15/8", base_path))

        anime_session = new_session("isnet-anime")
        anime, _ = rembg_cutout(
            kelly_src,
            anime_session,
            target_height=640,
            alpha_matting=True,
            foreground_threshold=240,
            background_threshold=15,
            erode_size=8,
        )
        anime_path = variant_dir / "isnet-anime-fg240-bg15-erode08.png"
        anime.save(anime_path, format="PNG", optimize=True)
        variants.append(("isnet-anime · alpha 240/15/8", anime_path))

        eroded, _ = rembg_cutout(
            kelly_src,
            kelly_session,
            target_height=640,
            alpha_matting=True,
            foreground_threshold=240,
            background_threshold=15,
            erode_size=16,
        )
        eroded_path = variant_dir / "isnet-general-use-fg240-bg15-erode16.png"
        eroded.save(eroded_path, format="PNG", optimize=True)
        variants.append(("isnet-general-use · alpha 240/15/16", eroded_path))

        comparison = asset_root / "review" / "kelly-variants.png"
        render_kelly_variants(comparison, variants)
        print(f"Kelly comparison -> {comparison}")

    trophy_src = asset_root / "victory" / "trophy-stage.png"
    trophy_out = staging_dir / "trophy-stage.png"
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
