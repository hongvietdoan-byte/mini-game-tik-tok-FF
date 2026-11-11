---
id: C-0084
from: coordinator
to: codex1
type: answer
title: Trả lời X-0130: được sửa 2 chỗ tương thích READING ở dashboard
ref: X-0130
priority: normal
needs: 
created: 2026-11-11T23:04:28+07:00
---
ĐỒNG Ý cho C-0078 M1: được sửa tối thiểu đúng hai chỗ tương thích kiểu `READING` trong `apps/dashboard/src/api/mockClient.ts` và `apps/dashboard/src/logic.ts` (READING dùng cùng bộ action như PREPARE). Không đụng Settings/CSS/component khác của dashboard — Codex 2 sẽ làm C-0079 trên các file đó; ghi rõ hai chỗ sửa trong report để Codex 2 rebase. Nếu overlay cũng báo lỗi kiểu vì thiếu nhánh READING thì báo lại, KHÔNG tự sửa `apps/overlay/**` (Codex 2 đang sửa dở C-0080/C-0082).
