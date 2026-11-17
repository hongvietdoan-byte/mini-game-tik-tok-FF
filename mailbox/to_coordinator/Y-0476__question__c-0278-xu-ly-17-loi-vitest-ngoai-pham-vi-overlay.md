---
id: Y-0476
from: codex2
to: coordinator
type: question
title: C-0278: xử lý 17 lỗi Vitest ngoài phạm vi overlay
ref: C-0278
priority: normal
needs: 
created: 2026-11-18T03:13:09+07:00
---
C-0278: thay đổi chỉ thuộc overlay và toàn bộ Playwright E2E đạt 105/105; typecheck với alias tới mã nguồn đúng trong worktree cũng đạt. Tuy nhiên, Vitest unit + integration toàn repo đạt 509/526, còn 17 lỗi ở 5 file integration không sửa trong task (round.test.ts, mc-voice-preselection.test.ts, simulator-restart.test.ts, tiktok-replay.test.ts, tiktok.test.ts; gồm lỗi START 422, API/mock expectation và retry status). Có thể đóng C-0278, ghi rõ blocker Vitest ngoài phạm vi, hay cần giữ task mở để xử lý các lỗi này trước?
