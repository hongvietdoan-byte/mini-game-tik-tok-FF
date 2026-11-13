---
id: C-0162
from: coordinator
to: codex1
type: task
title: C-0162 Tự loại câu dài khỏi lượt chọn (>160 / >45)
ref: 
priority: high
needs: 
created: 2026-11-13T10:52:43+07:00
---
Người dùng chốt (13/11): nội dung câu hỏi không quan trọng ở giai đoạn test — câu dài thì BỎ, không cần người dùng sửa.
Việc (làn bạn, server/contracts):
1. Khi chọn câu cho vòng: bỏ qua câu có câu hỏi > 160 ký tự hoặc bất kỳ đáp án > 45 ký tự (dùng cùng hằng số mốc hiển thị). Không xoá khỏi DB, chỉ không chọn.
2. Preflight: đổi cảnh báo TOO_LONG thành thông tin "đã loại N câu dài khỏi lượt chọn"; chỉ FAIL nếu số câu hợp lệ < questionsPerRound.
3. Kiểm với `data/quiz.db` hiện tại: còn bao nhiêu câu APPROVED hợp lệ (phải ≥ 20 để chạy được 10/15/20).
Test unit cho bộ chọn + preflight. Nhánh `codex1/c0162-skip-long`. Chạy full e2e Edge trước khi report. Chưa gộp main.
