---
id: Y-0333
from: codex2
to: coordinator
type: report
title: C-0197-D hoàn tất: video loop nền
ref: C-0197
priority: normal
needs: 
created: 2026-11-14T02:48:45+07:00
---
## C-0197-D — nền video loop

### Đã làm
- Branch: `codex2/c0197-video-background`; các commit đã push: `354a26f`, `752a881` (tip).
- `ArenaLoopVideo` phát tùy chọn `/assets/arena/bg-loop.webm`, dự phòng `/assets/arena/bg-loop.mp4`; tắt tiếng, loop, playsinline, poster là ảnh hiện hành, fade-in khi phát. Khi file lỗi/không có hoặc người xem bật reduced motion, video bị bỏ và nền ảnh tĩnh vẫn giữ nguyên.
- Phát video chỉ ở QUESTION/REVEAL và Victory; sảnh cùng các màn phụ giữ nền tĩnh.
- Static server chỉ nhận `video/webm` và `video/mp4` trong `/assets/arena/`, giới hạn 30 MiB.
- E2E dùng fixture tổng hợp 1080×1920, VP9, 30 fps, 600 kb/s, 8 giây, 756,912 byte (không dùng ảnh/video đầu vào của người dùng).

### Bằng chứng
- `corepack pnpm typecheck` — PASS.
- `corepack pnpm build:web` — PASS; dashboard và overlay build thành công.
- `corepack pnpm test` — PASS, 57 file / 343 test.
- `corepack pnpm test:e2e` — PASS, 71/71 trên Microsoft Edge; bao gồm safe-zone, nội dung dài, sảnh, QUESTION, REVEAL, Victory, fallback ảnh tĩnh và kiểm tra vòng LIVE thật.
- Bài đo 8 giây ở viewport 1080×1920 với video phát và 35 ghế: FPS trung bình 120.0, p5 116.3; `TaskDuration` của CDP làm proxy CPU main-thread là 55.7%. Chỉ số CPU này không đo tổng CPU hay tải giải mã GPU.
- `apps/server/src/static.test.ts`: MIME cho WebM/MP4, giới hạn kích thước, từ chối video ngoài `/arena/` và phần mở rộng khác — PASS.

### Khuyến nghị asset thật
- Bắt đầu với WebM VP9 1080×1920, 30 fps, 1.2–1.8 Mb/s, vòng liền mạch 6–8 giây, mục tiêu khoảng 1.2–1.8 MB; cung cấp thêm MP4 H.264 2–3 Mb/s làm fallback, khoảng 2–3 MB.
- Đây là mức khởi điểm để người dùng thử trên máy phát thật. Video sự kiện thật chưa được cung cấp nên chất lượng hình và tải giải mã của asset đó chưa được đo. Server hiện từ chối file loop trên 30 MiB.

### Ảnh kiểm tra local
- `E:\Ai\2026\Trend mini game tiktok\.claude\worktrees\c0197-video-background\.claude\review\C0197D\question-video-35-seats.png`
- `E:\Ai\2026\Trend mini game tiktok\.claude\worktrees\c0197-video-background\.claude\review\C0197D\victory-video.png`
- `E:\Ai\2026\Trend mini game tiktok\.claude\worktrees\c0197-video-background\.claude\review\C0197D\question-static-fallback.png`

C-0197-D hoàn tất; C-0197 tổng thể còn mở trong khi nhánh B chờ trường dữ liệu của C-0198.
