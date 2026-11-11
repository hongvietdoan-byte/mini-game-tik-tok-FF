---
id: C-0002
from: coordinator
to: codex1
type: task
title: Unit test quiz-core: answers / scoring / selection
ref: 
priority: high
needs: 
created: 2026-11-11T10:58:06+07:00
---
# Unit test quiz-core: answers / scoring / selection

## Phạm vi file
- `packages/quiz-core/src/answers.test.ts`, `scoring.test.ts`, `selection.test.ts` (chỉ file test).
- Không sửa `*.ts` không phải test. Test lộ lỗi mã nguồn → để ở `it.fails(...)` kèm chú thích `// LỖI: ...` và gửi `question` (đề xuất bản vá dạng diff trong thư). Coordinator sửa mã.
- Tự dựng câu hỏi trong test (không phụ thuộc C-0001 để chạy song song).

## Phải phủ (đặc tả §4, §5, §6 + BOARD "Quyết định đã chốt")

**answers.ts**
- `parseAnswer`: `A`, `b`, `  c `, `D\n`, full-width `Ａ`…`Ｄ` → hợp lệ; `đáp án A`, `AA`, `A B`, `!A`, `B.`, `E`, chuỗi rỗng, emoji, chuỗi > 16 ký tự → null.
- `decideComment`: thứ tự lý do NOT_AN_ANSWER → NOT_ACCEPTING → EARLY → LATE → STALE_SOURCE_TIMESTAMP; biên `openAtMs` (nhận), `deadlineMs` (từ chối — end-exclusive), `deadlineMs-1` (nhận);
  sourceTimestamp trước openAtMs → STALE; trễ > maxSourceLagMs → STALE; đúng bằng maxSourceLagMs → nhận.
- `sanitizeDisplayName`: bỏ ký tự điều khiển / bidi / zero-width, gộp khoảng trắng, rỗng → `Người chơi`, cắt theo grapheme (emoji ZWJ không bị cắt đôi) và thêm `…`.

**scoring.ts**
- Đúng +100; sai / không trả lời 0; chuỗi 3 → +30, 5 → +50, 10 → +100 đúng tại câu đạt mốc (ledger có `STREAK_3`…); sai ở câu 4 rồi đúng tiếp 3 câu → STREAK_3 lần hai.
- Bỏ lỡ một câu sau khi đã tham gia → chuỗi về 0. Người vào từ câu 6 → không bị tính câu 1–5.
- Câu `voided` hoặc `closed=false` → không điểm, không đổi chuỗi.
- Trùng đáp án cùng người cùng câu trong input → chỉ cái đầu tính.
- Idempotent: gọi 2 lần → `ledger` + `totals` deep-equal; đảo thứ tự mảng `questions` → cùng kết quả.
- Property test nhẹ (không thêm thư viện): sinh ngẫu nhiên có seed (`createPrng`) 200 lần, kiểm `score = SUM(ledger.points)` theo người và `correctCount` = số dòng CORRECT.
- `rankPlayers`: hạng chung 1,1,3; cùng điểm khác số câu đúng → khác hạng; `tied` đúng; thứ tự trong nhóm hoà theo playerId; không mutate input.
- `topN`: < 10 người không bịa thêm.
- `buildPodium`: 0, 1, 2, 3 người; hoà hạng 1 (2 người) → slot 1 tied, slot 2 = hạng 3; ranks 1,2,3,3,3 → `tieAcrossCutoff=true`; 4 người cùng hạng 1 → 1 slot, `tieAcrossCutoff=true`.

**selection.ts**
- `createPrng`: cùng seed cùng chuỗi, giá trị trong [0,1).
- `isEligible`: chỉ APPROVED; VERIFIED / OPERATOR_VERIFIED ok; DEMO chỉ khi allowDemo; UNVERIFIED không; validFrom / validUntil (validUntil end-exclusive).
- `selectRound`: cùng seed + cùng pool (kể cả đảo thứ tự pool) → cùng snapshots; seed khác → khác; không lặp câu trong vòng; ưu tiên câu chưa dùng trong phiên;
  thiếu câu + `allowReuse=false` → `INSUFFICIENT_QUESTIONS` với eligible / unused / required đúng; `allowReuse=true` → `reusedQuestionIds` đúng, ít-dùng-gần-đây trước.
- `snapshotQuestion`: sau xáo, option có id = `correctOptionId` mang `originalOptionId === q.correctOptionId` (chạy 500 seed); id A..D đúng thứ tự; `isDemo` đúng;
  `questionInstanceId` dạng `<roundId>:q01`.

## Tiêu chí xong
- `corepack pnpm vitest run --project unit` xanh (dán tóm tắt), `corepack pnpm typecheck` sạch.
- Report liệt kê số test theo file, các `it.fails` (nếu có) + question tương ứng. Nhánh `codex1/c0002-core-tests`.
