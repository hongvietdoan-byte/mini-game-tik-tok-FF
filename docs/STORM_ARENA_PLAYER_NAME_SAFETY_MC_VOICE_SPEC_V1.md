# STORM ARENA — PLAYER NAME SAFETY & MC KELLY VOICE POLICY

**Version:** 1.0 — 13/11/2026  
**Audience:** Claude Coordinator / Codex / QA  
**Scope:** Bổ sung vào codebase Storm Arena hiện tại; không thay thế Master Plan V4 hoặc viết lại Quiz Engine.  
**Decision status:** Các quyết định MVP bên dưới là yêu cầu mới nhất, ưu tiên hơn các đề xuất đọc tên người chơi trong tài liệu cũ.

## 1. Mục tiêu và phạm vi

Storm Arena là mini game Quiz tương tác bằng comment TikTok LIVE. Người chơi có tên TikTok do họ tự đặt, xuất hiện ở khán đài, Top 10 và Victory Top 3. Những tên này có thể chứa từ tục, xúc phạm, mạo danh, nhắc đến Garena/Free Fire, KOL/streamer/tuyển thủ hoặc ghép các thực thể trên với nội dung phản cảm. Cần giảm rủi ro đưa tên không phù hợp lên LIVE.

**Hai yêu cầu độc lập:**

1. **Name Display Safety:** lọc và thay thế tên trước khi đưa vào mọi thành phần hiển thị công khai.
2. **MC Voice MVP:** MC Kelly **không đọc bất kỳ tên, nickname, username, userId, alias hay comment người chơi nào**. MC vẫn đọc lời dẫn được duyệt, câu hỏi, A/B/C/D, thời gian, đáp án đúng, giải thích và thông báo kết quả chung không có danh tính.

Không loại người chơi khỏi Quiz chỉ vì tên bị ẩn; playerId, điểm, thứ hạng, nhân vật, ghế và lịch sử trận giữ nguyên.

## 2. Nguồn yêu cầu và giới hạn

- Tài liệu người dùng: `He_Thong_Loc_Ten_Nhay_Cam_TikTok.docx`, mô tả taxonomy 5 nhóm, chuẩn hóa NFKC/leetspeak/teencode, dual-track matching, whitelist, partial/full masking.
- Đề xuất triển khai hiện tại: TypeScript chạy trong Node.js server, bộ từ mặc định trong repo, cấu hình local `data/name-filter.json`, offline, không cần Python/API/AI.
- Các quyết định trong cuộc trò chuyện: bảo vệ tên thương hiệu, công ty, KOL Free Fire, streamer, tuyển thủ, tên mạo danh; ưu tiên **tắt đọc tên người chơi của MC trong MVP**.
- Những tên, alias, tài khoản chính thức và danh sách từ chặn đầy đủ **chưa được cung cấp**; không tự bịa danh sách xác minh hay tuyên bố độ chính xác 100%.
- Mục tiêu 10.000 tên trong 0,2 giây và kiểm tra ~500 tên Việt là **mục tiêu benchmark**, không phải kết quả đã xác minh.

## 3. Quyết định đã khóa cho MVP

| ID | Quyết định | Trạng thái |
|---|---|---|
| D01 | Bộ lọc tên nằm ở backend Node.js/TypeScript, hoạt động offline | MUST |
| D02 | Overlay/Top 10/khán đài/Victory chỉ nhận `safeDisplayName` | MUST |
| D03 | Raw displayName chỉ truy cập qua Dashboard quản trị được bảo vệ | MUST |
| D04 | MC không đọc tên/ID/comment người chơi, kể cả Top 3, Top 10 hay người trả lời đúng | MUST |
| D05 | Không gửi bất kỳ trường danh tính người chơi vào TTS request hoặc template | MUST |
| D06 | Lọc tên không làm đổi kết quả Quiz, scoring, rank hay character assignment | MUST |
| D07 | Cho phép operator ẩn tên, duyệt ngoại lệ và cập nhật trong LIVE | MUST |
| D08 | Protected entities là danh sách cảnh báo/ngữ cảnh, không phải danh sách tự động cấm mọi tên trùng | MUST |
| D09 | Tính năng MC đọc tên là **DEFERRED**, không được tự kích hoạt trong MVP | MUST |
| D10 | Không cần TTS Provider thứ hai hoặc AI hội thoại cho module này | MUST |

## 4. Taxonomy và chính sách hiển thị

Nguồn DOCX đề xuất năm nhóm: (1) profanity, (2) NSFW/sexual, (3) hate speech, (4) illegal/harmful, (5) impersonation. Áp dụng chính sách có cấu hình theo rule và mức độ, không gắn cờ tự động chỉ vì từ ngữ chính trị, tên địa danh, vùng miền, thương hiệu hoặc tên người nổi tiếng xuất hiện riêng lẻ.

| Risk | Ví dụ tình huống | Hành động mặc định |
|---|---|---|
| NONE | Tên bình thường | Hiển thị tên sau giới hạn độ dài |
| REVIEW | Tên trùng/gần giống thương hiệu hoặc KOL, ngữ cảnh chưa rõ | Hiển thị alias an toàn tạm thời; đưa vào hàng chờ duyệt |
| PARTIAL | Tên có phần từ ngữ không phù hợp, có thể giữ phần còn lại an toàn | Che phần vi phạm, sau đó kiểm tra lại kết quả |
| HIGH | Tục tĩu nặng, thù ghét, đe dọa, NSFW nặng, mạo danh rõ ràng | Thay toàn bộ bằng alias an toàn |
| MANUAL_HIDE | Operator yêu cầu ẩn | Thay toàn bộ bằng alias an toàn |

**Quy tắc ưu tiên:** manual hide > full mask > partial mask > review > allow. Whitelist chỉ là ngoại lệ theo rule/chuỗi và phạm vi cụ thể, không được vô hiệu hóa các quy tắc mức HIGH khác. Tên nghi vấn nhưng chưa xác định vi phạm không được mặc nhiên kết luận người dùng mạo danh.

## 5. Protected Entity Registry

Tạo registry riêng, tách khỏi danh sách profanity:

- Thương hiệu/sản phẩm: ví dụ Garena, Free Fire, Free Fire MAX.
- Đơn vị tổ chức và chức danh: BTC, admin, moderator, support, tên tài khoản chính thức.
- KOL/streamer, tuyển thủ, đội tuyển Free Fire: tên, alias, cách viết phổ biến **chỉ nhập khi có nguồn xác minh hoặc do operator cung cấp**.
- Tài khoản chính thức: chỉ xác minh bằng `source + stableUserId` trong allowlist được quản trị, **không xác minh bằng nickname**.

Protected entity match tự nó không đồng nghĩa tên xấu. Phải đánh giá thêm từ tục, nội dung ghép, biểu hiện giả mạo (`official`, `support`, `admin`, trao thưởng...) và mức tin cậy của rule. Fuzzy matching chỉ áp dụng thận trọng; mọi kết quả mơ hồ chuyển REVIEW.

## 6. Pipeline chuẩn hóa và phát hiện

1. Nhận TikTok event, tách `stableUserId`, `displayName`, `comment`.
2. Giữ bản gốc trong khu vực dữ liệu hạn chế truy cập (nếu cần cho operator); không gửi vào Overlay.
3. Chuẩn hóa Unicode NFKC, casefold/lowercase, chuẩn hóa khoảng trắng và ký tự điều khiển.
4. Tạo **nhiều representation** để dò, không phá hủy chuỗi gốc:
   - Original-normalized (giữ dấu tiếng Việt).
   - Accent-insensitive (bỏ dấu) với word boundary/rule nghiêm ngặt.
   - Separator-insensitive (dấu chấm, gạch dưới, khoảng trắng, emoji xen giữa).
   - Leetspeak/homoglyph theo ánh xạ có kiểm soát.
   - Repeated-character collapsed.
   - Teencode patterns được liệt kê rõ, tránh biến đổi toàn bộ `k/q/w` một cách mù quáng.
5. Đối chiếu profanity/NSFW/hate/harmful/impersonation/protected entity; lưu rule ID và confidence/priority (nếu có).
6. Áp dụng ngoại lệ whitelist có phạm vi và manual override.
7. Tạo `safeDisplayName` không quá 16 ký tự hiển thị theo quy tắc Unicode grapheme (không cắt giữa emoji/tổ hợp dấu), hoặc alias ổn định `Người chơi 128`.
8. Kiểm tra lại output sau partial mask để bảo đảm không còn phần nhạy cảm.
9. Lưu policy version, moderation result, cập nhật Overlay bằng **chỉ** dữ liệu an toàn.

**False positives:** kiểm tra cả tên hợp lệ có substring nhạy cảm, ví dụ `Classic`, `Dickens`, tên tiếng Việt có dấu; không dùng substring matching ngây thơ. Không khẳng định mọi biến thể sẽ được phát hiện.

## 7. Dữ liệu và hợp đồng API

```ts
type NameRisk = 'NONE' | 'REVIEW' | 'PARTIAL' | 'HIGH' | 'MANUAL_HIDE';
type DisplayAction = 'ALLOW' | 'PARTIAL_MASK' | 'ANONYMIZE';

interface NameModerationResult {
  playerId: string;
  safeDisplayName: string;
  risk: NameRisk;
  displayAction: DisplayAction;
  matchedRuleIds: string[];
  requiresReview: boolean;
  policyVersion: number;
  checkedAt: number;
}

interface PublicPlayerDTO {
  playerId: string; // public-safe opaque identifier if required
  safeDisplayName: string;
  score: number;
  rank?: number;
  characterId?: string;
}
```

- `rawDisplayName` không được nằm trong `PublicPlayerDTO`, event WebSocket, log client, screenshot debug, audio request hoặc payload TTS.
- Operator API có quyền riêng, kiểm soát truy cập; không expose raw names ra localhost endpoints không bảo vệ.
- `data/name-filter.json` lưu cấu hình riêng trên máy; bộ rule mặc định được version hóa trong repo. Cần migration, validation, backup và atomic write khi chỉnh file.
- Không dùng nickname làm khóa player; tên đổi phải lọc lại nhưng giữ playerId.
- Có thể lưu `safeSpokenName` để tương lai, nhưng **không sử dụng trong MVP**; tốt hơn không đưa vào TTS DTO hiện tại.

## 8. MC Kelly Voice MVP — quy tắc cứng

**Được đọc:** câu thoại dẫn chương trình đã duyệt; câu hỏi và bốn đáp án đã qua kiểm duyệt nội dung; thông báo thời gian; đáp án đúng và giải thích; thông báo Top 10/Top 3 chung không nhắc tên; số lượng người tham gia hoặc điểm tổng hợp nếu cần.

**Không được đọc:** username, displayName, nickname, alias, userId, tên Top 1/2/3, tên người trả lời đúng, comment người xem, tên thương hiệu/KOL phát sinh từ tên người chơi.

TTS payload phải được xây dựng từ các typed voice events không có trường player identity:

```ts
type McVoiceEvent =
  | { type: 'WELCOME'; scriptId: string }
  | { type: 'QUESTION'; questionInstanceId: string; approvedQuestionVersion: string }
  | { type: 'COUNTDOWN'; secondsRemaining: number }
  | { type: 'ANSWER_REVEAL'; questionInstanceId: string; approvedQuestionVersion: string }
  | { type: 'LEADERBOARD_GENERIC'; roundId: string }
  | { type: 'VICTORY_GENERIC'; roundId: string };
```

**Không thêm `playerName` hay `playerId` vào template TTS**. Không tạo lời thoại tự do từ raw event hoặc comment. Chặn ở backend bằng schema allowlist và test; ẩn toggle UI là không đủ.

Ví dụ lời thoại hợp lệ:

- “Chào mừng các bạn đến với Đấu Trường Bão Tố!”
- “Câu hỏi tiếp theo, hãy chọn A, B, C hoặc D.”
- “Đáp án chính xác là B, bốn người.”
- “Bảng xếp hạng đã được cập nhật!”
- “Xin chúc mừng nhà vô địch của trận đấu!”

**Audio cache:** audit và xóa/vô hiệu hóa các file thoại cũ có tên người chơi; cache key phải có `voicePolicyVersion`. Không phát file không xác định provenance. Pause/Skip/Stop hủy queue theo event ID; TTS API lỗi thì dùng audio đã duyệt hoặc tiếp tục không giọng, không chặn Quiz.

## 9. Luồng dữ liệu và điểm chặn

```text
TikTok LIVE Comment Adapter
  -> Player Registry (stableUserId)
  -> NameSafetyFilter (rules + protected entities + manual overrides)
  -> PublicPlayerDTO(safeDisplayName only)
      -> Audience 35 seats
      -> Top 10 leaderboard
      -> Victory Top 3

Quiz Engine (approved question + game state)
  -> MCVoiceEvent (NO player identity)
  -> Voice Script Validator
  -> TTS API / approved cached audio
  -> Audio Queue -> MC Kelly talking/idle -> OBS/TikTok LIVE Studio
```

Lưu ý: comment TikTok có thể vẫn xuất hiện trong HUD TikTok gốc do nền tảng điều khiển. Bộ lọc này bảo vệ **các thành phần Storm Arena tự render và giọng MC**, không thể cam kết xóa tên/comment khỏi UI gốc của TikTok.

## 10. Dashboard operator

- Trang Moderation: tên gốc (chỉ operator), tên hiển thị an toàn, nhóm rule, lý do, policy version, thời gian.
- Actions: `Hide`, `Restore/Allow` có giới hạn, `Add blocked rule`, `Add exception`, `Review protected entity`, `Recheck`.
- Tìm kiếm và lọc theo risk; hiển thị preview tên trên Top 10/Victory.
- Audit trail cho thay đổi thủ công; cập nhật LIVE ngay, phát lại moderation trên player hiện tại khi policy đổi.
- Không cho phép operator bật tính năng đọc tên trong bản MVP; hiển thị “Đọc tên người chơi: Chưa hỗ trợ trong phiên bản này”.

## 11. Kiểm thử bắt buộc

### Unit tests
- Unicode NFKC, có dấu/không dấu, separator, emoji, leetspeak, lặp ký tự, teencode.
- Các nhóm taxonomy; severity; whitelist có phạm vi; manual hide.
- Tên sạch dễ chặn nhầm; từ ngữ có nghĩa khác; tên dài và Unicode grapheme.
- Protected entities đơn thuần không tự động bị kết luận vi phạm; tên thương hiệu + tục, KOL + tục, giả mạo chức danh.

### Integration tests
- User vào game -> được lọc -> xếp ghế -> trả lời -> tính điểm -> Top 10 -> Victory: cùng playerId, đúng điểm, không lộ tên gốc.
- Người chơi đổi tên giữa trận; operator ẩn tên giữa LIVE; reconnect; reload Overlay; cập nhật policy.
- WebSocket/Overlay DTO không chứa rawDisplayName.
- TTS API mock spy xác nhận **zero** trường tên/ID/comment người chơi trong mọi request.
- Cache audio cũ chứa tên bị chặn không được phát; skip/pause/stop hủy queue đúng.
- Kiểm tra audio OBS/LIVE Studio khi có điều kiện, không coi mock là xác minh LIVE thật.

### Benchmark
- Đo 10.000 tên trên máy mục tiêu, báo median/p95 và peak memory; 0,2 giây là mục tiêu cần chứng minh.
- Tập khoảng 500 tên Việt phổ biến có gán nhãn thủ công, đo false positive/false negative theo từng nhóm; không tự công bố tỉ lệ nếu chưa đo.

## 12. Acceptance gates

- [ ] Asset/code audit chỉ ra mọi đường đi của raw displayName.
- [ ] Tất cả public overlay surfaces dùng `safeDisplayName`.
- [ ] Tên nghi vấn được thay bằng alias an toàn và không ảnh hưởng điểm.
- [ ] Có UI quản trị hide/allow/review và audit trail.
- [ ] Protected entity registry có nguồn, scope, rule và không chặn nhầm hàng loạt.
- [ ] MC Voice không đọc tên/ID/comment người chơi ở mọi trạng thái, kể cả Top 3.
- [ ] Không có player identity trong request TTS và audio cache mới.
- [ ] Cache cũ được xử lý an toàn.
- [ ] Unit/integration tests pass; benchmark có bằng chứng.
- [ ] Kiểm thử bằng HUD simulator và ít nhất một buổi chạy end-to-end trước khi đánh dấu sẵn sàng LIVE.

## 13. Thứ tự triển khai cho Claude/Codex

**Phase A — Audit (chưa sửa code):** xác định các điểm đọc tên gốc, Voice Engine hiện tại, cache, WebSocket DTO, dashboard, danh sách rule; báo cáo gap và file sẽ sửa.

**Phase B — Display Safety:** viết normalization/matcher, config, moderation result, safe DTO, dashboard review, migration cần thiết; unit test.

**Phase C — MC Voice Hard Disable:** xóa đường truyền player identity vào voice templates/TTS, kiểm tra cache cũ, bổ sung schema/test; không thay đổi timing đã chốt của Quiz Engine.

**Phase D — End-to-end QA:** mô phỏng 500 người, Top 10/Victory, đổi tên, manual hide, TTS mock, benchmark; screenshot và báo cáo.

**Phase E — Release Gate:** QA/Coordinator kiểm chứng trên build thực tế; cập nhật DECISIONS, BOARD, README, CHANGELOG; chỉ gộp khi CI xanh.

## 14. Hướng dẫn giao việc ngay cho Claude

> Đọc toàn bộ tài liệu `STORM_ARENA_PLAYER_NAME_SAFETY_MC_VOICE_SPEC_V1.md`. Đây là quyết định mới nhất về an toàn tên và MC Voice MVP. Hãy audit codebase hiện tại trước, lập Gap Matrix, liệt kê các file và test cần sửa, xác nhận không ảnh hưởng Quiz Engine, rồi chờ duyệt trước khi code. Không tự bổ sung tính năng MC đọc tên; đây là chức năng DEFERRED. Khi triển khai, phải đưa bằng chứng public DTO không lộ tên gốc và TTS không nhận danh tính người chơi.

---

**Ghi chú:** Đây là đặc tả bổ sung cho hệ thống hiện tại, không phải bằng chứng rằng tính năng đã được code hoặc nghiệm thu. Các quy tắc lọc cần được thử trên dữ liệu thực tế, vì lọc theo từ điển không bảo đảm phát hiện 100% hoặc không chặn nhầm.

---

## Quyết định người dùng 13/11/2026 (sau Gap Matrix)
- Duyệt kế hoạch theo đề xuất của coordinator.
- Kiểu che: HIGH / MANUAL_HIDE → alias ổn định `Người chơi <số>`; PARTIAL → che phần vi phạm (giữ phần an toàn); REVIEW → alias tạm, vào hàng chờ duyệt.
- Protected entity bản đầu: chỉ Garena, Free Fire, Free Fire MAX, BTC/ban tổ chức, admin, moderator, support. KOL/streamer/tuyển thủ/đội: chờ người dùng cung cấp.
- Dashboard khi game đang chạy: danh sách tên có cảnh báo (REVIEW/PARTIAL/HIGH) hiện rõ; người vận hành chủ động chọn từng tên (hoặc nhiều tên) để ẩn / cho hiện; ẩn được cả tên không bị cảnh báo (tìm theo tên trong Top 10/khán đài). Áp dụng ngay lên LIVE.
