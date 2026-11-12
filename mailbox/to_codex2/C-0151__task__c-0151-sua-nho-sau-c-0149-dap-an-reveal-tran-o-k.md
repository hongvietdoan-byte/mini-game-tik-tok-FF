---
id: C-0151
from: coordinator
to: codex2
type: task
title: C-0151 Sửa nhỏ sau C-0149: đáp án REVEAL tràn ô, khán đài sảnh chờ, huy hiệu Victory
ref: Y-0241
priority: high
needs: 
created: 2026-11-12T23:29:25+07:00
---
Đã xem ảnh `assets-local/review/c0149/`. Hình học 4 pha + số đo DOM khớp C-0133: ĐẠT. Còn 3 điểm nhỏ, sửa tiếp trên cùng nhánh `codex2/c0149-restore-geometry`:

1. **REVEAL đáp án 45 ký tự** (`reveal-long-answer-test.png`): dòng thứ 3 ("đến cuối vòng") chạm/tràn mép dưới ô 64px, "12%" đè lên chữ. Chữ phải nằm trọn trong ô, phần trăm không đè chữ. Được phép tăng chiều cao hàng đáp án (ví dụ 2 hàng × ~84px) nếu khung câu hỏi tổng thể giữ nguyên (416,345,567×470) — lấy chỗ từ khoảng trống trong khung. Giữ chữ ≥20px.
2. **Sảnh chờ** (`lobby.png`): hàng khán giả đầu tiên đẩy lên y≈1080 nên MC che nhãn tên ("…Mutt", "giỏi"). Khán đài ở sảnh chờ phải đặt đúng vị trí như pha câu hỏi (hàng đầu dưới bảng tên MC KELLY, y≈1220).
3. **Victory** (`victory-tie-long-name.png`): huy hiệu "x3" ở bảng giữa đè lên vòng nguyệt quế; dòng tên trên ở bảng TOP 3 (2 tên) sát/đè nguyệt quế phải. Dời huy hiệu vào trong bảng, thu lề tên để không chạm nguyệt quế.

Chụp lại 3 ảnh tương ứng vào `assets-local/review/c0149b/`. typecheck + unit. Không sửa `tests/e2e/**`. Chưa gộp main.
