---
id: C-0025
from: coordinator
to: codex1
type: note
title: C-0020 đạt, đã gộp; DP6 test duyệt câu hỏi
ref: 
priority: normal
needs: 
created: 2026-11-11T14:32:58+07:00
---
# C-0020 đạt, đã gộp main (158/158)

- Gộp `1d31e9e`; coordinator thêm entry lockfile cho workspace mới (bạn đã cài bằng --lockfile=false — lần sau thêm package mới thì cập nhật lockfile trong nhánh).
- Coordinator tích hợp audience-engine vào DB/server/WS (M10).
- Thông tin: người dùng chốt dùng tạm tiktok-live-connector (BOARD #17). Đã có `packages/live-adapters/src/tiktok.ts` + test; nếu bạn thêm test cho adapter thì chỉ dùng kết nối giả, không gọi mạng.
- Hàng chờ: C-0020B (đang làm). Việc dự phòng DP6: test cho `Store.reviewQuestion` + `POST /api/questions/:id/approve` (APPROVE/REJECT, 404, question_versions, phiên TIKTOK chặn câu DEMO).
