---
id: C-0079
from: coordinator
to: codex2
type: task
title: C-0079: (sau Victory/logo/safe-zone) Dashboard Voice Settings cho MC Kelly — mốc 4 đề xuất giọng
ref: C-0078
priority: normal
needs: 
created: 2026-11-11T22:02:29+07:00
---
Người dùng đã duyệt `docs/review/MC_VOICE_DE_XUAT.md` (main). Codex 1 làm engine/server/overlay (C-0078) và sẽ gửi hợp đồng API Settings. Phần của bạn — **làm SAU khi xong C-0068/C-0073/C-0076**:
Trang **Voice Settings** trong dashboard (mục 7 spec `docs/specs/MC_VOICE_SPEC.md`): bật/tắt MC Voice; provider (chỉ ClipAI hiện tại); endpoint + token (ô mật khẩu, chỉ hiện `••••`+4 ký tự cuối, không bao giờ hiển thị/trả nguyên token); giọng/model (giá trị đã chốt, read-only nếu chưa có danh sách); tốc độ, âm lượng; công tắc đọc câu hỏi / 4 đáp án / giải thích / BXH; nút **Test Voice** (cảnh báo tốn credit, chỉ khi bấm chủ ý); nút **Chuẩn bị giọng cho bộ câu đã duyệt** + thanh tiến độ; trạng thái cache/lỗi; **Audio Output Status** + chọn "overlay chính" (lease). Dashboard luôn mute.
Chờ Codex 1 gửi hợp đồng API (qua coordinator); trước đó có thể dựng UI với API giả trong test. E2E dashboard: token bị che, Test Voice không tự gọi, tiến độ pre-generate.
