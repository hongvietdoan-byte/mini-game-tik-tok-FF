#!/usr/bin/env python3
"""Xuất/nhập ngân hàng câu hỏi Excel; nội dung workbook luôn là file local, không commit."""

from __future__ import annotations

import argparse
from collections import Counter
from copy import deepcopy
from dataclasses import dataclass
import json
import re
import sqlite3
import subprocess
import sys
from pathlib import Path
from typing import Any, Iterable
from urllib.error import HTTPError, URLError
from urllib.parse import urlsplit
from urllib.request import ProxyHandler, Request, build_opener

try:
    from openpyxl import Workbook, load_workbook
    from openpyxl.styles import Alignment, Font, PatternFill
    from openpyxl.worksheet.datavalidation import DataValidation
except ImportError as error:  # pragma: no cover - depends on local Python environment
    raise SystemExit("Thiếu openpyxl. Cài bằng: py -m pip install openpyxl") from error


OPERATOR_ID = "người dùng duyệt qua file Excel 12/11"
PACK_ID = "demo"
WORKSHEET_ALL = "TAT_CA"
WORKSHEET_GUIDE = "HUONG_DAN"
HEADERS = [
    "id", "chủ đề", "độ khó", "câu hỏi", "A", "B", "C", "D",
    "đáp án đúng", "dùng", "nguồn", "ghi chú", "số ký tự câu hỏi", "cảnh báo",
]
TOPICS = ("Free Fire", "Bá Vương Đại Chiến", "Sự kiện", "Đội", "Caster", "FFWS")
DIFFICULTY_CODES = {"dễ": "EASY", "vừa": "MEDIUM", "khó": "HARD"}
DIFFICULTY_LABELS = {value: key for key, value in DIFFICULTY_CODES.items()}
TOPIC_SUBTOPICS = {
    "Free Fire": ("ff-question-bank", "Free Fire"),
    "Bá Vương Đại Chiến": ("bvdc-question-bank", "Bá Vương Đại Chiến"),
    "Sự kiện": ("bvdc-events", "Sự kiện"),
    "Đội": ("bvdc-teams", "Đội"),
    "Caster": ("bvdc-casters", "Caster"),
    "FFWS": ("ffws-question-bank", "FFWS"),
}
PROMPT_WARNING_LIMIT = 110
OPTION_WARNING_LIMIT = 28
PROMPT_MAX = 220
OPTION_MAX = 90
EXPLANATION_MAX = 400
LOCAL_ADMIN_OPENER = build_opener(ProxyHandler({}))


class QuestionBankError(RuntimeError):
    pass


class ImportApiError(QuestionBankError):
    pass


@dataclass
class QuestionRow:
    question_id: str
    topic: str
    difficulty: str
    prompt: str
    options: list[str]
    correct_answer: str
    enabled: bool
    source: str = ""
    notes: str = ""


@dataclass
class ValidatedImport:
    row_number: int
    question: dict[str, Any]
    topic: str
    enabled: bool


def default_root() -> Path:
    """Dùng common checkout root để worktree vẫn đọc được DB/source local của checkout chính."""
    script_root = Path(__file__).resolve().parents[1]
    try:
        common_dir = subprocess.check_output(
            ["git", "rev-parse", "--path-format=absolute", "--git-common-dir"],
            cwd=script_root,
            text=True,
            stderr=subprocess.DEVNULL,
        ).strip()
        common_path = Path(common_dir).resolve()
        if common_path.name.lower() == ".git":
            candidate = common_path.parent
            if (candidate / "data").is_dir():
                return candidate
    except (OSError, subprocess.CalledProcessError):
        pass
    return script_root


def character_count(value: str) -> int:
    """Python len counts Unicode code points, matching JS [...text].length used by contracts."""
    return len(value.strip())


def length_warnings(prompt: str, options: Iterable[str]) -> list[str]:
    warnings: list[str] = []
    prompt_length = character_count(prompt)
    if prompt_length > PROMPT_WARNING_LIMIT:
        warnings.append(f"Câu hỏi {prompt_length} ký tự")
    for letter, option in zip("ABCD", options):
        option_length = character_count(option)
        if option_length > OPTION_WARNING_LIMIT:
            warnings.append(f"{letter} {option_length} ký tự")
    return warnings


def _clean_markdown(value: str) -> str:
    result = value.strip()
    result = re.sub(r"^\*\*(.*?)\*\*$", r"\1", result)
    result = re.sub(r"\s*(?:✅|✔|✓)\s*$", "", result)
    return result.strip()


def _topic_from_heading(suffix: str, *, is_ffws: bool) -> str:
    if is_ffws:
        return "FFWS"
    segments = [segment.strip() for segment in suffix.split("·") if segment.strip()]
    label = segments[0].casefold() if segments else ""
    if label == "giải":
        return "Bá Vương Đại Chiến"
    aliases = {topic.casefold(): topic for topic in TOPICS}
    return aliases.get(label, "Bá Vương Đại Chiến")


def parse_question_markdown(markdown: str, *, kind: str) -> list[QuestionRow]:
    """Đọc các block bv-NNN/gd-NNN; báo lỗi theo ID, không đưa nội dung câu vào thông báo."""
    if kind not in {"bvdc", "ffws"}:
        raise ValueError("kind phải là 'bvdc' hoặc 'ffws'.")
    lines = markdown.splitlines()
    heading_re = re.compile(r"^\s*#{2,6}\s+((?:bv|gd)-\d{3})\b(.*)$", re.IGNORECASE)
    headings = [index for index, line in enumerate(lines) if heading_re.match(line)]
    output: list[QuestionRow] = []

    for position, start in enumerate(headings):
        match = heading_re.match(lines[start])
        assert match is not None
        question_id = match.group(1).lower()
        end = headings[position + 1] if position + 1 < len(headings) else len(lines)
        # Do not let end matter headings or a later appendix become part of this question.
        for index in range(start + 1, end):
            if re.match(r"^\s*#{1,2}\s+", lines[index]):
                end = index
                break
        block = [line.strip() for line in lines[start + 1:end] if line.strip()]
        suffix = match.group(2).strip()
        difficulty_match = re.search(r"\b(dễ|vừa|khó)\b", suffix, re.IGNORECASE)
        difficulty = (difficulty_match.group(1).casefold() if difficulty_match else "vừa")
        topic = _topic_from_heading(suffix, is_ffws=(kind == "ffws"))

        prompt = ""
        options: dict[str, str] = {}
        marked_answers: list[str] = []
        correct_answer = ""
        source_parts: list[str] = []
        note_parts: list[str] = []
        option_re = re.compile(r"^\s*(?:[-*+]\s*)?([A-D])[.)]\s*(.*?)\s*$", re.IGNORECASE)
        correct_re = re.compile(r"^\s*(?:[-*+]\s*)?(?:đúng|đáp án(?: đúng)?)\s*:\s*\*{0,2}([A-D])\*{0,2}\s*$", re.IGNORECASE)

        for line in block:
            if not prompt and line.startswith("**") and line.endswith("**"):
                prompt = _clean_markdown(line)
                continue
            option_match = option_re.match(line)
            if option_match:
                letter = option_match.group(1).upper()
                raw_text = option_match.group(2)
                if re.search(r"(?:✅|✔|✓)", raw_text):
                    marked_answers.append(letter)
                options[letter] = _clean_markdown(raw_text)
                continue
            answer_match = correct_re.match(line)
            if answer_match:
                correct_answer = answer_match.group(1).upper()
                continue
            label_match = re.match(r"^[-*+]\s*(nguồn|bằng chứng|ghi chú|tin cậy)(?:\s*\([^)]*\))?\s*:\s*(.*)$", line, re.IGNORECASE)
            if label_match:
                label = label_match.group(1).casefold()
                value = label_match.group(2).strip()
                if label == "nguồn":
                    source_parts.append(value)
                elif label in {"bằng chứng", "ghi chú"}:
                    note_parts.append(value)

        if len(options) != 4 or set(options) != set("ABCD"):
            raise QuestionBankError(f"{question_id}: cần đủ bốn đáp án A–D.")
        if not prompt:
            raise QuestionBankError(f"{question_id}: thiếu câu hỏi.")
        if correct_answer:
            marked_answers.append(correct_answer)
        if len(marked_answers) != 1:
            raise QuestionBankError(f"{question_id}: không xác định được duy nhất đáp án đúng.")
        correct_answer = marked_answers[0]
        output.append(QuestionRow(
            question_id=question_id,
            topic=topic,
            difficulty=difficulty,
            prompt=prompt,
            options=[options[letter] for letter in "ABCD"],
            correct_answer=correct_answer,
            enabled=True,
            source="\n".join(source_parts),
            notes="\n".join(note_parts),
        ))
    return output


def load_database_rows(database_path: Path) -> list[QuestionRow]:
    if not database_path.is_file():
        raise QuestionBankError(f"Không tìm thấy DB: {database_path}")
    uri = database_path.resolve().as_uri() + "?mode=ro"
    try:
        connection = sqlite3.connect(uri, uri=True)
        connection.row_factory = sqlite3.Row
        rows = connection.execute(
            "SELECT id, subtopic_id, prompt, options_json, correct_option_id, explanation, difficulty, "
            "source_refs_json, approval_status FROM questions ORDER BY id"
        ).fetchall()
        output: list[QuestionRow] = []
        for row in rows:
            options = json.loads(row["options_json"])
            correct_index = next(
                (index for index, option in enumerate(options) if option["id"] == row["correct_option_id"]),
                None,
            )
            if correct_index is None:
                raise QuestionBankError(f"{row['id']}: correctOptionId không thuộc danh sách đáp án.")
            difficulty = str(row["difficulty"] or "MEDIUM").upper()
            topic = next(
                (topic_name for topic_name, (subtopic_id, _name) in TOPIC_SUBTOPICS.items()
                 if row["subtopic_id"] == subtopic_id),
                None,
            )
            if topic is None:
                if row["subtopic_id"].startswith("ffws-"):
                    topic = "FFWS"
                elif row["subtopic_id"].startswith("bvdc-"):
                    topic = "Bá Vương Đại Chiến"
                else:
                    topic = "Free Fire"
            output.append(QuestionRow(
                question_id=row["id"],
                topic=topic,
                difficulty=DIFFICULTY_LABELS.get(difficulty, "vừa"),
                prompt=row["prompt"],
                options=[option["text"] for option in options],
                correct_answer="ABCD"[correct_index],
                enabled=row["approval_status"] == "APPROVED",
                source="\n".join(json.loads(row["source_refs_json"] or "[]")),
                notes=row["explanation"] or "",
            ))
        return output
    except sqlite3.Error as error:
        raise QuestionBankError(f"Không đọc được DB câu hỏi: {error}") from error
    finally:
        if "connection" in locals():
            connection.close()


def load_all_sources(root: Path) -> list[QuestionRow]:
    database_rows = load_database_rows(root / "data" / "quiz.db")
    bvdc_path = root / "assets-local" / "review" / "DE_XUAT_CAU_HOI_BVDC.md"
    ffws_path = root / "docs" / "review" / "DE_XUAT_CAU_HOI_GIAI_DAU.md"
    missing = [str(path) for path in (bvdc_path, ffws_path) if not path.is_file()]
    if missing:
        raise QuestionBankError("Thiếu nguồn câu hỏi cần thiết: " + ", ".join(missing))
    bvdc_rows = parse_question_markdown(bvdc_path.read_text(encoding="utf-8-sig"), kind="bvdc")
    ffws_rows = parse_question_markdown(ffws_path.read_text(encoding="utf-8-sig"), kind="ffws")
    source_rows = bvdc_rows + ffws_rows
    return merge_source_rows(database_rows, source_rows)


def merge_source_rows(database_rows: list[QuestionRow], source_rows: list[QuestionRow]) -> list[QuestionRow]:
    source_by_id = _index_unique_rows(source_rows, "các nguồn Markdown")
    database_by_id = _index_unique_rows(database_rows, "DB")
    # DB là bản đang vận hành; sau import, bản DB cho ID nguồn thắng để lần export kế tiếp không bị trùng.
    for question_id, database_row in database_by_id.items():
        source_row = source_by_id.get(question_id)
        if (
            question_id.startswith("bv-")
            and source_row is not None
            and database_row.topic == "Bá Vương Đại Chiến"
            and source_row.topic in {"Sự kiện", "Đội", "Caster"}
        ):
            # Dữ liệu cũ có thể đã nhập vào subtopic tổng; phục hồi nhãn phân nhóm từ metadata nguồn.
            database_row.topic = source_row.topic
    source_by_id.update(database_by_id)
    return list(source_by_id.values())


def _index_unique_rows(rows: list[QuestionRow], source_name: str) -> dict[str, QuestionRow]:
    indexed: dict[str, QuestionRow] = {}
    for row in rows:
        if row.question_id in indexed:
            raise QuestionBankError(f"ID trùng trong {source_name}: {row.question_id}")
        indexed[row.question_id] = row
    return indexed


def excel_values(row: QuestionRow) -> list[Any]:
    warnings = length_warnings(row.prompt, row.options)
    return [
        row.question_id,
        row.topic,
        row.difficulty,
        row.prompt,
        *row.options,
        row.correct_answer,
        "CÓ" if row.enabled else "KHÔNG",
        row.source,
        row.notes,
        character_count(row.prompt),
        "; ".join(warnings),
    ]


def create_workbook(rows: list[QuestionRow], output_path: Path, *, overwrite: bool = False) -> int:
    if output_path.exists() and not overwrite:
        raise QuestionBankError(f"File đã tồn tại, không ghi đè: {output_path} (dùng --overwrite nếu đã kiểm tra).")
    output_path.parent.mkdir(parents=True, exist_ok=True)
    workbook = Workbook()
    all_sheet = workbook.active
    all_sheet.title = WORKSHEET_ALL
    header_fill = PatternFill("solid", fgColor="24345E")
    warning_fill = PatternFill("solid", fgColor="FFF2CC")
    header_font = Font(color="FFFFFF", bold=True)
    body_alignment = Alignment(vertical="top", wrap_text=True)

    def populate(sheet, selected: list[QuestionRow]) -> None:
        sheet.append(HEADERS)
        for cell in sheet[1]:
            cell.fill = header_fill
            cell.font = header_font
            cell.alignment = body_alignment
        for row in selected:
            values = excel_values(row)
            sheet.append(values)
            excel_row = sheet.max_row
            for cell in sheet[excel_row]:
                cell.alignment = body_alignment
            if character_count(row.prompt) > PROMPT_WARNING_LIMIT:
                sheet.cell(excel_row, 4).fill = warning_fill
            for index, option in enumerate(row.options, start=5):
                if character_count(option) > OPTION_WARNING_LIMIT:
                    sheet.cell(excel_row, index).fill = warning_fill
            if length_warnings(row.prompt, row.options):
                sheet.cell(excel_row, 14).fill = warning_fill
        sheet.freeze_panes = "A2"
        sheet.auto_filter.ref = f"A1:N{max(sheet.max_row, 1)}"
        widths = [18, 24, 13, 55, 30, 30, 30, 30, 14, 12, 48, 42, 18, 34]
        for index, width in enumerate(widths, start=1):
            sheet.column_dimensions[__import__("openpyxl").utils.get_column_letter(index)].width = width
        for row_number in range(2, sheet.max_row + 1):
            sheet.row_dimensions[row_number].height = 48
        if sheet.max_row >= 2:
            difficulty_validation = DataValidation(type="list", formula1='"dễ,vừa,khó"', allow_blank=False)
            answer_validation = DataValidation(type="list", formula1='"A,B,C,D"', allow_blank=False)
            enabled_validation = DataValidation(type="list", formula1='"CÓ,KHÔNG"', allow_blank=False)
            sheet.add_data_validation(difficulty_validation)
            sheet.add_data_validation(answer_validation)
            sheet.add_data_validation(enabled_validation)
            difficulty_validation.add(f"C2:C{sheet.max_row}")
            answer_validation.add(f"I2:I{sheet.max_row}")
            enabled_validation.add(f"J2:J{sheet.max_row}")

    populate(all_sheet, rows)
    for topic in TOPICS:
        sheet = workbook.create_sheet(topic)
        populate(sheet, [row for row in rows if row.topic == topic])

    guide = workbook.create_sheet(WORKSHEET_GUIDE)
    guide.append(["#", "Hướng dẫn sử dụng"])
    for cell in guide[1]:
        cell.fill = header_fill
        cell.font = header_font
    instructions = [
        "TAT_CA là nguồn dữ liệu duy nhất; các sheet chủ đề chỉ là bản lọc để đọc thuận tiện.",
        "Mỗi dòng là một câu hỏi; giữ id ổn định để lần nhập sau cập nhật đúng câu.",
        "Chỉ sửa nội dung trong file này; không sửa trực tiếp database.",
        "Độ khó chọn một trong ba mức: dễ, vừa hoặc khó.",
        "Đáp án đúng chọn A, B, C hoặc D theo thứ tự bốn cột đáp án.",
        "Dùng = KHÔNG sẽ lưu câu ở trạng thái không được chọn; câu và lịch sử vẫn được giữ.",
        "Ô vàng hoặc cảnh báo báo câu hỏi trên 110 ký tự hay đáp án trên 28 ký tự.",
        "Sau khi sửa, lưu file rồi chạy: py tools\\question_bank.py import --from BO_CAU_HOI.xlsx",
        "Import kiểm tra từng dòng; dòng lỗi được báo theo id và không chặn các dòng hợp lệ khác.",
        "Giữ bản sao lưu DB trước import; không đổi tên sheet TAT_CA hoặc tên các cột.",
    ]
    for index, instruction in enumerate(instructions, start=1):
        guide.append([index, instruction])
        guide.cell(guide.max_row, 2).alignment = body_alignment
    guide.freeze_panes = "A2"
    guide.column_dimensions["A"].width = 8
    guide.column_dimensions["B"].width = 110
    workbook.properties.title = "Bộ câu hỏi TikTok LIVE Quiz"
    workbook.properties.subject = "Nguồn câu hỏi local, cập nhật qua question_bank.py"
    workbook.save(output_path)
    return sum(bool(length_warnings(row.prompt, row.options)) for row in rows)


def _header_map(values: list[Any]) -> dict[str, int]:
    return {str(value).strip(): index for index, value in enumerate(values) if value is not None}


def _cell_text(value: Any) -> str:
    if value is None:
        return ""
    return str(value).strip()


def _difficulty_code(value: str) -> str:
    normalized = value.strip().casefold()
    aliases = {**DIFFICULTY_CODES, "easy": "EASY", "medium": "MEDIUM", "hard": "HARD"}
    if normalized not in aliases:
        raise ValueError("độ khó phải là dễ/vừa/khó")
    return aliases[normalized]


def _enabled_value(value: str) -> bool:
    normalized = value.strip().casefold()
    if normalized in {"có", "co", "yes", "y", "true", "1"}:
        return True
    if normalized in {"không", "khong", "no", "n", "false", "0"}:
        return False
    raise ValueError("dùng phải là CÓ hoặc KHÔNG")


def _source_refs(value: str) -> list[str]:
    refs = [part.strip() for part in re.split(r"\s*(?:\n|;|·)\s*", value) if part.strip()]
    if len(refs) > 20 or any(len(ref) > 200 for ref in refs):
        raise ValueError("nguồn vượt giới hạn 20 mục hoặc 200 ký tự mỗi mục")
    return refs


def _topic_slug(topic: str) -> str:
    return TOPIC_SUBTOPICS[topic][0]


def validate_row(values: list[Any], headers: dict[str, int], row_number: int) -> ValidatedImport:
    def cell(name: str) -> str:
        index = headers.get(name)
        return _cell_text(values[index] if index is not None and index < len(values) else None)

    question_id = cell("id")
    if not question_id:
        raise ValueError("thiếu id")
    if len(question_id) > 64:
        raise ValueError("id vượt giới hạn 64 ký tự")
    topic = cell("chủ đề")
    if topic not in TOPICS:
        raise ValueError("chủ đề không hợp lệ")
    difficulty = _difficulty_code(cell("độ khó"))
    prompt = cell("câu hỏi")
    if not prompt:
        raise ValueError("thiếu câu hỏi")
    if character_count(prompt) > PROMPT_MAX:
        raise ValueError(f"câu hỏi vượt giới hạn lưu {PROMPT_MAX} ký tự")
    options = [cell(letter) for letter in "ABCD"]
    if any(not option for option in options):
        raise ValueError("cần đủ bốn đáp án A–D")
    if any(character_count(option) > OPTION_MAX for option in options):
        raise ValueError(f"đáp án vượt giới hạn lưu {OPTION_MAX} ký tự")
    if len({option.casefold() for option in options}) != 4:
        raise ValueError("bốn đáp án phải khác nhau")
    correct = cell("đáp án đúng").upper()
    if correct not in set("ABCD"):
        raise ValueError("đáp án đúng phải là A/B/C/D")
    enabled = _enabled_value(cell("dùng") or "CÓ")
    source = cell("nguồn")
    notes = cell("ghi chú")
    if len(notes) > EXPLANATION_MAX:
        raise ValueError(f"ghi chú vượt giới hạn {EXPLANATION_MAX} ký tự")
    refs = _source_refs(source)
    topic_id, _topic_name = TOPIC_SUBTOPICS[topic]
    question = {
        "id": question_id,
        "packId": PACK_ID,
        "subtopicId": topic_id,
        "prompt": prompt,
        "options": [{"id": f"o{index + 1}", "text": option} for index, option in enumerate(options)],
        "correctOptionId": f"o{'ABCD'.index(correct) + 1}",
        "explanation": notes,
        "difficulty": difficulty,
        "tags": ["question-bank", topic_id],
        "sourceRefs": refs,
        "verificationStatus": "OPERATOR_VERIFIED",
        "approvalStatus": "APPROVED",
        "version": 1,
        "media": None,
        "validFrom": None,
        "validUntil": None,
        "lastUsedAt": None,
    }
    return ValidatedImport(row_number=row_number, question=question, topic=topic, enabled=enabled)


def read_import_rows(workbook_path: Path) -> tuple[list[ValidatedImport], list[str], Counter[str]]:
    if not workbook_path.is_file():
        raise QuestionBankError(f"Không tìm thấy workbook: {workbook_path}")
    workbook = load_workbook(workbook_path, read_only=True, data_only=True)
    if WORKSHEET_ALL not in workbook.sheetnames:
        workbook.close()
        raise QuestionBankError("Workbook thiếu sheet TAT_CA.")
    sheet = workbook[WORKSHEET_ALL]
    iterator = sheet.iter_rows(values_only=True)
    try:
        header_values = list(next(iterator))
    except StopIteration:
        workbook.close()
        raise QuestionBankError("Sheet TAT_CA rỗng.")
    headers = _header_map(header_values)
    missing = sorted(set(HEADERS[:12]) - headers.keys())
    if missing:
        workbook.close()
        raise QuestionBankError("Thiếu cột bắt buộc: " + ", ".join(missing))

    raw_rows: list[tuple[int, list[Any]]] = []
    for excel_row_number, values in enumerate(iterator, start=2):
        materialized = list(values)
        if not any(_cell_text(value) for value in materialized):
            continue
        raw_rows.append((excel_row_number, materialized))
    workbook.close()
    id_index = headers["id"]
    ids = [
        _cell_text(values[id_index] if id_index < len(values) else None)
        for _row_number, values in raw_rows
    ]
    duplicate_ids = {question_id for question_id, count in Counter(ids).items() if question_id and count > 1}
    valid: list[ValidatedImport] = []
    errors: list[str] = []
    valid_ids: Counter[str] = Counter()
    for row_number, values in raw_rows:
        question_id = _cell_text(values[id_index] if id_index < len(values) else None)
        if question_id in duplicate_ids:
            errors.append(f"Dòng {row_number} ({question_id}): id trùng trong workbook.")
            continue
        try:
            item = validate_row(values, headers, row_number)
            valid.append(item)
            valid_ids[item.question["id"]] += 1
        except ValueError as error:
            errors.append(f"Dòng {row_number} ({question_id or '?'}): {error}.")
    return valid, errors, valid_ids


def _is_connection_refused(error: URLError) -> bool:
    reason = error.reason
    return isinstance(reason, ConnectionRefusedError) or getattr(reason, "winerror", None) == 10061


def _windows_listener_status(api_url: str) -> bool | None:
    """Fallback cục bộ khi firewall làm TCP health probe hết hạn trên Windows."""
    if sys.platform != "win32":
        return None
    parsed = urlsplit(api_url)
    if parsed.hostname not in {"127.0.0.1", "localhost", "::1"}:
        return None
    port = parsed.port or (443 if parsed.scheme == "https" else 80)
    try:
        result = subprocess.run(
            ["netstat", "-ano", "-p", "tcp"],
            capture_output=True, text=True, timeout=4, check=True,
        )
        for line in result.stdout.splitlines():
            columns = line.split()
            if len(columns) < 4 or columns[0].upper() != "TCP" or columns[3].upper() != "LISTENING":
                continue
            try:
                local_port = int(columns[1].rsplit(":", 1)[1])
            except (IndexError, ValueError):
                continue
            if local_port == port:
                return True
        return False
    except (OSError, subprocess.SubprocessError):
        return None


def server_is_running(api_url: str) -> bool:
    try:
        with LOCAL_ADMIN_OPENER.open(api_url.rstrip("/") + "/health", timeout=1.5) as response:
            return response.status < 600
    except HTTPError:
        return True
    except URLError as error:
        if _is_connection_refused(error):
            return False
        listener = _windows_listener_status(api_url)
        if listener is not None:
            return listener
        raise ImportApiError("Không xác định được trạng thái server; từ chối ghi DB trực tiếp.") from error
    except TimeoutError as error:
        raise ImportApiError("Server không phản hồi; từ chối ghi DB trực tiếp.") from error


def _api_json(api_url: str, token: str, path: str, payload: dict[str, Any] | None = None) -> dict[str, Any]:
    body = None if payload is None else json.dumps(payload, ensure_ascii=False).encode("utf-8")
    request = Request(
        api_url.rstrip("/") + path,
        data=body,
        headers={
            "Authorization": f"Bearer {token}",
            **({"Content-Type": "application/json"} if body is not None else {}),
        },
        method="GET" if body is None else "POST",
    )
    try:
        with LOCAL_ADMIN_OPENER.open(request, timeout=8) as response:
            return json.loads(response.read().decode("utf-8"))
    except HTTPError as error:
        code = ""
        try:
            code = str(json.loads(error.read().decode("utf-8")).get("code", ""))
        except (UnicodeDecodeError, json.JSONDecodeError, AttributeError):
            pass
        raise ImportApiError(f"API trả HTTP {error.code}" + (f" ({code})" if code else "")) from error
    except (URLError, TimeoutError, json.JSONDecodeError) as error:
        raise ImportApiError("Không gọi được API nhập câu hỏi; không ghi DB trực tiếp.") from error


def api_import_items(root: Path, api_url: str, items: list[ValidatedImport]) -> dict[str, Any]:
    token_path = root / "data" / "admin-token.txt"
    if not token_path.is_file():
        raise ImportApiError("Server đang chạy nhưng thiếu data/admin-token.txt; không ghi DB trực tiếp.")
    token = token_path.read_text(encoding="utf-8").strip()
    if not token:
        raise ImportApiError("Mã quản trị rỗng; không ghi DB trực tiếp.")
    try:
        _api_json(api_url, token, "/api/question-bank/status")
    except ImportApiError as error:
        raise ImportApiError(
            "Server đang chạy nhưng chưa có API nhập ngân hàng câu hỏi; không ghi DB trực tiếp. "
            "Cập nhật/khởi động lại server rồi chạy import lại."
        ) from error

    outcomes: Counter[str] = Counter()
    errors: list[str] = []
    for item in items:
        payload = {
            "question": item.question,
            "enabled": item.enabled,
            "operatorId": OPERATOR_ID,
        }
        try:
            result = _api_json(api_url, token, "/api/question-bank/import", payload)
            outcomes[str(result.get("action", "updated"))] += 1
        except ImportApiError as error:
            errors.append(f"Dòng {item.row_number} ({item.question['id']}): API nhập lỗi: {error}.")
    return {"outcomes": outcomes, "errors": errors}


def _question_from_sql(row: sqlite3.Row) -> dict[str, Any]:
    return {
        "id": row["id"],
        "packId": row["pack_id"],
        "subtopicId": row["subtopic_id"],
        "prompt": row["prompt"],
        "options": json.loads(row["options_json"]),
        "correctOptionId": row["correct_option_id"],
        "explanation": row["explanation"],
        "difficulty": row["difficulty"],
        "tags": json.loads(row["tags_json"] or "[]"),
        "sourceRefs": json.loads(row["source_refs_json"] or "[]"),
        "verificationStatus": row["verification_status"],
        "approvalStatus": row["approval_status"],
        "version": row["version"],
        "media": json.loads(row["media_json"]) if row["media_json"] else None,
        "validFrom": row["valid_from_ms"],
        "validUntil": row["valid_until_ms"],
        "lastUsedAt": row["last_used_at_ms"],
    }


def _direct_upsert(connection: sqlite3.Connection, item: ValidatedImport) -> str:
    question = deepcopy(item.question)
    question_id = question["id"]
    topic_id, topic_name = TOPIC_SUBTOPICS[item.topic]
    current_row = connection.execute("SELECT * FROM questions WHERE id = ?", (question_id,)).fetchone()
    existing = _question_from_sql(current_row) if current_row else None
    # Các câu Free Fire cũ giữ cờ duyệt hiện tại; dòng mới đã được người dùng duyệt qua workbook.
    preserve_existing_status = existing is not None
    preserve_legacy_metadata = bool(
        existing and item.topic == "Free Fire" and existing["subtopicId"].startswith("ff-")
    )
    if existing:
        question["subtopicId"] = existing["subtopicId"] if preserve_legacy_metadata else topic_id
        question["packId"] = existing["packId"]
        if preserve_legacy_metadata:
            question["tags"] = existing["tags"]
        question["media"] = existing["media"]
        question["validFrom"] = existing["validFrom"]
        question["validUntil"] = existing["validUntil"]
        question["lastUsedAt"] = existing["lastUsedAt"]
        question["version"] = existing["version"]
        previous_options = existing["options"]
        if len(previous_options) == 4:
            correct_index = int(question["correctOptionId"][1:]) - 1
            question["options"] = [
                {"id": previous_options[index]["id"], "text": option["text"]}
                for index, option in enumerate(question["options"])
            ]
            question["correctOptionId"] = previous_options[correct_index]["id"]
    if preserve_existing_status:
        verification_status = existing["verificationStatus"]
        approval_status = "ARCHIVED" if not item.enabled else (
            "APPROVED" if existing["approvalStatus"] == "ARCHIVED" else existing["approvalStatus"]
        )
    else:
        verification_status = "OPERATOR_VERIFIED"
        approval_status = "APPROVED" if item.enabled else "ARCHIVED"
    question["verificationStatus"] = verification_status
    question["approvalStatus"] = approval_status

    if existing:
        content_fields = (
            "packId", "subtopicId", "prompt", "options", "correctOptionId", "explanation", "difficulty",
            "tags", "sourceRefs", "verificationStatus", "approvalStatus", "media", "validFrom", "validUntil",
        )
        if all(existing[field] == question[field] for field in content_fields):
            return "unchanged"
        question["version"] = existing["version"] + 1
        old_snapshot = json.dumps(existing, ensure_ascii=False, separators=(",", ":"))
        connection.execute(
            "INSERT OR IGNORE INTO question_versions (question_id, version, snapshot_json, edited_by, created_at_ms) "
            "VALUES (?, ?, ?, ?, ?)",
            (question_id, existing["version"], old_snapshot, OPERATOR_ID, now_ms()),
        )

    connection.execute(
        "INSERT INTO theme_packs (id, name, schema_version, pack_version, manifest_json) "
        "VALUES (?, ?, 1, '0.0.0', '{}') ON CONFLICT (id) DO NOTHING",
        (question["packId"], "Bộ câu hỏi TikTok LIVE Quiz"),
    )
    connection.execute(
        "INSERT INTO subtopics (id, pack_id, name) VALUES (?, ?, ?) ON CONFLICT (id) DO NOTHING",
        (question["subtopicId"], question["packId"], topic_name if not existing else question["subtopicId"]),
    )
    params = (
        question["packId"], question["subtopicId"], question["prompt"],
        json.dumps(question["options"], ensure_ascii=False), question["correctOptionId"], question["explanation"],
        question["difficulty"], json.dumps(question["tags"], ensure_ascii=False),
        json.dumps(question["sourceRefs"], ensure_ascii=False), question["verificationStatus"],
        question["approvalStatus"], question["version"],
        json.dumps(question["media"], ensure_ascii=False) if question["media"] else None,
        question["validFrom"], question["validUntil"], now_ms(),
    )
    if existing:
        connection.execute(
            "UPDATE questions SET pack_id=?, subtopic_id=?, prompt=?, options_json=?, correct_option_id=?, explanation=?, "
            "difficulty=?, tags_json=?, source_refs_json=?, verification_status=?, approval_status=?, version=?, "
            "media_json=?, valid_from_ms=?, valid_until_ms=?, updated_at_ms=? WHERE id=?",
            (*params, question_id),
        )
        action = "archived" if not item.enabled else "updated"
    else:
        connection.execute(
            "INSERT INTO questions (id, pack_id, subtopic_id, prompt, options_json, correct_option_id, explanation, "
            "difficulty, tags_json, source_refs_json, verification_status, approval_status, version, media_json, "
            "valid_from_ms, valid_until_ms, updated_at_ms) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
            (question_id, *params),
        )
        action = "added" if item.enabled else "archived"
    snapshot = json.dumps(question, ensure_ascii=False, separators=(",", ":"))
    connection.execute(
        "INSERT INTO question_versions (question_id, version, snapshot_json, edited_by, created_at_ms) "
        "VALUES (?, ?, ?, ?, ?) ON CONFLICT (question_id, version) DO UPDATE SET snapshot_json=excluded.snapshot_json, "
        "edited_by=excluded.edited_by, created_at_ms=excluded.created_at_ms",
        (question_id, question["version"], snapshot, OPERATOR_ID, now_ms()),
    )
    return action


def now_ms() -> int:
    from time import time_ns
    return time_ns() // 1_000_000


def direct_db_import(database_path: Path, items: list[ValidatedImport]) -> dict[str, Any]:
    connection = sqlite3.connect(database_path, timeout=5, isolation_level=None)
    connection.row_factory = sqlite3.Row
    outcomes: Counter[str] = Counter()
    errors: list[str] = []
    try:
        connection.execute("PRAGMA foreign_keys = ON")
        connection.execute("PRAGMA busy_timeout = 5000")
        connection.execute("BEGIN IMMEDIATE")
        for item in items:
            connection.execute("SAVEPOINT question_bank_item")
            try:
                action = _direct_upsert(connection, item)
                connection.execute("RELEASE SAVEPOINT question_bank_item")
                outcomes[action] += 1
            except (sqlite3.Error, KeyError, TypeError, ValueError) as error:
                connection.execute("ROLLBACK TO SAVEPOINT question_bank_item")
                connection.execute("RELEASE SAVEPOINT question_bank_item")
                errors.append(f"Dòng {item.row_number} ({item.question['id']}): DB từ chối dòng ({type(error).__name__}).")
        connection.execute("COMMIT")
    except sqlite3.Error as error:
        try:
            connection.execute("ROLLBACK")
        except sqlite3.Error:
            pass
        raise QuestionBankError(f"Không thể cập nhật DB: {type(error).__name__}") from error
    finally:
        connection.close()
    return {"outcomes": outcomes, "errors": errors}


def run_backup(root: Path) -> str:
    command = [sys.executable, str(root / "tools" / "backup.py"), "create", "--root", str(root)]
    try:
        result = subprocess.run(
            command, cwd=root, check=True, text=True, encoding="utf-8", errors="replace", capture_output=True,
        )
    except subprocess.CalledProcessError as error:
        detail = error.stderr.strip().splitlines()[-1] if error.stderr.strip() else "backup thất bại"
        raise QuestionBankError(f"Backup dừng, chưa ghi DB: {detail}") from error
    output = result.stdout.strip().splitlines()
    if not output:
        raise QuestionBankError("Backup không xác nhận kết quả; chưa ghi DB.")
    return output[-1]


def print_source_summary(rows: list[QuestionRow]) -> None:
    counts: dict[tuple[str, str], int] = Counter(
        (row.topic, _difficulty_code(row.difficulty)) for row in rows
    )
    for topic in TOPICS:
        values = [f"{DIFFICULTY_LABELS[difficulty]} {counts[(topic, difficulty)]}" for difficulty in ("EASY", "MEDIUM", "HARD")]
        total = sum(counts[(topic, difficulty)] for difficulty in ("EASY", "MEDIUM", "HARD"))
        if total:
            print(f"- {topic}: {', '.join(values)}; tổng {total}")


def database_preflight(database_path: Path, *, round_size: int = 15) -> dict[str, Any]:
    """Đếm pool công khai và kiểm tra quota vòng kế tiếp, không đọc nội dung câu hỏi."""
    connection = sqlite3.connect(database_path)
    try:
        rows = connection.execute(
            "SELECT difficulty, COUNT(*) FROM questions WHERE pack_id=? AND approval_status='APPROVED' "
            "AND verification_status IN ('VERIFIED', 'OPERATOR_VERIFIED') "
            "AND (valid_from_ms IS NULL OR valid_from_ms<=?) "
            "AND (valid_until_ms IS NULL OR valid_until_ms>?) GROUP BY difficulty",
            (PACK_ID, now_ms(), now_ms()),
        ).fetchall()
    finally:
        connection.close()
    available = {difficulty: int(count) for difficulty, count in rows}
    total = sum(available.values())
    rounds = total // round_size
    targets = {"EASY": 7, "MEDIUM": 5, "HARD": 3}
    tolerance = 2
    quota_possible = any(
        easy + medium + hard == round_size
        and easy <= available.get("EASY", 0)
        and medium <= available.get("MEDIUM", 0)
        and hard <= available.get("HARD", 0)
        for easy in range(max(0, targets["EASY"] - tolerance), targets["EASY"] + tolerance + 1)
        for medium in range(max(0, targets["MEDIUM"] - tolerance), targets["MEDIUM"] + tolerance + 1)
        for hard in range(max(0, targets["HARD"] - tolerance), targets["HARD"] + tolerance + 1)
    )
    return {"available": available, "total": total, "rounds": rounds, "difficulty_quota_pass": quota_possible}


def print_database_preflight(database_path: Path) -> None:
    result = database_preflight(database_path)
    available = result["available"]
    distribution = ", ".join(
        f"{DIFFICULTY_LABELS[difficulty]} {available.get(difficulty, 0)}"
        for difficulty in ("EASY", "MEDIUM", "HARD")
    )
    quota = "PASS" if result["difficulty_quota_pass"] else "WARN"
    print(
        f"Preflight 15 câu: RANDOM {result['rounds']} vòng; DIFFICULTY {result['rounds']} vòng "
        f"(quota 7/5/3 ±2 vòng tới: {quota}); kho {result['total']} câu ({distribution})."
    )


def command_export(args: argparse.Namespace) -> int:
    root = Path(args.root).resolve()
    output_path = Path(args.out)
    if not output_path.is_absolute():
        output_path = root / output_path
    rows = load_all_sources(root)
    warning_count = create_workbook(rows, output_path, overwrite=args.overwrite)
    print(f"export PASS: {len(rows)} câu → {output_path}")
    print_source_summary(rows)
    print(f"Câu vượt ngưỡng độ dài: {warning_count}")
    return 0


def command_import(args: argparse.Namespace) -> int:
    root = Path(args.root).resolve()
    workbook_path = Path(args.from_file)
    if not workbook_path.is_absolute():
        current_candidate = Path.cwd() / workbook_path
        root_candidate = root / workbook_path
        workbook_path = current_candidate if current_candidate.is_file() else root_candidate
    items, validation_errors, _ids = read_import_rows(workbook_path)
    if args.dry_run:
        print(f"dry-run: hợp lệ {len(items)} dòng; lỗi {len(validation_errors)} dòng; DB không thay đổi.")
        for error in validation_errors:
            print(f"  - {error}")
        return 0 if not validation_errors else 1

    api_url = args.api_url.rstrip("/")
    server_running = server_is_running(api_url)
    backup_line = run_backup(root)
    print(backup_line)
    result = api_import_items(root, api_url, items) if server_running else direct_db_import(root / "data" / "quiz.db", items)
    outcomes: Counter[str] = result["outcomes"]
    errors = validation_errors + result["errors"]
    print(
        "import "
        f"thêm={outcomes['added']} sửa={outcomes['updated']} tắt={outcomes['archived']} "
        f"không đổi={outcomes['unchanged']} lỗi/bỏ qua={len(errors)} "
        f"(đường ghi={'API' if server_running else 'DB offline'})."
    )
    for error in errors:
        print(f"  - {error}")
    print_database_preflight(root / "data" / "quiz.db")
    return 0 if not errors else 1


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description=__doc__)
    subparsers = parser.add_subparsers(dest="command", required=True)
    export_parser = subparsers.add_parser("export", help="Gộp nguồn câu hỏi vào workbook local.")
    export_parser.add_argument("--out", required=True, help="Đường dẫn workbook đầu ra; file không được commit.")
    export_parser.add_argument("--root", default=str(default_root()), help=argparse.SUPPRESS)
    export_parser.add_argument("--overwrite", action="store_true", help="Cho phép ghi đè workbook đã tồn tại.")
    export_parser.set_defaults(run=command_export)
    import_parser = subparsers.add_parser("import", help="Kiểm tra và upsert từng dòng trong sheet TAT_CA.")
    import_parser.add_argument("--from", dest="from_file", required=True, help="Workbook nguồn.")
    import_parser.add_argument("--dry-run", action="store_true", help="Chỉ kiểm tra và báo cáo; không backup/ghi DB.")
    import_parser.add_argument("--root", default=str(default_root()), help=argparse.SUPPRESS)
    import_parser.add_argument("--api-url", default="http://127.0.0.1:8787", help=argparse.SUPPRESS)
    import_parser.set_defaults(run=command_import)
    return parser


def main(argv: list[str] | None = None) -> int:
    parser = build_parser()
    args = parser.parse_args(argv)
    try:
        return args.run(args)
    except (QuestionBankError, OSError, sqlite3.Error) as error:
        print(f"question_bank: {error}", file=sys.stderr)
        return 2


if __name__ == "__main__":
    for stream in (sys.stdout, sys.stderr):
        try:
            stream.reconfigure(encoding="utf-8")
        except (AttributeError, OSError):
            pass
    raise SystemExit(main())
