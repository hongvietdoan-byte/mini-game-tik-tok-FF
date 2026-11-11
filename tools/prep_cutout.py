"""Tách nền xám đơn sắc của ảnh chibi (nền studio) → PNG trong suốt, cắt sát, thu nhỏ.

Dùng:  py tools/prep_cutout.py <ảnh nguồn> <ảnh đích.png> [--height 640]
Thuật toán: loang (flood fill) từ toàn bộ mép ảnh, chỉ nhận điểm ÍT MÀU (gần xám) và gần màu điểm kề → nền;
làm mềm viền 1–2 px. Chỉ phù hợp nền xám trơn; kết quả cần người duyệt bằng mắt (tóc bạc / áo trắng có thể bị ăn mòn).
Ảnh đầu ra là asset cục bộ (assets-local/, ngoài git) — chưa xác nhận quyền phân phối.
"""
from __future__ import annotations

import argparse
from collections import deque

from PIL import Image, ImageFilter


def cutout(src: str, dst: str, height: int, sat_max: int, step_max: int) -> None:
    im = Image.open(src).convert("RGB")
    w, h = im.size
    px = im.load()
    bg = bytearray(w * h)
    q: deque[tuple[int, int]] = deque()

    def low_sat(c: tuple[int, int, int]) -> bool:
        return max(c) - min(c) <= sat_max

    for x in range(w):
        for y in (0, h - 1):
            if low_sat(px[x, y]):
                bg[y * w + x] = 1
                q.append((x, y))
    for y in range(h):
        for x in (0, w - 1):
            if low_sat(px[x, y]) and not bg[y * w + x]:
                bg[y * w + x] = 1
                q.append((x, y))
    while q:
        x, y = q.popleft()
        c = px[x, y]
        for nx, ny in ((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)):
            if 0 <= nx < w and 0 <= ny < h and not bg[ny * w + nx]:
                n = px[nx, ny]
                if low_sat(n) and max(abs(n[0] - c[0]), abs(n[1] - c[1]), abs(n[2] - c[2])) <= step_max:
                    bg[ny * w + nx] = 1
                    q.append((nx, ny))

    alpha = Image.frombytes("L", (w, h), bytes(0 if b else 255 for b in bg))
    # bỏ đốm lẻ + làm mềm viền
    alpha = alpha.filter(ImageFilter.MinFilter(3)).filter(ImageFilter.GaussianBlur(1.2))
    out = im.convert("RGBA")
    out.putalpha(alpha)
    bbox = alpha.point(lambda a: 255 if a > 24 else 0).getbbox()
    if bbox:
        out = out.crop(bbox)
    if height and out.height > height:
        out = out.resize((round(out.width * height / out.height), height), Image.LANCZOS)
    out.save(dst, optimize=True)
    kept = sum(1 for b in bg if not b) / len(bg)
    print(f"{dst}: {out.width}x{out.height}, kept {kept:.0%}")


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("src")
    ap.add_argument("dst")
    ap.add_argument("--height", type=int, default=640)
    ap.add_argument("--sat-max", type=int, default=14)
    ap.add_argument("--step-max", type=int, default=10)
    a = ap.parse_args()
    cutout(a.src, a.dst, a.height, a.sat_max, a.step_max)
