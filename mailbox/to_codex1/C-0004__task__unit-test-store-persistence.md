---
id: C-0004
from: coordinator
to: codex1
type: task
title: Unit test Store (persistence)
ref: 
priority: normal
needs: 
created: 2026-11-11T10:58:21+07:00
---
# Unit test Store (packages/persistence)

## Phạm vi file
- `packages/persistence/src/store.test.ts` (chỉ file test). Lỗi mã nguồn → `it.fails` + `question`.

## Cách dựng
- Mỗi test một DB tạm: `new Store(join(mkdtempSync(join(tmpdir(), 'quiz-')), 'test.db'))` (cần WAL thật, không dùng `:memory:` cho test WAL / backup); `close()` trong `afterEach`.
- Dùng `DEMO_PACK`, `DEMO_QUESTIONS`, `makeSimPlayers` từ `fixtures/` (C-0001). Nếu C-0001 chưa gộp `main` thì tạo nhánh này từ `codex1/c0001-fixtures`.

## Phải phủ
- Migration chạy trên DB mới; `journal_mode` = wal; `foreign_keys` = 1; mở lại cùng file không lỗi.
- `seedQuestions` trả đúng số câu, gọi lại → 0; `listQuestions` round-trip qua `QuestionSchema`.
- `createSession` / `getSession` / `latestOpenSession` / `closeSession` / `heartbeat`.
- `createRound` + `roundQuestions` giữ nguyên snapshot; `usedQuestionIdsInSession`; `nextRoundNumber`.
- `resolvePlayer`: cùng (source, userId) → cùng id; khác source → khác id.
- `insertAnswer`: lần đầu true, lần hai cùng người cùng câu → false và option không đổi; `participantCount`; `optionCounts`.
- Sổ cái: `insertLedger` hai lần → lần hai trả 0; `ledgerTotals` = tổng; `insertVoidReversals` tạo bút toán âm `VOID_REVERSAL:CORRECT`, gọi lại → 0, tổng câu đó về 0, dòng cũ còn nguyên.
- `saveGameSnapshot` + `latestGameSnapshot` (version lớn nhất); ghi lại cùng version → cập nhật không lỗi.
- `recordAction` + `findAction`; ghi trùng commandId → lỗi UNIQUE.
- Outbox: `addOutbox` → `takeUnpublished` → `markPublished` → rỗng.
- `transaction()` ném lỗi giữa chừng → rollback toàn bộ.
- `backup()` tạo file mở được, cùng số câu hỏi.
- `history()` trả rounds + actions đúng thứ tự.
- Không có cột nhạy cảm: `PRAGMA table_info` mọi bảng, không tên cột nào khớp `email|phone|birth|dob|password|address`.

## Tiêu chí xong
- Vitest xanh, typecheck sạch, nhánh `codex1/c0004-store-tests`, report liệt kê test.
