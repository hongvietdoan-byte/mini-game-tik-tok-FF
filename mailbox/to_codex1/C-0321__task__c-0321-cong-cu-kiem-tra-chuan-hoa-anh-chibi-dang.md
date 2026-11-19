---
id: C-0321
from: coordinator
to: codex1
type: task
title: C-0321: công cụ kiểm tra/chuẩn hoá ảnh chibi dáng ngồi ngai vàng + seatedUrl ở server
ref: C-0321
priority: normal
needs: 
created: 2026-11-19T14:46:12+07:00
---
Người dùng muốn **vẽ thêm dáng ngồi ngai vàng cho cả 66 nhân vật chibi**, dùng cho ngai Top 1 (xem C-0320 của Codex 2). Người dùng sẽ tự tạo ảnh bằng công cụ AI, theo quy cách trong file cục bộ `assets-local/chibi-seated/HUONG-DAN.md` (đường dẫn bị ignore, không commit):
- PNG nền trong suốt, khung 600×600;
- nhân vật ngồi nhìn thẳng, toàn thân, không vẽ ghế;
- tên file `chibi-seated-<số>-<tên>.png`, tương ứng id trong `assets-local/chibi/manifest.json`.

Việc cần làm (phạm vi tools + server asset, không đụng overlay):
1. **Công cụ** `tools/chibi_seated.py` (chạy `py -3 tools/chibi_seated.py check|build`):
   - `check`: với mỗi file trong `assets-local/chibi-seated/`, báo id có khớp manifest không; nền có trong suốt không (alpha ở 4 góc); bbox nhân vật; lệch tâm ngang (> 5 % thì báo); nhân vật quá nhỏ (cao < 60 % khung) hay chạm mép.
   - `build`: cắt sát, đưa về khung chuẩn 600×600, căn giữa ngang và căn đáy bbox ở y 570; ghi `assets-local/chibi-seated/manifest.json` có `seatedFile` theo id; xuất ảnh tổng hợp `contact-sheet.png` để duyệt. Không ghi đè ảnh gốc người dùng; bản chuẩn hoá để ở `assets-local/chibi-seated/out/`.
2. **Server:** phục vụ ảnh ngồi qua route asset hiện có (giống chibi đứng), trả thêm `seatedUrl` cho nhân vật đã có ảnh ngồi; chưa có thì để trống. Overlay sẽ tự dùng dáng đứng che chân bằng tay vịn.
3. **Test:** unit test cho `check`/`build` bằng ảnh giả sinh trong thư mục tạm (dọn sau test, không để trên ổ C); test route `seatedUrl`. Không commit ảnh thật.
4. Cập nhật `docs/` một đoạn ngắn cách thêm ảnh dáng ngồi.

Ưu tiên: sau C-0310. Báo cáo kèm lệnh đã chạy và kết quả.
