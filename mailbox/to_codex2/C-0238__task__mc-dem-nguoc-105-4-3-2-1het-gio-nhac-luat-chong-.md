---
id: C-0238
from: coordinator
to: codex2
type: task
title: MC: đếm ngược 10→5-4-3-2-1→Hết giờ, nhắc luật chống spam câu 2/5/8, bảng phát âm + rà từ viết tắt
ref: 
priority: high
needs: 
created: 2026-11-17T00:39:04+07:00
---
## Bối cảnh
Người dùng chạy thử MOCK có giọng MC 16/11 và chốt 3 thay đổi lời MC. Mở ngoại lệ lane server cho codex2 riêng ticket này: được sửa `apps/server/src/runtime.ts` (chỉ các hàm giọng MC: `preGenerateGenericVoice`, `maybeSpeakCountdown`, `generateRoundVoice`, lịch cue), `apps/server/src/voice/*`, `packages/contracts` (sự kiện giọng MC), overlay nếu cần, và test. **Codex1 đang sửa đường nhận bình luận/simulator trong `runtime.ts` (C-0237)** — không động vào ingest/simulator/audience, giữ diff nhỏ để gộp không xung đột.

## 1. Đếm ngược (người dùng chốt)
Bỏ kiểu hiện tại ("Còn X giây, hãy chốt đáp án!" ở 10/5/3/2/1 — câu dài chồng lên nhau). Thay bằng:
- Lúc còn 10 giây: MC nói "Còn 10 giây!" (một lần).
- Rồi đếm ngược từng giây: "Năm" (5 s), "Bốn", "Ba", "Hai", "Một" — mỗi từ phát đúng giây của nó, không chồng nhau (từ ngắn, nếu từ trước chưa hết thì bỏ từ sau chứ không xếp hàng lệch giờ).
- Hết giờ (vào REVEAL/TIMEOUT): "Hết giờ!".
- Các câu này là lời chung, sinh 1 lần rồi dùng cache cho mọi câu (sinh trước ở LOBBY cùng WELCOME). Tiếng tick hiệu ứng vẫn giữ; giảm ducking hợp lý để số đếm nghe rõ.

## 2. Nhắc luật chống spam (người dùng chốt câu thoại)
"Nhắc nhẹ nè: mỗi người chỉ một đáp án, bình luận đầu tiên mới được tính nhé!"
- Phát ở câu 2, 5, 8 của mỗi vòng (mỗi 3 câu, bắt đầu từ câu 2), ngay lúc vừa mở nhận đáp án (ACCEPTING), trước mốc "Còn 10 giây". Không đè lên lời đọc câu hỏi/đáp án còn đang phát (chờ voiceTail như các cue khác; nếu trễ quá ~4 s thì bỏ lượt đó).
- Lời chung, cache một lần. Hiển thị bong bóng MC tương ứng nếu overlay đang có cơ chế bong bóng cho cue (giữ đúng bố cục đã duyệt).

## 3. Phát âm — cơ chế từ điển + rà soát
- Thêm bảng phát âm chỉ áp dụng cho TEXT GỬI ĐI SINH GIỌNG (không đổi chữ hiển thị trên màn). File cấu hình cục bộ `data/mc-pronunciation.json` (gitignore) + mẫu rỗng/ví dụ trong repo (`fixtures/` hoặc `docs/`); thay thế theo từ nguyên vẹn (word boundary, không phân biệt hoa thường khi khai báo như vậy). Đổi bảng → khoá cache đổi theo text đã thay, KHÔNG nâng `MC_VOICE_POLICY_VERSION` (tránh sinh lại toàn bộ).
- Rà toàn bộ câu hỏi đã duyệt (APPROVED, không DEMO) + lời MC chung: liệt kê từ viết tắt, tiếng Anh, chữ+số (BO5, FF, MVP, rank, skin, v.v.), đơn vị/ký hiệu. Xuất danh sách ra `assets-local/review/1117-phat-am/danh-sach-tu.md` (KHÔNG commit) gồm: từ, số lần xuất hiện, ví dụ câu, đề xuất cách đọc tiếng Việt. Người dùng sẽ chọn cách đọc rồi mới điền vào bảng. Trong thư report chỉ ghi tóm tắt số lượng + vài ví dụ (repo public).

## Ràng buộc
- KHÔNG chạy sinh giọng thật (tốn lượt) — chỉ mock. Không ghi thông số profile giọng vào repo/thư.
- Nhánh `codex2/c-mc-countdown-reminder` từ main mới nhất. typecheck + test + e2e (có và không `QUIZ_ASSETS_DIR=fixtures/assets-placeholder`) + privacy xanh, dọn `.tmp-test`. Push, report kèm hash + số câu giọng chung mới cần sinh.
