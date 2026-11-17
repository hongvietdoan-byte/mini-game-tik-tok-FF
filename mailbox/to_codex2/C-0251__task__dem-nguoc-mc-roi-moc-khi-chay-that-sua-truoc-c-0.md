---
id: C-0251
from: coordinator
to: codex2
type: task
title: Đếm ngược MC rơi mốc khi chạy thật — sửa trước C-0250
ref: 
priority: high
needs: 
created: 2026-11-17T16:37:01+07:00
---
## Lỗi phát hiện khi diễn tập thật (17/11, MOCK 15 câu, 5.000 người giả lập, giọng thật)
Đếm ngược C-0238 **rơi phần lớn các mốc**. Thống kê theo log WS: mỗi câu chỉ phát 1–3 trong 6 mốc, và rơi ngẫu nhiên. Ví dụ:
- Q4: chỉ có "Ba"
- Q9: chỉ có "Một"
- Q1: có "Năm", "Bốn", "Một"; thiếu "Còn 10 giây!", "Ba", "Hai"

Asset lúc đó đã nằm trong cache (từ câu 2 trở đi), nên đây không phải lỗi sinh giọng chậm.

Nghi vấn trong `schedulePreciseVoiceCue` (`apps/server/src/runtime.ts`):
1. `firedAt > startsAtServerMs - 20` → bỏ cue. Ngưỡng này chỉ chịu được timer trễ ≤60 ms (gửi lúc −80 ms). Khi chạy 5.000 người, event loop dễ trễ hơn thế, nên cue bị bỏ.
2. `voiceTailAtMs > startsAtServerMs` → bỏ cue. Một số asset số đếm dài bất thường: "Ba" ≈1281 ms, "Còn 10 giây!" ≈1040 ms, trong khi "Bốn" 436 ms và "Một" 329 ms. Vì vậy tail của câu trước chặn mốc kế tiếp. Lời nhắc spam hay câu reveal cũng có thể chặn.

## Yêu cầu (C-0251, ưu tiên cao, làm TRƯỚC C-0250)
- Đếm ngược phải phát đủ **6/6 mốc** khi asset có sẵn, kể cả khi event loop trễ 100–300 ms.
  - Gửi sớm hơn (ví dụ 300 ms) và nới ngưỡng trễ.
  - Trễ quá khoảng 400 ms so với mốc thì mới bỏ.
- Mốc đếm ngược được **cắt ngang tail của mốc đếm ngược trước** (không bị chặn bởi chính chuỗi đếm). Overlay dừng cue đếm trước khi phát cue mới; kiểm tra overlay đã làm vậy chưa, cần thì sửa.
- Với giọng khác (reveal, nhắc luật):
  - Mốc "Còn 10 giây!" ưu tiên hơn đoạn cuối lời nhắc.
  - Lời nhắc ở câu 2/5/8 phải xong trước mốc 10 s; nếu không kịp thì bỏ lời nhắc chứ không bỏ đếm ngược.
- Tìm hiểu vì sao "Ba" dài khoảng 1,28 s. Có thể do đệm lặng hoặc bộ lọc chuẩn hoá chưa cắt lặng cuối với câu một từ. Asset số đếm nên ≤600 ms; cắt lặng đầu/cuối là đủ, **không sinh lại giọng thật** (tốn lượt).
- Test có timer trễ giả lập (scheduler jitter 0–300 ms) và asset có độ dài thật như trên; phát đủ 6 mốc, không chồng tiếng.
- Không đổi luật chơi hay thời gian câu hỏi.

typecheck, test, e2e và privacy phải xanh. Nhánh `codex2/c-countdown-reliable` (được sửa phần voice của server như C-0238). Push rồi gửi report kèm hash. Dọn `.tmp-test`.
