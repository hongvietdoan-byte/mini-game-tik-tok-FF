# Theme cho đợt sự kiện

Theme đổi ảnh, video, âm thanh, màu, font, chữ thương hiệu và cách trình bày danh hiệu. Bố cục overlay, câu hỏi, luật chơi, đồng hồ và giọng MC vẫn thuộc ứng dụng/game.

## Tạo bộ theme và gửi người làm hình

```powershell
pnpm theme:export-default                 # chỉ để dựng lại bộ gốc khi cần
pnpm theme:new tet-2027 --name "Tết 2027"
pnpm theme:validate data/themes/tet-2027
pnpm theme:pack tet-2027                  # tạo tet-2027.zip
```

`theme:new` nhân bản `data/themes/default` và tạo `CAN-CHUAN-BI.md` cùng `SO-DO.png`. Trong checklist có ID ảnh/chữ khớp sơ đồ, thông số, màu, font, giới hạn chữ, pose, file và số lượng hiện có. Thay file dưới `assets/` hoặc sửa đường dẫn tương đối trong `theme.json`; không xóa các pose bắt buộc. Giữ đúng định dạng và kích thước ghi trong checklist; mỗi asset tối đa 50 MB. Không vẽ chữ hay khung giao diện dính vào ảnh nền.

`theme:validate` phải báo theme hợp lệ trước khi đóng gói. ZIP chứa `theme.json`, asset/font, checklist và sơ đồ. Gửi một file `<id>.zip` cho người dựng hình; không gửi file ngoài gói.

## Nhận và dùng gói trên máy chạy LIVE

```powershell
pnpm theme:import .\tet-2027.zip
pnpm theme:validate .\data\themes\tet-2027
```

Import kiểm tra cấu trúc ZIP, đường dẫn, checksum và toàn bộ manifest/asset trước khi thêm theme. Gói lỗi sẽ không được chép vào kho. Nếu ID đã tồn tại, dùng ID mới; lệnh không ghi đè theme đang có.

Trong Dashboard mở **Giao diện / Theme** → **Tải lại danh sách theme** → chọn theme → kiểm tra xem trước → **Dùng theme này**. Nếu chữ HUD đã được điều hành viên sửa, xác nhận trước khi thay chữ. Chọn theme khi phiên ở `IDLE` hoặc `LOBBY`; trong vòng thi, nút bị khóa. Theme có hiệu lực ngay, không cần reload overlay hoặc khởi động lại server.

## Lệnh hỗ trợ

- `pnpm theme:map <id>` cập nhật sơ đồ từ bốn ảnh overlay hiện tại.
- `pnpm theme:pack <id> [--out <tệp.zip>]` xuất ZIP vào thư mục hiện tại nếu không chỉ định đường dẫn.
- `pnpm theme:import <tệp.zip> [--themes <thư-mục>]` nhập vào `data/themes` nếu không chỉ định kho khác.
- `pnpm theme:validate <thư-mục-theme>` kiểm tra thủ công.

Theme không chứa câu hỏi, đáp án, điểm, vị trí ghế, kích thước khung hay giọng đọc. Các giới hạn này giữ nguyên bố cục đã duyệt và nội dung trận đấu.
