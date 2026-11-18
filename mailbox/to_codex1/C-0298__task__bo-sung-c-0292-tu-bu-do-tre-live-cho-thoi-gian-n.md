---
id: C-0298
from: coordinator
to: codex1
type: task
title: Bổ sung C-0292: tự bù độ trễ LIVE cho thời gian nhanh nhất và điểm tốc độ (đã duyệt)
ref: C-0292
priority: normal
needs: 
created: 2026-11-18T23:12:51+07:00
---
Bổ sung tiếp vào nhánh sửa nóng C-0292 (chung báo cáo với C-0292/C-0294). Người dùng đã DUYỆT phương án.

Bối cảnh (đo trên DB live): từ C-0257 (nhận + tính giờ từ READING), thời gian người trả lời đầu tiên mỗi câu = 4,0–7,9 s (trung vị 6,8 s) vì hình TikTok LIVE tới người xem trễ ~5–7 s; live 17/11 trước C-0257 là ~2,0 s. Ô "NHANH NHẤT" hiện 7–9 s, điểm SPEED giảm ~10%. Người dùng muốn thời gian gần cảm nhận của người xem và không bao giờ âm / 0,01 s.

**Bù độ trễ LIVE tự điều chỉnh** (giữ nguyên nhận đáp án từ READING):
1. `effectiveElapsedMs = max(MIN_DISPLAY_MS=500, rawElapsedMs - streamDelayMs)` với rawElapsed = receivedAt − mốc mở (như hiện tại).
2. `streamDelayMs` tự ước lượng theo phiên: câu đầu dùng mặc định an toàn 2.000 ms; sau mỗi câu đóng, lấy rawElapsed của người TRẢ LỜI ĐÚNG ĐẦU TIÊN ở tối đa 5 câu gần nhất, chọn giá trị thấp THỨ HAI (bỏ giá trị thấp nhất để loại người đoán bừa; nếu chỉ có 1 câu thì dùng nó), trừ 1.000 ms biên an toàn; kẹp trong [0, 6.000] ms. Câu không ai đúng thì bỏ qua.
3. Chỉ cập nhật streamDelay GIỮA các câu (khi câu đóng), không đổi trong lúc câu đang mở; mỗi câu chốt một giá trị và lưu lại (trong snapshot/DB) để tính điểm và khôi phục/regrade cho ra cùng kết quả (idempotent, deterministic).
4. Dùng effectiveElapsed cho: số giây hiển thị ở ô NHANH NHẤT / Top 3 nhanh nhất (Phase 1) và điểm SPEED (KAHOOT/CLASSIC). Effective ≤ MIN → điểm SPEED tối đa, không âm, không vượt trần.
5. XẾP HẠNG nhanh nhất (ai nhanh hơn) luôn theo rawElapsed/receivedAt thật — không đổi thứ tự, đồng hiển thị 0,5 s vẫn phân định.
6. Operator: Dashboard API + hiển thị (contracts/admin snapshot) độ trễ đang dùng và chế độ AUTO / MANUAL (nhập tay ms, kẹp 0–6.000). Mặc định AUTO. Phần giao diện Dashboard nhỏ (một dòng hiển thị + ô nhập) — nếu đụng lane Codex 2 thì chỉ làm API + contract và ghi rõ trong báo cáo để coordinator giao Codex 2.
7. Không đổi điểm CORRECT/STREAK, không đổi thời lượng pha.

Nghiệm thu: unit test ước lượng (mạng nhanh 2–3 s → delay ~1–2 s; mạng chậm 6–8 s → ~4–5 s; 1 người đoán bừa 0,8 s bị loại; kẹp 0–6 s; câu không ai đúng), test điểm SPEED với effective ≤ MIN = tối đa, thứ tự nhanh nhất theo raw, khôi phục giữ đúng delay đã chốt mỗi câu; phát lại dữ liệu live 18/11 (dùng bản sao DB tạm ở ổ E, KHÔNG đụng data/quiz.db thật) → in thời gian hiển thị mới của người nhanh nhất từng câu. typecheck, test, e2e đầy đủ, privacy PASS; dọn `.tmp-test`.
