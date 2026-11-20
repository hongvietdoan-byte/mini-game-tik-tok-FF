from __future__ import annotations

import json
import shutil
import unittest
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw

from tools.throne_assets import DEFAULT_CENTER, SHEET_CELL, build_contact_sheet, check_assets, compare_throne


TEMP_ROOT = Path(__file__).resolve().parents[1] / "test-results" / "tmp-throne"


class ThroneAssetsTests(unittest.TestCase):
    def setUp(self) -> None:
        shutil.rmtree(TEMP_ROOT, ignore_errors=True)
        TEMP_ROOT.mkdir(parents=True)
        self.directory = TEMP_ROOT / "throne"
        self.directory.mkdir()
        self.manifest = TEMP_ROOT / "manifest.json"
        self.ids = ["alpha", "bravo"]
        self.manifest.write_text(json.dumps({"characters": [{"id": value} for value in self.ids]}), encoding="utf-8")
        self.reference = self.make_throne()
        self.reference.save(self.directory / "ngai-trong.png")

    def tearDown(self) -> None:
        shutil.rmtree(TEMP_ROOT, ignore_errors=True)

    @staticmethod
    def make_throne(color: tuple[int, int, int, int] = (80, 110, 145, 255)) -> Image.Image:
        image = Image.new("RGBA", (800, 800), (0, 0, 0, 0))
        draw = ImageDraw.Draw(image)
        draw.rounded_rectangle((78, 55, 722, 745), radius=24, fill=color)
        draw.rectangle((104, 90, 696, 708), fill=(108, 132, 160, 255))
        draw.rectangle((126, 112, 674, 686), fill=color)
        draw.line((100, 330, 700, 330), fill=(220, 190, 110, 255), width=13)
        draw.line((116, 520, 684, 520), fill=(28, 38, 52, 255), width=9)
        return image

    @staticmethod
    def shift(image: Image.Image, dx: int, dy: int) -> Image.Image:
        source = np.asarray(image.convert("RGBA"))
        moved = np.zeros_like(source)
        source_x0, source_x1 = max(0, -dx), min(source.shape[1], source.shape[1] - dx)
        source_y0, source_y1 = max(0, -dy), min(source.shape[0], source.shape[0] - dy)
        moved[source_y0 + dy:source_y1 + dy, source_x0 + dx:source_x1 + dx] = source[source_y0:source_y1, source_x0:source_x1]
        return Image.fromarray(moved, "RGBA")

    def save_asset(self, character_id: str, image: Image.Image | None = None) -> Path:
        path = self.directory / f"ngai-{character_id}.png"
        (image or self.reference).save(path)
        return path

    def report(self):
        return check_assets(self.directory, self.manifest, DEFAULT_CENTER)

    def test_identical_throne_is_ok(self) -> None:
        self.save_asset("alpha")
        self.save_asset("bravo")
        report = self.report()
        alpha = next(row for row in report.results if row.character_id == "alpha")
        self.assertEqual(alpha.conclusion, "OK")
        self.assertEqual((alpha.dx, alpha.dy), (0, 0))
        self.assertLess(alpha.color_diff or 0, 1)

    def test_ten_pixel_shift_is_red(self) -> None:
        self.save_asset("alpha", self.shift(self.reference, 10, 0))
        with Image.open(self.directory / "ngai-alpha.png") as opened:
            dx, dy, _ = compare_throne(self.reference, opened)
        self.assertGreater(max(abs(dx), abs(dy)), 8)
        self.assertIn("LỆCH", next(row for row in self.report().results if row.character_id == "alpha").conclusion)

    def test_recolored_throne_is_red(self) -> None:
        recolored = self.make_throne((210, 35, 35, 255))
        self.save_asset("alpha", recolored)
        row = next(row for row in self.report().results if row.character_id == "alpha")
        self.assertEqual((row.dx, row.dy), (0, 0))
        self.assertGreater(row.color_diff or 0, 30)
        self.assertIn("LỆCH", row.conclusion)

    def test_wrong_dimensions_are_red_and_set_exit_code(self) -> None:
        small = self.reference.resize((640, 640))
        self.save_asset("alpha", small)
        row = next(row for row in self.report().results if row.character_id == "alpha")
        self.assertEqual((row.width, row.height), (640, 640))
        self.assertIn("kích thước sai", row.conclusion)
        self.assertEqual(self.report().exit_code, 1)

    def test_nontransparent_corner_is_reported_for_review(self) -> None:
        image = self.reference.copy()
        draw = ImageDraw.Draw(image)
        draw.rectangle((0, 0, 9, 9), fill=(255, 0, 0, 255))
        self.save_asset("alpha", image)
        row = next(row for row in self.report().results if row.character_id == "alpha")
        self.assertFalse(row.corner_alpha_clear)
        self.assertIn("góc", " ".join(row.issues))
        self.assertEqual(row.conclusion, "CẦN XEM")

    def test_missing_id_and_extra_filename_are_both_listed(self) -> None:
        self.save_asset("alpha")
        self.save_asset("not-in-manifest")
        (self.directory / "wrong-name.png").write_bytes(b"not an image")
        report = self.report()
        self.assertEqual(report.missing, ["bravo"])
        self.assertIn("ngai-not-in-manifest.png", report.extras)
        self.assertIn("wrong-name.png", report.extras)
        self.assertEqual(report.summary["THỪA"], 2)

    def test_missing_reference_never_marks_character_assets_ok(self) -> None:
        (self.directory / "ngai-trong.png").unlink()
        self.save_asset("alpha")
        report = self.report()
        self.assertEqual(report.summary["OK"], 0)
        self.assertEqual(report.summary["CẦN XEM"], 2)
        self.assertTrue(all(row.conclusion != "OK" for row in report.results))

    def test_contact_sheet_draws_each_tile_border(self) -> None:
        self.save_asset("alpha")
        self.save_asset("bravo")
        report = self.report()
        sheet_path = TEMP_ROOT / "contact-sheet.png"
        build_contact_sheet(report, sheet_path)
        with Image.open(sheet_path) as sheet:
            self.assertEqual(sheet.getpixel((1, 1)), (42, 202, 116))
            self.assertEqual(sheet.getpixel((SHEET_CELL + 1, 1)), (42, 202, 116))
            self.assertEqual(sheet.getpixel((2 * SHEET_CELL + 1, 1)), (42, 202, 116))


if __name__ == "__main__":
    unittest.main()
