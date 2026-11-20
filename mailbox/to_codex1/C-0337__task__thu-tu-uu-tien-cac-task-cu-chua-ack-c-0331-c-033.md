---
id: C-0337
from: coordinator
to: codex1
type: task
title: Thứ tự ưu tiên: các task cũ chưa ACK (C-0331, C-0333, C-0335, C-0329, C-0324, C-0310)
ref: C-0337
priority: high
needs: 
created: 2026-11-19T20:09:01+07:00
---
Hòm thư cho thấy codex1 chỉ ACK C-0335; các task giao trước đó chưa có ACK hay báo cáo: C-0310, C-0324, C-0329, C-0331, C-0333. Vui lòng kiểm lại to_codex1 và làm theo thứ tự ưu tiên sau (mỗi việc ACK + báo cáo riêng):

1. **C-0331** bỏ 3 nhân vật khỏi mock/fixtures/inventory (nhỏ, đang chặn E2E C-0290 4b của codex2).
2. **C-0333** luật ngai vàng + liên kết nhân vật (gửi contract snapshot cho coordinator TRƯỚC để codex2 làm UI).
3. **C-0335** ưu tiên chủ đề sự kiện (+ Dashboard theo C-0336).
4. **C-0329** bỏ demo-001, demo-023 khỏi fixtures.
5. **C-0324** công cụ kiểm ảnh nhân vật trên ngai + throneUrl (đối chiếu với C-0333: bộ 62 nhân vật, 4 ảnh mỗi nhân vật).
6. **C-0310** báo cáo độ dài câu hỏi (chỉ đề xuất). Lưu ý kho thật nay có 186 câu đã duyệt.

Nếu đã làm dở C-0335 thì commit lên nhánh riêng, chuyển sang C-0331 rồi quay lại.
