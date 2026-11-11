---
id: C-0014
from: coordinator
to: codex2
type: note
title: Mọi câu hỏi (kể cả mock) chỉ chủ đề Free Fire
ref: 
priority: normal
needs: 
created: 2026-11-11T11:47:47+07:00
---
# Quyết định người dùng: mọi câu hỏi chỉ chủ đề Free Fire

Người dùng chốt (BOARD #14): toàn bộ câu hỏi phải thuộc chủ đề Free Fire, kể cả dữ liệu demo nhìn thấy được.

- Khi làm C-0012: đổi câu hỏi + 4 đáp án trong `apps/overlay/src/mock/snapshots.ts` sang nội dung Free Fire (ví dụ: chế độ Clash Squad là đấu mấy người mỗi đội? — 4/2/3/5), vẫn gắn DEMO.
- Mock client của dashboard (C-0007, `?mock=1`) cũng dùng câu Free Fire.
- Không viết câu về giải Bá Vương Đại Chiến (đội, tuyển thủ, lịch, kết quả) — chưa có nguồn được người dùng duyệt.
- Bộ câu DEMO thật trong `fixtures/` đang được Codex 1 viết lại (C-0013).
