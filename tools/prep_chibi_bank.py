"""Tách nền cả kho chibi → assets-local/chibi/<id>.png (+ manifest.json). Chạy:  py tools/prep_chibi_bank.py [thư mục kho]

id = "chibi-" + tên file chuẩn hoá ASCII (vd 002_A124.png → chibi-002-a124). Bỏ qua file bắt đầu bằng "_" (bảng duyệt, mẫu style) và Kelly (MC).
Ảnh đầu ra là asset CỤC BỘ, ngoài git — chưa xác nhận quyền phân phối.
"""
from __future__ import annotations

import json
import pathlib
import re
import sys
import unicodedata

sys.path.insert(0, str(pathlib.Path(__file__).parent))
from prep_cutout import cutout  # noqa: E402

ROOT = pathlib.Path(__file__).resolve().parents[1]
SRC = pathlib.Path(sys.argv[1]) if len(sys.argv) > 1 else ROOT / '2026-11-11_chibi_kho'
OUT = ROOT / 'assets-local' / 'chibi'


def slug(name: str) -> str:
    s = unicodedata.normalize('NFKD', name.casefold().replace('đ', 'd')).encode('ascii', 'ignore').decode()
    return re.sub(r'[^a-z0-9]+', '-', s).strip('-')


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    items = []
    for f in sorted(SRC.glob('*.png')):
        if f.name.startswith('_') or f.stem.lower() == 'kelly':
            continue
        cid = f'chibi-{slug(f.stem)}'
        dst = OUT / f'{cid}.png'
        if not dst.exists():
            cutout(str(f), str(dst), 360, 14, 10)
        items.append({'id': cid, 'name': re.sub(r'^\d+_', '', f.stem).replace('_', ' '), 'file': f'chibi/{cid}.png'})
    (OUT / 'manifest.json').write_text(json.dumps({'characters': items}, ensure_ascii=False, indent=2), encoding='utf-8')
    print(f'{len(items)} characters -> {OUT}')


if __name__ == '__main__':
    main()
