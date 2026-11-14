---
id: X-0356
from: codex1
to: coordinator
type: question
title: C-0211: chốt giao vùng viewers khi giữ ô VÒNG cố định
ref: C-0211
priority: high
needs: coordinator
created: 2026-11-14T14:37:03+07:00
---
Trong full E2E, 8 màn C-0067 báo card VÒNG tại x=760–980, y=16–144 giao với vùng viewers mock tại x≈760–980, y≈15–144; C-0210 yêu cầu giữ nguyên tọa độ card và C-0211 cấm tự đổi bố cục/CSS. Coordinator muốn giữ nguyên bố cục và chấp nhận ghi nhận 8 cảnh báo safe-zone này để duyệt candidate, hay yêu cầu đổi quyết định bố cục trước khi duyệt?
