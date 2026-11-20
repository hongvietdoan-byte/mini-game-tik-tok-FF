---
id: Y-0571
from: codex2
to: coordinator
type: report
title: C-0341: tích hợp V5 hoàn tất, hai E2E xanh
ref: C-0341
priority: high
needs: 
created: 2026-11-19T22:50:20+07:00
---
## Hoàn tất C-0341

- Nhánh: codex2/c-0341-v5-integrate
- Commit công việc: 09c62d4f; đã push lên origin. Nhánh cũng gồm merge mới nhất của origin/main.
- Đã tích hợp codex2/c-0330-top3-compact, codex2/c-0319-hud-tall, codex1/c-0331-remove-characters.
- C-0339 vẫn xếp sau C-0341; nhờ coordinator xem ảnh rồi gộp.

### Sửa và lý do đổi mốc

- Audio mock cycle loại reading-demo-006 / question-demo-006 khỏi vòng lặp. URL trực tiếp vẫn dùng được; tránh phát lại cue QUESTION khi cùng câu hỏi đổi snapshot.
- Đồng bộ kiểm tra khung MC theo C-0317: frame 130/826/205/158, bảng tên 92/1013/250/49, bubble x=411 và callout nhanh rộng 599px. Giữ các assertion khoảng cách; pixel alpha xác nhận ảnh MC cách khung ít nhất 16px. CSS ROUND_WINNER chỉnh riêng bảng tên để đạt khe 16px với asset thật.
- C-0297 và long-content theo C-0319: cỡ chữ sàn 24px, tối đa 4 dòng; mẫu 160 ký tự hiển thị đủ trong 4 dòng nên test xác nhận không bị truncate thay vì ép cắt.
- C-0214 tạo thêm hai ảnh zoom để soi khung câu hỏi và crop MC.

### Kiểm tra

- corepack pnpm typecheck — PASS.
- corepack pnpm privacy:check — PASS, 1330 tệp theo dõi.
- corepack pnpm test — PASS, 93 file / 613 test. Lần chạy đầy đủ đầu tiên có hai test thời gian nhạy cảm thất bại; chạy riêng cả hai đều PASS, sau đó chạy đầy đủ lại PASS 613/613.
- E2E asset thật mặc định: corepack pnpm test:e2e — PASS, 137/137.
- E2E placeholder: QUIZ_ASSETS_DIR=fixtures/assets-placeholder; corepack pnpm test:e2e — PASS, 136 passed / 1 skipped; C-0062 cần asset thật.
- Sau E2E đầy đủ, selector CSS tương đương được dọn lại; xác minh riêng C-0311 (3/3) và C-0316 (1/1) cho cả asset thật lẫn placeholder. C-0214 capture (1/1) cũng PASS sau thêm ảnh zoom.
- git diff --check — PASS. Không có character portrait/chibi 404; log C-0062 chỉ liệt kê asset nền vòng lặp tùy chọn và manifest voice MC không cấu hình, được test MC Voice bỏ qua.

### Ảnh để coordinator duyệt

Ảnh E2E 1080x1920 và zoom nằm trong:
E:/Ai/2026/Trend mini game tiktok/.claude/worktrees/c-0341-v5-integrate/.claude/review

- Question, reveal, top10 giữa vòng: C0214/question.png, reveal.png, top10-mid-round.png
- Top10 tie: C0307/option-b-rotate-overall-tie-1080x1920.png
- Top3 chặng normal / tie: C0307/option-b-rotate-stage-normal-1080x1920.png, option-b-rotate-stage-tie-1080x1920.png
- Victory tie: C0307/victory-tie-context-1080x1920.png
- HUD tall: C0319/hud-tall-question.png
- Zoom question frame / MC: C0214/question-frame-zoom.png, mc-frame-zoom.png
- V5 full/zoom và số đo clearance: C0307. Phương án A gộp Top10 + Top3 là ảnh chẩn đoán do vượt đáy; phương án B luân phiên mỗi 5 giây là phương án đạt.
