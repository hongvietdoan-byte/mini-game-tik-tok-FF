---
id: C-0268
from: coordinator
to: codex1
type: task
title: Tự chờ giọng câu 1 khi bấm Bắt đầu vòng (tối đa 30 s)
ref: 
priority: normal
needs: 
created: 2026-11-17T22:28:38+07:00
---
## Bối cảnh (phân tích live thật 17/11)
Câu 1 của vòng không có giọng MC khi operator bấm "Bắt đầu vòng" quá sớm sau "Mở sảnh" (phiên 21:11: sảnh chỉ ~10 s, READING câu 1 rơi về fallback 5 s, không có cue QUESTION). Hiện operator phải tự "đợi 30 giây" — người dùng muốn bỏ bước tay này.

## Việc cần làm (codex1, xếp sau C-0259/C-0267 và trước C-0262)
1. Khi nhận START_ROUND (bấm tay hoặc Auto) mà phiên bật `mcVoiceEnabled` và giọng câu 1 (bundle đọc câu hỏi + đáp án đã xáo của vòng này) **chưa sẵn sàng**: không vào PREPARE ngay; chờ tới khi sẵn sàng, tối đa 30 s (cấu hình được), rồi tự bắt đầu. Hết 30 s vẫn chưa có → bắt đầu bình thường (fallback như cũ) và ghi telemetry.
2. Trong lúc chờ: state vẫn LOBBY (hoặc trạng thái phụ "Đang chuẩn bị giọng câu 1"), Dashboard hiện dòng trạng thái + đếm giây; overlay giữ sảnh, MC bubble kiểu "Chuẩn bị vào trận…". Operator có nút "Bắt đầu ngay" (bỏ chờ).
3. Lệnh STOP/PAUSE trong lúc chờ phải huỷ việc chờ sạch sẽ. Không gọi sinh giọng thật trong test (mock provider).
4. Tương tự áp dụng cho Auto mode (lobby timer hết → chờ giọng câu 1).

## Tiêu chí xong
- Test: START_ROUND khi giọng chưa sẵn sàng → chờ, sẵn sàng thì vào PREPARE; quá 30 s → vào PREPARE với fallback; "Bắt đầu ngay" bỏ chờ; STOP huỷ chờ.
- typecheck, test, privacy, e2e dashboard PASS. Nhánh `codex1/c-wait-q1-voice`.
