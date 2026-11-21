---
id: C-0383
from: coordinator
to: codex2
type: task
title: Sửa lỗi sau live 21/11 — UI: ghế 30, căn giữa câu hỏi, Top 3 ≥10 s, @tài khoản người thắng
ref: 
priority: high
needs: 
created: 2026-11-21T21:52:11+07:00
---
# Sửa lỗi sau live 21/11 — phần giao diện + @tài khoản (Codex 2)

Người dùng duyệt 21/11. Danh sách gốc: `docs/HANDOFF.md` mục "Lỗi người dùng báo 21/11, SỬA SAU" (mục 2, 7, 9, 10). **Luôn chọn cách sửa đơn giản nhất**, sửa đúng chỗ ghi dưới đây.
Nhánh: `codex2/c-sau-live-ui` (từ origin/main mới nhất). Làm theo thứ tự A → B → C → D, commit riêng từng việc.
Codex 1 đang sửa song song: `runtime.ts`, `audience.ts`, `voice/safety.ts`, `packages/contracts`, `packages/name-filter`, header "ĐANG CHƠI". **Không đụng các file đó.** Nếu bắt buộc cần thì gửi note cho coordinator trước.
Bố cục chuẩn: `assets-local/review/mau-nguoi-dung/mau-1114.png`. Không dời hoặc đổi kích thước khung nào ngoài phạm vi dưới đây.

## A. Dashboard "Đã ngồi 30/35" (mục 2)
- `apps/dashboard/src/main.tsx:679` ghi cứng 35. Sảnh thật chỉ có 30 ghế (C-0333).
- Lấy sức chứa thật từ state (số ghế của `audience.seats`), không ghi cứng.
- Test: 30/30 hiện "Đã đủ ghế"; 24/30 hiện đúng số.

## B. Chữ câu hỏi không căn giữa dọc (mục 7)
- Câu demo-004 (3 dòng) dính sát mép trên khung.
- `arena.css:1381–1382` `.v3-stage--question-user .v3-question` cao cố định 160 px, chữ 30 px. Chữ cao hơn khung nên khi căn giữa thì tràn lên trên.
- Sửa đơn giản:
  - thu cỡ chữ cho vừa khung, sàn 24 px;
  - căn giữa an toàn (`align-items: safe center` hoặc tương đương).
  Không đổi vị trí/kích thước khung.
- Test bắt buộc (E2E): chạy **mọi câu APPROVED** trong fixtures và trong DB thật nếu test đọc được (không ghi DB). Đo bbox chữ bằng Range trên text node trong khung:
  - cách mép trên/dưới ≥ 8 px;
  - lệch khoảng trên – khoảng dưới ≤ 4 px;
  - không tràn (scrollHeight ≤ clientHeight).
- Báo cáo `report:question-length` thêm cột kết quả căn giữa (đạt / không).
- Ảnh (không commit): demo-004, câu dài nhất, câu ngắn nhất, chụp full + phóng to khung câu hỏi.

## C. Top 3 nhanh nhất bị cắt chữ khi ≥ 10 giây (mục 9)
- Live hiện "10,3 giâ", "11,2 giâ". Test C-0379 chỉ thử 0,9–3,5 s.
- Sửa ở `questionTop3Presentation.ts` / CSS khung Top 3: cột giây đủ rộng cho "99,9 giây"; tên co cỡ chữ (sàn 15 px) hoặc xuống 2 dòng trước. Không cắt chữ, không "…".
- Khung giữ x 740→998 như C-0379; khoảng cách với ngai/nhãn NGAI VÀNG như C-0379.
- Thêm ca test: 10,3 s; 15,0 s; 19,9 s; tên 24 ký tự + 19,9 s cả 3 dòng. Kiểm tra scrollWidth ≤ clientWidth cho từng ô.

## D. Lưu @tài khoản người chơi + bảng "Người thắng" trên Dashboard (mục 10)
- `packages/live-adapters/src/tiktok.ts:~70` đang bỏ `user.uniqueId`. Giữ lại, truyền qua comment event (trường tuỳ chọn) và lưu vào bảng `players` (cột mới `unique_id`, migration drizzle; cập nhật khi đổi).
- Dashboard thêm trang/bảng "Người thắng" cho mọi vòng của phiên hiện tại và các phiên cũ. Mỗi dòng gồm:
  - vòng, giờ kết thúc;
  - hạng 1–3;
  - tên hiển thị, @tài khoản, mã TikTok (userId);
  - điểm, số câu đúng;
  - nút mở `https://www.tiktok.com/@<uniqueId>`, và dự phòng `https://www.tiktok.com/share/user/<userId>` khi thiếu uniqueId.
- Quyền riêng tư:
  - chỉ hiện trên Dashboard (cần token admin), **KHÔNG hiện lên overlay**;
  - không ghi uniqueId vào log thô hay snapshot public;
  - privacy:check phải đạt (thêm luật kiểm nếu cần).
- Test:
  - adapter giữ uniqueId;
  - migration chạy trên DB cũ (người chơi cũ unique_id null → nút dự phòng);
  - API người thắng cần token;
  - public state/overlay không chứa uniqueId.

## Kiểm tra trước khi báo xong
- Gộp origin/main mới nhất.
- typecheck, privacy:check, vitest unit + integration.
- **Toàn bộ** Playwright 2 lượt: asset thật và `QUIZ_ASSETS_DIR=fixtures/assets-placeholder`. Báo số passed/failed từng lượt, cả hai 0 failed.
- Ảnh duyệt chỉ đặt ở `assets-local/review/c-sau-live-ui/` (ignore, KHÔNG commit), báo đường dẫn tuyệt đối. Gồm:
  - B: như trên;
  - C: Top 3 với 10,3 / 19,9 s và tên 24 ký tự, chụp full + phóng to;
  - D: bảng Người thắng;
  - A: dòng ghế 30/30.

## Bàn giao
- Push nhánh `codex2/c-sau-live-ui`, báo commit từng việc, file:dòng, số đo bbox thật cho B và C.
- ACK khi bắt đầu.
