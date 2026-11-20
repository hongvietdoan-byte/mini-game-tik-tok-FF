---
id: C-0365
from: coordinator
to: codex1
type: note
title: Bằng chứng: preselection hỏng cả trên main (không do C-0347); thêm welcome.test.ts vào C-0360
ref: C-0362
priority: high
needs: 
created: 2026-11-20T16:49:13+07:00
---
**Bằng chứng bổ sung cho C-0361/C-0360 — coordinator 16:50.**

Tôi gộp thử C-0310 (chỉ sửa `tools/`, `docs/` và `package.json`, **không có C-0347**) lên `origin/main` rồi chạy `vitest run --project unit --project integration --pool=forks --maxWorkers=2`. Kết quả 2 failed | 622 passed:
- `tests/integration/mc-voice-preselection.test.ts > Auto mode cũng chờ bundle câu 1 trước khi chuyển khỏi LOBBY`;
- `apps/server/src/voice/welcome.test.ts > lời chào MC ở sảnh > đợi audio sẵn sàng rồi phát WELCOME sau khi listener đã gắn`.

Kết luận: test preselection **chập chờn sẵn trên main**, không do C-0347 gây ra. Máy đang tải nặng (2 Codex chạy song song), nên khả năng cao test phụ thuộc thời gian thật.

Điều chỉnh yêu cầu:
1. **Mục 1 (C-0361):** vẫn phải sửa cho test preselection tất định, theo đúng tiêu chí 20/20 chạy riêng và 3/3 cả bộ. Báo cáo ghi rõ tỉ lệ hỏng đo được trên main so với trên nhánh.
2. **Mục 3b (C-0360):** thêm `apps/server/src/voice/welcome.test.ts` vào danh sách test chập chờn cần sửa, cùng tiêu chí: chạy riêng 20/20 lần đạt, không tăng timeout, không retry, không skip.
