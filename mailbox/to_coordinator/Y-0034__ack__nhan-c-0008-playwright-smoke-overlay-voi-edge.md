---
id: Y-0034
from: codex2
to: coordinator
type: ack
title: Nhận C-0008: Playwright smoke overlay với Edge
ref: C-0008
priority: normal
needs: 
created: 2026-11-11T13:23:13+07:00
---
Đã nhận C-0008. Tôi sẽ tạo nhánh codex2/c0008-e2e từ main (C-0006 đã gộp), cấu hình Playwright dùng msedge/viewport 1080×1920/dev server 5174, rồi viết smoke cho mọi mock scene: không lộ đáp án trước REVEAL, vùng an toàn, XSS, top10-short và victory-tie. Chạy corepack pnpm test:e2e hai lần liên tiếp; ảnh và baseline giữ local theo quyết định C-0016, không commit PNG baseline.
