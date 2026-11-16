---
id: C-0234
from: coordinator
to: codex1
type: task
title: Cảnh báo người spam đáp án (server + contract admin)
ref: 
priority: normal
needs: 
created: 2026-11-16T22:25:45+07:00
---
## Mục tiêu
Người dùng muốn **cảnh báo người spam** trong lúc LIVE. Hiện server chỉ bỏ qua bình luận không hợp lệ (DUPLICATE_ANSWER, NOT_ACCEPTING, EARLY, LATE, NOT_AN_ANSWER) và chỉ đếm tổng trong `metrics`; không biết AI đang spam. Luật hiện có giữ nguyên: mỗi người 1 đáp án/câu, đáp án đầu tiên được tính.

## Yêu cầu (phía server — mở ngoại lệ lane server cho codex1 riêng ticket này)
1. Theo dõi theo người chơi (playerId) trong cửa sổ trượt: số bình luận dạng đáp án bị từ chối vì `DUPLICATE_ANSWER`, `NOT_ACCEPTING`, `EARLY`, `LATE` (đáp án hợp lệ về cú pháp nhưng sai thời điểm/lặp). `NOT_AN_ANSWER` (chat thường) KHÔNG tính là spam.
2. Ngưỡng mặc định: ≥ 5 lần trong 30 s → gắn cờ cảnh báo. Ngưỡng nằm trong config phiên (tuỳ chọn, có default), không cần UI chỉnh.
3. Chỉ CẢNH BÁO, không tự phạt/chặn, không trừ điểm, không hiện lên overlay công khai.
4. Đưa vào `ADMIN_SNAPSHOT` một danh sách `spamWarnings` (giới hạn ~20 mục, mới nhất trước): `playerId`, tên hiển thị đã lọc (safeDisplayName), số lần, lý do chính, `lastAtMs`. Cập nhật contract trong `packages/contracts`. Không đưa user id TikTok thô ra public snapshot.
5. Không làm chậm đường nóng nhận bình luận (O(1) mỗi bình luận, dọn mục cũ theo nhịp). Không ghi DB theo từng bình luận.
6. Reset theo phiên; giữ qua các câu/vòng trong cùng phiên.

## Test
- Unit: 5 đáp án lặp trong 30 s → có cảnh báo; 4 lần → không; chat thường không tính; mục cũ hết hạn.
- Simulator 2000 người không làm tăng thời gian xử lý đáng kể.

## Sau đó
Codex2 sẽ làm khung hiển thị `spamWarnings` trên Dashboard sau khi coordinator gộp contract này.

## Ràng buộc
Nhánh `codex1/c-spam-warning` từ main mới nhất. Không sửa overlay/dashboard. typecheck + test + e2e + privacy xanh, dọn `.tmp-test`. Push nhánh, report kèm hash.
