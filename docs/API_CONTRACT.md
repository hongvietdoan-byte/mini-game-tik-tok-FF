# Hợp đồng API Phase 1 (server ↔ overlay / dashboard)

Nguồn kiểu dữ liệu duy nhất: `packages/contracts/src/index.ts`. File này chỉ chốt **đường dẫn, cổng, xác thực**.
Coordinator giữ file này; Codex không tự đổi — cần đổi thì gửi `question`.

## Cổng (mặc định, đổi bằng biến môi trường)

| Thành phần | Địa chỉ | Biến |
|---|---|---|
| server (Fastify + WS) | `http://127.0.0.1:8787` | `QUIZ_PORT`, `QUIZ_HOST` (mặc định `127.0.0.1`) |
| dashboard (Vite) | `http://127.0.0.1:5173` | — |
| overlay (Vite) | `http://127.0.0.1:5174` | — |

Cả hai app Vite proxy `/api` và `/ws` (ws: true) sang `127.0.0.1:8787`, nên trong code luôn gọi **đường dẫn tương đối**
(`/api/...`, `ws(s)://<location.host>/ws`).

## Xác thực admin

- Token sinh lần chạy đầu, lưu `data/admin-token.txt` (thư mục `data/` bị ignore). Server in ra console đường dẫn file, **không in token**.
- HTTP admin: header `Authorization: Bearer <token>`. Không bao giờ đặt token trong URL/query.
- Dashboard: operator dán token vào ô "Mã quản trị" → lưu `sessionStorage` (không `localStorage`).
- Mọi request đổi dữ liệu (POST) kiểm `Origin`: chỉ chấp nhận không có Origin hoặc
  `http://127.0.0.1:5173|5174`, `http://localhost:5173|5174`. Sai → 403.

## HTTP

| Method | Path | Auth | Body → Response |
|---|---|---|---|
| GET | `/health` | — | `{ ok: true, contractVersion, sessionId: string \| null }` |
| GET | `/api/sessions/current` | — | `{ sessionId: string \| null }` (phiên OPEN mới nhất) |
| POST | `/api/sessions` | admin | `CreateSessionRequest` → `201 { sessionId, snapshot: AdminSnapshot }`; đã có phiên OPEN → `409 { code: 'SESSION_ALREADY_OPEN', sessionId }`; mode ≠ MOCK → `422 NOT_ALLOWED_IN_MODE` (LIVE_CONNECTOR_BLOCKED) |
| GET | `/api/sessions/:id/state` | — / admin | không token → `PublicSnapshot`; có token → `AdminSnapshot` |
| POST | `/api/sessions/:id/commands` | admin | `CommandEnvelope` → `CommandResult` (xem mã HTTP dưới) |
| POST | `/api/sessions/:id/simulator` | admin, chỉ MOCK | `SimulatorRequest` → `{ ok, running, players }` |
| POST | `/api/sessions/:id/connection` | admin, chỉ MOCK | `{ action: 'LOSE' \| 'RESTORE' }` → `{ ok, status }` (giả lập rớt nguồn comment) |
| POST | `/api/sessions/:id/comments` | admin, chỉ MOCK | `{ userId, displayName, text, eventId? }` → `{ ok }` (bơm 1 comment tay) |
| GET | `/api/sessions/:id/history` | admin | `{ rounds: [...], actions: [...] }` (xem `Store.history`) |
| GET | `/api/questions` | admin | `Question[]` của pack phiên hiện tại |
| GET | `/api/diagnostics` | admin | `{ metrics, recentRejections, db: { path, walMode }, uptimeMs }` |
| POST | `/api/sessions/:id/source` | admin | `{ action: 'CONNECT' \| 'DISCONNECT' \| 'RECONNECT' }` → `{ ok, health: LiveSourceHealth }` — Connection Manager. Mất kết nối giữa câu → `CONNECTION_INTERRUPTED`; kết nối lại KHÔNG tự chạy tiếp (operator bấm Tiếp tục) |
| GET | `/api/system/checks` | admin | `{ checks: SystemCheck[9], live, overlay }` — Connection Test 9 bước, mỗi bước `PASS` / `FAIL` / `NOT_TESTED` + `detail` |
| POST | `/api/system/selftest` | admin | `{ ok, mockComment, engineRecorded, detail, durationMs }` — tự kiểm pipeline trên DB tạm (không đụng phiên LIVE); kết quả dùng cho bước 5 và 8 |

Mã HTTP của `/commands`:
- `200` — `ok: true` (kể cả `duplicate: true` khi gửi lại cùng `commandId`).
- `409` — `code: 'STALE_STATE_VERSION'`. Dashboard phải lấy snapshot mới rồi cho operator bấm lại (không tự gửi lại).
- `422` — các `code` khác (`ILLEGAL_TRANSITION`, `RECOVERY_PENDING`, `INSUFFICIENT_QUESTIONS`, `CONNECTION_NOT_READY`, …) hoặc body sai schema (`VALIDATION_FAILED`).
- `401` thiếu/sai token, `403` sai Origin, `404` không có phiên.

`commandId`: dashboard sinh `crypto.randomUUID()` **một lần cho mỗi lần bấm**; nếu mạng lỗi thì gửi lại **cùng** commandId.

## WebSocket `/ws`

1. Client mở kết nối, gửi ngay `ClientHello` (`{type:'HELLO', role:'overlay'|'admin', token?, lastStateVersion?}`).
   Admin gửi token trong HELLO (không trong URL). Sai token → server đóng với code `4401`.
2. Server trả ngay một snapshot: overlay nhận `STATE_SNAPSHOT` (PublicSnapshot), admin nhận `ADMIN_SNAPSHOT`.
3. Sau đó mỗi lần trạng thái đổi server gửi lại snapshot đầy đủ (+ có thể kèm các thông điệp sự kiện trong `WS_MESSAGE_TYPES`).
   **Client chỉ cần render từ snapshot**; bỏ qua mọi thông điệp có `stateVersion` nhỏ hơn bản đang giữ.
4. `ANSWER_COUNTS` có thể đến nhiều lần trong cùng `stateVersion` (đếm số đáp án) — cập nhật `answerCount`/`participantCount`.
5. Đồng hồ: dùng `timer.remainingMs` + `serverTimeMs` của thông điệp để nội suy; khi `timer.running=false` thì đứng yên.
6. Mất kết nối: tự nối lại (backoff 0.5 s → tối đa 5 s), gửi lại HELLO với `lastStateVersion`; **không phát lại hiệu ứng cũ**.
7. Ý nghĩa trường (server thật, có test tích hợp) — cập nhật V3 (11/11):
   - `round.questionIndex` **bắt đầu từ 0** → hiển thị `questionIndex + 1` / `questionCount`.
   - `question`: có ở PREPARE, ACCEPTING, REVEAL và LEADERBOARD ngắn (kể cả khi đang PAUSED/CONNECTION_INTERRUPTED từ đó).
     **PREPARE: `options = []`, `optionsVisible = false`** — chỉ hiện câu hỏi; mở nhận đáp án (ACCEPTING) mới có 4 đáp án (người dùng chốt).
   - Sau MỖI câu đã công bố có trạng thái `LEADERBOARD` ngắn (`leaderboardMs`, 9 s): `scene = 'REVEAL'` (giữ bố cục câu hỏi, đáp án đúng vẫn hiện, Top 10 gọn cập nhật).
     Ở mốc (mỗi 5 câu + câu cuối): `scene = 'INTERIM_TOP10'`, BXH lớn (`bigLeaderboardMs`, mặc định 6 s). Câu bị huỷ trước công bố chỉ vào LEADERBOARD nếu là mốc.
   - `reveal`: chỉ có ở REVEAL và LEADERBOARD ngắn ngay sau đó.
   - `fastestCorrectAnswer`: null ngoài công bố đáp án / BXH sau câu; nếu có đáp án đúng thì gồm `questionInstanceId`, `publicPlayerId`, `seatId`, `safeDisplayName`, `responseMs`. `publicPlayerId` là mã opaque cùng giá trị với `leaderboard.entries[].playerId`; `seatId` là `audience.seats[].slotId` hoặc null khi người thắng chưa có ghế. `responseMs` tính từ `opened_at_ms` tới thời điểm server nhận đáp án; cùng timestamp giữ đáp án được lưu trước.
   - `leaderboard`: `COMPACT` (≤ 10) trong mọi cảnh câu hỏi (PREPARE/ACCEPTING/REVEAL/LEADERBOARD ngắn) — chỉ đổi khi chốt câu;
     `FULL` (≤ 10) ở BXH lớn / ROUND_END / VICTORY / INTERMISSION; còn lại null.
   - `podium` chỉ ở ROUND_END / VICTORY. `answerCount` = tổng đáp án được nhận của câu hiện tại (0 ở PREPARE).
   - `mc: { state: 'idle'|'welcome'|'ask'|'react'|'celebrate', bubble }` — MC Kelly, không phải người chơi; lời thoại do server quyết định.
   - Mọi thông điệp có `seq` tăng đơn điệu trong một lần chạy server; client thấy `seq` hụt hoặc nhỏ hơn bản đang giữ (server khởi động lại) → dùng snapshot mới nhất.

### Thời lượng mặc định có đồng hồ trên overlay

| Pha / cấu hình | Cũ | Mới | Overlay có đồng hồ đếm giây |
| --- | ---: | ---: | --- |
| `lobbyMs` — sảnh chờ | 30 s | 30 s | Không |
| `prepareMs` — chuẩn bị câu | 3 s | 8 s | Có |
| `answerMs` — nhận đáp án | 15 s | 20 s | Có |
| `revealMs` — công bố đáp án | 4 s | 9 s | Có |
| `leaderboardMs` — BXH ngắn sau câu | 4 s | 9 s | Có |
| `bigLeaderboardMs` — BXH lớn | 6 s | 6 s | Không |
| `roundEndMs` — kết thúc vòng | 2 s | 2 s | Không |
| `victoryMs` — vinh danh | 18 s | 18 s | Không |
| `intermissionMs` — nghỉ giữa vòng | 25 s | 30 s | Có |

Pha MC đọc câu dùng `MAX_MC_READING_MS = 20 s` nhưng overlay hiện trạng thái đọc, không hiện bộ đếm; giá trị này giữ nguyên. Session đã lưu với thời lượng tường minh tiếp tục giữ cấu hình cũ; giá trị mới chỉ điền cho cấu hình thiếu trường hoặc tạo session mới.
8. **ACK của overlay (V3.1):** sau mỗi lần render xong một snapshot, overlay gửi `{ type: 'ACK', stateVersion, seq? }` (`ClientAckSchema`). Server dùng để chấm bước 9 "Overlay cập nhật đúng". Kênh admin gửi ACK bị bỏ qua.
9. `AdminSnapshot.live` (`LiveSourceHealth`): `status`, `connectedSinceMs`, `lastCommentAtMs`, `commentsReceived`, `reconnects`, `detail`; `AdminSnapshot.overlay`: `{ clients, lastAckStateVersion, lastAckAtMs }` — số overlay đang kết nối, KHÔNG khẳng định OBS/LIVE Studio đang phát.
10. Kênh overlay **không bao giờ** nhận `correctOptionId` trước khi `state = REVEAL` (server bảo đảm; overlay không được tự suy).
