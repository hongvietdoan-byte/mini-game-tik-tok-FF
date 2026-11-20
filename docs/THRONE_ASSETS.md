# Kiểm tra ảnh ngai vàng

Đặt ảnh mẫu tại `assets-local/throne/ngai-trong.png` và ảnh nhân vật theo tên `ngai-<characterId>.png`. Danh sách ID được lấy từ `assets-local/chibi/manifest.json`. Ảnh phải đúng 800×800, RGBA, bốn góc 10×10 px trong suốt.

```powershell
py -3 tools/throne_assets.py check
py -3 tools/throne_assets.py check --json
py -3 tools/throne_assets.py check --dir assets-local/throne --center 200,120,600,700
py -3 tools/throne_assets.py build
```

Phần ngai lộ ra được so với ảnh mẫu; vùng giữa mặc định `(200,120,600,700)` được bỏ qua vì nhân vật ngồi che vùng đó. Công cụ tìm dịch chuyển trong ±16 px, rồi tính trung bình sai khác RGB trong mask.

- `OK`: dịch chuyển mỗi trục ≤4 px, RGB trung bình <18.
- `CẦN XEM`: dịch chuyển 5–8 px, RGB 18–30, góc không trong, hoặc không có ảnh mẫu hợp lệ.
- `NGAI LỆCH`: dịch chuyển trục >8 px hoặc RGB >30; sai kích thước cũng được đánh dấu lỗi.

Cuối bảng có số ảnh theo kết luận, ID thiếu và tệp thừa/sai tên. Lệnh `build` xuất `manifest.json` và `contact-sheet.png` trong thư mục ngai; contact sheet có 8 cột, ô 200×200, ảnh mẫu ở ô đầu, viền xanh cho `OK`, vàng cho `CẦN XEM`, đỏ cho `NGAI LỆCH`. Mở contact sheet để rà nhanh; bảng JSON giữ đủ số đo từng tệp.
