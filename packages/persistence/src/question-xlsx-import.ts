import { randomUUID } from 'node:crypto';
import { basename, dirname, extname, join, resolve } from 'node:path';
import Database from 'better-sqlite3';
import ExcelJS from 'exceljs';
import SSF from 'ssf';
import {
  DifficultySchema,
  QUESTION_LIMITS,
  QUESTION_WARNING_LIMITS,
  QuestionSchema,
  questionLengthWarnings,
  type Difficulty,
  type Question,
} from '@quiz/contracts';
import { backupSqliteReadonly } from './readonly-backup';

const SHEET_NAME = 'Cau hoi';
const IMPORT_EDITOR = 'IMPORT_XLSX';
const COLUMN = {
  id: 1,
  topic: 2,
  difficulty: 3,
  prompt: 4,
  options: [6, 7, 8, 9],
  correct: 10,
  explanation: 11,
  action: 12,
  note: 13,
} as const;

export type QuestionImportAction = 'GIU' | 'SUA' | 'XOA' | 'THEM' | 'KHAC';
export type QuestionImportCounts = { keep: number; edit: number; delete: number; add: number; unknown: number };
export type QuestionImportIssue = { rowNumber: number; questionId: string; message: string };
export type QuestionImportChange = { field: string; before: string; after: string };

export type PlannedQuestionImport =
  | { kind: 'edit'; rowNumber: number; before: Question; after: Question; changes: QuestionImportChange[] }
  | { kind: 'delete'; rowNumber: number; before: Question }
  | { kind: 'add'; rowNumber: number; after: Question; topicName: string };

export type QuestionXlsxImportPlan = {
  workbookName: string;
  packId: string | null;
  topicsToCreate: Array<{ id: string; packId: string; name: string }>;
  correctAnswerChanges: number;
  counts: QuestionImportCounts;
  errors: QuestionImportIssue[];
  warnings: QuestionImportIssue[];
  operations: PlannedQuestionImport[];
};

export type QuestionXlsxImportResult = {
  added: number;
  edited: number;
  archived: number;
  backupPath: string | null;
};

type WorkbookQuestionRow = {
  rowNumber: number;
  id: string;
  topic: string;
  difficulty: string;
  prompt: string;
  options: string[];
  correct: string;
  explanation: string;
  action: QuestionImportAction;
  rawAction: string;
  note: string;
};

type DbQuestionRow = {
  id: string;
  pack_id: string;
  subtopic_id: string;
  prompt: string;
  options_json: string;
  correct_option_id: string;
  explanation: string;
  difficulty: string;
  tags_json: string;
  source_refs_json: string;
  verification_status: string;
  approval_status: string;
  version: number;
  media_json: string | null;
  valid_from_ms: number | null;
  valid_until_ms: number | null;
  last_used_at_ms: number | null;
};

type DbSnapshot = {
  packs: Array<{ id: string; status: string }>;
  subtopics: Array<{ id: string; packId: string; name: string }>;
  questions: Map<string, Question>;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function formatCellValue(cell: ExcelJS.Cell, value: unknown, date1904: boolean): string {
  if (value === null || value === undefined) return '';
  if (typeof value === 'string') return value.trim();
  if (typeof value === 'number' && Number.isFinite(value)) {
    try {
      return SSF.format(cell.numFmt || 'General', value).trim();
    } catch {
      return String(value);
    }
  }
  if (value instanceof Date) {
    const serial = 25569 + value.getTime() / (24 * 60 * 60 * 1000) - (date1904 ? 1462 : 0);
    try {
      return SSF.format(cell.numFmt || 'mm-dd-yy', serial).trim();
    } catch {
      return value.toISOString().slice(0, 10);
    }
  }
  if (typeof value === 'boolean') return value ? 'TRUE' : 'FALSE';
  if (isRecord(value)) {
    if (Array.isArray(value.richText)) {
      return value.richText.map((part) => isRecord(part) && typeof part.text === 'string' ? part.text : '').join('').trim();
    }
    if (typeof value.text === 'string') return value.text.trim();
    if ('formula' in value || 'sharedFormula' in value) return formatCellValue(cell, value.result, date1904);
  }
  return cell.text.trim();
}

function cellText(cell: ExcelJS.Cell, date1904: boolean): string {
  return formatCellValue(cell, cell.value, date1904);
}

function normalizeHeader(value: string): string {
  return value.normalize('NFD').replace(/\p{Diacritic}/gu, '').replace(/đ/giu, 'd').toLocaleLowerCase('vi').replace(/[^a-z0-9]+/gu, ' ').trim();
}

function checkHeaders(worksheet: ExcelJS.Worksheet, date1904: boolean) {
  const header = worksheet.getRow(1);
  const required: Array<{ column: number; label: string; accepts: (value: string) => boolean }> = [
    { column: 1, label: 'ID (A)', accepts: (value) => value === 'id' },
    { column: 2, label: 'Chủ đề (B)', accepts: (value) => value.includes('chu de') || value === 'topic' },
    { column: 3, label: 'Độ khó (C)', accepts: (value) => value.includes('do kho') || value === 'difficulty' },
    { column: 4, label: 'Câu hỏi (D)', accepts: (value) => value.includes('cau hoi') || value === 'question' },
    ...COLUMN.options.map((column, index) => ({
      column,
      label: `Phương án ${index + 1} (${String.fromCharCode(64 + column)})`,
      accepts: (value: string) => /phuong an|dap an|option/u.test(value),
    })),
    { column: 10, label: 'Đáp án đúng (J)', accepts: (value) => value.includes('dap an dung') || value === 'correct' },
    { column: 11, label: 'Giải thích (K)', accepts: (value) => value.includes('giai thich') || value === 'explanation' },
    { column: 12, label: 'Hành động (L)', accepts: (value) => value.includes('hanh dong') || value === 'action' },
    { column: 13, label: 'Ghi chú (M)', accepts: (value) => value.includes('ghi chu') || value === 'note' },
  ];
  const missing = required.filter(({ column, accepts }) => !accepts(normalizeHeader(cellText(header.getCell(column), date1904))));
  if (missing.length > 0) {
    throw new Error(`Sheet "${SHEET_NAME}" sai hoặc thiếu tiêu đề cột: ${missing.map((item) => item.label).join(', ')}.`);
  }
}

function actionFrom(value: string): QuestionImportAction {
  const normalized = normalizeHeader(value);
  if (normalized === 'giu' || normalized === 'keep') return 'GIU';
  if (normalized === 'sua' || normalized === 'edit') return 'SUA';
  if (normalized === 'xoa' || normalized === 'delete') return 'XOA';
  if (normalized === 'them' || normalized === 'add') return 'THEM';
  return 'KHAC';
}

function isBlankTemplateRow(worksheet: ExcelJS.Worksheet, rowNumber: number, date1904: boolean): boolean {
  const row = worksheet.getRow(rowNumber);
  // E contains =LEN(Dn) in the template; formulas are intentionally ignored.
  const contentColumns = [COLUMN.id, COLUMN.topic, COLUMN.difficulty, COLUMN.prompt, ...COLUMN.options,
    COLUMN.correct, COLUMN.explanation, COLUMN.note];
  return contentColumns.every((column) => cellText(row.getCell(column), date1904) === '');
}

async function readWorkbookRows(workbookPath: string): Promise<WorkbookQuestionRow[]> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(workbookPath);
  const worksheet = workbook.getWorksheet(SHEET_NAME);
  if (!worksheet) throw new Error(`Workbook thiếu sheet "${SHEET_NAME}".`);
  const date1904 = Boolean(workbook.properties.date1904);
  checkHeaders(worksheet, date1904);

  const rows: WorkbookQuestionRow[] = [];
  for (let rowNumber = 2; rowNumber <= worksheet.rowCount; rowNumber += 1) {
    if (isBlankTemplateRow(worksheet, rowNumber, date1904)) continue;
    const row = worksheet.getRow(rowNumber);
    const rawAction = cellText(row.getCell(COLUMN.action), date1904);
    rows.push({
      rowNumber,
      id: cellText(row.getCell(COLUMN.id), date1904),
      topic: cellText(row.getCell(COLUMN.topic), date1904),
      difficulty: cellText(row.getCell(COLUMN.difficulty), date1904),
      prompt: cellText(row.getCell(COLUMN.prompt), date1904),
      options: COLUMN.options.map((column) => cellText(row.getCell(column), date1904)),
      correct: cellText(row.getCell(COLUMN.correct), date1904),
      explanation: cellText(row.getCell(COLUMN.explanation), date1904),
      action: actionFrom(rawAction),
      rawAction,
      note: cellText(row.getCell(COLUMN.note), date1904),
    });
  }
  return rows;
}

function parseJson(value: string | null, field: string, id: string): unknown {
  if (value === null) return null;
  try {
    return JSON.parse(value) as unknown;
  } catch {
    throw new Error(`DB có JSON không hợp lệ ở ${field} của câu ${id}.`);
  }
}

function questionFromDb(row: DbQuestionRow): Question {
  return QuestionSchema.parse({
    id: row.id,
    packId: row.pack_id,
    subtopicId: row.subtopic_id,
    prompt: row.prompt,
    options: parseJson(row.options_json, 'options_json', row.id),
    correctOptionId: row.correct_option_id,
    explanation: row.explanation,
    difficulty: row.difficulty,
    tags: parseJson(row.tags_json, 'tags_json', row.id),
    sourceRefs: parseJson(row.source_refs_json, 'source_refs_json', row.id),
    verificationStatus: row.verification_status,
    approvalStatus: row.approval_status,
    version: row.version,
    media: parseJson(row.media_json, 'media_json', row.id),
    validFrom: row.valid_from_ms,
    validUntil: row.valid_until_ms,
    lastUsedAt: row.last_used_at_ms,
  });
}

function readDatabase(databasePath: string): DbSnapshot {
  const resolvedPath = resolve(databasePath);
  const db = new Database(resolvedPath, { readonly: true, fileMustExist: true });
  try {
    const packs = db.prepare('SELECT id, status FROM theme_packs ORDER BY id').all() as Array<{ id: string; status: string }>;
    const subtopics = db.prepare('SELECT id, pack_id AS packId, name FROM subtopics ORDER BY id').all() as DbSnapshot['subtopics'];
    const rawQuestions = db.prepare(`SELECT id, pack_id, subtopic_id, prompt, options_json, correct_option_id,
      explanation, difficulty, tags_json, source_refs_json, verification_status, approval_status, version,
      media_json, valid_from_ms, valid_until_ms, last_used_at_ms FROM questions ORDER BY id`).all() as DbQuestionRow[];
    return { packs, subtopics, questions: new Map(rawQuestions.map((row) => [row.id, questionFromDb(row)])) };
  } finally {
    db.close();
  }
}

function issue(row: WorkbookQuestionRow, message: string): QuestionImportIssue {
  return { rowNumber: row.rowNumber, questionId: row.id || '(câu mới)', message };
}

function topicName(snapshot: DbSnapshot, question: Question): string {
  return snapshot.subtopics.find((subtopic) => subtopic.id === question.subtopicId)?.name ?? question.subtopicId;
}

function normalizedTopic(value: string): string {
  return value.normalize('NFKC').replace(/\s+/gu, ' ').trim().toLocaleLowerCase('vi');
}

function contentChanges(before: Question, after: Question, snapshot: DbSnapshot, afterTopicName: string): QuestionImportChange[] {
  const changes: QuestionImportChange[] = [];
  const add = (field: string, oldValue: string, newValue: string) => {
    if (oldValue !== newValue) changes.push({ field, before: oldValue, after: newValue });
  };
  const oldTopicName = topicName(snapshot, before);
  if (normalizedTopic(oldTopicName) !== normalizedTopic(afterTopicName)) add('Chủ đề', oldTopicName, afterTopicName);
  add('Độ khó', before.difficulty, after.difficulty);
  add('Câu hỏi', before.prompt, after.prompt);
  before.options.forEach((option, index) => add(`Phương án ${index + 1}`, option.text, after.options[index]!.text));
  const beforeCorrectIndex = before.options.findIndex((option) => option.id === before.correctOptionId);
  const afterCorrectIndex = after.options.findIndex((option) => option.id === after.correctOptionId);
  const beforeCorrect = before.options[beforeCorrectIndex];
  const afterCorrect = after.options[afterCorrectIndex];
  if (beforeCorrectIndex !== afterCorrectIndex || beforeCorrect?.text !== afterCorrect?.text) {
    add('Đáp án đúng', `${beforeCorrectIndex + 1} — ${beforeCorrect?.text ?? '(không rõ)'}`,
      `${afterCorrectIndex + 1} — ${afterCorrect?.text ?? '(không rõ)'}`);
  }
  add('Giải thích', before.explanation, after.explanation);
  return changes;
}

function readContent(row: WorkbookQuestionRow, errors: QuestionImportIssue[]): {
  topic: string;
  difficulty: Difficulty;
  prompt: string;
  options: string[];
  correctIndex: number;
  explanation: string;
} | null {
  let valid = true;
  const addError = (message: string) => {
    errors.push(issue(row, message));
    valid = false;
  };

  const difficultyResult = DifficultySchema.safeParse(row.difficulty.trim().toUpperCase());
  if (!difficultyResult.success) addError('Độ khó phải là EASY, MEDIUM hoặc HARD.');
  const prompt = row.prompt.trim();
  if (!prompt) addError('Thiếu câu hỏi.');
  if (!row.topic.trim()) addError('Thiếu chủ đề.');
  if (prompt.length > QUESTION_LIMITS.promptMax) addError(`Câu hỏi vượt giới hạn lưu ${QUESTION_LIMITS.promptMax} ký tự.`);

  const options = row.options.map((value) => value.trim());
  options.forEach((option, index) => {
    if (!option) addError(`Thiếu phương án ${index + 1}.`);
    if (option.length > QUESTION_LIMITS.optionMax) addError(`Phương án ${index + 1} vượt giới hạn lưu ${QUESTION_LIMITS.optionMax} ký tự.`);
  });
  const seen = new Map<string, number>();
  options.forEach((option, index) => {
    if (!option) return;
    const key = option.normalize('NFKC').toLocaleLowerCase('vi');
    const first = seen.get(key);
    if (first !== undefined) addError(`Phương án ${first + 1} và ${index + 1} trùng nhau.`);
    else seen.set(key, index);
  });

  const correctIndex = parseCorrectIndex(row.correct);
  if (correctIndex < 0) addError('Đáp án đúng phải là số 1–4.');

  const explanation = row.explanation.trim();
  if (explanation.length > QUESTION_LIMITS.explanationMax) {
    addError(`Giải thích vượt giới hạn ${QUESTION_LIMITS.explanationMax} ký tự.`);
  }

  if (prompt) {
    const warnings = questionLengthWarnings({
      prompt,
      options: options.map((text, index) => ({ id: `o${index + 1}`, text })),
    }, QUESTION_WARNING_LIMITS);
    for (const warning of warnings) {
      const label = warning.field === 'prompt' ? 'Câu hỏi' : `Phương án ${Number(warning.optionId?.slice(1)) || 0}`;
      addError(`${label} quá dài theo ngưỡng question-length: ${warning.characterCount}/${warning.limit} ký tự.`);
    }
  }
  if (!valid || !difficultyResult.success || correctIndex < 0) return null;
  return {
    topic: row.topic.normalize('NFKC').replace(/\s+/gu, ' ').trim(),
    difficulty: difficultyResult.data, prompt, options, correctIndex, explanation,
  };
}

function parseCorrectIndex(value: string): number {
  const number = Number(value);
  return /^\s*[1-4](?:\.0+)?\s*$/u.test(value) && Number.isInteger(number) ? number - 1 : -1;
}

function blankQuestion(id: string, packId: string, subtopicId: string, content: NonNullable<ReturnType<typeof readContent>>): Question {
  return QuestionSchema.parse({
    id,
    packId,
    subtopicId,
    prompt: content.prompt,
    options: content.options.map((text, index) => ({ id: `o${index + 1}`, text })),
    correctOptionId: `o${content.correctIndex + 1}`,
    explanation: content.explanation,
    difficulty: content.difficulty,
    tags: [],
    sourceRefs: [],
    verificationStatus: 'UNVERIFIED',
    approvalStatus: 'PENDING_REVIEW',
    version: 1,
    media: null,
    validFrom: null,
    validUntil: null,
    lastUsedAt: null,
  });
}

function rowLooksChanged(row: WorkbookQuestionRow, before: Question, snapshot: DbSnapshot): boolean {
  if (normalizedTopic(row.topic) !== normalizedTopic(topicName(snapshot, before))) return true;
  if (row.difficulty.trim().toUpperCase() !== before.difficulty) return true;
  if (row.prompt.trim() !== before.prompt || row.explanation.trim() !== before.explanation) return true;
  if (row.options.some((option, index) => option.trim() !== before.options[index]?.text)) return true;
  const correctIndex = parseCorrectIndex(row.correct);
  return correctIndex >= 0 && before.options[correctIndex]?.id !== before.correctOptionId;
}

function actionMismatchWarning(row: WorkbookQuestionRow, actual: QuestionImportAction): string | null {
  if (!row.rawAction || row.action === actual) return null;
  const labels: Record<QuestionImportAction, string> = {
    GIU: 'Giữ', SUA: 'Sửa', XOA: 'Xoá', THEM: 'Thêm', KHAC: 'không nhận dạng',
  };
  return `Cột L ghi "${row.rawAction}" nhưng dữ liệu được nhận diện là ${labels[actual]}; importer ưu tiên nội dung ô.`;
}

export async function createQuestionXlsxImportPlan(
  workbookPath: string,
  databasePath: string,
  options: { packId?: string } = {},
): Promise<QuestionXlsxImportPlan> {
  const rows = await readWorkbookRows(resolve(workbookPath));
  const snapshot = readDatabase(resolve(databasePath));
  const counts: QuestionImportCounts = { keep: 0, edit: 0, delete: 0, add: 0, unknown: 0 };
  const errors: QuestionImportIssue[] = [];
  const warnings: QuestionImportIssue[] = [];
  const operations: PlannedQuestionImport[] = [];
  const topicsToCreate: QuestionXlsxImportPlan['topicsToCreate'] = [];
  const answerChangedIds = new Set<string>();

  const duplicateIds = new Set(rows.map((row) => row.id).filter(Boolean)
    .filter((id, index, all) => all.indexOf(id) !== index));
  const referencedPackIds = new Set(rows.flatMap((row) => {
    const question = snapshot.questions.get(row.id);
    return question ? [question.packId] : [];
  }));
  const addRows = rows.filter((row) => !row.id && row.prompt.trim());
  let packId = options.packId?.trim() || null;
  if (!packId && referencedPackIds.size === 1) packId = [...referencedPackIds][0]!;
  if (!packId && referencedPackIds.size === 0) {
    const activePacks = snapshot.packs.filter((pack) => pack.status === 'ACTIVE');
    if (activePacks.length === 1) packId = activePacks[0]!.id;
  }
  if (packId && !snapshot.packs.some((pack) => pack.id === packId && pack.status === 'ACTIVE')) {
    errors.push({ rowNumber: 1, questionId: '', message: `Pack "${packId}" không tồn tại hoặc không hoạt động.` });
    packId = null;
  }
  if (referencedPackIds.size > 1 && !options.packId && addRows.length > 0) {
    for (const row of addRows) {
      errors.push(issue(row, 'Workbook chứa ID thuộc nhiều pack; không thể xác định pack cho câu Thêm.'));
    }
  }
  if (!packId && addRows.length > 0 && referencedPackIds.size <= 1) {
    for (const row of addRows) errors.push(issue(row, 'Không xác định được pack; cần có ID câu hiện hữu trong workbook hoặc truyền --pack-id.'));
  }

  const plannedTopicIds = new Map<string, string>();
  const resolveTopic = (forPackId: string, name: string, row: WorkbookQuestionRow): string => {
    const key = `${forPackId}\u0000${normalizedTopic(name)}`;
    const planned = plannedTopicIds.get(key);
    if (planned) return planned;
    const existing = snapshot.subtopics.find((subtopic) => subtopic.packId === forPackId
      && normalizedTopic(subtopic.name) === normalizedTopic(name));
    if (existing) return existing.id;
    const id = `topic-${randomUUID()}`;
    plannedTopicIds.set(key, id);
    topicsToCreate.push({ id, packId: forPackId, name });
    warnings.push(issue(row, `Sẽ tạo chủ đề mới: ${name}.`));
    return id;
  };

  for (const row of rows) {
    if (row.note) warnings.push(issue(row, 'Cột M (Ghi chú) chỉ để operator trao đổi, không được lưu vào DB.'));

    const duplicateId = Boolean(row.id && duplicateIds.has(row.id));
    if (duplicateId) errors.push(issue(row, 'ID bị lặp trong workbook.'));

    if (!row.id) {
      if (!row.prompt.trim()) {
        counts.unknown += 1;
        errors.push(issue(row, 'Dòng không có ID cần có nội dung câu hỏi để được nhận là câu mới.'));
        continue;
      }
      counts.add += 1;
      const mismatch = actionMismatchWarning(row, 'THEM');
      if (mismatch) warnings.push(issue(row, mismatch));
      if (!packId) continue; // Lỗi pack đã được ghi ở phần suy luận phía trên.
      const content = readContent(row, errors);
      if (!content) {
        if (row.topic.trim()) resolveTopic(packId, row.topic.normalize('NFKC').replace(/\s+/gu, ' ').trim(), row);
        continue;
      }
      const subtopicId = resolveTopic(packId, content.topic, row);
      const id = `q-${randomUUID()}`;
      try {
        operations.push({ kind: 'add', rowNumber: row.rowNumber,
          after: blankQuestion(id, packId, subtopicId, content), topicName: content.topic });
      } catch {
        errors.push(issue(row, 'Dữ liệu câu mới không hợp lệ theo QuestionSchema.'));
      }
      continue;
    }

    const before = snapshot.questions.get(row.id);
    if (!before) {
      errors.push(issue(row, `ID "${row.id}" không tồn tại trong DB.`));
      if (row.action === 'XOA') counts.delete += 1;
      else if (row.action === 'SUA') counts.edit += 1;
      else if (row.action === 'GIU') counts.keep += 1;
      else counts.unknown += 1;
      continue;
    }
    if (row.action === 'XOA') {
      counts.delete += 1;
      if (before.approvalStatus === 'ARCHIVED') {
        warnings.push(issue(row, 'Câu hỏi đã ARCHIVED; không cần thay đổi.'));
      } else if (!duplicateId) {
        operations.push({ kind: 'delete', rowNumber: row.rowNumber, before });
      }
      continue;
    }

    const correctIndex = parseCorrectIndex(row.correct);
    const beforeCorrectOption = before.options.find((option) => option.id === before.correctOptionId);
    if (correctIndex >= 0 && (before.options[correctIndex]?.id !== before.correctOptionId
      || before.options[correctIndex]?.text !== beforeCorrectOption?.text)) answerChangedIds.add(row.id);

    const inferredAction: QuestionImportAction = rowLooksChanged(row, before, snapshot) ? 'SUA' : 'GIU';
    if (inferredAction === 'SUA') counts.edit += 1;
    else counts.keep += 1;
    const mismatch = actionMismatchWarning(row, inferredAction);
    if (mismatch && !(inferredAction === 'GIU' && row.action === 'SUA')) warnings.push(issue(row, mismatch));

    const content = readContent(row, errors);
    if (!content) {
      if (row.topic.trim()) resolveTopic(before.packId, row.topic.normalize('NFKC').replace(/\s+/gu, ' ').trim(), row);
      continue;
    }
    if (duplicateId) continue;
    const subtopicId = resolveTopic(before.packId, content.topic, row);
    const after = QuestionSchema.parse({
      ...before,
      subtopicId,
      prompt: content.prompt,
      options: content.options.map((text, index) => ({ id: before.options[index]!.id, text })),
      correctOptionId: before.options[content.correctIndex]!.id,
      explanation: content.explanation,
      difficulty: content.difficulty,
      verificationStatus: 'UNVERIFIED',
      approvalStatus: 'PENDING_REVIEW',
      version: before.version + 1,
    });
    const changes = contentChanges(before, after, snapshot, content.topic);
    if (changes.length === 0) {
      if (row.action === 'SUA') warnings.push(issue(row, 'Cột L ghi Sửa nhưng không có trường nội dung nào thay đổi; importer xem như Giữ.'));
      continue;
    }
    changes.push({ field: 'Trạng thái duyệt', before: before.approvalStatus, after: after.approvalStatus });
    changes.push({ field: 'Trạng thái xác minh', before: before.verificationStatus, after: after.verificationStatus });
    changes.push({ field: 'Phiên bản', before: String(before.version), after: String(after.version) });
    operations.push({ kind: 'edit', rowNumber: row.rowNumber, before, after, changes });
  }

  return { workbookName: basename(workbookPath), packId, topicsToCreate,
    correctAnswerChanges: answerChangedIds.size, counts, errors, warnings, operations };
}

function stableQuestion(question: Question): string {
  return JSON.stringify(question);
}

function questionSnapshotFromRow(row: unknown): Question | null {
  if (!isRecord(row) || typeof row.id !== 'string') return null;
  try {
    return questionFromDb(row as unknown as DbQuestionRow);
  } catch {
    return null;
  }
}

export async function applyQuestionXlsxImportPlan(
  plan: QuestionXlsxImportPlan,
  databasePath: string,
  backupPath: string,
  now = Date.now(),
): Promise<QuestionXlsxImportResult> {
  if (plan.errors.length > 0) throw new Error('Có lỗi kiểm tra dữ liệu; không thể áp dụng.');
  const dbPath = resolve(databasePath);
  const resolvedBackupPath = resolve(backupPath);
  if (dbPath === resolvedBackupPath) throw new Error('Đường dẫn backup không được trùng DB nguồn.');
  if (plan.operations.length === 0) return { added: 0, edited: 0, archived: 0, backupPath: null };

  await backupSqliteReadonly(dbPath, resolvedBackupPath);
  const db = new Database(dbPath);
  db.pragma('foreign_keys = ON');
  db.pragma('busy_timeout = 5000');
  try {
    const apply = db.transaction(() => {
      let added = 0;
      let edited = 0;
      let archived = 0;
      const topicIdMap = new Map<string, string>();

      for (const topic of plan.topicsToCreate) {
        const existing = (db.prepare('SELECT id, name FROM subtopics WHERE pack_id = ? ORDER BY id')
          .all(topic.packId) as Array<{ id: string; name: string }>)
          .find((item) => normalizedTopic(item.name) === normalizedTopic(topic.name));
        if (existing) {
          topicIdMap.set(topic.id, existing.id);
        } else {
          db.prepare('INSERT INTO subtopics (id, pack_id, name) VALUES (?, ?, ?)').run(topic.id, topic.packId, topic.name);
          topicIdMap.set(topic.id, topic.id);
        }
      }

      for (const operation of plan.operations) {
        if (operation.kind === 'add') {
          const plannedQuestion = operation.after;
          if (db.prepare('SELECT 1 FROM questions WHERE id = ?').get(plannedQuestion.id)) {
            throw new Error(`Câu mới ${plannedQuestion.id} đã tồn tại; DB thay đổi từ lúc chạy dry-run.`);
          }
          const question = QuestionSchema.parse({
            ...plannedQuestion,
            subtopicId: topicIdMap.get(plannedQuestion.subtopicId) ?? plannedQuestion.subtopicId,
          });
          db.prepare(`INSERT INTO questions (
            id, pack_id, subtopic_id, prompt, options_json, correct_option_id, explanation, difficulty,
            tags_json, source_refs_json, verification_status, approval_status, version, media_json,
            valid_from_ms, valid_until_ms, last_used_at_ms, updated_at_ms
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(
            question.id, question.packId, question.subtopicId, question.prompt, JSON.stringify(question.options),
            question.correctOptionId, question.explanation, question.difficulty, JSON.stringify(question.tags),
            JSON.stringify(question.sourceRefs), question.verificationStatus, question.approvalStatus, question.version,
            question.media ? JSON.stringify(question.media) : null, question.validFrom, question.validUntil,
            question.lastUsedAt, now,
          );
          db.prepare(`INSERT INTO question_versions (question_id, version, snapshot_json, edited_by, created_at_ms)
            VALUES (?, ?, ?, ?, ?)`).run(question.id, question.version, stableQuestion(question), IMPORT_EDITOR, now);
          added += 1;
          continue;
        }

        const currentRow = db.prepare('SELECT * FROM questions WHERE id = ?').get(operation.before.id);
        const current = questionSnapshotFromRow(currentRow);
        if (!current || stableQuestion(current) !== stableQuestion(operation.before)) {
          throw new Error(`Câu ${operation.before.id} đã đổi trong lúc chạy; transaction đã huỷ, hãy chạy dry-run lại.`);
        }

        if (operation.kind === 'delete') {
          const result = db.prepare(`UPDATE questions SET approval_status = 'ARCHIVED', updated_at_ms = ?
            WHERE id = ? AND version = ?`).run(now, operation.before.id, operation.before.version);
          if (result.changes !== 1) throw new Error(`Không thể ARCHIVED câu ${operation.before.id}; transaction đã huỷ.`);
          archived += 1;
          continue;
        }

        const before = operation.before;
        const after = QuestionSchema.parse({
          ...operation.after,
          subtopicId: topicIdMap.get(operation.after.subtopicId) ?? operation.after.subtopicId,
        });
        db.prepare(`INSERT OR IGNORE INTO question_versions (question_id, version, snapshot_json, edited_by, created_at_ms)
          VALUES (?, ?, ?, ?, ?)`).run(before.id, before.version, stableQuestion(before), `${IMPORT_EDITOR}:BEFORE`, now);
        const result = db.prepare(`UPDATE questions SET subtopic_id = ?, prompt = ?, options_json = ?,
          correct_option_id = ?, explanation = ?, difficulty = ?, verification_status = ?, approval_status = ?,
          version = ?, updated_at_ms = ? WHERE id = ? AND version = ?`).run(
          after.subtopicId, after.prompt, JSON.stringify(after.options), after.correctOptionId, after.explanation,
          after.difficulty, after.verificationStatus, after.approvalStatus, after.version, now, after.id, before.version,
        );
        if (result.changes !== 1) throw new Error(`Không thể cập nhật câu ${before.id}; transaction đã huỷ.`);
        db.prepare(`INSERT INTO question_versions (question_id, version, snapshot_json, edited_by, created_at_ms)
          VALUES (?, ?, ?, ?, ?)`).run(after.id, after.version, stableQuestion(after), IMPORT_EDITOR, now);
        edited += 1;
      }
      return { added, edited, archived, backupPath: resolvedBackupPath };
    });
    return apply.immediate();
  } finally {
    db.close();
  }
}

function inlineValue(value: string): string {
  return `\`${value.replace(/`/gu, '\\`').replace(/\r?\n/gu, ' ↵ ').replace(/\|/gu, '\\|')}\``;
}

export function renderQuestionXlsxImportReport(
  plan: QuestionXlsxImportPlan,
  options: { applyRequested: boolean; result?: QuestionXlsxImportResult; applyError?: string },
): string {
  const edits = plan.operations.filter((operation) => operation.kind === 'edit');
  const lines = [
    '# Báo cáo nhập câu hỏi từ Excel',
    '',
    `- Workbook: \`${plan.workbookName}\``,
    `- Sheet: \`${SHEET_NAME}\``,
    `- Chế độ: ${options.applyRequested ? '--apply' : 'dry-run (mặc định)'}`,
    `- Pack suy ra: ${plan.packId ? `\`${plan.packId}\`` : 'chưa xác định'}`,
    `- Số câu sẽ đổi đáp án đúng: ${plan.correctAnswerChanges}`,
    '',
    '## Tổng hợp',
    '',
    '| Giữ | Sửa | Xoá | Thêm | Dòng chưa nhận diện |',
    '|---:|---:|---:|---:|---:|',
    `| ${plan.counts.keep} | ${plan.counts.edit} | ${plan.counts.delete} | ${plan.counts.add} | ${plan.counts.unknown} |`,
    '',
  ];

  if (edits.length > 0) {
    lines.push('## Thay đổi trước / sau', '');
    for (const operation of edits) {
      if (operation.kind !== 'edit') continue;
      lines.push(`### Dòng ${operation.rowNumber} — ${inlineValue(operation.before.id)}`);
      for (const change of operation.changes) {
        lines.push(`- **${change.field}:** trước ${inlineValue(change.before)} → sau ${inlineValue(change.after)}`);
      }
      lines.push('');
    }
  }

  const deletes = plan.operations.filter((operation) => operation.kind === 'delete');
  if (deletes.length > 0) {
    lines.push('## Chuyển sang ARCHIVED', '');
    for (const operation of deletes) if (operation.kind === 'delete') lines.push(`- Dòng ${operation.rowNumber}: ${inlineValue(operation.before.id)} (không xoá cứng).`);
    lines.push('');
  }

  const adds = plan.operations.filter((operation) => operation.kind === 'add');
  if (adds.length > 0) {
    lines.push('## Câu mới dự kiến', '');
    for (const operation of adds) {
      if (operation.kind !== 'add') continue;
      const question = operation.after;
      lines.push(`### Dòng ${operation.rowNumber} — ${inlineValue(question.id)}`);
      lines.push(`- Chủ đề: ${inlineValue(operation.topicName)}`);
      lines.push(`- Độ khó: ${question.difficulty}`);
      lines.push(`- Câu hỏi: ${inlineValue(question.prompt)}`);
      question.options.forEach((option, index) => lines.push(`- Phương án ${index + 1}: ${inlineValue(option.text)}`));
      lines.push(`- Đáp án đúng: ${question.options.findIndex((option) => option.id === question.correctOptionId) + 1}`);
      lines.push(`- Trạng thái: ${question.approvalStatus} / ${question.verificationStatus}`);
      lines.push('');
    }
  }

  if (plan.warnings.length > 0) {
    lines.push('## Cảnh báo', '');
    for (const warning of plan.warnings) lines.push(`- Dòng ${warning.rowNumber} (${warning.questionId}): ${warning.message}`);
    lines.push('');
  }
  if (plan.errors.length > 0) {
    lines.push('## Lỗi — không được phép apply', '');
    for (const error of plan.errors) lines.push(`- Dòng ${error.rowNumber} (${error.questionId || 'tiêu đề'}): ${error.message}`);
    lines.push('', 'Có ít nhất một lỗi; không ghi DB. Sửa workbook rồi chạy dry-run lại.', '');
  } else if (options.applyError) {
    lines.push('## Không áp dụng được', '', `${options.applyError}`, '');
    if (options.result?.backupPath) lines.push(`Backup đã tạo trước giao dịch: \`${options.result.backupPath}\``, '');
  } else if (options.result) {
    lines.push('## Kết quả apply', '',
      `- Thêm: ${options.result.added}; sửa: ${options.result.edited}; chuyển ARCHIVED: ${options.result.archived}.`,
      options.result.backupPath ? `- Backup DB trước khi ghi: \`${options.result.backupPath}\`.` : '- Không có thay đổi cần ghi; không tạo backup mới.', '',
      'Câu Sửa/Thêm được đặt về PENDING_REVIEW và UNVERIFIED để operator duyệt/xác minh lại.', '');
  } else {
    lines.push('Dry-run chỉ đọc workbook và DB; không tạo backup và không ghi DB.', '');
  }
  lines.push('Cột E (LEN) chỉ là công thức hiển thị, không được nhập. Cột M (Ghi chú) không lưu vào DB.');
  return lines.join('\n');
}

export function questionImportReportPath(workbookPath: string): string {
  const resolved = resolve(workbookPath);
  return join(dirname(resolved), `${basename(resolved, extname(resolved))}.import-report.md`);
}

export function questionImportBackupPath(databasePath: string, now = new Date()): string {
  const resolved = resolve(databasePath);
  const backupDir = join(dirname(resolved), 'backups');
  const stamp = now.toISOString().replace(/[-:TZ.]/gu, '').slice(0, 14);
  return join(backupDir, `${basename(resolved)}.before-question-import-${stamp}.sqlite`);
}
