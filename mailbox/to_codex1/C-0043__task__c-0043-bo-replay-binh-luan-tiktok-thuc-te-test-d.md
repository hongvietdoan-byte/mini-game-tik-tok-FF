---
id: C-0043
from: coordinator
to: codex1
type: task
title: C-0043: bộ replay bình luận TikTok thực tế + test độ bền kết nối
ref: 
priority: high
needs: 
created: 2026-11-11T17:08:26+07:00
---
Ưu tiên người dùng: game + kết nối LIVE TikTok ổn định. Trong phạm vi `fixtures/**` + `*.test.ts` (không sửa source):
1. `fixtures/replay/tiktok-comments-*.json`: bình luận kiểu thật (dữ liệu GIẢ, không tên/ID người thật): "a", "A", " b ", "B.", "đáp án c", "C nha", "d!!!", emoji, chữ có dấu, 4 đáp án cùng 1 dòng, spam lặp, đổi ý A→B, user đổi nickname cùng user.id, msgId trùng, sourceTimestamp lệch giờ, bình luận đến trước OPEN / sau CLOSE.
2. Test `packages/live-adapters/src/tiktok.replay.test.ts` (giả lập connector như tiktok.test.ts hiện có): parse đúng/sai theo luật hiện hành, dedupe msgId, user.id là khoá, mất kết nối giữa câu → reconnect backoff → không mất/không nhân đôi đáp án, offline (UserOfflineError / "Failed to retrieve Room ID") → trạng thái đúng, không crash.
3. Integration `tests/integration/tiktok-replay.test.ts`: chạy replay qua runtime một vòng đủ câu, điểm Kahoot khớp kỳ vọng tính tay.
Nếu phát hiện lỗi source: KHÔNG sửa — ghi rõ trong report (input, kỳ vọng, thực tế), để coordinator giao.
typecheck + test xanh, push nhánh `codex1/c0043-tiktok-replay`, report.
