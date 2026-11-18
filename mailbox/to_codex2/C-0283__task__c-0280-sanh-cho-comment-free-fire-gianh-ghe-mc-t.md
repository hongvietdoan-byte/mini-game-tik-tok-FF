---
id: C-0283
from: coordinator
to: codex2
type: task
title: C-0280: sảnh chờ — comment Free Fire giành ghế, MC tương tác, tự bắt đầu khi đủ ghế (song song V5)
ref: 
priority: normal
needs: 
created: 2026-11-18T10:34:14+07:00
---
Tính năng mới người dùng duyệt 18/11: **tương tác ở sảnh chờ — comment "Free Fire" để giành ghế sớm**. Codex 2 làm trọn (server + overlay + dashboard), chạy SONG SONG với V5 Phase 1 của Codex 1 (C-0276). Thứ tự của Codex 2: C-0279 → **C-0280** → C-0277. Nhánh mới từ origin/main.

Được phép sửa: `apps/server/src/runtime.ts` (phần LOBBY), `apps/server/src/audience.ts`, `packages/audience-engine`, `packages/contracts` (thêm trường, không đổi nghĩa trường cũ), `packages/quiz-core` chỉ phần cấu hình/sự kiện LOBBY, overlay, dashboard, test. KHÔNG đụng phần xếp hạng/score_events/ranking mà C-0276 đang làm; nếu buộc phải chạm `runtime.ts` gần chỗ đó thì giữ diff nhỏ để gộp dễ.

**Hiện trạng:** ở LOBBY mọi bình luận bị bỏ qua; ghế (7×5 = 35) chỉ cấp khi vòng đã bắt đầu và có đáp án hợp lệ đầu tiên (`AudienceManager.onAccepted`).

**Yêu cầu:**
1. **Giành ghế ở sảnh:** khi sảnh mở, bình luận khớp từ khoá "Free Fire" (không phân biệt hoa/thường, dấu cách, dấu câu, emoji: "free fire", "FreeFire", "free fire!!!", "FF FREE FIRE"…) → người đó vào ghế trống (thứ tự center-out như hiện tại), hết ghế thì vào hàng chờ. Mỗi người tối đa 1 ghế. Tên qua bộ lọc tên bậy như mọi chỗ khác. Ghế chỉ để hiển thị, KHÔNG cộng điểm, KHÔNG tạo đáp án. Người giành ghế ở sảnh giữ ghế khi vòng bắt đầu (cùng roundId đã chọn trước ở LOBBY theo C-0227); người không có ghế vẫn chơi bình thường. Từ khoá cấu hình được trong config (mặc định "free fire").
2. **Overlay sảnh:** hiện ghế lấp dần (AUDIENCE_UPDATED như lúc chơi) và chữ "Đã ngồi X/35" + lời nhắc "Comment **Free Fire** để giành ghế!". Giữ bố cục 14/11 và phong cách C-0279; không thêm khung mới chồng lên khối khác.
3. **MC nói ở sảnh:** 4–6 câu chung xoay vòng khoảng 20 s/lần (ví dụ "Comment Free Fire để giành ghế ngồi nhé!", "Ghế đang lấp đầy nhanh lắm!", "Còn chờ gì nữa, comment Free Fire ngay!"). MC KHÔNG đọc tên người chơi, KHÔNG đọc số ghế (số chỉ hiện chữ). Giọng sinh một lần rồi dùng cache như các câu chung hiện có; test chỉ dùng mock, KHÔNG gọi dịch vụ sinh giọng thật. Không phát chồng WELCOME / chat MC (C-0262) — dùng hàng chờ cue sẵn có.
4. **Tự bắt đầu khi đủ ghế:** công tắc trên Dashboard "Tự bắt đầu khi đủ ghế", **mặc định TẮT** (tôn trọng quyết định 16/11: người dùng tự bấm bắt đầu). Khi BẬT, chỉ tự bắt đầu khi đủ CẢ 4 điều kiện:
   - đủ 35/35 ghế;
   - sảnh đã mở ≥ 30 s;
   - giọng câu 1 đã sẵn sàng (cùng cơ chế C-0268);
   - preflight PASS (không FAIL).
   Khi đủ → overlay đếm ngược **10 s** ("Vào trận sau 10…"), MC nói một câu chung kiểu "Đủ người rồi, vào trận sau 10 giây!". Dashboard có nút **Huỷ** trong lúc đếm; huỷ thì quay lại chờ, không tự đếm lại cho đến khi operator bật lại hoặc bấm tay. Hết đếm → gửi START_ROUND như operator bấm (cùng đường lệnh, có audit). Nút "Bắt đầu" bằng tay vẫn dùng được mọi lúc.
   Khi TẮT: đủ ghế chỉ hiện thông báo "Đã đủ ghế" trên Dashboard, không tự làm gì.
5. **Tải lớn:** 10.000 người comment trong vài giây không được làm chậm sảnh — đường nóng O(1) mỗi bình luận, gom AUDIENCE_UPDATED theo nhịp như lúc chơi. Bổ sung case vào bench/simulator nếu tiện.

**Nghiệm thu:**
- Unit/integration: nhận diện từ khoá (các biến thể trên, và không nhận "free", "fire" lẻ, "A", "B"…), 1 người 1 ghế, tràn ghế vào hàng chờ, ghế giữ khi START_ROUND, không tạo điểm/đáp án, 4 điều kiện tự bắt đầu (thiếu từng điều kiện thì không đếm), huỷ đếm ngược, công tắc tắt mặc định, MC không đọc tên.
- E2E MOCK: sảnh → bình luận giả "Free Fire" → ghế lấp → bật công tắc → đếm 10 s → vào vòng; và trường hợp huỷ.
- Ảnh 1080×1920 cảnh sảnh: 0 ghế, 12/35, 35/35 đang đếm ngược — gửi coordinator để người dùng duyệt.
- typecheck, test, e2e đầy đủ, privacy PASS; dọn `.tmp-test`.
