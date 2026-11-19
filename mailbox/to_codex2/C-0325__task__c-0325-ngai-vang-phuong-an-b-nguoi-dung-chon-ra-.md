---
id: C-0325
from: coordinator
to: codex2
type: task
title: C-0325: ngai vàng phương án B (người dùng chọn) + rà và cân lại mọi câu thoại MC trên bóng
ref: C-0325
priority: high
needs: 
created: 2026-11-19T16:04:53+07:00
---
Người dùng **chọn phương án B cho ngai vàng**: ngai to ở giữa, bóng thoại MC thu nhỏ đặt góc phải. Ảnh coordinator dựng thử để duyệt nằm ở `assets-local/review/ngai-vang-1119/B-co-thoai-MC.png` (ignored). Bộ mẫu C-0323 (bố cục A) dừng ở mức mẫu, không dùng.

Thứ tự: làm sau C-0315 đến C-0318. **Giai đoạn 1 vẫn là ảnh mẫu và bảng câu thoại để duyệt.**

## Bố cục B (số đo trên main, 1080×1920)
- **Ngai** (ảnh ghép 800×800, phần ngai thấy được ở toạ độ ảnh x 64–736, y 80–762): vùng thấy được x 372–706, y 837–1176. Cách đáy bảng Top 10 / thẻ câu hỏi (813) 24 px, cách tên hàng ghế thứ hai (1192) 16 px, cách bảng tên MC KELLY ≥ 24 px.
- **Bóng thoại MC:** x 738–1000, đỉnh y 845, cao theo nội dung, **tối đa 3 dòng chữ 26 px**, padding 14/18. Không còn đuôi chỉ về MC; thêm nhãn nhỏ "MC KELLY" (14–16 px, màu vàng) ở đầu bóng để biết ai nói.
- **Cột Top 1** ngay dưới bóng thoại, cách ≥ 16 px, đáy ≤ 1176: nhãn "NGAI VÀNG" 24 px, tên 30 px (tối đa 2 dòng, quá thì "…"), điểm 40 px số đều độ rộng. Không có bóng thoại thì cột Top 1 căn giữa dọc theo ngai.
- **Không có Top 1 (sảnh):** ngai trống, cột phải hiện "NGAI VÀNG / đang chờ chủ".
- Áp dụng quy tắc 11 và test bbox như C-0316/C-0317.

## Rà và sắp lại MỌI câu thoại hiển thị trên bóng (người dùng yêu cầu)
1. **Lập bảng đầy đủ** mọi chuỗi có thể hiện trên bóng thoại ở các cảnh dùng ngai (LOBBY, PREPARE, READING, ACCEPTING, REVEAL, LEADERBOARD, PAUSED…), gồm:
   - `mcFor` trong `packages/quiz-core/src/engine.ts`;
   - `bubbleText` của các voice cue trong `apps/server/src/runtime.ts` (đếm ngược, "Hết giờ!", nhắc luật câu 2/5/8, chào sảnh, đủ người…);
   - `lobbyMessage`, câu mặc định trong `ArenaStage.tsx`;
   - các preset trong `apps/server/src/mc-chat-presets.ts`.
2. **Đo từng câu** trong bóng B: số dòng, dòng dài nhất, có bị ngắt xấu không (ví dụ "comment A, | B, C" tách cụm A/B/C/D, hay một từ mồ côi ở dòng cuối).
3. **Đề xuất câu hiển thị mới** cho câu nào vượt 3 dòng hoặc ngắt xấu: ngắn, rõ, cân dòng, có chỉ định chỗ xuống dòng. Ví dụ: "Trả lời bằng cách comment A, B, C hoặc D để tham gia ngay!" thành "Comment A, B, C, D\nđể trả lời ngay!".
4. **Chỉ đổi chữ hiển thị, KHÔNG đổi câu MC đọc.** Đổi câu đọc thì cache giọng phải sinh lại, tốn lượt. Nếu cần, tách `bubbleText` hiển thị khỏi text đọc; giữ nguyên script giọng.
5. **Câu chat tự do của người vận hành:** tự co chữ tới 22 px, quá 3 dòng thì cắt "…". Ghi rõ giới hạn ký tự trên Dashboard.

**Báo cáo gửi coordinator:**
- bảng gồm các cột: nguồn | cảnh | câu cũ | số dòng cũ | câu đề xuất | số dòng mới;
- ảnh full B cho mỗi cảnh, mỗi ảnh có bóng thoại dài nhất của cảnh đó;
- ảnh có `hud=1`.

Coordinator duyệt rồi mới gửi người dùng. Chưa sửa runtime sản phẩm ở giai đoạn này, trừ khi chỉ là mock hoặc test.
