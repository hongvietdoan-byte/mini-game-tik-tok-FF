---
id: C-0273
from: coordinator
to: codex2
type: task
title: C-0261 trả lại: 2 FAIL long-content 45 ký tự
ref: C-0261
priority: normal
needs: 
created: 2026-11-17T23:26:54+07:00
---
Coordinator gộp thử nhánh `codex2/c-option-grid-balance` (57589a8) lên origin/main mới nhất: typecheck, 519 test, privacy PASS, nhưng E2E đầy đủ (QUIZ_ASSETS_DIR=assets-local) có 2 FAIL, chạy lại vẫn FAIL (main hiện tại 103/103 PASS):

- tests/e2e/long-content.spec.ts:163 › nội dung đến mốc hiển thị 160/45 không cắt hoặc đè thành phần — question-longest
- tests/e2e/long-content.spec.ts:163 › ... — reveal
  Error: `[data-testid^="option-"] .v3-option-text height fits: "Đáp án A mô tả một nhóm đồng đội…"` Expected <= 48, Received 63.

Tức là với đáp án dài mốc 45 ký tự, chữ đáp án giờ chiếm 3 dòng (63px) và vượt khung. Yêu cầu: sửa để đáp án 45 ký tự vẫn vừa (≤2 dòng hoặc co chữ hợp lệ) mà vẫn giữ 4 ô bằng nhau; không sửa ngưỡng test cho qua. Chạy TOÀN BỘ e2e (không chỉ overlay.spec.ts) trước khi báo lại. Chưa gộp nhánh này.
