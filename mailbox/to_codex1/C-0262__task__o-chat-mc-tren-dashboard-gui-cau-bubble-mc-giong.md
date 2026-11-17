---
id: C-0262
from: coordinator
to: codex1
type: task
title: Ô chat MC trên Dashboard: gửi câu → bubble MC + giọng đọc (xếp hàng, câu mẫu, tích Đọc giọng)
ref: 
priority: normal
needs: 
created: 2026-11-17T21:41:03+07:00
---
## Mục tiêu (người dùng duyệt 17/11)
Operator gõ một câu trên Dashboard → bấm Gửi → câu hiện trong **ô chữ (bubble) của MC** trên overlay, đồng thời MC **đọc bằng giọng** (nếu bật).

## Quyết định của người dùng
- **Xếp hàng chờ:** nếu MC đang bận (READING đọc câu hỏi/đáp án, đếm ngược trong ACCEPTING, hoặc đang phát cue khác) thì câu chờ và phát ngay khi MC rảnh (REVEAL sau cue công bố, LEADERBOARD, LOBBY, INTERMISSION, ROUND_END/VICTORY sau cue chính). Không đè lời đọc câu hỏi/đếm ngược.
- **Câu soạn sẵn:** ngoài ô gõ tự do có danh sách câu mẫu operator tự thêm/xoá (lưu cục bộ phía server, vd `data/mc-chat-presets.json`, file này phải nằm trong .gitignore). Câu mẫu dùng cache giọng như cue thường (bấm lại không tốn lượt).
- **Ô tích "Đọc giọng"** (mặc định bật): bỏ tích thì chỉ hiện chữ trong bubble.

## Yêu cầu kỹ thuật
1. Server: endpoint admin (có guard token) nhận `{ text, speak }`; giới hạn độ dài (đề xuất 120 ký tự, khớp bubble — kiểm tra thực tế bubble overlay), trim, chặn rỗng. Qua đúng **bộ lọc an toàn giọng** hiện có (`apps/server/src/voice/safety.ts` — chặn tên/ID người chơi, từ bậy) và **từ điển phát âm** `data/mc-pronunciation.json`. Bị chặn giọng thì vẫn có thể hiện chữ? → KHÔNG: nếu câu chứa tên người chơi/từ bị chặn thì từ chối cả câu và báo lý do rõ cho operator.
2. Hàng chờ có giới hạn (vd tối đa 5 câu), Dashboard thấy hàng chờ và huỷ được câu chưa phát. Phiên MOCK cũng dùng được. Chỉ phát khi phiên bật `mcVoiceEnabled` (nếu tắt thì chỉ hiện chữ).
3. Bubble hiện câu trong thời lượng giọng (hoặc ~4–6 s nếu chỉ chữ), sau đó trả về bubble mặc định của pha.
4. Ghi log hành động operator (audit) như các lệnh khác.
5. Dashboard: component mới (vd `apps/dashboard/src/McChatPanel.tsx`) đặt trong Live Control, chèn vào main.tsx tối thiểu (codex2 đang sửa main.tsx cho C-0260 → hạn chế xung đột). Gồm ô nhập + đếm ký tự, tích "Đọc giọng", nút Gửi, danh sách câu mẫu (thêm/xoá/bấm để gửi), hàng chờ.
6. Test dùng mock provider — **không gọi sinh giọng thật** (tốn lượt). Không đưa domain/ID nội bộ dịch vụ giọng vào repo/thư.

## Tiêu chí xong
- Unit test: xếp hàng khi READING/ACCEPTING, phát khi LEADERBOARD; câu có tên người chơi bị từ chối; speak=false chỉ hiện chữ; câu mẫu dùng lại cache.
- E2E dashboard+overlay: gửi câu → bubble overlay hiện đúng chữ.
- typecheck, test, privacy:check, e2e PASS. Kiểm tra cuối file không có `\n` literal.
- Làm SAU C-0257 và C-0259. Nhánh `codex1/c-mc-chat`, báo lại bằng thư.
