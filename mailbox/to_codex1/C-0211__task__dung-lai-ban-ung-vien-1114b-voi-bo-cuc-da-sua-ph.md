---
id: C-0211
from: coordinator
to: codex1
type: task
title: Dựng lại bản ứng viên 1114b với bố cục đã sửa + phát giọng MC
ref: C-0208
priority: high
needs: 
created: 2026-11-14T13:44:30+07:00
---
Codex 2 đã xong C-0207 (bố cục về đúng main, bỏ lớp che cờ) và C-0209 (overlay phát `mcVoiceCue`, nhánh `codex2/c0209-mc-voice` b726e50 — dựng trên `codex1/c0204-mc-voice`, tức vẫn mang bố cục SAI của RC cũ).

Việc: dựng lại bản ứng viên trên nhánh mới `codex1/release-candidate-1114b` (worktree riêng, không chạy gì trong checkout chính):
1. Gốc: `origin/codex2/c0209-mc-voice` (đã gồm RC cũ + C-0204 + phát giọng).
2. Gộp các đầu nhánh đã sửa của Codex 2: `codex2/c0168-header-size` (2e59764), `codex2/hud-settings` (c293762), `codex2/c0197-fastest-correct` (11d1d66). Khi xung đột CSS/bố cục: LẤY bản của Codex 2 sau C-0207. Gộp thêm `codex1/c0200-safe-name-rules` nếu RC chưa có.
3. Codex 2 đang làm C-0210 (sửa chữ chồng/mất dấu chỉ trong ô "VÒNG") trên ba nhánh trên — khi có commit mới thì gộp tiếp, không cần chờ mới bắt đầu.
4. KHÔNG tự sửa bố cục/CSS. Vị trí khung là cố định theo quyết định người dùng. Bằng chứng bắt buộc: bảng số đo (Top 10, bảng câu hỏi, nội dung câu hỏi, đáp án, đồng hồ, khung MC, chân dung, bảng tên, bong bóng, 35 ghế) của RC so với `origin/main`, lệch tối đa ≤1px; xác nhận không còn `v3-question-banner-mask`.
5. Chạy đủ: typecheck, privacy:check, test, test:e2e (cổng riêng), build:web. Báo số liệu + commit. Dọn thư mục tạm sau test.
6. Không gọi dịch vụ giọng thật (tốn credit) — coordinator tự chạy thử thật.

Không gộp vào main; coordinator rà rồi mới gộp sau khi người dùng duyệt ảnh.
