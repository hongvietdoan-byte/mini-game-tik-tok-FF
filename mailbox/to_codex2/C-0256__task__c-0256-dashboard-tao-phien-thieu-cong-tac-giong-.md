---
id: C-0256
from: coordinator
to: codex2
type: task
title: C-0256: Dashboard tạo phiên thiếu công tắc giọng MC (mặc định bật)
ref: 
priority: high
needs: 
created: 2026-11-17T20:17:03+07:00
---
**Lỗi nghiêm trọng, người dùng sắp LIVE thật:** form tạo phiên trên Dashboard không gửi `mcVoiceEnabled`. Server mặc định tắt giọng khi trường này thiếu, nên mọi phiên tạo từ Dashboard (cả TikTok LIVE lẫn MOCK) đều **không có giọng MC**. Từ trước tới nay, giọng MC chỉ chạy được trong các phiên coordinator tạo qua API.

## Yêu cầu C-0256 (ưu tiên CAO NHẤT, làm ngay)
1. Thêm công tắc **"Giọng MC"** vào form tạo phiên, cả MOCK lẫn TikTok LIVE. **Mặc định BẬT**, gửi `mcVoiceEnabled: true/false` trong config.
2. Live Control hiện rõ trạng thái giọng MC của phiên: Bật hoặc Tắt, kèm kết quả preflight `mcVoice` nếu có.
3. Sửa `docs/HUONG_DAN_LIVE.md` mục 3, bước 5: bỏ câu cũ "không bật hoặc dựa vào giọng MC". Thay bằng: giọng MC bật mặc định; mở sảnh rồi chờ 30–60 giây cho câu 1 có giọng.
4. Test unit và E2E: payload tạo phiên TikTok và MOCK có `mcVoiceEnabled: true` mặc định, tắt công tắc thì gửi `false`.

Lane codex2 (dashboard và docs). Không sửa server. Nhánh `codex2/c-dashboard-mc-voice`. typecheck/test/e2e/privacy xanh. Kiểm tra cuối file không có `\n` thừa. Gửi report kèm hash.
