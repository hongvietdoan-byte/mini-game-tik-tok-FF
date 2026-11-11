---
id: C-0069
from: coordinator
to: codex1
type: task
title: C-0069: MC Kelly 'bình luận' — lời thoại chữ trong bong bóng + giọng đọc (mở phạm vi)
ref: 
priority: high
needs: 
created: 2026-11-11T20:50:29+07:00
---
Người dùng (20:50): "Ô thoại cạnh MC cần dùng text kèm voice cho MC để bình luận". Hiện bong bóng là chữ cố định (`apps/overlay/src/v3/ArenaStage.tsx:107`). Làm xong C-0067 trước nếu sắp xong, rồi làm việc này (ưu tiên cao hơn phần còn lại).

**Mở phạm vi C-0069**: `packages/contracts/**` (thêm schema), `apps/server/src/mc/**` (mới), chỗ móc vào engine/WS broadcast tối thiểu trong `apps/server`, `apps/overlay/src/v3/mc/**`, 1 dòng thay bong bóng trong `ArenaStage.tsx:107` (Codex 2 đang restyle bong bóng ở C-0065 — chỉ thay nội dung, KHÔNG đụng CSS/khung), `docs/review/MC_LOI_THOAI.md`, `tools/**`.

1. **Kho lời thoại** `docs/review/MC_LOI_THOAI.md` (người dùng duyệt như kho câu hỏi — tool chỉ đề xuất): theo sự kiện — mở màn/LOBBY, giới thiệu câu hỏi N, còn 10s/5s, khoá đáp án, công bố đáp án (đúng nhiều/ít, tỉ lệ), người nhanh nhất, top1 giữ chuỗi x2/x3, BXH tạm, nghỉ giữa vòng, Victory chúc mừng top 3, mất kết nối/tạm dừng. Mỗi sự kiện 3–5 biến thể, giọng MC Free Fire sôi nổi, ngắn (≤ 2 câu, ≤ 90 ký tự hiển thị), placeholder `{name}`, `{n}`, `{pct}`, `{option}`. Chưa duyệt → dùng bộ DEMO đánh dấu.
2. **MC director (server)**: chọn câu theo sự kiện engine, không lặp câu liền nhau, giới hạn nhịp (không chồng lời; câu mới đè câu cũ chỉ khi ưu tiên cao hơn). Phát WS `MC_SAY {id, eventKind, text, audioUrl?, priority, durationMs}` (schema Zod trong contracts; overlay cũ bỏ qua an toàn).
3. **An toàn tên**: `{name}` chỉ dùng tên đã qua lọc (không HTML, không link, không từ tục — dùng bộ lọc sẵn có nếu có; không thì danh sách chặn cơ bản), cắt 16 ký tự; nếu bị lọc → biến thể không có tên. Không bao giờ đọc nội dung comment của khán giả.
4. **Giọng đọc** (thiết kế cắm được, mặc định an toàn offline):
   - Ưu tiên file thu sẵn: `assets-local/mc/voice/<lineId>.mp3` nếu có (câu cố định).
   - Câu có biến/không có file: TTS offline Windows (System.Speech, giọng vi-VN nếu cài; không có → chỉ chữ). Sinh file wav vào thư mục dữ liệu, cache theo hash nội dung, phục vụ qua route asset bind 127.0.0.1. KHÔNG gọi dịch vụ TTS online.
   - Overlay phát bằng `<audio>` (OBS: bật "Control audio via OBS"), hàng đợi 1 kênh, tôn trọng `?mute=1`; bong bóng gõ chữ theo thời lượng audio, tắt sau durationMs.
   - Dashboard (nếu nhẹ): công tắc MC nói on/off + âm lượng — nếu đụng nhiều UI dashboard thì bỏ, ghi lại cho Codex 2.
5. Test: unit director (chọn câu, không lặp, ưu tiên, lọc tên), schema; e2e: QUESTION hiện câu giới thiệu trong bong bóng, có request audio khi có file/TTS, `mute=1` không phát.
Nhánh `codex1/c0069-mc-voice`, typecheck + test + e2e, report kèm ảnh bong bóng.
