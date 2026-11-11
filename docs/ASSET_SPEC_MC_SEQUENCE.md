# Đặc tả xuất PNG Sequence cho MC Kelly (V3 §7–§8)

Dành cho người làm hình. Khi chưa có sequence, overlay dùng ảnh tĩnh `assets-local/mc/kelly.png` (đã tách nền) với chuyển động "thở" 1–2 %.
Có sequence → thả vào thư mục dưới đây, **không cần sửa code**.

## Thư mục (máy chạy app, ngoài git)
```
assets-local/mc/kelly/
  manifest.json
  idle/0001.png … 0024.png
  welcome/0001.png …
  ask/0001.png …
  react/0001.png …
  celebrate/0001.png …
  poster.png            ← ảnh tĩnh dự phòng (1 frame đẹp nhất của idle)
```
Bản desktop: đặt cùng cấu trúc trong `%APPDATA%\Storm Arena LIVE Quiz\assets\mc\kelly\` (sẽ hỗ trợ khi đóng gói asset).

## manifest.json
```json
{
  "id": "mc-kelly",
  "fallback": "poster.png",
  "anchor": { "x": 0.5, "y": 1 },
  "animations": {
    "idle":      { "path": "idle/",      "frames": 24, "fps": 10, "loop": true },
    "welcome":   { "path": "welcome/",   "frames": 30, "fps": 12, "loop": false, "then": "idle" },
    "ask":       { "path": "ask/",       "frames": 24, "fps": 12, "loop": true },
    "react":     { "path": "react/",     "frames": 24, "fps": 12, "loop": false, "then": "idle" },
    "celebrate": { "path": "celebrate/", "frames": 36, "fps": 12, "loop": false, "then": "idle" }
  }
}
```
- **Bắt buộc:** `idle`. Các trạng thái khác thiếu → tự dùng `idle`.
- Trạng thái lấy từ server (`snapshot.mc.state`): LOBBY = `welcome`, câu hỏi/đang nhận đáp án = `ask`, công bố = `react`, vinh danh = `celebrate`, còn lại = `idle`.

## Yêu cầu frame
| Mục | Yêu cầu |
|---|---|
| Định dạng | PNG 32-bit, **nền trong suốt** (alpha), không viền trắng/xám quanh tóc |
| Tên file | `0001.png`, `0002.png`… liên tục, không nhảy số |
| Kích thước | Mọi frame **cùng kích thước canvas** và cùng điểm neo (chân giữa đáy, `anchor 0.5,1`) — không cắt sát từng frame |
| Canvas khuyến nghị | 600 × 900 px (hiển thị ~290 px rộng trên khung 1080×1920 — đủ nét, nhẹ) |
| Khung hình | Kelly từ đầu tới chân hoặc tới hông; overlay chỉ hiện tới ngang ngực/hông như ảnh mẫu |
| FPS | 10–12 (MC); không cần 24/30 |
| Dung lượng | ≤ 150 KB/frame, ≤ 6 MB/trạng thái (nén PNG, có thể giảm màu) |
| Vòng lặp | `idle`/`ask` lặp mượt (frame cuối nối frame đầu) |
| Không được | Ghép chữ, logo, bảng tên, bong bóng vào frame (các phần đó là lớp chữ riêng); không nhấp nháy mạnh |

## Kiểm tra trước khi dùng
`node scripts/validate-sequences.mjs assets-local/mc/kelly` (sẽ có): kiểm đủ frame, cùng kích thước, có alpha, dung lượng; báo lỗi rõ từng file.
