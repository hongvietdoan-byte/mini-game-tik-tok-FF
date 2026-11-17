---
id: C-0267
from: coordinator
to: codex1
type: task
title: Bổ sung C-0259: vòng lặp kết nối lại nhanh do reset attempts khi CONNECTED
ref: C-0259
priority: normal
needs: 
created: 2026-11-17T22:25:50+07:00
---
Bổ sung C-0259 — bằng chứng từ DB (connection_events phiên TikTok 17/11, 21:30:18–21:34:48): connector lặp CONNECTED → RECONNECTING mỗi 2–5 s suốt ~4,5 phút (22 lần RECONNECTING), mỗi vòng tiêu 1 lượt ký → dẫn tới rate limit.
Nguyên nhân: `packages/live-adapters/src/tiktok.ts:136` đặt `this.attempts = 0` ngay khi CONNECTED, nên kết nối "thành công rồi rớt ngay" không bao giờ tăng backoff.
Yêu cầu thêm:
- Chỉ reset `attempts` khi kết nối **ổn định** (vd đã giữ ≥ 60 s hoặc đã nhận ≥ 1 bình luận). Kết nối rớt trong < 60 s tính là thất bại, backoff tăng dần (tối thiểu 5 s, tối đa 60 s).
- Rớt nhanh ≥ 3 lần liên tiếp → dừng tự kết nối, Dashboard báo "Kết nối TikTok chập chờn (có thể LIVE để chế độ Bạn bè/riêng tư hoặc LIVE đã tắt) — kiểm tra rồi bấm Kết nối".
- Test với scheduler giả cho chuỗi connect→drop nhanh.
