---
id: C-0333
from: coordinator
to: codex1
type: task
title: C-0333 Luật ngai vàng + liên kết nhân vật (server)
ref: C-0333
priority: high
needs: 
created: 2026-11-19T18:51:05+07:00
---
# C-0333 — Luật ngai vàng + liên kết nhân vật (server, người dùng đã chốt 19/11)

Làm TRƯỚC C-0310/C-0324 (C-0331 có thể làm cùng nhánh khác). Codex 2 sẽ dựng giao diện dựa trên hợp đồng dữ liệu của task này, nên **gửi coordinator bản hợp đồng (contracts) trước khi code xong** để chuyển Codex 2.

## A. Liên kết nhân vật (mỗi người 1 nhân vật, đúng mọi nơi)
1. Mỗi người chơi có **đúng 1 characterId cố định suốt vòng**: gán lúc đăng ký ở sảnh hoặc lần trả lời đầu, lưu `character_assignments`, không bao giờ gán lại (kể cả restart/reload).
2. **Chia không trùng trước:** những người vào đầu tiên lần lượt nhận nhân vật **chưa ai dùng trong vòng** cho tới khi hết kho (hiện 62). Hết kho thì chia ngẫu nhiên, trùng là bình thường. Thứ tự chọn trong phần chưa dùng vẫn tất định (theo seed + playerId) để test lặp lại được. Sảnh → vòng giữ nguyên nhân vật như hiện nay.
3. **Bỏ dự phòng sai nhân vật:** `apps/server/src/audience.ts` `characterId: this.chars.get(...) ?? this.pool[0]` — không được hiện nhân vật đầu kho cho người khác. Không có assignment là lỗi logic: gán ngay (theo luật 2) và lưu, kèm log.
4. Mọi nơi hiển thị (ghế, Top 10, Top 3 chặng, ngai, vinh danh Top 1/2/3) dùng cùng `characterId` của người đó. Overlay sẽ tra ảnh theo id: `chibi/<id>.png`, `throne/ngai-<id>.png`, `chibi/dang-top2-top3/top2/top2-<id>.png`, `.../top3/top3-<id>.png`.
5. **Preflight (gộp vào C-0324):** với mọi id trong `chibi/manifest.json`, phải có đủ 4 ảnh trên (đúng kích thước: ngai 800×800, top2/top3 800×1200, nền trong suốt). Thiếu → preflight FAIL, in danh sách file thiếu. Không có luật "thiếu dáng thì dùng ảnh đứng" lúc live.

## B. Ngai vàng (server là nguồn sự thật duy nhất)
1. **Ghế:** bỏ hàng ghế đầu, ngai thay vào đó → **30 ghế** bên dưới. Sảnh chỉ cho đăng ký ghế và đếm "x/30"; không ai vào được ngai ở sảnh.
2. **Sảnh và câu 1–5:** ngai trống (`LOCKED`, mở sau câu 5).
3. **Chốt kết quả câu 5** (sau khi chấm điểm, cùng transaction): người hạng 1 lên ngai.
4. **Từ câu 6:** chỉ xét đổi chủ ngai **lúc chốt kết quả mỗi câu**, không đổi trong ACCEPTING/READING. Ai hạng 1 thì lên ngai.
5. **Đồng điểm hạng 1:** người có **chuỗi trả lời đúng hiện tại (streak) dài hơn** được ngồi. Nếu streak cũng bằng: người đang ngồi ngai giữ ngai; lần đầu sau câu 5 (chưa ai ngồi) thì người có tổng thời gian trả lời đúng ngắn hơn; vẫn bằng thì người vào vòng trước.
   Bảng xếp hạng/Top 10 hiển thị phải nhất quán với chủ ngai (chủ ngai là hạng 1 hiển thị).
6. **Mỗi người chỉ ở 1 chỗ:** chủ ngai rời ghế (ghế nhường theo luật xoay hiện có). Mất ngai thì quay lại ghế (vẫn thuộc Top 5 được ghim). Người đang ở hàng chờ mà lên hạng 1 vẫn lên ngai.
7. Restart/reload giữa vòng: tính lại đúng chủ ngai từ dữ liệu đã lưu (điểm, streak, lịch sử) — không lưu riêng một giá trị có thể lệch.
8. Snapshot công khai thêm trường ngai, gợi ý: `throne: { state: 'LOCKED' | 'HELD', unlockAfterQuestion: 5, holder?: { publicPlayerId, safeDisplayName, characterId, score, streak } }`. Không lộ playerId thật. Màn vinh danh: Top 1/2/3 kèm characterId như hiện có.

## Test bắt buộc
- Cùng một người: characterId giống nhau ở ghế, Top 10, Top 3 chặng, ngai, vinh danh; giữ nguyên sau restart giữa vòng.
- 35 / 62 / 63 / 200 người: 62 người đầu không trùng; người 63+ được gán, không lỗi.
- Câu 1–4 và lúc ACCEPTING câu 5: ngai LOCKED. Chốt câu 5 → HELD đúng người. Đổi chủ chỉ ở thời điểm chốt câu.
- Đồng điểm: streak dài hơn thắng; streak bằng → người đang ngồi giữ; lần đầu đồng cả streak → nhanh hơn.
- Không ai xuất hiện đồng thời ở ghế và ngai; sảnh tối đa 30 ghế.
- Kiểm tra: typecheck, vitest, privacy, e2e chạy riêng (placeholder và `QUIZ_ASSETS_DIR=assets-local`), bench 20k không chậm hơn đáng kể. Không đụng `data/quiz.db`.
