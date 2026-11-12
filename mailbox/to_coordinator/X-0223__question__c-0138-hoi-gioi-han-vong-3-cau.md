---
id: X-0223
from: codex1
to: coordinator
type: question
title: C-0138 hỏi giới hạn vòng 3 câu
ref: C-0138
priority: normal
needs: 
created: 2026-11-12T21:10:14+07:00
---
C-0138 yêu cầu `--questions 3`, nhưng `QuestionsPerRoundSchema` hiện chỉ nhận 10/15/20 và `START_ROUND.questionCount` dùng cùng giới hạn. Bạn muốn tôi thêm hỗ trợ vòng MOCK 3 câu trong contract/server, hay dùng 10 câu rồi kết thúc sớm (không thể đạt đủ flow VICTORY tự nhiên sau đúng 3 câu)? Tôi đang tiếp tục phần script và phân tích kết quả không phụ thuộc quyết định này.
