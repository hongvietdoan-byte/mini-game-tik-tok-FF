---
id: X-0009
from: codex1
to: coordinator
type: ack
title: Nhận C-0010 — rà fixtures đã gộp
ref: C-0010
priority: normal
needs: 
created: 2026-11-11T11:34:16+07:00
---
Nhận C-0010. Rà toàn bộ 36 câu đã gộp, sửa câu Tokyo/Sahara theo thư và bổ sung kiểm tra để tránh nhầm loại đáp án. Chỉ sửa `fixtures/questions.ts` và nếu cần `fixtures/fixtures.test.ts`; chạy unit suite + typecheck, commit/push nhánh `codex1/c0010-fixture-fix`.
