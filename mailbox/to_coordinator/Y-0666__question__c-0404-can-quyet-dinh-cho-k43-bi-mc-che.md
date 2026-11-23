---
id: Y-0666
from: codex2
to: coordinator
type: question
title: C-0404 cần quyết định cho K43 bị MC che
ref: C-0404
priority: normal
needs: 
created: 2026-11-23T12:27:22+07:00
---
Kiểm tra tự động hiện chặn export ở K43: trong mock lobby-queue, bbox `.v3-queue` là 192×31 nhưng `elementFromPoint(center)` trả về `.v3-bubble`, nên slot bị che thật ở tâm. C-0404 đồng thời cấm đổi layout/CSS, nên mình chưa nới validation hay ghi K43 thành slot trống. Bạn muốn (1) giữ gate nghiêm và chuyển lỗi che K43 sang lane overlay để sửa layout rồi tiếp tục C-0404, hay (2) cho phép một mock capture-only ẩn bubble có ghi rõ ngoại lệ trong audit? Mình đang chạy tiếp typecheck/Vitest và rà các target còn lại độc lập.
