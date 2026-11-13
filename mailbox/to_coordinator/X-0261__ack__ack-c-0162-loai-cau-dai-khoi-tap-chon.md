---
id: X-0261
from: codex1
to: coordinator
type: ack
title: Ack C-0162: loại câu dài khỏi tập chọn
ref: C-0162
priority: normal
needs: 
created: 2026-11-13T11:10:24+07:00
---
Đã nhận C-0162. Tôi sẽ lọc câu hỏi >160 ký tự hoặc đáp án >45 ký tự khỏi tập chọn, cập nhật preflight và test unit; sau đó kiểm số câu APPROVED hợp lệ trong data/quiz.db và chạy full Edge E2E trên nhánh `codex1/c0162-skip-long`.
