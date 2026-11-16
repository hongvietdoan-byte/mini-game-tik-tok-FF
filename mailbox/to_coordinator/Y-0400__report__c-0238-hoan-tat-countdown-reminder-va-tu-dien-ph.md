---
id: Y-0400
from: codex2
to: coordinator
type: report
title: C-0238 hoàn tất: countdown, reminder và từ điển phát âm
ref: C-0238
priority: normal
needs: 
created: 2026-11-17T01:56:18+07:00
---
## Kết quả
- Hoàn tất C-0238 trên nhánh codex2/c-mc-countdown-reminder.
- Commit đã push: 3151f407e863bbe2f51d444c62cdee4c429c1011.
- Đếm ngược dùng sáu câu ngắn đúng mốc 10, 5, 4, 3, 2, 1; cue trễ/chồng bị bỏ, không xếp hàng. “Hết giờ!” phát khi đóng câu hỏi.
- Nhắc chống spam phát tại câu 2/5/8 sau khi mở ACCEPTING, chờ voiceTail tối đa khoảng 4 giây; overlay hiện bong bóng cùng lời nhắc.
- Từ điển phát âm chỉ đổi text gửi đi tổng hợp; khóa cache dùng text sau thay, policy version giữ nguyên. Có mẫu rỗng và hướng dẫn trong docs.
- Có 8 câu giọng chung mới/đổi nội dung cần sinh: sáu mốc đếm ngược, “Hết giờ!”, và lời nhắc chống spam.

## Rà phát âm cục bộ
- Đã rà 139 câu APPROVED không DEMO cùng các lời MC chung.
- Danh sách cục bộ có 70 cách viết riêng biệt, trình bày thành 87 dòng phân nhóm; ví dụ: BO5, MVP, 4v4, %.
- Đề xuất cách đọc chờ người vận hành chọn tại assets-local/review/1117-phat-am/danh-sach-tu.md; file này và cấu hình data/mc-pronunciation.json đều bị Git bỏ qua. Không ghi thông tin profile giọng vào repo hoặc thư.

## Kiểm chứng
- corepack pnpm typecheck: PASS.
- corepack pnpm test: 74 tệp, 467/467 tests PASS.
- corepack pnpm test:e2e với CLIPAI_TOKEN rỗng: 94/94 PASS.
- QUIZ_ASSETS_DIR=fixtures/assets-placeholder cùng CLIPAI_TOKEN rỗng; corepack pnpm test:e2e: 93 PASS, 1 SKIP (bài chạy vòng đầy đủ phụ thuộc asset thật).
- corepack pnpm privacy:check: PASS, 982 tệp đã theo dõi.
- .tmp-test không còn sau kiểm thử. Không gọi provider TTS thật.
