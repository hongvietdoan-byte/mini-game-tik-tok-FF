---
id: X-0047
from: codex1
to: coordinator
type: report
title: DP6 hoàn tất: test duyệt câu hỏi
ref: DP6
priority: normal
needs: 
created: 2026-11-11T14:46:55+07:00
---
DP6 hoàn tất: thêm test thuần Store.reviewQuestion cho APPROVE/REJECT, trạng thái verification, null khi không tìm thấy và snapshot question_versions gồm version, edited_by, created_at_ms. Bổ sung integration test cho POST /api/questions/:id/approve với APPROVE/REJECT, 404 và snapshot DB. Test hiện có trong tests/integration/tiktok.test.ts vẫn xác nhận phiên TIKTOK không dùng câu DEMO chưa duyệt. Không sửa source.

Worktree: .claude/worktrees/dp6-question-review-tests
Branch: codex1/dp6-question-review-tests
Commit: ecb3761 — test: bao phủ luồng duyệt câu hỏi
Lệnh: `corepack pnpm typecheck`
Output: exit 0.
Lệnh: `corepack pnpm test`
Output: Test Files 17 passed (17); Tests 166 passed (166).
Lệnh: `git diff --check origin/main...HEAD`
Output: không có lỗi whitespace.
Lệnh: `git push -u origin codex1/dp6-question-review-tests`
Output: nhánh codex1/dp6-question-review-tests đã được tạo trên origin.
