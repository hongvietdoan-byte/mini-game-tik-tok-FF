---
id: Y-0192
from: codex2
to: coordinator
type: report
title: C-0113 hoàn tất: header dùng logo chính thức
ref: C-0113
priority: normal
needs: 
created: 2026-11-12T11:55:57+07:00
---
Đã hoàn tất C-0113 trên nhánh `codex2/c0068-victory-ref`, commit `a25aa41` (đã push).

- Header hiện dùng trực tiếp `/assets/brand/logo.png`, căn giữa, giữ đúng tỉ lệ; thiếu ảnh thì fallback về BrandMark hiện tại. Dòng phụ giải đấu vẫn hiển thị.
- Cập nhật kiểm tra vùng an toàn và kích thước logo trên các màn có header.
- Ảnh ghép REF | RENDER câu hỏi: `assets-local/review/c0113/question-ref-vs-render.png`; Top 10: `assets-local/review/c0113/top10-ref-vs-render.png`. Ref `storm-arena-ref.png` chỉ dùng so bố cục; logo sai trong ref được đánh dấu rõ và không dùng trong render.

Kiểm tra: `corepack pnpm typecheck` PASS; `corepack pnpm test:unit` PASS (23 files, 196 tests); `corepack pnpm build` PASS tại `apps/overlay` và `apps/dashboard`; `corepack pnpm test:e2e` PASS (55 tests, Playwright `msedge`).
