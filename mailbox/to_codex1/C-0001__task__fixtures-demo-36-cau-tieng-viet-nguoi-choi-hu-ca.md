---
id: C-0001
from: coordinator
to: codex1
type: task
title: Fixtures DEMO: ≥36 câu tiếng Việt + người chơi hư cấu
ref: 
priority: high
needs: 
created: 2026-11-11T10:57:57+07:00
---
# Fixtures DEMO: câu hỏi tiếng Việt + người chơi hư cấu

## Mục tiêu
Bộ dữ liệu giả để server/simulator/test chạy offline. Không dính bất kỳ dữ kiện giải đấu, tên người thật hay nội dung Megasheet.

## Phạm vi file (chỉ sửa các file này)
- `fixtures/questions.ts`, `fixtures/players.ts`, `fixtures/index.ts`, `fixtures/fixtures.test.ts`

## Yêu cầu
1. `fixtures/questions.ts`
   - `export const DEMO_PACK = { id: 'demo', name: 'Gói DEMO — kiến thức chung' } as const;`
   - `export const DEMO_QUESTIONS: z.input<typeof QuestionSchema>[]` (import `QuestionSchema` từ `@quiz/contracts`) — **≥ 36 câu**,
     tiếng Việt có dấu, kiến thức chung bền vững (địa lý, khoa học, toán nhẹ, ngôn ngữ, thể thao chung) — KHÔNG về Free Fire / giải đấu / người thật / thời sự.
   - Mỗi câu: `id` dạng `demo-001`…, `packId: 'demo'`, `subtopicId` thuộc ≥ 4 chủ đề (vd `demo-dia-ly`, `demo-khoa-hoc`, `demo-toan`, `demo-ngon-ngu`),
     4 options id `o1..o4`, `correctOptionId` phân bố đều (không phải luôn `o1`), `difficulty` ≈ 16 EASY / 12 MEDIUM / 8 HARD,
     `verificationStatus: 'DEMO'`, `approvalStatus: 'APPROVED'`, `explanation` ngắn, `tags: ['demo']`.
   - Độ dài trong `QUESTION_LIMITS` (prompt ≤ 220, option ≤ 90). Ít nhất 2 câu prompt dài ~180–220 ký tự và 2 câu có option ~80 ký tự để thử bố cục overlay.
   - `export const INVALID_QUESTION_SAMPLES` (≥ 5 mẫu sai: 3 options, options trùng chữ, correctOptionId không tồn tại, prompt rỗng, prompt quá dài).
2. `fixtures/players.ts`
   - `export type FixturePlayer = { userId: string; displayName: string }` (khớp `SimPlayer` của `@quiz/live-adapters`).
   - `export const EDGE_CASE_PLAYERS: FixturePlayer[]` — tên hư cấu: tiếng Việt đủ dấu, tên rất dài (> 60 ký tự), emoji + ZWJ (👨‍👩‍👧‍👦),
     chuỗi giống HTML (`<script>alert(1)</script>`, `<img src=x onerror=1>`), ký tự bidi `‮`, toàn khoảng trắng, chữ full-width,
     hai người trùng tên khác userId.
   - `export function makeSimPlayers(n: number, seed = 1): FixturePlayer[]` — tất định, userId `sim-0001`…, tên ghép họ / tên đệm / tên Việt phổ biến + hậu tố số
     (hư cấu), đặt `EDGE_CASE_PLAYERS` ở đầu danh sách.
3. `fixtures/index.ts` re-export cả hai.
4. `fixtures/fixtures.test.ts` (vitest project `unit`):
   - mọi `DEMO_QUESTIONS` parse được bằng `QuestionSchema`, id duy nhất, prompt không trùng (không phân biệt hoa thường), đủ số lượng / độ khó / chủ đề;
   - mọi `INVALID_QUESTION_SAMPLES` bị `QuestionSchema.safeParse` từ chối;
   - `makeSimPlayers(100)` dài 100, userId duy nhất, cùng seed → giống hệt;
   - mọi displayName qua `sanitizeDisplayName` (`@quiz/quiz-core`) không còn ký tự điều khiển / bidi và ≤ 24 grapheme;
   - không chứa "Free Fire", "Bá Vương", "BVĐC" hay tên 8 đội (danh sách trong `docs/HANDOFF.md`).

## Tiêu chí xong
- `corepack pnpm typecheck` sạch; `corepack pnpm vitest run --project unit` xanh (dán số test).
- Nhánh `codex1/c0001-fixtures` đã push; report nêu số câu theo độ khó / chủ đề.
