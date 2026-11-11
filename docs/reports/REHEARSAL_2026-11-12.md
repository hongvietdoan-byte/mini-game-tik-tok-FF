# Biên bản tổng duyệt MOCK — 2026-11-12

**Kết quả: MOCK_REHEARSAL_PASSED**

Chạy Fastify qua HTTP loopback, `MockAdapter`, DB SQLite tạm và câu hỏi giả lập gắn DEMO. Mỗi câu bơm HTTP theo batch 100 comment, chọn 30% trong nhóm 500 hoặc 2.000 người; đồng hồ điều khiển tất định. Gate restart đóng và dựng lại app trên cùng DB.

## Cấu hình và số liệu từng vòng

| Vòng | Người giả lập | Câu | Comment nhận | Được chấp nhận | Bị loại (lý do) | p95 HTTP batch 100 (ms) | Thời gian xử lý (ms) | Toàn vẹn |
|---:|---:|---:|---:|---:|---|---:|---:|---|
| 1 | 500 | 15 | 2356 | 2253 | 103 (NOT_ACCEPTING:1, LATE:1, DUPLICATE_ANSWER:100, STALE_SOURCE_TIMESTAMP:1) | 156.2 | 2630.46 | PASS |
| 2 | 500 | 15 | 2250 | 2250 | 0 (—) | 109.71 | 2304.97 | PASS |
| 3 | 500 | 15 | 2250 | 2250 | 0 (—) | 108.42 | 2188.79 | PASS |
| 4 | 2000 | 15 | 9000 | 9000 | 0 (—) | 156.69 | 9810.09 | PASS |
| 5 | 2000 | 15 | 9000 | 9000 | 0 (—) | 150.36 | 9426.33 | PASS |
| 6 | 2000 | 15 | 9000 | 9000 | 0 (—) | 164.21 | 9471.51 | PASS |

## Các gate

| Gate | Kết quả | Bằng chứng |
|---|---|---|
| Fastify lắng nghe HTTP, chế độ MOCK, dữ liệu tạm | PASS | Fastify listen http://127.0.0.1:61177; session mode MOCK; DB đặt ở temp. |
| Khởi động lại giữa câu và yêu cầu operator xử lý recovery | PASS | Đóng app đang chạy, mở lại trên cùng DB; trạng thái PAUSED/RECOVERY không tự tiến; RESOLVE_RECOVERY/RESUME trả 200 và số bút toán giữ nguyên. |
| Người xem vào giữa vòng | PASS | Sau khi câu 1 ở ACCEPTING, 150/500 người bắt đầu gửi comment qua HTTP; DB nhận đủ 150 người. |
| 100 comment spam từ một tài khoản chỉ ghi một đáp án | PASS | Gửi 100 HTTP comment song song; DB thêm 1 answer cho một user. |
| A rồi B: giữ đáp án đầu tiên | PASS | Hai HTTP comment A rồi B; DB chỉ có một answer và option đầu là A. |
| Comment đúng deadline bị loại theo cửa sổ end-exclusive | PASS | Đặt virtual receive time đúng bằng deadline; API ghi reject LATE, sau đó timer đóng câu. |
| Comment trễ từ câu trước bị cách ly | PASS | MockAdapter phát timestamp từ câu trước (7900 ms); reject STALE_SOURCE_TIMESTAMP. |
| Pause giữ nguyên thời gian; resume nhận comment trở lại | PASS | PAUSED giữ 600/600 ms sau khi clock đi thêm 5000 ms; comment lúc pause bị loại, sau RESUME nhận lại. |
| Hoàn tất liên tiếp 6 vòng × 15 câu | PASS | Cùng một phiên Fastify đã hoàn tất liên tiếp 6 vòng; mỗi vòng có 15 câu hỏi trong round_questions. |
| Mô phỏng 500 người xem | PASS | 500 user ID qua HTTP trong 3 vòng; p95 batch tối đa 156.2 ms. |
| Mô phỏng 2.000 người xem | PASS | 2000 user ID qua HTTP trong 3 vòng; p95 batch tối đa 164.21 ms. |
| Sổ điểm và đáp án không trùng trong cả sáu vòng | PASS | Từng vòng có 15 câu, verifyIntegrity() rỗng và không có cặp answer trùng; 33856 comment đã đi qua runtime. |

## Lỗi P0/P1 còn mở

- Không phát hiện lỗi P0/P1 trong các gate tổng duyệt này. Các hạng mục ngoài kịch bản chưa được đánh giá bởi biên bản này.

## Ghi chú ngoài phạm vi gate

- `MockSimulator` reset bộ đếm event ID khi tạo instance mới; STOP/START trong cùng nguồn có thể phát lại `sim-1`, `sim-2`… và bị runtime đánh dấu `DUPLICATE_EVENT`. Lần chạy thăm dò trước khi chuyển sang tải HTTP ghi nhận 5.778 duplicate event. Regression nằm ở `packages/live-adapters/src/simulator.test.ts` dưới dạng `it.fails`; chưa sửa runtime ngoài phạm vi P0-D. Tải 6 vòng trong biên bản dùng event ID duy nhất qua HTTP và không gọi lại simulator giữa phiên.
- Tất cả dữ liệu/ảnh/câu hỏi dùng trong rehearsal là synthetic và được tạo ở thư mục tạm; không ghi vào DB của repo.
