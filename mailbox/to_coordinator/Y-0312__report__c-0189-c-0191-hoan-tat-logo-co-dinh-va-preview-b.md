---
id: Y-0312
from: codex2
to: coordinator
type: report
title: C-0189 C-0191 hoàn tất: logo cố định và preview B2
ref: C-0191
priority: normal
needs: 
created: 2026-11-13T21:06:59+07:00
---
## Đã làm
- Sửa trên nhánh codex2/hud-settings, commit c192fd0 (đã push).
- C-0189: giữ fallback logo/nền khi ảnh tùy chỉnh lỗi hoặc thiếu; dùng B2 đã được xác nhận; tái chụp màn mặc định/tùy chỉnh.
- C-0191: cố định khung logo câu hỏi 220×182px, Top 10 440×182px; pill tiêu đề cố định 560px, fit chữ theo khung. E2E so bounding box pill, ô vòng, Top 10, khung câu hỏi giữa mặc định/tùy chỉnh: lệch tối đa 1px; kiểm giao nhau header.
- Dashboard nhúng trực tiếp overlay hiện tại với role=preview, xác thực URL/khung preview, cập nhật ảnh/chữ; nhãn “Xem thử”, cột preview rộng và sticky để giảm khoảng trống. Placeholder tự tạo cục bộ: logo 600×400, nền 1080×1920; mock upload giữ đúng kích thước, MIME và phần mở rộng.
- Chỉ sửa 7 file trong apps/dashboard, apps/overlay, tests/e2e; không chạy app/test trong checkout chính.

## Bằng chứng
- corepack pnpm typecheck — OK, exit 0.
- corepack pnpm exec vitest run --project unit — 45 files / 287 tests passed.
- corepack pnpm exec playwright test tests/e2e/overlay.spec.ts --timeout 60000 — 45 passed.
- corepack pnpm exec playwright test tests/e2e/dashboard.test.ts --timeout 60000 — 8 passed.
- corepack pnpm build:web — dashboard 46 modules và overlay 57 modules, cả hai build thành công.
- git diff --check — OK.
- Ảnh local, không commit: E:\Ai\2026\Trend mini game tiktok\.claude\worktrees\c0172-hud-settings\assets-local\review\hud\
  - custom-question.png, custom-top10.png, custom-victory.png
  - dashboard-default.png, dashboard-edit-validation.png, dashboard-uploaded.png, dashboard-reset.png
  - default-question.png và main-default-question.png cũng có trong thư mục; C-0191 xác nhận default-question đạt B2.

## Rủi ro / việc còn lại
- .tmp-test trong worktree đã được helper E2E tự dọn.
- Tệp tạm main-compare-data/admin-token.txt từ lần so sánh C-0189 trước đó chưa được đụng tới ở lượt này; coordinator đã nhận dọn theo C-0190.
