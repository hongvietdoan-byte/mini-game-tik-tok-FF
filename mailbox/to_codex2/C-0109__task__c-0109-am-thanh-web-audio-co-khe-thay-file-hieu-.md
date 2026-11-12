---
id: C-0109
from: coordinator
to: codex2
type: task
title: C-0109 Âm thanh (Web Audio, có khe thay file) + hiệu ứng cho overlay — làm sau C-0101
ref: 
priority: normal
needs: 
created: 2026-11-12T09:17:18+07:00
---
Người dùng yêu cầu 12/11: overlay phải có **âm thanh và hiệu ứng** (hiện chưa có chỗ nào phát âm thanh; hiệu ứng mới ở mức cơ bản). Làm SAU khi report C-0101/C-0103, nhánh mới từ nhánh giao diện: `codex2/c0109-sound-fx`.

**Âm thanh** — tạo bằng Web Audio API ngay trong overlay (tổng hợp bằng mã, không cần file, không cần khoá API), theo một bảng sự kiện → âm:
- vào câu hỏi (whoosh + hit), tích tắc 5 giây cuối (nhanh dần), hết giờ, công bố đáp án đúng (chord sáng), Top 10 xuất hiện, Victory (fanfare ngắn + tiếng reo tổng hợp), chuyển cảnh.
- Nhạc nền: vòng lặp nhẹ tổng hợp, mặc định TẮT.
- Mỗi âm có một "khe file": nếu tồn tại `assets-local/audio/<tên>.mp3|ogg` thì phát file thay cho âm tổng hợp (để sau này thay bằng âm tạo từ dịch vụ ngoài mà không sửa code). Liệt kê tên khe trong `docs/ASSET_INVENTORY.md`.
- Điều khiển: âm lượng tổng + bật/tắt riêng SFX và nhạc nền qua tham số URL của overlay (`?sfx=0..1&bgm=0..1`) và lưu trong state phiên nếu đã có chỗ phù hợp; mặc định SFX 0.6, BGM 0. Không phát đè giọng MC: khi pha READING có audio MC thì hạ SFX (ducking).
- Trình duyệt chặn autoplay: overlay trong LIVE Studio/OBS là browser source nên thường phát được; ở trình duyệt thường phải có cú bấm đầu tiên — hiện gợi ý nhỏ "bấm để bật âm" chỉ khi AudioContext bị treo, không hiện trong chế độ nguồn phát.
- Không trùng âm khi state được gửi lại/khôi phục sau restart (phát theo chuyển pha, không theo render).

**Hiệu ứng** — CSS/canvas nhẹ, giữ ≥ 55 FPS ở 1080×1920 (bài đo FPS hiện có):
- sét loé ở nền khi vào câu hỏi và khi công bố đáp án; hạt sáng bay chậm ở nền; đồng hồ đập nhịp + đổi màu 5 giây cuối; đáp án đúng phát sáng + rung nhẹ, đáp án sai mờ đi; thanh số người chọn chạy mượt; hàng Top 10 trượt vào lần lượt; Victory: confetti rơi liên tục, chùm sáng quét, cúp toả sáng.
- Tôn trọng `prefers-reduced-motion` và thêm `?fx=low` để giảm hiệu ứng trên máy yếu.

Test: unit cho bộ ánh xạ pha → âm (không phát trùng, ducking), e2e kiểm AudioContext được tạo và hàm phát được gọi đúng một lần mỗi chuyển pha (mock), FPS không tụt. Report kèm một video/GIF ngắn hoặc chuỗi ảnh cho hiệu ứng và danh sách âm.
