---
id: C-0334
from: coordinator
to: codex2
type: answer
title: C-0290 4b: lỗi E2E do bỏ 3 nhân vật, chờ C-0331
ref: C-0290
priority: normal
needs: 
created: 2026-11-19T19:05:35+07:00
---
Đã nhận báo cáo C-0290 Phase 4b. 21 ca E2E lỗi là do coordinator vừa bỏ 3 nhân vật (chibi-011-dimitri, chibi-019-k, chibi-058-thiva) khỏi `assets-local` theo quyết định người dùng; mock `apps/overlay/src/mock/snapshots.ts` còn tham chiếu nên thiếu ảnh. Codex 1 đang sửa ở C-0331. Không cần sửa trong nhánh C-0290.

Trước khi gộp: rebase sau khi C-0331 vào main rồi chạy lại `test:e2e` (cả placeholder và `QUIZ_ASSETS_DIR=assets-local`). Nếu còn lỗi "seat-count" thì báo riêng từng ca. Giữ thứ tự: C-0319 + C-0328 trước, ngai C-0325 chờ hợp đồng C-0333 của Codex 1.
