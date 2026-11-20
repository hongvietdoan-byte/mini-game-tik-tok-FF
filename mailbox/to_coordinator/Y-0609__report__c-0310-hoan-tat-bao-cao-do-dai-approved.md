---
id: Y-0609
from: codex2
to: coordinator
type: report
title: C-0310 hoàn tất: báo cáo độ dài APPROVED
ref: C-0310
priority: high
needs: 
created: 2026-11-20T16:34:41+07:00
---
C-0310 đã hoàn tất. Nhánh `codex2/c-0310-question-length` đã push (commit `32279b49`), đã cập nhật từ `origin/main` mới nhất trước khi báo. Chỉ sửa `package.json`, `tools/report-question-length.ts`, test/config trong `tools/` và `docs/QUESTION_LENGTH_REPORT.md`; `tests/e2e/` không đổi.

Báo cáo đầy đủ: `E:\Ai\2026\Trend mini game tiktok\.claude\worktrees\c-0310-question-length\.claude\review\C0310\question-length-report.md` (JSON cùng thư mục). Ảnh kiểm dấu DPR 3: `E:\Ai\2026\Trend mini game tiktok\.claude\worktrees\c-0310-question-length\test-results\c0310\glyph-*.png`.

Kết quả: 186 câu APPROVED; prompt clamp 0; cỡ prompt dưới 30 px: 50; ước lượng đọc trên 20 giây: 2; 4/744 slot đáp án cắt nội dung. Tách riêng line-box: 744/744 có chênh scrollHeight; 740 chỉ tràn hình học, 4 trùng các đáp án bị cắt; selector `.v3-option-text`, mức chênh line-box-only 2–16 px. So Range bbox với content box và xem phóng 3× năm đáp án có `ẫ`, `ặ`, `ạ`: bbox Range lấn 3 px ở một số cạnh nhưng dấu trên/dấu dưới đều thấy nguyên vẹn trong ảnh. Kết luận: **chỉ tràn hình học, không mất pixel**.

Năm mục ưu tiên kèm đề xuất (tất cả đều ghi “ĐỀ XUẤT — chờ người dùng duyệt” trong báo cáo):
1. “Trong giao tiếp của trò chơi, từ ‘squad’ thường chỉ điều gì khi người chơi cùng nhau tham gia một trận?” → “Trong Free Fire, ‘squad’ là nhóm người chơi nào trong trận?”; rút gọn đáp án C/D thành “Nhóm vật phẩm trong hành trang” / “Nhóm nhân vật trong bộ sưu tập”.
2. “Đặc điểm nào mô tả đúng nhịp trận của Clash Squad trong Free Fire?” → “Clash Squad có nhịp trận thế nào?”; rút gọn đáp án C/D thành “Bài tập ngắm bắn không phân thắng thua” / “Nhiều vòng giao tranh nối tiếp giữa hai đội”.
3. “Trong Clash Squad, người chơi dùng khu vực mua sắm trong trận để chọn vũ khí và trang bị cho vòng đấu. Khu vực đó thường được gọi là gì?” → “Trong Clash Squad, cửa hàng mua vũ khí và trang bị cho từng vòng gọi là gì?”
4. “Chế độ nào của Free Fire được tổ chức thành các vòng giao tranh giữa hai đội, thay vì một trận Battle Royale kéo dài trên bản đồ rộng?” → “Chế độ nào có nhiều vòng giao tranh giữa hai đội, thay vì một trận Battle Royale dài trên bản đồ rộng?”
5. “Khi một cơ chế trong trận đưa người đồng đội đã bị loại trở lại cuộc đấu, hành động đó thường được gọi bằng thuật ngữ nào?” → “Đồng đội bị loại trở lại trận nhờ hành động nào?”

Kiểm tra:
- `corepack pnpm report:question-length --json`: PASS; 186 câu, 0 clamp, 50 chữ nhỏ, 2 câu >20 giây, 4 đáp án cắt.
- `corepack pnpm test:question-length`: PASS, 4 tests.
- `corepack pnpm typecheck`: PASS.
- `corepack pnpm privacy:check`: PASS (1404 tệp).
- `corepack pnpm test`: 619 passed, 5 failed, 1 worker timeout. Chạy lại tập trung 5 test lỗi: 4 pass; còn một lỗi trong `apps/server/src/voice/mc-chat.test.ts` (test MC chat cuối vòng). Tệp này nằm ngoài phạm vi được giao và không bị sửa.
