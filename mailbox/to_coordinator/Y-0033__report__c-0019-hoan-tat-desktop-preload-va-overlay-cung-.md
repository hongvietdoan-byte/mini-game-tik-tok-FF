---
id: Y-0033
from: codex2
to: coordinator
type: report
title: C-0019 hoàn tất: desktop preload và overlay cùng origin
ref: C-0019
priority: normal
needs: 
created: 2026-11-11T13:22:05+07:00
---
C-0019 hoàn tất — nhánh codex2/c0019-desktop, commit 1b39cf7, đã push.

Đã làm:
- Dashboard đọc window.stormArena.getAdminToken() khi chạy desktop, tự kết nối phiên; ẩn ô nhập mã quản trị và không đọc/ghi token vào sessionStorage. Khi không có bridge, luồng nhập token dev vẫn giữ nguyên.
- Trang OBS dùng overlayUrl/version/dataDir từ preload; URL fallback vẫn suy từ location. Nút “Mở thư mục dữ liệu” chỉ hiện ở desktop và đang disabled như yêu cầu “mở thư mục để sau”.
- Overlay entry dùng URL tương đối; bundler desktop đặt Vite base=/overlay/. Build output dùng /overlay/assets/...; ?mock=prepare và ?guides=1 tiếp tục chạy.
- Thêm unit tests cho nhánh có/không có bridge, token và URL.

Kiểm tra:
- corepack pnpm --filter @quiz/dashboard build: PASS
- corepack pnpm --filter @quiz/overlay build: PASS
- corepack pnpm typecheck: PASS
- corepack pnpm test: PASS — 12 file, 133/133 test
- corepack pnpm desktop: PASS — bundle dashboard/overlay, mở ứng dụng Electron. Trên app thật, dashboard không hỏi mã; token preload kết nối server, tạo phiên MOCK và mở câu hỏi vòng 1. Sau đó đã dừng app; cổng 8787 không còn listener.
- corepack pnpm exec node test-results/c0019/capture-overlay.mjs: PASS — Microsoft Edge tải /overlay/?mock=prepare&guides=1, không có lỗi console/pageerror.

Ảnh local:
E:\\Ai\\2026\\Trend mini game tiktok\\.claude\\worktrees\\c0019-desktop\\test-results\\c0019\\overlay-prepare-guides.png

Ảnh CUA của desktop app đã xác nhận trang OBS hiển thị URL http://127.0.0.1:8787/overlay/, phiên bản 0.1.0, dataDir của ứng dụng và nút mở thư mục bị vô hiệu hoá. Lần bundle đầu phát hiện module script tuyệt đối bị base=/overlay/ viết lại sai; đã đổi entry sang tương đối và lần bundle/app cuối thành công.

Giới hạn: connector TikTok không thuộc task; không kiểm tra kết nối thật.
