---
id: C-0335
from: coordinator
to: codex1
type: task
title: Ưu tiên chủ đề sự kiện (FFA 2026, FFWS, Đấu Trường Bão Tố) khi chọn câu
ref: C-0335
priority: normal
needs: 
created: 2026-11-19T19:53:35+07:00
---
Người dùng 19/11: khi chọn câu cho mỗi vòng, **ưu tiên câu thuộc các chủ đề sự kiện đang diễn ra** (FFA 2026, FFWS / Đấu Trường Bão Tố, ...). Kho hiện có chủ đề "FFA 2026" (33 câu, vừa duyệt) và "FFWS" (40 câu); chủ đề "Đấu Trường Bão Tố" sẽ thêm sau.

## Yêu cầu
1. Cấu hình mới (lưu bền, sửa được trên Dashboard, không cần khởi động lại):
   - `priorityTopicNames: string[]` — so khớp **tên** chủ đề (subtopic name), không phân biệt hoa thường/khoảng trắng. Mặc định: `["FFA 2026", "FFWS", "Đấu Trường Bão Tố"]` (tên chưa có trong kho thì bỏ qua, không lỗi).
   - `priorityShare` 0–1, mặc định 0.6 = khoảng 60% số câu của vòng lấy từ chủ đề ưu tiên.
   - Dashboard: 1 ô danh sách chủ đề ưu tiên (chọn từ chủ đề đang có + gõ tên) và 1 thanh/ô tỉ lệ. Gọn, theo quy tắc thiết kế đã giao (C-0307).
2. `packages/quiz-core/src/selection.ts` `selectRound` (cả DIFFICULTY và RANDOM):
   - Vẫn giữ nguyên kế hoạch độ khó (planDifficultyCounts), seed tất định, không lặp câu trong phiên.
   - Trong từng mức độ khó: lấy câu **chưa dùng** thuộc chủ đề ưu tiên trước, tới hạn mức ≈ round(priorityShare × số câu mức đó) (cộng dồn sao cho tổng cả vòng ≈ priorityShare × count); phần còn lại lấy từ chủ đề khác.
   - Chủ đề khác thiếu thì bù bằng câu ưu tiên; câu ưu tiên thiếu thì bù bằng câu khác. Không vì ưu tiên mà dùng lại câu đã dùng khi còn câu chưa dùng.
   - Xếp thứ tự câu như cũ (EASY → MEDIUM → HARD, xáo trong nhóm), câu ưu tiên không dồn cục ở đầu/cuối.
   - Ghi log/diagnostics số câu ưu tiên đã chọn mỗi vòng (vd. "ưu tiên 9/15").
3. Test vitest: tỉ lệ đúng khi đủ câu; thiếu câu ưu tiên; thiếu câu thường; danh sách rỗng hoặc share=0 → hành vi y như cũ (so seed cũ ra cùng kết quả); tên chủ đề không tồn tại; tất định theo seed.
4. Không đụng `data/quiz.db` trong test. Chạy typecheck, vitest, privacy, e2e cục bộ trước khi báo.

Báo lại coordinator kèm nhánh + kết quả kiểm tra.
