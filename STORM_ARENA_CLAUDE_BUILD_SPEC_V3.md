# STORM ARENA LIVE QUIZ — MASTER IMPLEMENTATION SPEC V3.0
**Ngày:** 11/11/2026  
**Đối tượng:** Claude Code / kỹ sư full-stack  
**Mục tiêu:** Ứng dụng Windows local-first, phát overlay 9:16 qua OBS/TikTok LIVE Studio, Quiz bằng comment, khán giả chibi trong đấu trường, MC Kelly, Top 10, màn hình vinh danh Top 3.  
**Trạng thái:** Tài liệu giao việc. Không tuyên bố tích hợp TikTok thật khi chưa kiểm thử.

## 0. NGUỒN THIẾT KẾ VÀ THỨ TỰ ƯU TIÊN
1. **Mẫu giao diện đã duyệt mới nhất:** `a_highly_detailed_neon_esports_quiz_livestream_pos.png` — có MC Kelly, câu hỏi, BXH Top 10, 7 hàng ghế × 5 chỗ = **35 vị trí hiển thị**. Đây là **visual target**, không phải file giao diện động.
2. Visual Guide Storm Arena: `1920x1080.jpeg`, `1920x1080-01.jpeg`, `1920x1080-02.jpeg`, `1920x1080-03.jpeg`, `1920x1080-06.jpeg`, `1920x1080-07.jpeg`, `1920x1080-08.jpeg`.
3. Bối cảnh đấu trường/cúp/chibi: `IMG_2124.jpeg`, `IMG_2125.jpeg`, `IMG_2134.jpeg`, `IMG_2141.jpeg`, `IMG_2142.jpeg`, các file IMG khác do người dùng cung cấp.
4. Tài liệu dữ liệu sự kiện: `DAU_TRUONG_BAO_TO_Megasheet_CS.xlsx`. Chỉ dùng thông tin sự kiện đã xác minh và được duyệt; **không import nguyên workbook vào sản phẩm, không lộ dữ liệu cá nhân, lịch nội bộ, liên hệ, tài khoản**.
5. Tài liệu nền: `CLAUDE_MASTER_BUILD_PLAN_V2.md`. Nếu mâu thuẫn về UI/khán giả/animation, **v3.0 được ưu tiên**; các module khác giữ nguyên v2.0.
6. Logo giải đấu và logo đội: dùng đúng file có quyền sử dụng; không tự tạo logo Free Fire trên đầu giao diện. Không sao chép tên/đáp án demo như dữ kiện đã xác thực.

## 1. SẢN PHẨM VÀ PHẠM VI
Ứng dụng gồm: Dashboard điều hành; Overlay 1080×1920; Quiz Engine; Comment Adapter (Mock + TikTok); Audience Seating/Character Registry; Theme Pack; Question Bank; AI Question Studio; Leaderboard; Victory Ceremony; SQLite persistence; diagnostics, recovery.

**Ưu tiên MVP:** Offline Quiz + Mock Comment + overlay giống mẫu + 35 chỗ ngồi + Top 10 + MC Kelly PNG Sequence + Victory Scene có chibi tĩnh hoặc sequence mẫu. **Tiếp theo:** TikTok thực tế, AI Studio, thêm nhiều character sequence, hiệu ứng phong phú. Không xây dựng game 3D, skeletal rig, Spine, Rive hoặc hệ thống quà tặng.

## 2. KIẾN TRÚC
- Frontend: React + TypeScript + Vite; CSS cho HUD; PixiJS (hoặc Canvas 2D nếu benchmark phù hợp) cho khán giả/MC/particle PNG Sequence.
- Backend: Node.js + TypeScript + Fastify + WebSocket; SQLite với migrations; Zod schemas.
- Một process backend là **authoritative state** cho thời gian, câu hỏi, người chơi, điểm, ghế và thứ hạng.
- Routes: `/dashboard` (điều hành), `/overlay` (chỉ trình chiếu), `/preview` (overlay + mô phỏng HUD TikTok). Bind loopback mặc định; không lộ đáp án đúng trước reveal.
- Các package: `shared`, `game-engine`, `comment-adapters`, `question-bank`, `theme-manager`, `audience-engine`, `character-renderer`, `victory-scene`, `database`, `ai-studio`.
- Chỉ truyền DTO an toàn đến overlay; API điều hành phải được bảo vệ. Không render HTML từ comment/tên người dùng.

## 3. BỐ CỤC 9:16 — BẢN CHÍNH THỨC
Thiết kế trong hệ tọa độ logic 1080×1920, scale đồng nhất. Mẫu cuối có **7 hàng × 5 chibi**; không tăng số ghế chỉ bằng cách thu nhỏ quá mức. Các khoảng dưới đây là **điểm xuất phát** và cần kiểm thử HUD trên điện thoại thật:

| Khu vực | Y tham khảo | Nội dung |
|---|---:|---|
| Header | 80–250 | Logo Storm Arena nhỏ bên trái; Bá Vương Đại Chiến trung tâm; vòng/trận và số người bên phải |
| Quiz board | 260–760 | BXH Top 10 gọn bên trái; câu hỏi và timer phía phải/trung tâm; đáp án A/B/C/D |
| MC / hướng dẫn | 760–1070 | MC Kelly bên trái; bubble hướng dẫn comment bên phải |
| Audience arena | 1080–1850 | 7 hàng ghế, 5 ghế/hàng, nhân vật nhìn về sân khấu, bảng tên nhỏ |
| Bottom ambient | 1850–1920 | Chỉ trang trí, không có dữ liệu bắt buộc |

**Cảnh báo:** HUD TikTok thường che bên phải và phần dưới, và comment có thể phủ lên Audience. Vì vậy cần **safe-zone editor** cho phép operator điều chỉnh offset/scale của Quiz board, MC, bảng điểm, audience; các yếu tố quan trọng (câu hỏi, timer, đáp án) phải nằm trong vùng đã kiểm thử. Audience là lớp thứ cấp, chấp nhận bị che một phần. Tạo preset `TikTok Standard`, `High Comment Density`, `Custom`; preset chỉ là giả định, cần nghiệm thu LIVE thật.

**Visual hierarchy:** câu hỏi > đáp án > timer > BXH > MC > khán giả > trang trí. Tránh glow quá mạnh làm chữ mờ. Giữ màu `#2D387F`, `#7049F5`, `#FFCC58`, `#8CC8FB`, `#D24470`, `#E47E5F`. Sử dụng font display phù hợp nhận diện ở heading và font Unicode tiếng Việt dễ đọc ở câu hỏi/đáp án/tên.

**Tách layer:** `background-storm`, `arena-depth`, `brand-header`, `quiz-hud`, `leaderboard`, `kelly`, `audience-seats`, `audience-characters`, `audience-nametags`, `ambient-particles`, `transitions`. Không dùng ảnh concept đã ghép chữ và người làm background nguyên khối. Nếu chưa có asset tách lớp, dùng placeholder rõ ràng và lập danh sách asset cần xuất; tuyệt đối không giả vờ đã có asset trong suốt.

## 4. LUỒNG MỘT BUỔI LIVE
1. Operator chọn Theme Pack, ngân hàng câu đã APPROVED, số câu/trận, cấu hình timing, chính sách lặp câu, chế độ kết nối, audience seating, auto mode.
2. Kiểm tra: Theme hợp lệ, asset tối thiểu, đủ câu, database ghi được, comment adapter sẵn sàng. Nếu thiếu, chặn Start và hiển thị lý do.
3. LOBBY 30 giây: MC Kelly `welcome/idle`, đấu trường sáng nhẹ, hướng dẫn `Comment A/B/C/D để tham gia`; người xem có thể comment `JOIN` nếu bật. Mặc định auto-join bằng câu trả lời hợp lệ.
4. PREPARE 3 giây: chọn snapshot câu tiếp theo, hiển thị câu hỏi + 4 lựa chọn nhưng **chưa nhận đáp án**; timer chuẩn bị.
5. ANSWER_OPEN 15 giây: backend phát `question.opened` kèm `questionInstanceId`, `opensAt`, `deadlineAt` và payload **không có đáp án đúng**; comment hợp lệ đầu tiên của mỗi player được ghi nhận.
6. ANSWER_LOCKED: khóa ghi nhận theo clock backend; transaction chấm điểm và cập nhật leaderboard; không tin thời gian đồng hồ của browser.
7. REVEAL 4 giây: hiển thị đáp án đúng, số người đúng/sai; MC Kelly `react_correct` hoặc `react_neutral` nếu có sequence, fallback idle.
8. LEADERBOARD 4 giây: cập nhật Top 10; mỗi 5 câu có thể mở overlay BXH riêng 5–8 giây theo cấu hình.
9. Lặp đến 15 câu; FINISHED → Victory Ceremony 15–20 giây → INTERMISSION 20–30 giây → trận mới nếu auto mode và điều kiện đủ.
10. Operator có Start/Pause/Resume/Skip/Cancel Question/Stop/Next Round. Mọi thao tác đều log và phải kiểm tra transition hợp lệ.

State machine: `IDLE → LOBBY → PREPARE → ANSWER_OPEN → ANSWER_LOCKED → REVEAL → LEADERBOARD → (PREPARE | FINISHED) → VICTORY → INTERMISSION → LOBBY`. Trạng thái `PAUSED`, `CONNECTION_INTERRUPTED`, `ERROR` là nhánh xử lý có snapshot; không tự chấm lại khi resume.

## 5. LOGIC COMMENT, ĐỊNH DANH, CHỐNG SPAM
- Chuẩn hóa `userId` ổn định, `displayName`, `text`, `eventId?`, `receivedAt`, `source`. **Không dùng nickname làm khóa**.
- Chỉ nhận câu trả lời khi `ANSWER_OPEN` và `serverReceivedAt < deadlineAt`; trim + uppercase; chỉ chấp nhận đúng `A`, `B`, `C`, `D` (không tự tìm ký tự trong câu dài).
- Một player chỉ có **một đáp án hợp lệ đầu tiên** mỗi `questionInstanceId`; database unique `(question_instance_id, player_id)`; xử lý transaction/serial queue để tránh race condition.
- Comment lặp không cộng điểm, comment sau deadline bị từ chối, comment cũ sau reconnect không được tính sang câu mới. Nếu event ID có sẵn, dedupe theo source+eventId; nếu không, unique answer vẫn chống tính điểm kép.
- Nếu comment adapter không cung cấp ID ổn định, không chấm điểm chính thức cho event đó; hiển thị cảnh báo adapter.
- Reconnect: pause trận, thông báo nguồn dữ liệu có thể thiếu; operator chọn resume/restart/cancel question. Không tuyên bố nhận đủ 100% comment.
- Gift/like/follow không tham gia scoring. Không có cơ chế trả tiền để tăng điểm.

## 6. PLAYER REGISTRY VÀ KHÁN GIẢ CHIBI
**Hai khái niệm tách biệt:** `registeredPlayers` (có thể hàng trăm/nghìn) và `visibleAudienceSlots` (35 vị trí trên màn hình). **Số ghế không giới hạn số người được tham gia.**

### 6.1 Gán nhân vật
- Khi player lần đầu có câu trả lời hợp lệ hoặc JOIN (nếu bật), tạo `roundPlayer` và `characterId` bằng seeded RNG/assignment được lưu trong DB. Không random lại mỗi render.
- Character Pool bản đầu 8–12 chibi (có thể tạm dùng 3 mẫu khi chưa đủ asset). Nhân vật có thể trùng giữa các user; không thay nhân vật sau khi người chơi thắng.
- `characterId`, `paletteVariant?`, `assignedAt`, `roundId`, `playerId` được lưu; giữ trong suốt trận; cấu hình cho phép giữ qua nhiều trận về sau.
- Fallback character nếu asset thiếu. Không sử dụng ảnh chân dung thật của user.

### 6.2 Ghế và thứ tự hiển thị
- 35 slot: `rowIndex=0..6`, `seatIndex=0..4`, `slotId`, `x`, `y`, `scale`, `depth`, `occupiedBy?`.
- Mỗi hàng phía sau nhỏ hơn nhẹ, cao hơn theo phối cảnh; nhân vật không được đè tên của hàng trước.
- **MVP:** khi user mới tham gia, cấp ghế trống gần nhất theo thứ tự ổn định. Khi 35 ghế đầy, người mới vẫn tham gia Quiz và được chấm điểm, nhưng không xuất hiện ngay; vào `waitingAudienceQueue`.
- Nếu một người rời LIVE, **không xóa ghế ngay** vì nguồn có thể không cung cấp sự kiện rời đáng tin cậy. Dùng cơ chế `audienceRotation` giữa các câu (ví dụ mỗi 2 câu): thay tối đa 5 slot không được pin, ưu tiên người đang hoạt động gần đây hoặc hàng chờ; có transition fade 250–500ms.
- `PinnedSlots`: có thể pin Top 3/Top 10 hoặc user nổi bật; giới hạn tối đa 5, có thể tắt. Không bảo đảm mọi user đều xuất hiện cùng lúc.
- Khi người chơi được chọn hiển thị, dùng `seatAssigned` event và giữ slot ổn định đến lần rotation; không shuffle mọi người mỗi comment.
- Không cho tên người dùng quá dài làm vỡ bố cục: Unicode normalize, escape, ellipsis, tooltip chỉ trong dashboard; hiển thị nickname ngắn 10–14 ký tự tùy slot.

### 6.3 Hiệu ứng phản ứng
- Nhận câu hợp lệ: nhân vật trong ghế có thể phát `answer`/nhún nhẹ một lần; không nhấp nháy toàn bộ màn hình.
- Trả lời đúng sau REVEAL: glow ngắn 0.5s; trả lời sai: animation trung tính, không làm nhục người chơi.
- Với user không có ghế, vẫn cập nhật điểm bình thường. Không làm tăng FPS hoặc số particle theo số comment.

### 6.4 Công thức chọn người lên ghế (MVP)
`eligible = roundPlayers active`; giữ người đang ngồi trừ khi tới mốc rotation; fill ghế trống từ queue; sau đó có thể chọn theo `lastAcceptedAnswerAt` và seeded shuffle để không thiên vị tài khoản có nhiều comment. Không dùng tổng số comment làm ưu tiên. Ghi `seatRotationId` để reload khôi phục đúng bố cục.

## 7. MC KELLY
- Kelly là MC cố định, **không tham gia bảng xếp hạng**. `MC_KELLY` không phải playerId; tên `FFVN.Kelly` trong demo chỉ là dữ liệu mẫu, tránh nhầm MC với người chơi.
- Render MC bên trái vùng giữa, bubble hướng dẫn bên phải. Bố trí tránh che Quiz HUD.
- Trạng thái: `idle`, `welcome`, `ask`, `react`, `celebrate` (MVP bắt buộc `idle`; còn lại fallback). Bảng tên `MC KELLY` là UI text động.
- Dùng PNG Sequence nền trong suốt, không dùng Spine/Rive. Nếu chưa có sequence của Kelly, dùng PNG tĩnh có chuyển động nhẹ transform 1–2%, không giả lập blink từ ảnh tĩnh.
- Nội dung bubble theo state: LOBBY 'Bình luận A/B/C/D để tham gia'; ANSWER_OPEN 'Chọn đáp án ngay!'; REVEAL 'Đáp án đúng là ...'; INTERMISSION 'Trận tiếp theo sắp bắt đầu'. Bubble phải hỗ trợ nội dung dài và safe zone.

## 8. PNG SEQUENCE PLAYER — RENDERER
Manifest ví dụ:
```json
{
  "id": "chibi-kelly", "fallback": "poster.png", "scale": 1,
  "animations": {
    "idle": {"path": "idle/", "frames": 24, "fps": 10, "loop": true},
    "victory": {"path": "victory/", "frames": 36, "fps": 12, "loop": false}
  },
  "anchor": {"x": 0.5, "y": 1}
}
```
- Tên frame thống nhất `0001.png` ...; validator kiểm tra đủ frame, cùng kích thước canvas/anchor, alpha, dung lượng.
- Renderer dùng `requestAnimationFrame` + accumulated delta, texture cache; không tạo `<img>` mới mỗi frame. **Render loop và animation FPS độc lập**; chỉ preload sequence của MC + nhân vật đang hiển thị + Top 3 dự kiến khi gần kết thúc; không preload toàn bộ hàng trăm player.
- Hạn chế VRAM: texture atlas nếu phù hợp, max 35 visible character animations; người ngồi xa có thể dùng static/idle 4–6fps, MC 10–12fps. Chỉ cần `idle` ở MVP; `victory` là tùy chọn.
- Pause khi overlay hidden nếu không ảnh hưởng đồng bộ timer backend; khi hiện lại lấy state snapshot mới. Có reduced motion / low-performance toggle. Fallback static khi thiếu frame hoặc lỗi GPU.
- Không dùng ảnh concept tổng thể làm PNG Sequence. Bắt buộc tách lớp sân khấu, nhân vật, tên và bảng điểm.

## 9. QUIZ RULES / QUESTION SELECTION
- Mặc định 15 câu/trận; 7 dễ, 5 trung bình, 3 khó; 15 giây nhận đáp án; 3 giây prepare; 4 giây reveal; 4 giây leaderboard; chỉnh từ Dashboard.
- `SMART_RANDOM`: chỉ APPROVED; không trùng trong trận; ưu tiên không lặp trong session; quota theo độ khó và chủ đề con; nếu thiếu, hiển thị policy trước khi chạy; lưu `seed`, snapshot câu và answerKey server-only.
- Điểm: đúng +100; sai/không trả lời 0; streak đạt 3/5/10 lần thưởng +30/+50/+100 một lần tại mỗi mốc; sai hoặc bỏ câu reset streak. Không thưởng tốc độ mặc định vì độ trễ TikTok.
- Tie: điểm giảm dần, số câu đúng giảm dần, sau đó đồng hạng. Rank hiển thị phải có quy tắc đồng hạng nhất quán; Victory Top 3 cần xử lý đồng hạng (ví dụ operator chọn hiển thị 3 slot theo thứ tự ổn định và ghi 'đồng hạng', không tự tuyên bố người thắng duy nhất).
- Lưu lịch sử score events để audit; không cho chỉnh câu đã dùng làm thay đổi kết quả cũ.

## 10. BXH TOP 10
- Dữ liệu xếp hạng tính ở backend, overlay chỉ render.
- Trong Question Mode: panel Top 10 bên trái, compact, ưu tiên tên + điểm; cập nhật khi kết thúc câu, không xáo thứ hạng trong lúc trả lời.
- Cứ 5 câu hoặc khi operator chọn: scene BXH lớn trong vùng an toàn, Top 10 đầy đủ, số câu đúng tùy bố cục. Tránh che câu hỏi khi timer đang chạy.
- Chỉ cập nhật DOM khi có thay đổi; animation rank-change nhẹ 250–400ms; không chạy glow vô hạn trên mọi dòng.
- Với nickname dài, ellipsis và giới hạn chiều rộng; không hiển thị user ID công khai.

## 11. VICTORY CEREMONY — GIỮ CÚP GỐC
- Scene riêng 1080×1920; dựa trên bố cục đã duyệt: logo Bá Vương Đại Chiến ở trên (không logo Free Fire), cúp lớn ở giữa, ba chibi **đứng ở mặt sàn phía trước bục**, **không che phần chính của cúp**; Top 1 giữa, Top 2 trái, Top 3 phải.
- Không thêm ba cục bục TOP 1/2/3; giữ nguyên hình học sân khấu và cúp trong `IMG_2125.jpeg`/asset gốc. Tên và điểm là overlay riêng, không bake vào ảnh nền.
- Tên người chơi nằm gần chân nhân vật hoặc trên đầu tùy safe-zone, nhưng không che cúp; rank màu vàng/bạc/đồng; nếu thiếu nhân vật `victory` dùng `idle` hoặc static.
- Timeline cấu hình: 0–1.5s fade scene; 1.5–3s trophy glow; 3–5s xuất hiện 3 nhân vật; 5–7s nameplates; 7–15s idle; 15–20s chuyển lobby. Không có hiệu ứng nhấp nháy liên tục gây mỏi mắt.
- Victory lấy snapshot Top 3 từ backend; không tự chấm điểm, không random lại nhân vật. Bảo đảm các phần quan trọng không nằm trong vùng TikTok HUD đang dùng.

## 12. AI QUESTION STUDIO / NGUỒN DỮ LIỆU
- Các chức năng từ v2: tạo câu từ gợi ý, PDF, ảnh, text, URL công khai; 4 đáp án A–D, đúng một đáp án, explanation, source references, difficulty, subtopic, trạng thái DRAFT/PENDING_REVIEW/APPROVED/REJECTED.
- Không tự động đưa nội dung AI lên LIVE. Sửa câu APPROVED → quay về PENDING_REVIEW. Batch 10–20 câu; schema validation, duplicate check, human approval.
- Import từ workbook sự kiện **chỉ các cột/đoạn nội dung đã được người vận hành chọn và duyệt**; không gửi nguyên Megasheet nội bộ đến provider AI. Có preview và redaction trước khi gửi API ngoài.
- Facebook URL có thể không đọc được; báo lỗi rõ và cho upload ảnh/caption thủ công. Không bypass CAPTCHA/login.

## 13. DATABASE — TỐI THIỂU
`theme_packs`, `questions`, `question_versions`, `question_sources`, `sessions`, `rounds`, `round_questions`, `players`, `round_players`, `answers`, `score_events`, `audience_slots`, `audience_assignments`, `character_definitions`, `character_assignments`, `game_snapshots`, `ai_generation_jobs`, `logs`, `settings`.

Constraints:
- `answers`: unique `(question_instance_id, player_id)`.
- `character_assignments`: unique `(round_id, player_id)`.
- `audience_assignments`: chỉ một occupant/slot trong cùng `seatRotationId`, và một player không được chiếm hai ghế đồng thời.
- `round_questions`: snapshot câu/đáp án và index; key đáp án chỉ backend.
- `score_events`: idempotency key để tránh cộng lại sau restart.
- DB migrations, backup/restore, snapshot mỗi transition; recovery phải dừng timer chờ operator xác nhận.

## 14. EVENT CONTRACTS
Server → Overlay:
- `session.snapshot` — toàn bộ state công khai khi client connect/reconnect.
- `round.started`, `question.preparing`, `question.opened`, `question.locked`, `answer.revealed`, `leaderboard.updated`, `round.finished`.
- `audience.seat_assigned`, `audience.seat_released`, `audience.rotated`, `audience.character_reaction`.
- `mc.state_changed`, `victory.started`, `victory.finished`, `connection.status`.

Ví dụ event:
```json
{
  "type": "audience.seat_assigned",
  "version": 1,
  "sessionId": "s-1",
  "roundId": "r-1",
  "sequence": 128,
  "payload": {
    "seatRotationId": "rot-3",
    "slotId": "row-2-seat-4",
    "playerId": "p-44",
    "displayName": "StormKing",
    "characterId": "chibi-04"
  }
}
```
- Mọi event có sequence monotonic; client nhận thiếu/gap → request snapshot; không apply event từ round cũ. Chỉ phát dữ liệu cần cho overlay, không leak answerKey trước reveal.

## 15. TIKTOK HUD SIMULATOR & SAFE ZONE
- Preview có lớp giả lập: header TikTok, avatar/tên LIVE, icon bên phải, comment bên dưới, input bar; có slider comment density và preset nhiều loại điện thoại.
- Overlay thật không tự vẽ HUD TikTok. Cần preview so sánh và quay màn hình điện thoại LIVE thực tế để hiệu chỉnh.
- Mục tiêu: Quiz question/timer/4 đáp án không bị che ở preset đã chọn; Audience có thể bị che một phần nhưng phải còn đủ cảm giác đông vui. Cho operator điều chỉnh anchor/offset/scale từng layer và lưu theo Theme Pack.

## 16. HIỆU NĂNG VÀ TÍNH CÔNG BẰNG
- Mock 100, 500 người chơi; burst 100 comments/s; 35 nhân vật hiển thị; UI mục tiêu 30fps ổn định trên máy phát dự kiến. Benchmark phải ghi CPU/RAM/VRAM và số event rớt, không khẳng định năng lực của TikTok upstream.
- Nếu máy yếu: giảm particle, tắt lightning, giảm idle FPS, chuyển khán giả xa sang static, giảm shadow blur; **không giảm chất lượng chữ câu hỏi**.
- Người không có ghế vẫn có cơ hội thắng như người đang có ghế. Không ưu tiên người spam comment. Quà tặng không tăng điểm.

## 17. KIỂM THỬ BẮT BUỘC
1. Một user gửi A 100 lần: chỉ một answer, một score event.
2. User đổi A→B: chỉ câu đầu tính.
3. Event đến sát/sau deadline, reconnect, duplicate ID, stale round.
4. 500 người tham gia nhưng 35 ghế: đủ 500 trong leaderboard, 35 ghế, queue không mất, rotation không trùng.
5. MC Kelly không xuất hiện trong player list chỉ vì có tên trên overlay.
6. 7×5 ghế ở 1080×1920 và 720×1280: không chồng tên/nhân vật nghiêm trọng.
7. Reload overlay giữa câu: timer và ghế khôi phục từ snapshot, không random lại nhân vật.
8. Sequence PNG thiếu frame: fallback static, không crash.
9. Tắt animation: câu hỏi/đáp án vẫn rõ và game tiếp tục.
10. Top 10 cập nhật đúng, tie xử lý nhất quán.
11. Victory lấy đúng Top 3, đúng characterId, giữ cúp không bị che, không có 3 bục xếp hạng bổ sung.
12. TikTok HUD preview và test thật: câu hỏi, đáp án, timer không bị che.
13. Crash/restart không cộng trùng; Auto Mode dừng khi thiếu câu hoặc mất kết nối.
14. Không có API key/PII trong overlay, logs hay Theme Pack.

## 18. PHASE / GATE TRIỂN KHAI
**P0 — Foundation (1–2 ngày):** repo, packages, migrations, API contracts, state machine, test harness, asset inventory. Gate: khởi động dashboard + overlay, migrations/test chạy.

**P1 — Quiz offline + layout (3–5 ngày):** 15 câu, Mock comments, scoring, timer, Top 10, overlay 9:16 theo ảnh mẫu. Gate: chạy trọn trận, test dedupe/time.

**P2 — Audience + MC (3–6 ngày):** 35 slots, character assignment, seating queue/rotation, MC Kelly static/PNG Sequence, fallback. Gate: 500 users/35 ghế, reload không đổi ghế/nhân vật.

**P3 — Theme + Question Bank (3–5 ngày):** theme manifest, asset validation, CRUD/approval, smart random, import/export. Gate: 2 themes thay được không sửa engine.

**P4 — Victory + polish (2–4 ngày):** giữ cúp và stage, 3 nhân vật phía trước, nameplates, timeline, safe-zone simulator. Gate: video test 9:16, không che cúp, không leak dữ liệu.

**P5 — TikTok adapter (3–7+ ngày):** xác minh connector, nhận comment thật, reconnect/diagnostics. Gate: LIVE test thật, nếu không truy cập được thì ghi rõ blocker; Mock không thay thế nghiệm thu.

**P6 — AI Studio + packaging (4–8 ngày):** AI drafts, review, sources, validation, backup/recovery, Windows packaging. Gate: tạo/duyệt câu và chạy LIVE theo ngân hàng đã duyệt.

Các mốc là **ước lượng công sức**, phụ thuộc chất lượng asset, khả năng kết nối TikTok, năng lực máy và số người triển khai; không phải cam kết thời hạn.

## 19. GIAO VIỆC CHO CLAUDE CODE
1. Đọc v2.0 và v3.0, kiểm tra các asset thực có trong thư mục. **Không giả định có PNG transparent sequence nếu chỉ có JPG poster.**
2. Xuất `ASSET_INVENTORY.md` phân loại: usable directly / requires cutting / requires new export / missing; liệt kê đúng file nguồn.
3. Viết `ARCHITECTURE.md`, `GAME_STATE_MACHINE.md`, `EVENT_CONTRACTS.md`, `AUDIENCE_SEATING_SPEC.md`, `UI_LAYOUT_SPEC.md`, `TEST_PLAN.md`.
4. Trình bày wireframe 1080×1920 và preview HUD TikTok trước khi code animation.
5. Triển khai P0 → P1; mỗi phase báo file đã sửa, test đã chạy, screenshot/video preview, blocker và tiêu chí nghiệm thu. **Không nhảy thẳng sang AI/TikTok hoặc hiệu ứng 3D nặng.**
6. Không thay đổi thiết kế đã chốt (MC Kelly, 7×5 khán giả, Top 10, Victory giữ cúp) mà không xin xác nhận.
7. Khi thiếu asset, dùng placeholder rõ nhãn và ghi yêu cầu xuất tài nguyên; không dùng ảnh mockup phẳng để tuyên bố đã làm giao diện động.

### PROMPT BẮT ĐẦU
> Hãy đọc `STORM_ARENA_CLAUDE_BUILD_SPEC_V3.md` và `CLAUDE_MASTER_BUILD_PLAN_V2.md`, kiểm kê tất cả tài nguyên hình ảnh và workbook trong thư mục, rồi trả về: (1) kiến trúc cuối cùng, (2) asset inventory, (3) sơ đồ state/event, (4) wireframe 1080×1920 có TikTok safe zone, (5) task breakdown P0–P1 và acceptance tests. Chưa viết các module P2+ trước khi P0–P1 chạy được. Giao diện mục tiêu là ảnh có MC Kelly và 7 hàng × 5 khán giả. Đảm bảo gameplay bằng comment, chấm điểm công bằng và tách nhân vật khán giả khỏi nền.
