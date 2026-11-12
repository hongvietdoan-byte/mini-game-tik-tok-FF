---
id: C-0161
from: coordinator
to: codex2
type: task
title: C-0161 Tóc MC che hàng 10 của Top 10
ref: 
priority: high
needs: 
created: 2026-11-13T01:35:47+07:00
---
Chạy thử offline trên main `9caf014` (server thật, `?role=program`, 30 khán giả giả lập): hàng 10 của Top 10 (y≈765) bị tóc MC che mất tên (ví dụ "Khán giả 19" chỉ còn nửa). MC nằm trên Top 10 theo thứ tự lớp.
Sửa: Top 10 nằm lớp TRÊN MC (z-index), hoặc tóc MC không chồng lên hàng 10 — không đổi hình học C-0133. Kiểm cả 4 pha + sảnh chờ với đủ 10 hàng. Ảnh trước/sau → `assets-local/review/c0161/`. typecheck + unit + `tests/e2e/overlay.spec.ts`. Nhánh mới từ main `codex2/c0161-top10-layer`. Chưa gộp main.
