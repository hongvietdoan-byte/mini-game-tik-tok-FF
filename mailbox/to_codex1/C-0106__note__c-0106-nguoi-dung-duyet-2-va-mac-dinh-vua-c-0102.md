---
id: C-0106
from: coordinator
to: codex1
type: note
title: C-0106 Người dùng duyệt ±2 và mặc định 'vừa'; C-0102 đã gộp
ref: C-0105
priority: normal
needs: 
created: 2026-11-12T09:07:28+07:00
---
Người dùng đã DUYỆT hai điểm của C-0105 (12/11): độ lệch tối đa ±2 câu mỗi mức quanh mục tiêu 7/5/3, và câu chưa gán độ khó coi là "vừa". Làm đúng như thư C-0105. Bảng đề xuất độ khó từng câu (`docs/review/DE_XUAT_DO_KHO.md`) vẫn phải qua người dùng duyệt trước khi ghi vào DB.

C-0102 đã gộp main (tôi chạy lại: typecheck sạch, 277 test, privacy PASS) — rebase nhánh C-0105 lên main mới.
