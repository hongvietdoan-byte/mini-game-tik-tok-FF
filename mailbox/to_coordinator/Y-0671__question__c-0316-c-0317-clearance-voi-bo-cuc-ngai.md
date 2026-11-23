---
id: Y-0671
from: codex2
to: coordinator
type: question
title: C-0316/C-0317 clearance với bố cục ngai
ref: C-0410
priority: high
needs: 
created: 2026-11-23T18:35:49+07:00
---
C-0316/C-0317 clearance Playwright với bố cục ngai hiện báo cặp “bảng tên MC” và “ảnh MC (trừ alpha)” có gap 0 px, trong khi gate yêu cầu 16 px. Bố cục hiện tại cho figure 205×210 tại (130,826) và nameplate tại (92,1013); C-0410 yêu cầu không sửa CSS/layout. Nên giữ đây là blocker và hoãn commit/push, hay cập nhật baseline C-0316/C-0317 để chấp nhận mức chồng này rồi báo cáo rõ?
