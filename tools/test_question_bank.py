"""Unit test dữ liệu giả cho bộ đọc/ghi workbook câu hỏi."""

from __future__ import annotations

import json
from pathlib import Path
import sqlite3
try:
    from test_support import repo_temp_directory
except ImportError:
    from tools.test_support import repo_temp_directory
import unittest

from openpyxl import Workbook, load_workbook

from tools import question_bank as bank


def fake_row(question_id: str = "fake-001", topic: str = "Free Fire", enabled: str = "CÓ") -> list[str]:
    return [
        question_id, topic, "dễ", "Câu hỏi mẫu?", "Đáp án alpha", "Đáp án beta", "Đáp án gamma", "Đáp án delta",
        "B", enabled, "fixture:fake", "Ghi chú giả", "17", "",
    ]


def fake_question(question_id: str, topic: str = "Free Fire") -> bank.ValidatedImport:
    return bank.validate_row(fake_row(question_id, topic), {name: index for index, name in enumerate(bank.HEADERS)}, 2)


def create_test_database(path: Path) -> None:
    connection = sqlite3.connect(path)
    connection.executescript(
        """
        CREATE TABLE theme_packs (
            id TEXT PRIMARY KEY, name TEXT NOT NULL, schema_version INTEGER NOT NULL DEFAULT 1,
            pack_version TEXT NOT NULL DEFAULT '0.0.0', manifest_json TEXT NOT NULL DEFAULT '{}',
            status TEXT NOT NULL DEFAULT 'DRAFT', created_at_ms INTEGER NOT NULL DEFAULT 0
        );
        CREATE TABLE subtopics (
            id TEXT PRIMARY KEY, pack_id TEXT NOT NULL, name TEXT NOT NULL, fact_kind TEXT NOT NULL DEFAULT 'GENERAL'
        );
        CREATE TABLE questions (
            id TEXT PRIMARY KEY, pack_id TEXT NOT NULL, subtopic_id TEXT NOT NULL, prompt TEXT NOT NULL,
            options_json TEXT NOT NULL, correct_option_id TEXT NOT NULL, explanation TEXT NOT NULL,
            difficulty TEXT NOT NULL, tags_json TEXT NOT NULL, source_refs_json TEXT NOT NULL,
            verification_status TEXT NOT NULL, approval_status TEXT NOT NULL, version INTEGER NOT NULL,
            media_json TEXT, valid_from_ms INTEGER, valid_until_ms INTEGER, last_used_at_ms INTEGER,
            created_at_ms INTEGER NOT NULL DEFAULT 0, updated_at_ms INTEGER NOT NULL DEFAULT 0
        );
        CREATE TABLE question_versions (
            question_id TEXT NOT NULL, version INTEGER NOT NULL, snapshot_json TEXT NOT NULL,
            edited_by TEXT NOT NULL, created_at_ms INTEGER NOT NULL, PRIMARY KEY(question_id, version)
        );
        INSERT INTO theme_packs (id, name) VALUES ('demo', 'Bộ giả');
        INSERT INTO subtopics (id, pack_id, name) VALUES ('ff-tong-quan', 'demo', 'Free Fire');
        INSERT INTO questions (
            id, pack_id, subtopic_id, prompt, options_json, correct_option_id, explanation,
            difficulty, tags_json, source_refs_json, verification_status, approval_status, version
        ) VALUES (
            'old-001', 'demo', 'ff-tong-quan', 'Câu cũ?',
            '[{"id":"o1","text":"Một"},{"id":"o2","text":"Hai"},{"id":"o3","text":"Ba"},{"id":"o4","text":"Bốn"}]',
            'o1', '', 'EASY', '["legacy"]', '[]', 'VERIFIED', 'APPROVED', 1
        );
        """
    )
    connection.commit()
    connection.close()


class QuestionBankTests(unittest.TestCase):
    def test_parse_fake_bvdc_marker_and_ffws_answer_line(self) -> None:
        bvdc = """## bv-001 · Giải · Dễ
**Câu hỏi giả?**
- A) Một
- B) Hai ✅
- C) Ba
- D) Bốn
- Nguồn: fixture:fake
"""
        bvdc_event = bvdc.replace("bv-001 · Giải · Dễ", "bv-002 · Sự kiện · Vừa")
        ffws = """### gd-001 · Khó
**Câu hỏi giải đấu giả?**
A. Một
B. Hai
C. Ba
D. Bốn
Đúng: **C**
"""

        parsed_bvdc = bank.parse_question_markdown(bvdc, kind="bvdc")[0]
        parsed_event = bank.parse_question_markdown(bvdc_event, kind="bvdc")[0]
        parsed_ffws = bank.parse_question_markdown(ffws, kind="ffws")[0]

        self.assertEqual((parsed_bvdc.question_id, parsed_bvdc.topic, parsed_bvdc.difficulty),
                         ("bv-001", "Bá Vương Đại Chiến", "dễ"))
        self.assertEqual(parsed_bvdc.correct_answer, "B")
        self.assertEqual(parsed_event.topic, "Sự kiện")
        self.assertEqual(parsed_event.difficulty, "vừa")
        self.assertEqual(parsed_ffws.topic, "FFWS")
        self.assertEqual(parsed_ffws.correct_answer, "C")

    def test_import_validates_distinct_options_and_correct_letter(self) -> None:
        headers = {name: index for index, name in enumerate(bank.HEADERS)}
        valid = bank.validate_row(fake_row(), headers, 2)
        self.assertEqual(valid.question["verificationStatus"], "OPERATOR_VERIFIED")
        self.assertEqual(valid.question["approvalStatus"], "APPROVED")
        self.assertEqual(valid.topic, "Free Fire")

        invalid = fake_row()
        invalid[6] = invalid[5]
        with self.assertRaisesRegex(ValueError, "phải khác nhau"):
            bank.validate_row(invalid, headers, 3)

    def test_database_rows_override_matching_source_ids_without_duplicate_export(self) -> None:
        source = bank.QuestionRow("bv-001", "Bá Vương Đại Chiến", "dễ", "Nguồn giả", ["a", "b", "c", "d"], "A", True)
        database = bank.QuestionRow("bv-001", "Bá Vương Đại Chiến", "khó", "Bản DB giả", ["a", "b", "c", "d"], "D", False)

        merged = bank.merge_source_rows([database], [source])

        self.assertEqual(len(merged), 1)
        self.assertEqual((merged[0].prompt, merged[0].difficulty, merged[0].enabled), ("Bản DB giả", "khó", False))
        with self.assertRaisesRegex(bank.QuestionBankError, "ID trùng trong DB"):
            bank.merge_source_rows([database, database], [source])

        recovered_category = bank.merge_source_rows(
            [bank.QuestionRow("bv-034", "Bá Vương Đại Chiến", "vừa", "Bản DB", ["a", "b", "c", "d"], "A", True)],
            [bank.QuestionRow("bv-034", "Sự kiện", "vừa", "Nguồn giả", ["a", "b", "c", "d"], "A", True)],
        )
        self.assertEqual(recovered_category[0].topic, "Sự kiện")

    def test_workbook_has_all_sheets_guidance_validation_and_warning_style(self) -> None:
        long_row = bank.QuestionRow(
            "fake-long", "FFWS", "vừa", "Q" * (bank.PROMPT_WARNING_LIMIT + 1),
            ["A", "B", "C", "D"], "A", True,
        )
        with repo_temp_directory() as temp:
            path = Path(temp) / "questions.xlsx"
            warnings = bank.create_workbook([long_row], path)
            workbook = load_workbook(path)
            try:
                self.assertEqual(warnings, 1)
                self.assertEqual(workbook.sheetnames, ["TAT_CA", *bank.TOPICS, "HUONG_DAN"])
                self.assertEqual(workbook["TAT_CA"].freeze_panes, "A2")
                self.assertEqual(workbook["TAT_CA"].auto_filter.ref, "A1:N2")
                self.assertEqual(len(workbook["TAT_CA"].data_validations.dataValidation), 3)
                self.assertEqual(workbook["FFWS"].max_row, 2)
                self.assertEqual(workbook["HUONG_DAN"].max_row, 11)
                self.assertEqual(workbook["TAT_CA"]["D2"].fill.fgColor.rgb, "00FFF2CC")
            finally:
                workbook.close()

    def test_read_import_keeps_good_rows_and_reports_duplicate_ids(self) -> None:
        with repo_temp_directory() as temp:
            path = Path(temp) / "questions.xlsx"
            workbook = Workbook()
            sheet = workbook.active
            sheet.title = bank.WORKSHEET_ALL
            sheet.append(bank.HEADERS)
            sheet.append(fake_row("duplicate"))
            sheet.append(fake_row("duplicate"))
            sheet.append(fake_row("valid"))
            workbook.save(path)

            valid, errors, _ids = bank.read_import_rows(path)
            self.assertEqual([item.question["id"] for item in valid], ["valid"])
            self.assertEqual(len(errors), 2)
            self.assertTrue(all("id trùng" in error for error in errors))

    def test_direct_import_preserves_legacy_flags_tracks_history_and_archives(self) -> None:
        with repo_temp_directory() as temp:
            db_path = Path(temp) / "quiz.db"
            create_test_database(db_path)
            changed_legacy = fake_question("old-001", "Free Fire")
            changed_legacy.question["prompt"] = "Câu đã chỉnh?"
            result = bank.direct_db_import(db_path, [changed_legacy, fake_question("new-001", "FFWS")])

            self.assertEqual(result["outcomes"]["updated"], 1)
            self.assertEqual(result["outcomes"]["added"], 1)
            connection = sqlite3.connect(db_path)
            try:
                legacy = connection.execute(
                    "SELECT verification_status, approval_status, subtopic_id, version FROM questions WHERE id='old-001'"
                ).fetchone()
                new = connection.execute(
                    "SELECT verification_status, approval_status, subtopic_id FROM questions WHERE id='new-001'"
                ).fetchone()
                editor = connection.execute(
                    "SELECT edited_by FROM question_versions WHERE question_id='old-001' AND version=2"
                ).fetchone()[0]
                self.assertEqual(legacy, ("VERIFIED", "APPROVED", "ff-tong-quan", 2))
                self.assertEqual(new, ("OPERATOR_VERIFIED", "APPROVED", "ffws-question-bank"))
                self.assertEqual(editor, bank.OPERATOR_ID)
                self.assertEqual(connection.execute("SELECT COUNT(*) FROM question_versions WHERE question_id='new-001'").fetchone()[0], 1)
            finally:
                connection.close()

            repeated = bank.direct_db_import(db_path, [fake_question("new-001", "FFWS")])
            self.assertEqual(repeated["outcomes"]["unchanged"], 1)

            bank.direct_db_import(db_path, [fake_question("team-001", "Bá Vương Đại Chiến")])
            recategorized = bank.direct_db_import(db_path, [fake_question("team-001", "Đội")])
            self.assertEqual(recategorized["outcomes"]["updated"], 1)
            connection = sqlite3.connect(db_path)
            try:
                self.assertEqual(
                    connection.execute("SELECT subtopic_id FROM questions WHERE id='team-001'").fetchone()[0],
                    "bvdc-teams",
                )
            finally:
                connection.close()

            archived = fake_question("archived-001", "Đội")
            archived.enabled = False
            result = bank.direct_db_import(db_path, [archived])
            self.assertEqual(result["outcomes"]["archived"], 1)
            connection = sqlite3.connect(db_path)
            try:
                status = connection.execute(
                    "SELECT verification_status, approval_status FROM questions WHERE id='archived-001'"
                ).fetchone()
                self.assertEqual(status, ("OPERATOR_VERIFIED", "ARCHIVED"))
            finally:
                connection.close()


if __name__ == "__main__":
    unittest.main()
