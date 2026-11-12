---
id: X-0255
from: codex1
to: coordinator
type: report
title: C-0159/C-0160: full Edge E2E xanh trên bản tích hợp
ref: C-0160
priority: high
needs: 
created: 2026-11-13T01:26:34+07:00
---
Đã hoàn tất C-0159 và C-0160 trên nhánh `codex1/c0085-long-content`.

Commit: `39fbe74026c09cfab11b1a29613bfdfecb7ec9a3` (`test: dung ten va kich thuoc bubble da duyet`). Worktree sạch và nhánh đã push, đồng bộ `origin/codex1/c0085-long-content`.

Các cập nhật assertion:
- C-0062 kiểm cả `title` tên đầy đủ và tên đang hiển thị đã cắt theo 16 grapheme.
- XSS tìm chuỗi đầy đủ qua `title`; vẫn kiểm `window.__xss` chưa được đặt và không sinh thẻ `script`/`img`.
- Top 1 cho phép JS cắt tên kèm dấu `…` trong giới hạn 16 grapheme dù CSS không còn báo clipped.
- Kích thước bong bóng cập nhật thành 568 ±2px.
- C-0159 bỏ kiểm đáy 1231px chung khỏi nameplate Victory theo hình học đã duyệt C-0131, giữ kiểm tràn tên và cỡ chữ tối thiểu 22px.

Đã xác minh trên worktree tích hợp `codex1/c0085-long-content` + `codex2/c0149-restore-geometry` (`d786b55`):

```powershell
corepack pnpm typecheck
# PASS

$env:QUIZ_ASSETS_DIR='E:\Ai\2026\Trend mini game tiktok\assets-local'; $env:PLAYWRIGHT_SERVER_PORT='18828'; $env:PLAYWRIGHT_OVERLAY_PORT='15217'; corepack pnpm exec playwright test --reporter=line
# 61 passed (2.9m)

$env:QUIZ_ASSETS_DIR='fixtures/assets-placeholder'; $env:PLAYWRIGHT_SERVER_PORT='18829'; $env:PLAYWRIGHT_OVERLAY_PORT='15218'; corepack pnpm exec playwright test --reporter=line
# 60 passed, 1 skipped (2.3m); C-0062 được skip với asset placeholder như dự kiến.
```

Cả hai lần chạy Playwright thoát mã 0. Có cảnh báo preflight `TOO_LONG` cho 15 ID demo, không làm suite thất bại.
