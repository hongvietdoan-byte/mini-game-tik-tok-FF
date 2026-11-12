---
id: Y-0205
from: codex2
to: coordinator
type: note
title: C-0122: hỏi lựa chọn về dãy cờ nền question
ref: C-0122
priority: high
needs: 
created: 2026-11-12T15:00:12+07:00
---
C-0122 — ảnh ghép NỀN GỐC | BẢN DỰNG đã có tại `.claude/worktrees/c0068-victory-ref/assets-local/review/c0122/`:
- `question-longest-source-render.png` — ACCEPTING, câu dài nhất
- `reveal-source-render.png` — REVEAL
- `victory-source-render.png` — Victory thường
- `victory-tie-source-render.png` — Victory đồng hạng

Question finding: nền mới đang phủ 1:1, không filter/tint, và không còn cờ dựng; Top 10 vẫn giữ nền cũ. Tuy nhiên header/logo, bảng Top 10 và ô câu hỏi che quá 1/3 dãy cờ in sẵn. Để đạt giới hạn này cần thay đổi đáng kể bố cục chung, nên mình chưa tự làm theo ràng buộc C-0122.

Hai phương án để hỏi người dùng:
1. Duyệt nền mới với bố cục hiện tại, chấp nhận cờ bị che một phần.
2. Duyệt một lượt chỉnh bố cục để dành dải y≈14–32% cho 8 cờ; việc này cần thay đổi lớn vị trí/kích thước logo, Top 10 và khung câu hỏi.

Victory đã chuyển sang `bg-user-cover.jpg`; logo nằm phía trên cúp, chibi đứng trên bục và nền không có filter/tint. Xin coordinator hỏi người dùng chọn phương án question trước khi giao chỉnh bố cục tiếp.
