---
id: C-0341
from: coordinator
to: codex2
type: task
title: C-0340: nhánh tích hợp V5 (0330 + 0319 + C-0331), E2E xanh cả placeholder lẫn asset thật
ref: C-0340
priority: high
needs: 
created: 2026-11-19T21:05:54+07:00
---
**Làm TRƯỚC C-0339.** Người dùng yêu cầu gộp BXH V5 vào main. Coordinator đã thử gộp `origin/main` + `codex2/c-0330-top3-compact` + `codex2/c-0319-hud-tall`, có xung đột và E2E đỏ. Cần một nhánh tích hợp sạch.

## Việc
1. Nhánh mới `codex2/c-0340-v5-integrate` từ origin/main, gộp: `codex2/c-0330-top3-compact`, `codex2/c-0319-hud-tall`, `codex1/c-0331-remove-characters`.
2. Xung đột coordinator gặp (tự giải lại, kiểm đúng ý):
   - `apps/overlay/src/v3/arenaLogic.ts` `wrapPromptToLines` (đoạn thêm "…"): hai cách khác nhau từ 0327/0330 và 0319 (6f31ef2e). Giữ đúng yêu cầu: không dòng nào chỉ có "…", "…" dính chữ cuối.
   - `apps/overlay/src/mock/snapshots.ts` câu hỏi demo-006 (questionInstanceId/index/prompt).
3. E2E với asset placeholder trên bản gộp của coordinator: **12 fail** (main riêng: xanh theo báo cáo C-0331):
   - Kelly/MC sai vị trí so với mốc cũ: c0207 header A/B ("head-and-shoulders portrait follows the user's reference"), c0214, c0221, c0306 (Kelly vs khung bình luận), overlay.spec:1178 ("MC portrait matches user reference height"), overlay.spec:1358.
   - Cỡ chữ câu hỏi: c0297 `expected >= 26, received 24`; long-content 160/45 (prepare, question-longest, reveal) `data-prompt-truncated` false thay vì true.
   - overlay.spec:1687 audio: `question-enter` phát 5 lần thay vì 1 → có vẻ lỗi thật (cue lặp), sửa code, không sửa test.
   Với test vị trí/cỡ chữ: nếu thay đổi là có chủ đích từ C-0316/C-0317/C-0319 (MC cách khung ≥16px, chữ câu hỏi ≥24px đã duyệt) thì cập nhật mốc test và ghi lý do từng test trong báo cáo; không nới lỏng kiểu bỏ kiểm tra.
4. Chạy đủ: typecheck, vitest, privacy, E2E với `QUIZ_ASSETS_DIR=fixtures/assets-placeholder` **và** E2E với asset thật mặc định (sau C-0331 không còn 404 nhân vật). Cả hai phải xanh (FPS flaky thì chạy lại riêng, ghi rõ).
5. Ảnh 1080×1920 các scene: question, reveal, top10, top3 chặng (normal + tie), victory, hud=tall, kèm bản phóng to vùng MC và khung câu hỏi.

Báo cáo: nhánh + commit, danh sách test đã đổi mốc và lý do, kết quả 2 lượt E2E. Coordinator sẽ soi ảnh rồi gộp.
