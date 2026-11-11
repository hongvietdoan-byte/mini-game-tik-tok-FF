---
id: C-0007
from: coordinator
to: codex2
type: task
title: apps/dashboard Live Control tối thiểu
ref: 
priority: high
needs: 
created: 2026-11-11T10:58:46+07:00
---
# apps/dashboard — Live Control tối thiểu

## Mục tiêu
Trang điều khiển cho operator chạy một phiên MOCK từ đầu đến cuối mà không sửa code. Phase 1 chỉ cần **một trang** (Live Control) + ô nhập mã quản trị.
Server đang được coordinator viết song song theo `docs/API_CONTRACT.md` — code theo hợp đồng đó; trong lúc chưa có server dùng `?mock=1` (client giả trong bộ nhớ).

## Phạm vi file
- `apps/dashboard/**`. Không sửa `packages/**`, `apps/server/**`, `apps/overlay/**` (muốn dùng chung code với overlay → chép, ghi chú; gộp chung là việc Phase 2).

## Yêu cầu
1. Vite 6 + React 18 + TS, cổng 5173, host `127.0.0.1`, proxy `/api` + `/ws` → `127.0.0.1:8787`.
2. **Mã quản trị**: ô nhập token → `sessionStorage`; mọi fetch admin gửi `Authorization: Bearer`; WS gửi token trong HELLO role `admin`. Không đặt token vào URL, không log ra console.
3. **Tạo phiên**: form `CreateSessionRequest` (tên, số câu 10/15/20, `allowDemoQuestions` bật sẵn ở MOCK, speedMultiplier 1–20 chỉ hiện khi MOCK, seed tuỳ chọn). Nếu đã có phiên OPEN (`/api/sessions/current`) thì vào thẳng phiên đó.
4. **Live Control** (render từ `AdminSnapshot` qua WS):
   - Trạng thái lớn: state, scene, `stateVersion`, đồng hồ, câu `n/N`, đáp án đúng của câu hiện tại (**chỉ ở dashboard**), phân bố A/B/C/D trực tiếp, số người tham gia, kết nối nguồn comment.
   - Nút theo trạng thái hợp lệ (ẩn/mờ nút không hợp lệ, nhưng server vẫn là thẩm quyền): Mở sảnh, Bắt đầu vòng, Tạm dừng, Tiếp tục, Tiếp (MANUAL_NEXT), Vòng mới, Auto bật/tắt.
   - **Hành động nguy hiểm** (`DANGEROUS_COMMANDS`: Bỏ qua câu, Huỷ câu, Chơi lại vòng, Dừng phiên, Xử lý khôi phục) → hộp xác nhận có ô **lý do bắt buộc ≥ 3 ký tự**.
   - Khi `recoveryPending`: banner đỏ "Hệ thống vừa khởi động lại" + 3 nút Tiếp tục / Huỷ câu / Dừng (RESOLVE_RECOVERY).
   - Gửi lệnh: `CommandEnvelope` với `commandId = crypto.randomUUID()` sinh **một lần mỗi lần bấm**, `expectedStateVersion` = version đang hiển thị, `operatorId` = 'operator' (ô nhập tuỳ chọn).
     Lỗi mạng → nút "Gửi lại" dùng **cùng** commandId. `409` → thông báo "Trạng thái đã thay đổi, xem lại rồi bấm lại" (không tự gửi lại). `422` → hiện `message` tiếng Việt từ server.
   - Khối **Giả lập (MOCK)**: bật/tắt simulator (`SimulatorRequest`: số người, độ chính xác, tỉ lệ tham gia), nút "Rớt kết nối" / "Có kết nối lại", ô gửi comment tay (userId, tên, nội dung).
   - Khối **Chẩn đoán**: `metrics` (received/accepted/rejected theo lý do), 20 lý do từ chối gần nhất, cảnh báo pool câu hỏi thấp.
   - Top 10 hiện tại + nút mở overlay (`http://127.0.0.1:5174/`) và overlay có lưới (`?guides=1`) ở tab mới.
5. UI tiếng Việt, gọn, đọc được trên màn 1366×768. Không cần đẹp cầu kỳ — rõ ràng, nút nguy hiểm màu đỏ, tách khỏi nút thường.
6. Tách client API thành `src/api/client.ts` (fetch + WS) với interface để `?mock=1` thay bằng `src/api/mockClient.ts` (máy trạng thái giả đơn giản, đủ để bấm thử mọi nút).
7. Vitest unit cho logic thuần: dựng `CommandEnvelope`, chính sách gửi lại cùng commandId, ánh xạ state → nút hợp lệ, xử lý 409/422.

## Tiêu chí xong
- `corepack pnpm --filter @quiz/dashboard build` OK; typecheck sạch; vitest unit xanh.
- `?mock=1` bấm được trọn một vòng (ảnh chụp vài màn ở `test-results/dashboard-c0007/`, không commit).
- Khi server của coordinator đã gộp `main`: chạy thật với server (`corepack pnpm dev`), ghi kết quả vào report (nếu chưa có server lúc xong thì ghi rõ "chưa thử với server thật").
- Nhánh `codex2/c0007-dashboard`.
