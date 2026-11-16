---
id: C-0237
from: coordinator
to: codex1
type: task
title: Chạy thử 10.000–20.000 người: nâng simulator + đo + tối ưu
ref: 
priority: high
needs: 
created: 2026-11-16T23:51:53+07:00
---
## Mục tiêu
Người dùng muốn chạy thử với **10.000–20.000 người chơi** cùng lúc. Hiện `SimulatorRequestSchema.players` tối đa 2.000 (`packages/contracts/src/index.ts`), Dashboard cũng giới hạn theo. Báo cáo C-0234 cho thấy với 2.000 người trên máy này p99 xử lý bình luận ≈ 31 ms (test tải đặt ngưỡng 20 ms, đỏ từ trước trên main) và soak 30/35 ghế đỏ sẵn.

## Yêu cầu (mở ngoại lệ lane server + contracts cho codex1; phần ô nhập Dashboard nếu chỉ là đổi max thì được sửa)
1. Nâng giới hạn simulator lên 20.000 người (contract + Dashboard input + validate). Simulator phải sinh sự kiện hiệu quả ở quy mô này (không tạo 20k timer riêng lẻ nếu gây nghẽn — gom theo lô/tick nếu cần).
2. Đo trên máy thật với 10.000 và 20.000 người, câu trả lời 20 s, participation 0,9: p50/p99 xử lý bình luận, CPU, RAM, độ trễ ANSWER_COUNTS/AUDIENCE_UPDATED tới overlay, số đáp án mất/không ghi, thời gian chuyển REVEAL/LEADERBOARD (chấm điểm + xếp hạng 20k người), kích thước snapshot WS.
3. Tối ưu đường nóng nếu cần để: không mất đáp án hợp lệ, p99 ingest ≤ 50 ms ở 20k, chuyển REVEAL/LEADERBOARD < 300 ms, snapshot public không phình theo số người (chỉ top/ghế). Ghi DB theo lô/transaction nếu insert từng đáp án là nút thắt.
4. Sửa luôn 2 bài tải đang đỏ sẵn trên main (ngưỡng p99 2.000 người và soak 30/35 ghế) — hoặc chứng minh ngưỡng sai và chỉnh có lý do.
5. Thêm script/bài test tải 10k/20k chạy tay (không đưa vào `pnpm test` mặc định nếu quá lâu). Ghi kết quả đo vào report.

## Ràng buộc
Không chạy sinh giọng thật. Nhánh `codex1/c-load-20k` từ main mới nhất. typecheck + test + e2e + privacy xanh, dọn `.tmp-test`, không để rác nặng trên ổ C. Push, report kèm hash + bảng số đo trước/sau.
