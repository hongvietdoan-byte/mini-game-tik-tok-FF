---
id: C-0379
from: coordinator
to: codex2
type: task
title: C-0379: Top 3 nhanh nhất trên overlay thật + ảnh MC không hở
ref: C-0378
priority: high
needs: 
created: 2026-11-21T11:54:35+07:00
---
# C-0379: Top 3 nhanh nhất trên overlay thật + ảnh MC không hở (làm tiếp trên nhánh C-0378)

Người dùng duyệt 21/11. Làm tiếp trên nhánh `codex2/c-nhanh-nhat-bubble` (chưa gộp main), để người dùng chỉ duyệt ảnh 1 lần.

## Việc 1 — Top 3 nhanh nhất mỗi câu trên overlay thật
Bối cảnh: server đã gửi `questionTop3` ở REVEAL/LEADERBOARD (runtime.ts ~3134), mẫu đã duyệt ở C-0307/C-0314/C-0327, nhưng `ArenaStage.tsx` vẫn chỉ hiện 1 người (`fastestCorrectAnswer`). Giờ đưa Top 3 vào đúng khung MC của C-0378.

### 1. Số đo
- Khung giữ x 740→998 (rộng 258), như C-0378. Không giãn sang trái.
- Người dùng yêu cầu: **dùng cỡ chữ nhỏ để có nhiều chỗ hiện tên.** Gợi ý: tiêu đề "TOP 3 NHANH NHẤT" 18 px; mỗi dòng: hạng | tên | giây, chữ 20 px, cao dòng 30 px, khoảng giữa dòng 4 px. Giây dùng tabular nums, căn phải.
- Viền trong ≥ 8 px.

### 2. Khoảng cách
- Cách bbox ngai (kể cả người ngồi) ≥ 24 px.
- Đáy khung cách mép trên nhãn "NGAI VÀNG" ≥ 16 px.
- Nếu không đủ cao: được nâng mép trên khung lên, nhưng cách đáy khung 4 đáp án ≥ 24 px. Không dời/đổi khung nào khác.

### 3. Ca biên
- 0 người đúng: "Chưa có người trả lời đúng". 1, 2, 3 người: hiện đúng số người.
- Đồng hạng (cùng ms): cùng số hạng, cùng kiểu nhấn. Nhóm đồng hạng > 3: 3 dòng + dòng "+X người đồng hạng".
- Tên 1 / 12 / 24 grapheme (dấu tiếng Việt + emoji), cả 3 dòng cùng tên 24 ký tự: mỗi dòng 1 dòng chữ, thu cỡ chữ tới tối thiểu 15 px; vẫn không vừa thì dòng đó xuống 2 dòng. Không cắt chữ, không "…".
- Ngai trống / có người; REVEAL và LEADERBOARD; theme mặc định và theme font khác.
- Câu bị huỷ: không có Top 3, khung về như lúc hỏi.
- Giữ `fastestCorrectAnswer` làm dự phòng khi `questionTop3` null (server cũ).

## Việc 2 — ảnh MC bị cắt ngắn, hở với khung tên "MC KELLY"
Hiện tại (ảnh c-0378 reveal-held, 1080×1920): ảnh MC kết thúc khoảng y ≈ 985 (cắt ngang vai áo), khung tên "MC KELLY" bắt đầu y ≈ 1013 → hở ~28 px lộ nền sân. Ảnh mẫu 14/11 (`assets-local/review/mau-nguoi-dung/mau-1114.png`): thân MC chạy xuống **khuất sau** khung tên, không có khe hở.
- Sửa: ảnh MC kéo dài xuống (đổi chiều cao/crop/object-position, không phóng to mặt), đáy ảnh nằm **dưới** mép trên khung tên ≥ 12 px; khung tên đè lên trên (z-index cao hơn). Không dời khung tên, không đổi vị trí đầu/mặt MC (lệch ≤ 4 px).
- Đo bằng DOM: mép trên khung tên − đáy phần ảnh MC hiển thị ≤ −12 px. Kiểm tra cả ảnh MC động/từng khung (nếu theme có dãy ảnh MC) và ở mọi pha (LOBBY, QUESTION, REVEAL, LEADERBOARD).
- Nếu file ảnh MC gốc bị cắt sẵn, không đủ chiều cao: dừng và báo coordinator kèm kích thước ảnh, không tự vẽ thêm.

## 4. Test
- E2E bbox: khung Top 3 không chồng ngai, nhãn NGAI VÀNG, khung đáp án; khoảng cách như mục 2; scrollWidth/Height ≤ client cho từng dòng.
- E2E: MC ảnh chồng dưới khung tên ≥ 12 px, khung tên ở trên.
- Unit/component test các ca 0/1/2/3 người, đồng hạng, +X.

## 5. Chạy kiểm tra
- Gộp origin/main mới nhất trước khi báo xong. typecheck, privacy:check, vitest unit + integration, full E2E 2 lượt (asset thật và placeholder), 0 failed.

## 6. Bàn giao
- Push cùng nhánh `codex2/c-nhanh-nhat-bubble`.
- Ảnh (không commit) vào `assets-local/review/c-0379/`: REVEAL 3 người tên ngắn; REVEAL 3 người cùng tên 24 ký tự; đồng hạng +X; 0 người; LEADERBOARD ngai có người; vùng MC phóng to. Mỗi cảnh ảnh full + ảnh zoom vùng ngai/MC.
- Báo số đo bbox thật từng ca và cỡ chữ cuối cùng mỗi ca. ACK khi bắt đầu.
