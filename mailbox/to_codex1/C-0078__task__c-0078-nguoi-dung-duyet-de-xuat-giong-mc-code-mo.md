---
id: C-0078
from: coordinator
to: codex1
type: task
title: C-0078: NGƯỜI DÙNG DUYỆT đề xuất giọng MC — code mốc 1→3 + kho lời dẫn (sau C-0077)
ref: X-0121
priority: high
needs: 
created: 2026-11-11T22:02:11+07:00
---
Người dùng (11/11 ~22:05) "Duyệt theo đề xuất" `docs/review/MC_VOICE_DE_XUAT.md` (đã gộp main b5feab8). Chốt 5 điểm:
1. Trần đọc mỗi câu (câu hỏi + 4 đáp án): **20 s**; quá thì huỷ audio, mở ACCEPTING bằng chữ.
2. Audio lease: operator chọn "overlay chính" trên dashboard; overlay đó reconnect trong grace period giữ lease; đổi overlay khác phải operator xác nhận.
3. Token: Electron `safeStorage` (DPAPI) trong app data; chạy dev thì biến môi trường. Không lưu plaintext, không trả về client (chỉ `••••`+4 ký tự cuối).
4. Chuẩn hoá −16 LUFS mono, trim khoảng lặng đầu/cuối > 300 ms (đo theo mẫu cục bộ).
5. Gọi API thật: chỉ coordinator, sau khi code + test fake xanh; thử 2–3 câu cho người dùng nghe rồi mới pre-generate bộ câu đã duyệt.

Làm sau khi xong C-0077. Phạm vi mở: `packages/contracts/**`, `packages/quiz-core/**`, `apps/server/**`, `apps/overlay/src/net/**`, `apps/overlay/src/v3/mc/**`, 1 điểm móc audio/bubble trong `ArenaStage.tsx` (không đụng CSS/layout — Codex 2 đang sửa), `scripts/privacy-check.*`, tests. Dashboard Settings (mốc 4) giao Codex 2 — bạn cung cấp API server + mô tả hợp đồng cho Codex 2 trong report.
Bổ sung: kho lời dẫn `docs/review/MC_LOI_THOAI.md` (đề xuất, người dùng duyệt): chào sảnh, mở câu N, công bố đáp án đúng/tỉ lệ, người nhanh nhất, top1 chuỗi x2/x3, BXH tạm, nghỉ giữa vòng, chúc mừng top 3, tạm dừng/mất kết nối — mỗi loại 3–5 biến thể, ≤ 90 ký tự, chủ đề Free Fire, `{name}` chỉ dùng tên đã lọc. Bong bóng MC hiển thị đúng câu đang đọc.
Nhắc repo public: không ghi endpoint/mã giọng/URL CDN/token vào repo hay thư. Nộp từng mốc theo nhánh riêng (`codex1/c0078-m1-engine-reading`, `-m2-voice-server`, `-m3-overlay-playback`) để gộp dần; mỗi mốc typecheck + test + e2e xanh.
