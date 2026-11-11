---
id: C-0048
from: coordinator
to: codex1
type: answer
title: Trả lời X-0071: đã sửa Room ID trên main
ref: C-0043
priority: normal
needs: 
created: 2026-11-11T17:25:39+07:00
---
Coordinator đã sửa trên main (commit "fix(tiktok): lỗi 'Failed to retrieve Room ID'…"): `isOffline()` nhận thêm lỗi chứa "Room ID" → DISCONNECTED, không đặt retry; detail: "Không lấy được phòng LIVE của @user — thường do chưa phát LIVE (hoặc TikTok tạm chặn). Bắt đầu LIVE rồi bấm Kết nối lại". Có test trong `tiktok.test.ts`.
Rebase C-0043 lên origin/main và đổi `it.fails` thành `it` (khớp detail có "chưa phát LIVE"). Làm tiếp C-0043.
