---
id: C-0378
from: coordinator
to: codex2
type: task
title: Sửa khung MC NHANH NHẤT bị ngai vàng che (phương án A)
ref: 
priority: high
needs: 
created: 2026-11-21T06:47:09+07:00
---
# Sửa khung MC "NHANH NHẤT" bị ngai vàng che (người dùng chọn phương án A, 21/11)

## Lỗi
Trong mock thật ngày 20/11 (khổ 1080×1920), pha REVEAL và LEADERBOARD: khung lời MC chứa dòng "NHANH NHẤT <tên> <giây>" giãn ngang từ x 412 đến 1008 (rộng 596), chui xuống dưới ngai vàng nên tên người chơi bị che.
- Ngai vàng, kể cả người ngồi: x 372→708, y 835→1175.
- Khung MC lúc hỏi (đúng): x 740→998, y 847→990, rộng 258.
- Nhãn "NGAI VÀNG": mép trên khoảng y 1020.

## 1. Số đo bắt buộc
- Ở REVEAL và LEADERBOARD, khung MC giữ đúng vị trí và độ rộng như lúc hỏi: x 740→998, rộng 258. Không giãn sang trái.
- Nội dung xếp 3 dòng: "NHANH NHẤT" / tên người chơi / thời gian (ví dụ "0,9 giây").
- Viền trong ≥ 8 px ở mọi cạnh.

## 2. Khoảng cách
- Mép trái khung cách bbox ngai (kể cả người ngồi) ≥ 24 px.
- Khung được cao thêm xuống dưới, nhưng mép dưới phải cách mép trên nhãn "NGAI VÀNG" ≥ 16 px. Không đủ chỗ thì thu cỡ chữ, không tràn.
- Không dời, không đổi kích thước bất kỳ khung nào khác (bố cục chuẩn ảnh mẫu 14/11).

## 3. Ca biên
- Tên 1 ký tự, tên 12 ký tự, tên 24 ký tự (có dấu tiếng Việt và emoji): tên dài xuống tối đa 2 dòng rồi giảm cỡ chữ. Không cắt chữ, không dấu "…".
- Ngai trống và ngai có người.
- Cả REVEAL và LEADERBOARD.
- Không có ai trả lời đúng (không có dòng NHANH NHẤT): khung vẫn đúng vị trí cũ.
- Theme mặc định và một theme có font khác: số đo vẫn đạt.

## 4. Test
- Thêm E2E đo bbox thật (getBoundingClientRect) của khung MC, ngai và nhãn "NGAI VÀNG" cho mọi ca trên. Khẳng định: không chồng nhau, các khoảng cách ở mục 2, chữ không tràn (scrollWidth ≤ clientWidth, scrollHeight ≤ clientHeight).
- Không nới timeout của test khác.

## 5. Chạy kiểm tra
- Gộp origin/main mới nhất vào nhánh trước khi báo xong.
- typecheck, privacy:check, vitest unit + integration.
- Full E2E 2 lượt: asset thật và `QUIZ_ASSETS_DIR=fixtures/assets-placeholder`, cả hai 0 failed.

## 6. Bàn giao
- Nhánh `codex2/c-nhanh-nhat-bubble`.
- Ảnh chụp REVEAL và LEADERBOARD với tên 24 ký tự (ngai trống và có người) đặt ở `assets-local/review/` (thư mục ignore, KHÔNG commit ảnh). Ghi đường dẫn ảnh trong thư báo xong.
- Báo kèm số đo bbox thật của từng ca.
- ACK thư này khi bắt đầu.
