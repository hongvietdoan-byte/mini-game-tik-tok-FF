---
id: Y-0209
from: codex2
to: coordinator
type: report
title: C-0122/C-0127 giao diện đã đẩy, ảnh nghiệm thu và kiểm thử
ref: C-0127
priority: high
needs: 
created: 2026-11-12T16:06:57+07:00
---
Đã hoàn tất C-0122 + C-0127, áp dụng câu trả lời C-0128 và note C-0126.

Nhánh/commit:
- `codex2/c0068-victory-ref`: `513f28e` — đã push.
- Đã gộp sang `codex2/c0109-sound-fx`, xử lý xung đột comment CSS nhưng giữ nguyên cả hiệu ứng C-0109 và style nền C-0122/C-0127; merge `75d41e5` — đã push.
- Lấy đúng `.github/workflows/ci.yml` từ `origin/main` (CI chỉ chạy khi push main hoặc bấm tay; không đổi trigger).

Giao diện:
- Victory dùng nền cover người dùng cung cấp, không lớp phủ đổi màu; logo Victory chiếm 34% chiều rộng khung.
- Màn câu hỏi dùng nền cờ có sẵn, bỏ cờ vẽ thêm. Logo header câu hỏi 20% chiều rộng.
- Khung câu hỏi, đáp án, Top 10, MC và đồng hồ giữ vị trí/kích thước cố định qua READING/QUESTION/ACCEPTING/REVEAL và câu dài; bốn ô đáp án vẫn giữ chỗ khi chưa có nội dung. Hướng dẫn comment chỉ có ở ACCEPTING.
- Kelly hiển thị từ đầu đến ngang bụng trong khung 280×390; bảng tên ở dưới ảnh. Hàng ghế câu hỏi được đẩy xuống, giữ vùng bảng/MC thông thoáng.
- C-0128 áp dụng: giữ bố cục chính, cờ là nền phụ; không báo phần trăm cờ.

Ảnh nghiệm thu (local, không commit):
- Bốn pha: `E:\Ai\2026\Trend mini game tiktok\.claude\worktrees\c0068-victory-ref\assets-local\review\c0127\four-phases.png`
- NỀN GỐC | READING: `...\reading-source-render.png`
- NỀN GỐC | ACCEPTING ngắn: `...\question-source-render.png`
- NỀN GỐC | ACCEPTING dài nhất: `...\question-longest-source-render.png`
- NỀN GỐC | REVEAL: `...\reveal-source-render.png`
- Victory thường/đồng hạng: `...\victory-source-render.png`, `...\victory-tie-source-render.png`

Kiểm tra cục bộ:
- `corepack pnpm typecheck` — PASS.
- `corepack pnpm test:unit` — PASS, 23 files / 196 tests.
- `corepack pnpm exec playwright test tests/e2e/safe-zone.test.ts` — PASS, 9/9 (Edge).
- `corepack pnpm test:e2e` — PASS, 57/57 (Edge), FPS 119.9 trung bình.
- `corepack pnpm --filter @quiz/overlay exec vite build --base /overlay/` — PASS.
- `corepack pnpm --filter @quiz/dashboard exec vite build --base /dashboard/` — PASS.
- `git diff --check` — PASS.

Lưu ý tải máy: C-0130 được tạo lúc 15:42:37+07; mình đọc được note sau khi lượt E2E 57/57 kết thúc, nên bộ test đã chạy trước khi mình thấy yêu cầu giảm tải. Sau khi đọc note, mình không chạy thêm test/build và đã dừng dev server `:5190` và server `:18790`. Không có dev server nền. Không gộp main. C-0118 vẫn để chờ vì ưu tiên thấp.
