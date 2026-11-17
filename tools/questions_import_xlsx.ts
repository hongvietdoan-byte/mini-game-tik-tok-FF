#!/usr/bin/env node
import { mkdir, writeFile } from 'node:fs/promises';
import { basename, dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  applyQuestionXlsxImportPlan,
  createQuestionXlsxImportPlan,
  questionImportBackupPath,
  questionImportReportPath,
  renderQuestionXlsxImportReport,
  type QuestionXlsxImportPlan,
  type QuestionXlsxImportResult,
} from '@quiz/persistence/question-xlsx-import';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const USAGE = `Cách dùng:
  pnpm questions:import-xlsx <file.xlsx> [--apply] [--db <quiz.db>] [--pack-id <id>]

Mặc định là dry-run. --apply chỉ chạy khi workbook không có lỗi.
DB mặc định: QUIZ_DB hoặc <repo>/data/quiz.db.
Báo cáo Markdown được ghi cạnh workbook.`;

type CliArgs = { workbookPath: string; apply: boolean; databasePath?: string; packId?: string; help: boolean };

function parseArgs(argv: string[]): CliArgs {
  let workbookPath = '';
  let apply = false;
  let databasePath: string | undefined;
  let packId: string | undefined;
  let help = false;
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index]!;
    if (argument === '--help' || argument === '-h') {
      help = true;
    } else if (argument === '--apply') {
      apply = true;
    } else if (argument === '--db' || argument === '--pack-id') {
      const value = argv[index + 1];
      if (!value || value.startsWith('--')) throw new Error(`Thiếu giá trị sau ${argument}.`);
      if (argument === '--db') databasePath = value;
      else packId = value;
      index += 1;
    } else if (argument.startsWith('-')) {
      throw new Error(`Tham số không được hỗ trợ: ${argument}.`);
    } else if (!workbookPath) {
      workbookPath = argument;
    } else {
      throw new Error('Chỉ nhận một file workbook.');
    }
  }
  return { workbookPath, apply, databasePath, packId, help };
}

function fatalReport(workbookName: string, message: string): string {
  return `# Báo cáo nhập câu hỏi từ Excel\n\n- Workbook: \`${workbookName}\`\n\n## Lỗi\n\n- ${message}\n`;
}

async function writeReport(path: string, content: string) {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, `${content.trimEnd()}\n`, 'utf8');
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    console.log(USAGE);
    return;
  }
  if (!args.workbookPath) throw new Error(USAGE);

  const workbookPath = resolve(args.workbookPath);
  const databasePath = resolve(args.databasePath ?? process.env.QUIZ_DB ?? join(ROOT, 'data', 'quiz.db'));
  const reportPath = questionImportReportPath(workbookPath);
  let plan: QuestionXlsxImportPlan;

  try {
    plan = await createQuestionXlsxImportPlan(workbookPath, databasePath, { packId: args.packId });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Không đọc được workbook hoặc DB.';
    const report = fatalReport(basename(workbookPath), message);
    await writeReport(reportPath, report);
    console.error(report);
    console.error(`Đã ghi báo cáo: ${reportPath}`);
    process.exitCode = 1;
    return;
  }

  let result: QuestionXlsxImportResult | undefined;
  let applyError: string | undefined;
  let requestedBackupPath: string | undefined;
  if (args.apply && plan.errors.length === 0) {
    try {
      requestedBackupPath = questionImportBackupPath(databasePath);
      result = await applyQuestionXlsxImportPlan(plan, databasePath, requestedBackupPath);
    } catch (error) {
      applyError = error instanceof Error ? error.message : 'Lỗi không xác định khi apply.';
      result = { added: 0, edited: 0, archived: 0, backupPath: requestedBackupPath };
    }
  }

  const report = renderQuestionXlsxImportReport(plan, { applyRequested: args.apply, result, applyError });
  await writeReport(reportPath, report);
  console.log(report);
  console.log(`\nĐã ghi báo cáo: ${reportPath}`);

  if (plan.errors.length > 0 || applyError) process.exitCode = 1;
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(message);
  process.exitCode = 1;
});
