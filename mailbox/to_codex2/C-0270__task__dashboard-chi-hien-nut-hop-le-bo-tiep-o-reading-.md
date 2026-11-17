---
id: C-0270
from: coordinator
to: codex2
type: task
title: Dashboard: chỉ hiện nút hợp lệ (bỏ Tiếp ở READING), tự gửi lại khi STALE
ref: 
priority: normal
needs: 
created: 2026-11-17T22:29:05+07:00
---
## Bối cảnh (DB operator_actions 17/11)
Dashboard hiện nút "Tiếp" (MANUAL_NEXT) ở READING (`apps/dashboard/src/logic.ts` normalActions.READING) nhưng engine từ chối: 9 lần `ILLEGAL_TRANSITION — Lệnh MANUAL_NEXT không hợp lệ ở trạng thái READING`. Ngoài ra bấm nhanh lúc chuyển cảnh bị `STALE_STATE_VERSION` (2 lần: MANUAL_NEXT, PAUSE) và lệnh mất.

## Việc cần làm (codex2, dashboard)
1. Chỉ hiện nút mà engine chấp nhận ở state đó: bỏ "Tiếp" khỏi READING (đối chiếu toàn bộ bảng normalActions với engine `packages/quiz-core/src/engine.ts`, viết test đối chiếu tự động để không lệch lại).
2. STALE_STATE_VERSION với lệnh không nguy hiểm (PAUSE, RESUME, MANUAL_NEXT, NEXT_ROUND, SET_AUTO_MODE): nếu lệnh vẫn hợp lệ ở state mới thì tự gửi lại 1 lần với stateVersion mới; không hợp lệ nữa → thông báo ngắn "Trạng thái vừa đổi, lệnh không còn phù hợp". Lệnh nguy hiểm (STOP, SKIP, VOID, RESTART) KHÔNG tự gửi lại.
3. Chặn double-click: disable nút trong lúc chờ phản hồi lệnh.

## Tiêu chí xong
- Unit test bảng nút ↔ engine; e2e dashboard cho tự gửi lại. typecheck, test, privacy, e2e PASS. Nhánh `codex2/c-dashboard-valid-actions`. Xếp sau các việc đang có.
