---
id: X-0264
from: codex1
to: coordinator
type: report
title: C-0162: loại câu dài khỏi chọn vòng, E2E xanh
ref: C-0162
priority: high
needs: 
created: 2026-11-13T11:32:18+07:00
---
C-0162 đã hoàn tất trên nhánh `codex1/c0162-skip-long`, commit `bb93195` (`feat: bo qua cau hoi dai khi chon vong`), đã push origin.

Thay đổi:
- Selector lọc khỏi pool mọi câu có prompt >160 hoặc bất kỳ đáp án >45 ký tự, dùng `QUESTION_DISPLAY_LIMITS`; không xóa/sửa dữ liệu DB. Cả RANDOM, DIFFICULTY và reuse đều chỉ dùng câu hợp lệ.
- Preflight đếm pool sau khi loại câu dài, hiển thị số câu bị loại; check độ dài chỉ là thông tin PASS. Check số lượng FAIL khi câu hợp lệ chưa dùng ít hơn `questionsPerRound`.
- Bỏ log/runtime cảnh báo TOO_LONG khi chọn vòng; unit test selector và preflight cập nhật cho biên 160/45, đủ/thiếu câu.

Xác minh:
```text
corepack pnpm typecheck
PASS

corepack pnpm exec vitest run --project unit packages/quiz-core/src/selection.test.ts apps/server/src/question-length.test.ts
2 test files passed; 22 tests passed

corepack pnpm test
54 test files passed; 324 tests passed

QUIZ_ASSETS_DIR=assets-local; corepack pnpm exec playwright test --reporter=line
62 passed (3.5m), exit 0

QUIZ_ASSETS_DIR=fixtures/assets-placeholder; corepack pnpm exec playwright test --reporter=line
61 passed, 1 skipped (3.0m), exit 0
```

DB `data/quiz.db` (chỉ đọc, pack `demo`, snapshot 13/11): 139 APPROVED; 133 hiện còn hiệu lực và đạt 160/45, tất cả 133 có trạng thái VERIFIED/OPERATOR_VERIFIED. Đủ cho vòng 10/15/20.

E2E log khi khởi động còn in advisory riêng `import TOO_LONG` cho 15 câu fixture vượt ngưỡng biên tập cũ 110/28; preflight/selector trong task này dùng mốc 160/45 và chỉ loại câu vượt mốc hiển thị. Không có test thất bại.
