import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import Database from 'better-sqlite3';
import ExcelJS from 'exceljs';
import { afterEach, describe, expect, it } from 'vitest';
import { QuestionSchema } from '@quiz/contracts';
import { Store } from './index';
import {
  applyQuestionXlsxImportPlan,
  createQuestionXlsxImportPlan,
  renderQuestionXlsxImportReport,
} from './question-xlsx-import';
import { removeTestTempRoot, testTempRoot } from '../../../tests/support/tempRoot';

const allocated: string[] = [];
const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
const HEADERS = [
  'ID (không sửa)', 'Chủ đề', 'Độ khó', 'Câu hỏi', 'Số ký tự', 'Phương án 1', 'Phương án 2', 'Phương án 3',
  'Phương án 4', 'Đáp án đúng (1-4)', 'Giải thích', 'Hành động', 'Ghi chú',
];

type WorkbookRow = {
  id?: string;
  topic?: string;
  difficulty?: string;
  prompt?: string;
  options?: string[];
  correct?: number | string;
  explanation?: string;
  action?: string;
  note?: string;
};

function tempRoot() {
  const path = testTempRoot('question-xlsx-import-');
  allocated.push(path);
  return path;
}

afterEach(() => {
  for (const path of allocated.splice(0)) removeTestTempRoot(path);
});

function seedDatabase(path: string) {
  const store = new Store(path);
  const question = (id: string, prompt: string) => QuestionSchema.parse({
    id,
    packId: 'pack-demo',
    subtopicId: 'topic-general',
    prompt,
    options: [
      { id: 'o1', text: 'Một' },
      { id: 'o2', text: 'Hai' },
      { id: 'o3', text: 'Ba' },
      { id: 'o4', text: 'Bốn' },
    ],
    correctOptionId: 'o2',
    explanation: 'Giải thích cũ',
    difficulty: 'MEDIUM',
    tags: ['giữ-tag'],
    sourceRefs: ['https://example.invalid/source'],
    verificationStatus: 'OPERATOR_VERIFIED',
    approvalStatus: 'APPROVED',
    version: 1,
  });
  const longQuestion = question('q-long', 'L'.repeat(111));
  longQuestion.options[0]!.text = 'O'.repeat(29);
  store.seedQuestions({ id: 'pack-demo', name: 'Pack demo' }, [
    question('q-edit', 'Câu hỏi cũ'),
    question('q-keep', 'Câu hỏi giữ'),
    question('q-delete', 'Câu hỏi xoá'),
    question('q-noop', 'Câu hỏi không đổi'),
    longQuestion,
  ], 100);
  store.raw.prepare('UPDATE subtopics SET name = ? WHERE id = ?').run('Tổng quát', 'topic-general');
  store.close();
}

async function writeWorkbook(path: string, rows: WorkbookRow[]) {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Cau hoi');
  sheet.addRow(HEADERS);
  for (const item of rows) {
    const row = sheet.addRow([
      item.id ?? '', item.topic ?? 'Tổng quát', item.difficulty ?? 'MEDIUM', item.prompt ?? 'Câu hỏi kiểm thử',
      null, '', '', '', '', item.correct ?? 2, item.explanation ?? 'Giải thích', item.action ?? 'Giữ', item.note ?? '',
    ]);
    (item.options ?? ['Một', 'Hai', 'Ba', 'Bốn']).forEach((option, index) => {
      row.getCell(6 + index).value = option;
    });
    row.getCell(5).value = { formula: `LEN(D${row.number})` };
  }
  // Template có các hàng trống đánh dấu Thêm và formula ở E; chúng không phải lỗi nhập liệu.
  for (let index = 0; index < 3; index += 1) {
    const row = sheet.addRow(['', '', '', '', null, '', '', '', '', '', '', 'Thêm', '']);
    row.getCell(5).value = { formula: `LEN(D${row.number})` };
  }
  await workbook.xlsx.writeFile(path);
}

function readQuestion(db: Database.Database, id: string) {
  const row = db.prepare('SELECT * FROM questions WHERE id = ?').get(id) as Record<string, unknown> | undefined;
  return row;
}

describe('question XLSX importer', () => {
  it('dry-run previews all actions; apply versions edits, archives deletions and adds pending questions transactionally', async () => {
    const root = tempRoot();
    const dbPath = join(root, 'quiz.db');
    const workbookPath = join(root, 'synthetic.xlsx');
    const backupPath = join(root, 'backups', 'before-import.sqlite');
    seedDatabase(dbPath);
    await writeWorkbook(workbookPath, [
      { id: 'q-keep', action: 'Giữ', prompt: 'Câu hỏi giữ', explanation: 'Giải thích cũ' },
      { id: 'q-edit', topic: 'Tổng quát', difficulty: 'HARD', prompt: 'Câu hỏi mới', options: ['Một mới', 'Hai', 'Ba', 'Bốn'], correct: 3, explanation: 'Giải thích mới', action: '', note: 'Không nhập ghi chú' },
      { id: 'q-delete', action: 'Xoá' },
      { topic: 'Tổng quát', difficulty: 'EASY', prompt: 'Câu mới', options: ['Đỏ', 'Xanh', 'Vàng', 'Tím'], correct: 1, explanation: 'Giải thích câu mới', action: '' },
      { id: 'q-noop', action: 'Sửa', topic: 'Tổng quát', difficulty: 'MEDIUM', prompt: 'Câu hỏi không đổi', options: ['Một', 'Hai', 'Ba', 'Bốn'], correct: 2, explanation: 'Giải thích cũ' },
    ]);

    const plan = await createQuestionXlsxImportPlan(workbookPath, dbPath);
    expect(plan.packId).toBe('pack-demo');
    expect(plan.counts).toEqual({ keep: 2, edit: 1, delete: 1, add: 1, unknown: 0 });
    expect(plan.correctAnswerChanges).toBe(1);
    expect(plan.errors).toEqual([]);
    expect(plan.warnings.map((warning) => warning.message)).toEqual([
      'Cột M (Ghi chú) chỉ để operator trao đổi, không được lưu vào DB.',
      'Cột L ghi Sửa nhưng không có trường nội dung nào thay đổi; importer xem như Giữ.',
    ]);
    expect(plan.operations.map((operation) => operation.kind)).toEqual(['edit', 'delete', 'add']);

    const dryRun = renderQuestionXlsxImportReport(plan, { applyRequested: false });
    expect(dryRun).toContain('Câu hỏi cũ');
    expect(dryRun).toContain('Câu hỏi mới');
    expect(dryRun).toContain('Số câu sẽ đổi đáp án đúng: 1');
    expect(dryRun).toContain('2 — Hai');
    expect(dryRun).toContain('3 — Ba');
    expect(dryRun).toContain('chỉ đọc workbook và DB');
    expect(existsSync(backupPath)).toBe(false);

    const result = await applyQuestionXlsxImportPlan(plan, dbPath, backupPath, 555);
    expect(result).toEqual({ added: 1, edited: 1, archived: 1, backupPath });
    expect(existsSync(backupPath)).toBe(true);

    const db = new Database(dbPath, { readonly: true });
    try {
      const edited = readQuestion(db, 'q-edit')!;
      expect(edited).toMatchObject({
        version: 2,
        prompt: 'Câu hỏi mới',
        difficulty: 'HARD',
        correct_option_id: 'o3',
        verification_status: 'UNVERIFIED',
        approval_status: 'PENDING_REVIEW',
        updated_at_ms: 555,
      });
      expect(JSON.parse(edited.options_json as string)).toEqual([
        { id: 'o1', text: 'Một mới' }, { id: 'o2', text: 'Hai' }, { id: 'o3', text: 'Ba' }, { id: 'o4', text: 'Bốn' },
      ]);
      expect(JSON.parse(edited.tags_json as string)).toEqual(['giữ-tag']);
      expect(JSON.parse(edited.source_refs_json as string)).toEqual(['https://example.invalid/source']);

      expect(readQuestion(db, 'q-delete')).toMatchObject({ approval_status: 'ARCHIVED', version: 1 });
      const added = db.prepare("SELECT * FROM questions WHERE prompt = 'Câu mới'").get() as Record<string, unknown>;
      expect(added).toMatchObject({
        pack_id: 'pack-demo', subtopic_id: 'topic-general', version: 1,
        verification_status: 'UNVERIFIED', approval_status: 'PENDING_REVIEW',
      });
      expect(added.id).toMatch(/^q-[0-9a-f-]{36}$/u);

      const history = db.prepare('SELECT question_id, version, snapshot_json FROM question_versions ORDER BY question_id, version').all() as Array<{
        question_id: string; version: number; snapshot_json: string;
      }>;
      const editedHistory = history.filter((entry) => entry.question_id === 'q-edit');
      expect(editedHistory.map((entry) => entry.version)).toEqual([1, 2]);
      expect(JSON.parse(editedHistory[0]!.snapshot_json)).toMatchObject({ prompt: 'Câu hỏi cũ', version: 1 });
      expect(JSON.parse(editedHistory[1]!.snapshot_json)).toMatchObject({ prompt: 'Câu hỏi mới', version: 2 });
      expect(history.some((entry) => entry.question_id === added.id && entry.version === 1)).toBe(true);
    } finally {
      db.close();
    }

    const backup = new Database(backupPath, { readonly: true });
    try {
      expect(readQuestion(backup, 'q-edit')).toMatchObject({ prompt: 'Câu hỏi cũ', version: 1, approval_status: 'APPROVED' });
      expect(readQuestion(backup, 'q-delete')).toMatchObject({ approval_status: 'APPROVED' });
      expect(backup.prepare("SELECT COUNT(*) AS count FROM questions WHERE prompt = 'Câu mới'").get()).toMatchObject({ count: 0 });
    } finally {
      backup.close();
    }
  });

  it('reports row errors and warnings, and refuses apply before creating a backup', async () => {
    const root = tempRoot();
    const dbPath = join(root, 'quiz.db');
    const workbookPath = join(root, 'invalid-synthetic.xlsx');
    const backupPath = join(root, 'backups', 'must-not-exist.sqlite');
    seedDatabase(dbPath);
    await writeWorkbook(workbookPath, [
      { id: 'q-edit', action: 'Sửa', topic: 'Không tồn tại', difficulty: 'IMPOSSIBLE', prompt: 'x'.repeat(111), options: ['trùng', 'trùng', '', 'bốn'], correct: 5 },
      { id: 'missing-id', action: 'Sửa' },
      { id: 'q-keep', action: 'Giữ' },
      { id: 'q-keep', action: 'Xoá' },
      { id: 'q-delete', action: 'Sửa', prompt: 'Câu hỏi xoá', difficulty: 'MEDIUM', options: ['Một', 'Hai', 'Ba', 'Bốn'], correct: 2, explanation: 'Giải thích cũ' },
      { id: 'not-blank', action: 'Thêm' },
    ]);

    const plan = await createQuestionXlsxImportPlan(workbookPath, dbPath, { packId: 'pack-demo' });
    const messages = plan.errors.map((error) => error.message);
    expect(messages).toContain('ID bị lặp trong workbook.');
    expect(messages).toContain('ID "missing-id" không tồn tại trong DB.');
    expect(plan.tooLongWarnings).toContainEqual(expect.objectContaining({
      rowNumber: 2,
      message: 'Câu hỏi vượt ngưỡng question-length: 111/110 ký tự; sẽ bị loại khỏi vòng chơi.',
    }));
    expect(messages.some((message) => message.includes('Phương án 1 và 2 trùng nhau.'))).toBe(true);
    expect(messages.some((message) => message.includes('Thiếu phương án 3.'))).toBe(true);
    expect(messages).toContain('Đáp án đúng phải là số 1–4.');
    expect(messages).toContain('Độ khó phải là EASY, MEDIUM hoặc HARD.');
    expect(plan.warnings.some((warning) => warning.message === 'Sẽ tạo chủ đề mới: Không tồn tại.')).toBe(true);
    expect(messages).toContain('ID "not-blank" không tồn tại trong DB.');
    expect(plan.warnings.some((warning) => warning.message === 'Cột L ghi Sửa nhưng không có trường nội dung nào thay đổi; importer xem như Giữ.')).toBe(true);
    expect(renderQuestionXlsxImportReport(plan, { applyRequested: true })).toContain('không được phép apply');

    await expect(applyQuestionXlsxImportPlan(plan, dbPath, backupPath, 999)).rejects.toThrow('không thể áp dụng');
    expect(existsSync(backupPath)).toBe(false);
    const db = new Database(dbPath, { readonly: true });
    try {
      expect(readQuestion(db, 'q-edit')).toMatchObject({ prompt: 'Câu hỏi cũ', version: 1, approval_status: 'APPROVED' });
    } finally {
      db.close();
    }
  });

  it('uses subtopic case-insensitively and marks a new question pending review', async () => {
    const root = tempRoot();
    const dbPath = join(root, 'quiz.db');
    const workbookPath = join(root, 'new-only.xlsx');
    seedDatabase(dbPath);
    await writeWorkbook(workbookPath, [
      { topic: 'tỔNG QUÁT', difficulty: 'easy', prompt: 'Câu thêm', action: 'Thêm' },
    ]);
    const plan = await createQuestionXlsxImportPlan(workbookPath, dbPath);
    expect(plan.errors).toEqual([]);
    expect(plan.operations).toHaveLength(1);
    const add = plan.operations[0]!;
    expect(add.kind).toBe('add');
    if (add.kind === 'add') expect(add.after).toMatchObject({
      packId: 'pack-demo', subtopicId: 'topic-general', approvalStatus: 'PENDING_REVIEW', verificationStatus: 'UNVERIFIED',
    });
  });

  it('infers edits and additions without column L, creates normalized topics, and reads displayed Excel values through the last row', async () => {
    const root = tempRoot();
    const dbPath = join(root, 'quiz.db');
    const workbookPath = join(root, 'inferred-actions.xlsx');
    seedDatabase(dbPath);
    const newRows: WorkbookRow[] = Array.from({ length: 22 }, (_, index) => ({
      topic: index === 0 ? ' Chủ đề   mới ' : 'chủ đề mới',
      difficulty: 'EASY',
      prompt: `Câu thêm ${index + 1}`,
      options: ['Một', 'Hai', 'Ba', 'Bốn'],
      correct: index === 0 ? '3.0' : 3,
      action: '',
    }));
    await writeWorkbook(workbookPath, [
      { id: 'q-edit', topic: 'Tổng quát', prompt: 'Đổi đáp án', correct: 3, action: 'Giữ' },
      ...newRows,
    ]);

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(workbookPath);
    const sheet = workbook.getWorksheet('Cau hoi')!;
    sheet.getCell(3, 4).value = 1887;
    sheet.getCell(3, 6).value = new Date(Date.UTC(2025, 0, 2));
    sheet.getCell(3, 6).numFmt = 'yyyy-mm-dd';
    sheet.getCell(3, 10).value = 3;
    sheet.getCell(3, 10).numFmt = '0.0';
    await workbook.xlsx.writeFile(workbookPath);

    const plan = await createQuestionXlsxImportPlan(workbookPath, dbPath);
    expect(plan.errors).toEqual([]);
    expect(plan.counts).toEqual({ keep: 0, edit: 1, delete: 0, add: 22, unknown: 0 });
    expect(plan.correctAnswerChanges).toBe(1);
    expect(plan.topicsToCreate).toHaveLength(1);
    expect(plan.topicsToCreate[0]).toMatchObject({ name: 'Chủ đề mới', packId: 'pack-demo' });
    expect(plan.warnings.some((warning) => warning.message.includes('Cột L ghi "Giữ"'))).toBe(true);
    const firstAdd = plan.operations.find((operation) => operation.kind === 'add');
    expect(firstAdd?.kind).toBe('add');
    if (firstAdd?.kind === 'add') {
      expect(firstAdd.after.prompt).toBe('1887');
      expect(firstAdd.after.options[0]?.text).toBe('2025-01-02');
    }
    expect(renderQuestionXlsxImportReport(plan, { applyRequested: false })).toContain('Số câu sẽ đổi đáp án đúng: 1');

    const result = await applyQuestionXlsxImportPlan(plan, dbPath, join(root, 'backup.sqlite'), 777);
    expect(result).toMatchObject({ added: 22, edited: 1 });
    const db = new Database(dbPath, { readonly: true });
    try {
      expect(db.prepare("SELECT COUNT(*) AS count FROM subtopics WHERE pack_id = 'pack-demo' AND lower(name) = lower('Chủ đề mới')")
        .get()).toMatchObject({ count: 1 });
      expect(db.prepare("SELECT COUNT(*) AS count FROM questions WHERE prompt LIKE 'Câu thêm %'").get()).toMatchObject({ count: 21 });
    } finally {
      db.close();
    }
  });

  it('allows apply when an unchanged question exceeds question-length and lists it in the prominent report section', async () => {
    const root = tempRoot();
    const dbPath = join(root, 'quiz.db');
    const workbookPath = join(root, 'long-unchanged-synthetic.xlsx');
    const backupPath = join(root, 'backup.sqlite');
    const longPrompt = 'L'.repeat(111);
    const longOption = 'O'.repeat(29);
    seedDatabase(dbPath);
    await writeWorkbook(workbookPath, [
      { id: 'q-long', topic: 'Tổng quát', difficulty: 'MEDIUM', prompt: longPrompt,
        options: [longOption, 'Hai', 'Ba', 'Bốn'], correct: 2, explanation: 'Giải thích cũ', action: 'Giữ' },
      { id: 'q-edit', topic: 'Tổng quát', difficulty: 'MEDIUM', prompt: 'Câu đã sửa',
        options: ['Một', 'Hai', 'Ba', 'Bốn'], correct: 2, explanation: 'Giải thích cũ', action: '' },
    ]);

    const plan = await createQuestionXlsxImportPlan(workbookPath, dbPath);
    expect(plan.errors).toEqual([]);
    expect(plan.counts).toMatchObject({ keep: 1, edit: 1 });
    expect(plan.tooLongWarnings).toHaveLength(2);
    const report = renderQuestionXlsxImportReport(plan, { applyRequested: false });
    expect(report).toContain('## Quá dài — sẽ bị loại khỏi vòng chơi');
    expect(report).toContain('Dòng 2 (q-long)');
    expect(report).toContain('Phương án 1 vượt ngưỡng question-length: 29/28 ký tự; sẽ bị loại khỏi vòng chơi.');
    expect(report.indexOf('## Quá dài')).toBeLessThan(report.indexOf('## Tổng hợp'));

    const result = await applyQuestionXlsxImportPlan(plan, dbPath, backupPath, 888);
    expect(result).toMatchObject({ edited: 1, backupPath });
    const db = new Database(dbPath, { readonly: true });
    try {
      expect(readQuestion(db, 'q-long')).toMatchObject({ prompt: longPrompt, version: 1, approval_status: 'APPROVED' });
      expect(readQuestion(db, 'q-edit')).toMatchObject({ prompt: 'Câu đã sửa', version: 2, approval_status: 'PENDING_REVIEW' });
    } finally {
      db.close();
    }
  });

  it('CLI writes a Vietnamese adjacent report and keeps dry-run read-only', async () => {
    const root = tempRoot();
    const dbPath = join(root, 'quiz.db');
    const workbookPath = join(root, 'cli-synthetic.xlsx');
    const reportPath = join(root, 'cli-synthetic.import-report.md');
    seedDatabase(dbPath);
    await writeWorkbook(workbookPath, [
      { id: 'q-edit', topic: 'Tổng quát', prompt: 'Bản sửa qua CLI', explanation: 'Giải thích cũ', action: '' },
    ]);

    const output = execFileSync(process.execPath, [
      join(REPO_ROOT, 'node_modules', 'tsx', 'dist', 'cli.mjs'),
      join(REPO_ROOT, 'tools', 'questions_import_xlsx.ts'), workbookPath, '--db', dbPath,
    ], { cwd: REPO_ROOT, encoding: 'utf8' });

    expect(output).toContain('Báo cáo nhập câu hỏi từ Excel');
    expect(output).toContain('Chế độ: dry-run (mặc định)');
    expect(existsSync(reportPath)).toBe(true);
    expect(readFileSync(reportPath, 'utf8')).toContain('Bản sửa qua CLI');
    const db = new Database(dbPath, { readonly: true });
    try {
      expect(readQuestion(db, 'q-edit')).toMatchObject({ prompt: 'Câu hỏi cũ', version: 1 });
    } finally {
      db.close();
    }
  });
});
