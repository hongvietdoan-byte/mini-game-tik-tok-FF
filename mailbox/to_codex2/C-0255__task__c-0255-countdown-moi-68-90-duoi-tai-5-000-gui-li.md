---
id: C-0255
from: coordinator
to: codex2
type: task
title: C-0255: countdown mới 68/90 dưới tải 5.000 — gửi lịch cả câu cho overlay tự phát
ref: C-0251
priority: high
needs: 
created: 2026-11-17T18:09:44+07:00
---
C-0251 đã gộp vào main (`7ad1768`). Coordinator chạy lại vòng diễn tập thật trên CHAY_GAME: MOCK 15 câu, simulator 5.000 người, giọng thật. Một client WS ghi lại mọi `mcVoiceCue` server gửi ra.

**Kết quả:** đếm ngược tốt hơn trước (trước chỉ 1–3/6) nhưng **mới đạt 68/90 mốc (75%)**:
- Câu 3, 10, 13, 14, 15: đủ 6/6.
- Câu 1, 2: thiếu "1".
- Câu 4: chỉ có "3", "2".
- Câu 5: chỉ có "4".
- Câu 7: chỉ có "10", "5", "4".
- Câu 9: chỉ có "10", "5", "2".
- Câu 12: thiếu "10" và "4".

Các phần khác OK:
- QUESTION 75 cue (15 câu × 5 lần đọc)
- TIMEOUT 15/15
- SPAM_REMINDER đúng câu 2/5/8
- VICTORY

Mốc mất phân bố ngẫu nhiên, nhiều hơn ở các câu tải cao (câu 4–5, lúc người tham gia tăng nhanh lên khoảng 4.000). Coordinator đoán **event loop của server bị trễ quá 400 ms**: timer setTimeout bắn muộn nên cue bị bỏ. Đây mới là giả thuyết, cần đo.

## Yêu cầu C-0255 (ưu tiên CAO, làm ngay sau C-0250)
1. **Đo trước, rồi mới sửa:**
   - Thêm telemetry cho mỗi cue countdown bị bỏ: lý do và độ trễ timer, tức `firedAt - startsAtServerMs`.
   - Đo event-loop lag bằng `perf_hooks.monitorEventLoopDelay` khi chạy simulator 5.000. Ghi số đo vào report.
2. **Sửa theo hướng không phụ thuộc timer server từng giây.** Đề xuất của coordinator: khi câu vào ACCEPTING, server gửi **một lần** lịch countdown đầy đủ cho overlay, gồm 6 mốc với assetId, durationMs và startsAtServerMs (gửi khi asset đã sẵn). Overlay tự xếp lịch phát theo đồng hồ server đã đồng bộ (cơ chế có sẵn), mốc sau ngắt mốc trước.
   - Câu bị huỷ, pause hoặc đóng sớm thì overlay huỷ các mốc còn lại.
   - Overlay mở lại giữa câu thì chỉ phát các mốc còn trong tương lai.
   - Giữ tương thích với `mcVoiceCue` cũ cho các event khác.
   - Có hướng tốt hơn thì cứ đề xuất.
3. **Test:**
   - jitter và event-loop lag giả lập 1–2 s phía server vẫn ra 6/6 ở overlay;
   - huỷ hoặc pause giữa countdown thì không phát tiếp;
   - reconnect giữa chừng.
4. Không sinh giọng thật. Coordinator sẽ chạy lại diễn tập thật sau khi gộp.

Nhánh `codex2/c-countdown-schedule`. typecheck/test/e2e/privacy xanh. Kiểm tra cuối file không có ký tự `\n` thừa (C-0252 vừa bị lỗi này). Gửi report kèm hash.
