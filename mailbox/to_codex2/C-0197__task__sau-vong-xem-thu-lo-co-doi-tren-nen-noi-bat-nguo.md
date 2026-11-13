---
id: C-0197
from: coordinator
to: codex2
type: task
title: Sau vòng xem thử: lộ cờ đội trên nền, nổi bật người nhanh nhất, MC nhiều dáng, nền video
ref: C-0194
priority: high
needs: 
created: 2026-11-13T23:26:08+07:00
---
Người dùng xem vòng MOCK thật trên main và nêu 4 yêu cầu giao diện. Làm SAU C-0194, mỗi mục một nhánh riêng, KHÔNG gộp — gửi ảnh để người dùng duyệt. Mọi thay đổi overlay phải chạy đủ e2e (kể cả `safe-zone.test.ts` và bộ câu dài), không chỉ `overlay.spec.ts`. Test dùng `.tmp-test/` trong worktree, dọn sau khi chạy; không chạy gì trong checkout chính.

A. (ưu tiên 1, gộp chung vào C-0194 nếu tiện) Nền màn câu hỏi phải THẤY 8 cờ đội. Nền người dùng chốt là `assets-local/arena/bg-question-user.jpg` (cờ in sẵn, y khoảng 270–610px trên khung 1920). Hiện `ArenaBackdrop.tsx` phủ `v3-question-banner-mask` (top 220, cao 500) che hết dải cờ, và khung Top 10/câu hỏi nằm đè lên đúng vùng đó. Yêu cầu: bỏ lớp che, sắp lại bố cục để dải cờ lộ rõ (logo/pill phía trên, khung Top 10 + câu hỏi bắt đầu dưới dải cờ), vẫn đạt safe-zone và không đè bong bóng MC/khán đài. Hai phương án header A/B của C-0194 phải chụp trên nền có cờ. Sảnh chờ và Top 10 giữa vòng cũng dùng nền này (có cờ) trừ khi bạn thấy lý do không nên — nêu trong report.

B. Làm nổi bật người trả lời ĐÚNG NHANH NHẤT mỗi câu. Đề xuất 2 phương án bằng mock (`?mock=`), chụp ảnh pha công bố đáp án. Gợi ý: dải "NHANH NHẤT · <tên> · 1,2 giây" gần khung câu hỏi/bong bóng MC + ghế của người đó trên khán đài sáng/phóng to + biểu tượng tia sét ở dòng Top 10. Chỉ dùng tên an toàn (`safeDisplayName`), không lộ ID. Codex 1 sẽ thêm trường dữ liệu công khai (thư C-0198); trong mock bạn tự giả trường đó, tên trường thống nhất theo report của Codex 1.

C. MC nhiều dáng theo diễn biến. Bộ phát `mc-sequence-player` đã có 5 trạng thái (idle/welcome/ask/react/celebrate) nhưng các thư mục `assets-local/mc/kelly/*` đang trống nên chỉ hiện ảnh tĩnh. Việc của bạn: (1) cho phép MỖI trạng thái chỉ cần 1 ảnh PNG tĩnh (không bắt buộc chuỗi frame), chuyển dáng có hiệu ứng mờ/nảy nhẹ; (2) đề xuất thêm trạng thái nếu cần (ví dụ hối thúc 5 giây cuối, công bố người nhanh nhất, Top 10) và bảng "pha → dáng"; (3) viết danh sách ảnh người dùng cần cung cấp (tên file, kích thước canvas, nền trong suốt, neo chân). Chưa có ảnh thật thì dùng placeholder để chụp minh họa.

D. Nền video lặp. Hỗ trợ tùy chọn video nền (ví dụ `assets-local/arena/bg-loop.mp4` hoặc `.webm`, tắt tiếng, lặp, `playsinline`), thiếu file hoặc lỗi phát thì tự về ảnh tĩnh; áp dụng được riêng cho màn câu hỏi và Victory. Đo tải CPU/khung hình ở 1080x1920 khi chạy cùng khán đài 35 ghế, nêu khuyến nghị thông số video (codec, bitrate, độ dài vòng lặp, dung lượng). Nếu cần sửa MIME ở `apps/server/src/static.ts` thì được phép.

Report: mỗi mục ghi nhánh, commit, lệnh test + kết quả, đường dẫn ảnh.
