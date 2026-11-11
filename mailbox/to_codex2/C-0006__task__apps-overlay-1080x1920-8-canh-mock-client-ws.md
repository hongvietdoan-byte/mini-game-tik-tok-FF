---
id: C-0006
from: coordinator
to: codex2
type: task
title: apps/overlay 1080x1920, 8 cảnh, mock, client WS
ref: 
priority: high
needs: 
created: 2026-11-11T10:58:38+07:00
---
# apps/overlay — khung 9:16, 8 cảnh, chế độ mock, client WS

## Mục tiêu
Browser source 1080×1920 cho OBS/TikTok LIVE Studio, render hoàn toàn từ `PublicSnapshot` (`@quiz/contracts`). Phase 1 = bố cục rõ ràng, dễ đọc;
**chưa dùng asset ảnh nào** (cúp/chibi/logo là Phase 5) — chỉ token màu + CSS (gradient, viền góc cạnh, bóng đổ nhẹ).

## Phạm vi file
- `apps/overlay/**` (index.html, vite.config.ts, src/**). Được thêm devDependency trong `apps/overlay/package.json` nếu thật cần (ghi lý do); lockfile cập nhật bằng `corepack pnpm install`.
- Không sửa `packages/**`, `apps/server/**`. Thiếu trường dữ liệu → gửi `question`, không tự thêm vào contracts.

## Yêu cầu
1. Vite 6 + React 18 + TS. `vite.config.ts`: cổng 5174, `strictPort`, host `127.0.0.1`, proxy `/api` + `/ws` (ws: true) → `http://127.0.0.1:8787` (xem `docs/API_CONTRACT.md`).
2. **Sân khấu cố định 1080×1920**: một `div#stage` kích thước thật 1080×1920, scale bằng CSS transform để vừa cửa sổ (giữ tỉ lệ, nền trong suốt bên ngoài). Mọi toạ độ bố cục tính theo px của khung 1080×1920.
3. **Lớp độc lập** (DOM riêng, không gộp thành 1 ảnh): nền, khung câu hỏi, đồng hồ, 4 đáp án, đếm số người trả lời, bảng xếp hạng, podium, nhãn DEMO, banner trạng thái.
4. Cảnh theo `snapshot.scene`:
   - `LOBBY`: tên chương trình (chữ, không logo), hướng dẫn "Bình luận A, B, C hoặc D để trả lời", số người tham gia.
   - `QUESTION`: số câu `n/15`, câu hỏi, 4 đáp án A–D, đồng hồ đếm ngược lớn, tổng số người đã trả lời. PREPARE (state=`PREPARE`) hiện "Chuẩn bị…" + đồng hồ. Không có thông tin đáp án đúng.
   - `REVEAL`: tô đáp án đúng (`reveal.correctOptionId`), thanh phân bố A/B/C/D (`reveal.optionCounts`), giải thích ngắn.
   - `INTERIM_TOP10`: Top 10 (hạng, tên, điểm, số câu đúng). Nếu chữ < 40px khi xếp 2 cột thì phân trang 1–5 rồi 6–10 (tự chuyển mỗi 2 s). Hạng hoà hiển thị cùng số hạng + nhãn "ĐỒNG HẠNG". Ít hơn 10 người → chỉ hiện số người có thật.
   - `ROUND_WINNER`: "Kết thúc vòng" + Top 3 dạng thẻ.
   - `VICTORY`: bục 3 vị trí — trái hạng 2, giữa hạng 1 (cao nhất), phải hạng 3; hình người = **silhouette CSS trong suốt** (placeholder), nameplate (tên + điểm) đặt ngay trên avatar; `podium.tieAcrossCutoff` hoặc slot `tied` → hiện "ĐỒNG HẠNG" và mọi tên trong nhóm, không gán hạng khác nhau. Không có khối số 1/2/3 kiểu hộp chung chung.
   - `INTERMISSION`: "Nghỉ giữa vòng" + đồng hồ.
   - `CONNECTION_LOST`: banner "Đang tạm dừng — mất kết nối nguồn bình luận" (khi `state=ERROR`: "Tạm dừng kỹ thuật"); không lộ chi tiết lỗi.
   - `paused=true` ở bất kỳ cảnh nào → lớp phủ "TẠM DỪNG", đồng hồ đứng yên.
5. **Vùng an toàn**: mọi chữ bắt buộc (câu hỏi, đáp án, đồng hồ, tên/hạng/điểm) phải nằm trong `snapshot.safeZone` (top/bottom/left/right). Query `?guides=1` vẽ lớp hướng dẫn
   (viền vùng cấm màu đỏ mờ + nhãn "Preset thử nghiệm — không phải số chính thức TikTok"); mặc định không vẽ.
6. **Token màu** (CSS variables): `--deep:#2D387F --violet:#7049F5 --gold:#FFCC58 --coral:#E47E5F --pink:#D24470 --sky:#8CC8FB`. Font: stack hệ thống hỗ trợ tiếng Việt
   (`"Segoe UI", "Be Vietnam Pro", Roboto, Arial, sans-serif`), không nhúng file font. Chữ tối thiểu 36px với nội dung chính, đáp án ≥ 44px, câu hỏi tự co 64→44px theo độ dài.
   `prefers-reduced-motion` → tắt animation. Animation chuyển cảnh nhẹ (fade/slide ≤ 400 ms), không chớp nháy, không hiệu ứng sau chữ.
7. **Tên người chơi**: render bằng text node React (không `dangerouslySetInnerHTML`), cắt `text-overflow: ellipsis`. Server đã sanitize nhưng overlay vẫn coi là không tin cậy.
8. **Nhãn DEMO** góc trên khi `question.isDemo`.
9. **Client WS** (`src/net/useSnapshot.ts`): theo `docs/API_CONTRACT.md` — HELLO role `overlay`, giữ snapshot có `stateVersion` lớn nhất, bỏ thông điệp cũ hơn, tự nối lại (0.5 s → 5 s), gửi `lastStateVersion`.
   Đồng hồ nội suy cục bộ bằng `requestAnimationFrame` từ `timer.remainingMs` + độ lệch `serverTimeMs`.
10. **Chế độ mock** (`?mock=<scene>` với scene ∈ lobby|prepare|question|reveal|top10|top10-short|round-winner|victory|victory-tie|intermission|connection-lost|paused):
    snapshot giả trong `src/mock/snapshots.ts` (tên hư cấu, câu hỏi DEMO, gồm tên dài / emoji / chuỗi `<script>`), không cần server. `?mock=cycle` lần lượt qua mọi cảnh mỗi 3 s.
    Snapshot mock của `question` phải **không** chứa trường đáp án đúng (đúng hình dạng `PublicSnapshot`).
11. Thuộc tính `data-scene`, `data-testid` ổn định cho Playwright (C-0008): `stage`, `question-prompt`, `option-A..D`, `timer`, `answer-count`, `leaderboard-row`, `podium-slot-1..3`, `demo-badge`, `safe-zone-guides`.
12. Test thuần (vitest unit, `apps/overlay/src/**/*.test.ts`) cho logic không cần DOM: chọn snapshot theo stateVersion, nội suy đồng hồ, phân trang Top 10, thứ tự podium (2-1-3).

## Tiêu chí xong
- `corepack pnpm --filter @quiz/overlay build` thành công; `corepack pnpm typecheck` sạch; vitest unit xanh.
- Chạy `corepack pnpm --filter @quiz/overlay dev`, mở mọi `?mock=` → không lỗi console. Ảnh chụp từng cảnh để ở `test-results/overlay-c0006/` (không commit), ghi đường dẫn trong report.
- Nhánh `codex2/c0006-overlay`.
