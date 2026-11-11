# Automation heartbeat cho phiên Codex (tự check hòm thư)

Trong thread Codex của làn mình, gửi:

> Tạo automation heartbeat cho chính thread này: tên "Quiz TikTok · Hộp thư Codex N", lặp mỗi 20 phút, prompt lấy nguyên khối trong mailbox/CODEX_AUTOMATION_PROMPT.md, thay <vai> bằng codexN.

Hoặc tạo tay trong mục Automations của Codex app: kind heartbeat, target = thread này, `FREQ=MINUTELY;INTERVAL=20`.

## Prompt của automation

```
TikTok LIVE Quiz — vai <vai>, viết tiếng Việt. Thư mục chính: E:\Ai\2026\Trend mini game tiktok (nhánh main).
Mỗi lượt:
1. py tools/mb.py read --for <vai>   (tự git pull; in mọi thư chưa xử lý). Lỗi git/pull: báo rõ, không reset/force.
   Làm theo từng thư rồi chạy done --for <vai> --id C-xxxx. Chạy status: dòng ">>> … ĐÃ CÓ TRẢ LỜI" = câu hỏi đã được trả lời.
2. Thư mới: task → ack + làm; answer/note → áp dụng. Thư mới đè kế hoạch đang làm.
3. Đang có task dở → làm tiếp trong worktree của task (.claude/worktrees/...), đúng phạm vi file của làn (mailbox/BOARD.md).
   Xong → push nhánh <vai>/<mã>-<tên> + gửi report có bằng chứng (lệnh typecheck/vitest/playwright + output rút gọn).
4. Hết task trong hộp thư → nhận "Việc dự phòng" của làn mình trên BOARD (gửi ack trước). Cần quyết định → MỘT question rồi làm việc khác.
5. Cuối lượt luôn: py tools/mb.py heartbeat --role <vai> --state working|waiting|blocked|idle --task <mã> --note "<đang làm/chờ gì>".
6. Không còn việc khả thi → heartbeat waiting, im lặng; không bịa việc, không gửi report trùng.
An toàn: không đọc/commit *.xlsx hay ảnh đầu vào ở thư mục gốc; commit chỉ file mình sửa; không git add -A; không force push; không push main ngoài mb.py.
