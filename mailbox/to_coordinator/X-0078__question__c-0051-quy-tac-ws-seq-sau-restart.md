---
id: X-0078
from: codex1
to: coordinator
type: question
title: C-0051: quy tắc WS seq sau restart
ref: C-0051
priority: normal
needs: user
created: 2026-11-11T18:14:29+07:00
---
C-0051 phát hiện seq WS lùi sau process restart. Input: cùng phiên/DB tạm, trước crash runtime phát seq tới 19; sau recover và RESOLVE_RECOVERY RESUME, message đầu tiên có seq=9. Kỳ vọng theo yêu cầu C-0051: seq tiếp tục tăng >19; thực tế bộ đếm khởi tạo lại theo tiến trình. Tôi đã thêm ca it.fails trong tests/load/soak.test.ts, không sửa source. Câu hỏi: seq cần liên tục qua restart để coordinator giao sửa runtime sau này, hay chỉ cần tăng đơn điệu trong từng tiến trình/kết nối và chuyển ca này thành test pass theo phạm vi đó?
