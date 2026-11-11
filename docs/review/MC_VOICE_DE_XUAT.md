# Đề xuất MC Voice System (C-0070, bước 0)

Ngày khảo sát: 11/11/2026
Trạng thái: đề xuất để coordinator và người dùng duyệt; chưa triển khai, chưa gọi dịch vụ thật.

## 1. Tóm tắt quyết định

- Chỉ overlay OBS/LIVE Studio phát lời MC. Dashboard không phát âm thanh.
- Backend là nguồn có thẩm quyền về trạng thái game, giới hạn thời gian đọc, quyền phát và thời điểm mở nhận đáp án.
- Thêm pha `READING` giữa `PREPARE` và `ACCEPTING`. Overlay hiển thị câu hỏi cùng bốn đáp án trong lúc đọc; cửa sổ nhận comment và đồng hồ trả lời chỉ mở sau khi câu hỏi và đáp án đã đọc xong.
- ClipAI là adapter tạo giọng đã chọn. Trong LIVE chỉ phát file đã cache. Nếu thiếu file, lỗi hoặc hết hạn chờ thì chuyển sang chữ, mở nhận đáp án đúng hạn; không gọi TTS trực tiếp để chờ trong LIVE và không tự gửi lại yêu cầu tạo giọng lỗi.
- API endpoint và token chỉ tồn tại ở backend, lấy từ cài đặt riêng của ứng dụng hoặc `CLIPAI_API_BASE` / `CLIPAI_TOKEN`. Không đưa endpoint, token, mã giọng, URL CDN hay tài liệu tích hợp riêng vào repo công khai. Không có API thật trong bước này.

## 2. Khảo sát hiện trạng

### Âm thanh và MC

Tìm trong mã overlay, dashboard và server không thấy `<audio>`, WebAudio/`AudioContext`, `speechSynthesis` hoặc luồng phát SFX/nhạc hiện hữu. Vì vậy có thể thiết kế đầu ra audio mới mà không phải phối trộn với audio system cũ.

`McSequence` hiện phát PNG sequence; trạng thái MC là `idle`, `welcome`, `ask`, `react`, `celebrate`. Manifest cho phép thiếu animation và rơi về idle/static poster. Thư mục asset Kelly nằm trong vùng cục bộ `assets-local/mc/kelly/`, không được commit.

Ánh xạ MVP đề xuất:

| Voice/game state | Animation có thể dùng | Ghi chú |
|---|---|---|
| Không đọc / idle | `idle` | Trạng thái mặc định và fallback |
| Đọc câu hỏi, đáp án | `ask` | Tái dùng trước; không giả định có lip-sync theo âm vị |
| Phản ứng / hào hứng | `react` | Dùng ở reveal theo logic hiện có |
| Vinh danh | `celebrate` | Dùng cho podium/victory |
| Chào sảnh | `welcome` | Giữ nguyên |

MVP chỉ cần chuyển idle ↔ talking khi audio `play` / `ended`; không đồng bộ miệng theo từng âm tiết. Mẫu Kelly cục bộ có metadata 44.1 kHz mono, 8.56 giây; dùng làm mẫu đo chuẩn hóa định dạng/loudness và khoảng lặng trước khi chốt ngưỡng. Không đưa file audio vào repo.

### Engine và đồng bộ

Engine hiện là reducer thuần trong `packages/quiz-core/src/engine.ts`. `START_ROUND` vào `PREPARE`; timer `prepareMs` hết thì vào `ACCEPTING`. `PREPARE` chỉ gửi prompt, chưa gửi bốn đáp án. `ACCEPTING` mới mở timer trả lời, đặt `acceptOpenAtMs` và phát sự kiện `QUESTION_OPENED`.

`acceptWindow()` trả về cửa sổ chỉ khi engine ở `ACCEPTING`. `apps/server/src/runtime.ts` đưa comment vào `decideComment()` với cửa sổ đó; ngoài cửa sổ comment bị từ chối, không được chấm. Điểm được ghi sau đóng câu/reveal. Vì vậy pha đọc có thể để comment bị từ chối với lý do hiện hành tương đương “chưa nhận đáp án”, không đệm comment để chấm về sau.

Snapshot công khai hiện hiển thị prompt trong `PREPARE`, còn đáp án chỉ khi `ACCEPTING`; nó cố ý loại đáp án đúng khỏi `PublicQuestion`. WS có `STATE_SNAPSHOT`, `QUESTION_OPENED_PUBLIC` và ACK hiện tại chỉ xác nhận overlay render tới stateVersion; chưa có ACK audio. Dashboard đang có trang Live Control, Kiểm tra kết nối, OBS/LIVE Studio và Duyệt câu hỏi; chưa có trang Voice Settings.

### Dòng hiện tại và dòng đề xuất

```text
Hiện tại: PREPARE (prompt) --prepareMs--> ACCEPTING (hiện 4 đáp án + answerMs)
Đề xuất:  PREPARE (warm-up) --> READING (hiện prompt + 4 đáp án, chỉ phát audio)
                                      | ACK ended / fallback / max-read timeout
                                      v
                                  ACCEPTING (mở acceptWindow + answerMs)
```

Backend mở `ACCEPTING` sau ACK hợp lệ `ended`; timeout cứng hoặc lỗi sẽ hủy audio/queue rồi mở nhận đáp án bằng chữ. Cách này không thay đổi hàm chấm điểm, quy tắc tốc độ hoặc nội dung bảng điểm.

## 3. Kiến trúc tích hợp

### ClipAI adapter phía server

Tạo abstraction thay provider được, ví dụ:

```ts
interface McVoiceProvider {
  synthesize(input: {
    text: string;
    voiceKey: string;
    rate: number;
  }): Promise<{
    filePath: string;
    durationMs: number;
    format: 'mp3';
    checksum: string;
  }>;
}
```

Chỉ hiện thực ClipAI adapter ở mốc MVP. Theo tài liệu bàn giao cục bộ, luồng là submit job bất đồng bộ → poll danh sách audio tới trạng thái hoàn tất → tải file về cache. Chi tiết endpoint/host, mã giọng và URL tải không thuộc tài liệu trong repo.

- Cache đặt trong thư mục dữ liệu ứng dụng, không nằm trong git. Cache key: hash(text đã chuẩn hóa + provider/model/voice settings + rate + format).
- Pre-generate bộ câu đã duyệt tuần tự hoặc tối đa 2–3 job đồng thời. Khi LIVE chỉ đọc cache. Câu động được tạo trước ít nhất một nhịp; không kịp thì dùng chữ.
- Không tự tạo lại job khi job lỗi. Có giới hạn thời gian và backoff cho lỗi tạm thời/1130 theo Retry-After; 401 dừng và báo cấu hình xác thực; hết credit và failed là lỗi có thể hành động; timeout kết thúc an toàn.
- Fake adapter kiểm thử nhánh success, processing→success, failed, 1130 retry-after, 401, hết credit, timeout, tải lỗi, cache hit. Không đăng ký tài khoản, không dùng token và không gọi API thật trong bước này.
- API key chỉ được đọc/ghi ở backend. GET settings chỉ trả trạng thái đã cấu hình và giá trị che `••••` + 4 ký tự cuối; không trả nguyên key. Không log header/body chứa bí mật. Overlay nhận `assetId` nội bộ rồi lấy audio từ server/cache; không nhận URL CDN hoặc thông tin provider.
- Nếu có lưu key từ dashboard, lưu trong cấu hình ứng dụng ngoài repo với quyền truy cập phù hợp; dùng secret store của hệ điều hành nếu app hỗ trợ. Biến môi trường là nguồn cấu hình thay thế.

Có thể bổ sung adapter `PreRecorded` ở mốc sau để nhập file theo `lineId` do người dùng xuất trước. Đây là nguồn tạo cache có chủ ý, không tự phát sinh như fallback lúc LIVE. Fallback của MVP vẫn là cache → không giọng/chữ.

### Một nguồn phát và xác nhận

Một hay nhiều cửa sổ overlay có thể kết nối cùng lúc. Backend phải cấp độc quyền `audioLease` cho đúng một overlay đã cấu hình làm nguồn tiếng; tất cả overlay khác chỉ render hình. Dashboard bị mute. Lease gắn với session và `overlayInstanceId`, có heartbeat/thu hồi rõ ràng; chỉ owner được tải lệnh phát và gửi ACK.

Mỗi playback command/ACK cần gắn ít nhất: `sessionId`, `roundId`, `questionInstanceId`, `lineId`, `stateVersion`, `playbackId` và lease hiện hành. Backend bỏ qua ACK trễ, trùng, đến từ overlay không sở hữu lease hoặc không khớp câu đang đọc. Chỉ hoàn tất toàn bộ line queue hiện tại mới mở `ACCEPTING`.

Backend ghi nhận các `lineId` đã hoàn tất. Reconnect không phát lại line đã hoàn tất; nếu trạng thái line đang phát không thể xác minh sau khi mất kết nối, đánh dấu interrupted và dùng fallback chữ khi hết grace period. Việc chuyển lease cần operator xác nhận hoặc lease hết hạn, không cho hai overlay tự giành quyền phát.

ACK audio tách khỏi ACK render hiện có. Đề xuất WS message/event `MC_VOICE_STATUS` với trạng thái `PREPARING | SPEAKING | FINISHED | INTERRUPTED | ERROR`; payload cho `play`, `ended`, `error` mang playback identity ở trên. Server xác thực rồi gửi snapshot/voice state mới. Overlay không có quyền tự đổi game state.

### Pha đọc, pause, skip, stop

- `PREPARE`: giữ warm-up ngắn hiện có. Khi vào `READING`, public snapshot đưa prompt và bốn đáp án nhưng vẫn không công bố đáp án đúng; timer là trần đọc do backend cấp.
- `READING`: `acceptWindow()` vẫn null. Comment trong pha này bị từ chối; không xếp hàng để chấm sau.
- `ended` hợp lệ cho line cuối → reducer vào `ACCEPTING`, đặt answer timer và `acceptOpenAtMs`. Logic nhận đáp án/chấm điểm không đổi.
- Không có cache, autoplay bị chặn, lỗi audio hoặc không có owner: không chờ provider; hiện chữ và vào `ACCEPTING`. Một trần đọc backend (đề xuất ban đầu 20 giây cho cả intro, có thể hiệu chỉnh từ cache duration) chặn câu quá dài hoặc ACK bị mất.
- `PAUSE`: đóng băng timer; hủy audio đang phát. `RESUME` đọc tiếp từ line chưa hoàn tất, rồi mở answer timer. Line đã ACK hoàn tất không phát lại.
- `SKIP_QUESTION`, `VOID_QUESTION`, `RESTART_ROUND`, `STOP`: hủy playback và xóa queue. Skip/void trước reveal vẫn không ghi điểm. Stop đóng phiên như hiện tại.
- Kết nối overlay mất: timer đọc đóng băng trong grace period ngắn, rồi fallback chữ/mở nhận đáp án; mất nguồn comment vẫn theo quy tắc connection pause hiện hành.

Mốc 20 giây là đề xuất giới hạn ban đầu, không phải yêu cầu đã được người dùng chốt; lấy thời lượng file cache làm ước lượng và không để câu dài khóa game vô hạn.

## 4. Hợp đồng, snapshot và API dự kiến

Phần code tương lai có thể cần:

- `packages/contracts/src/index.ts`: thêm state `READING`, voice status/payload, playback identity, cấu hình công khai không chứa bí mật; `McState` thêm `talking` hoặc thuộc tính voice riêng. Tăng/định nghĩa tương thích contract version.
- `packages/quiz-core/src/engine.ts`: transition `PREPARE → READING → ACCEPTING`, input hoàn tất intro đã được runtime xác thực, timer trần đọc, pause/resume/recovery/skip/stop. Giữ scoring APIs nguyên trạng.
- `apps/server/src/runtime.ts` và service mới dưới `apps/server/src/voice/`: lập queue/cấp lease, xác thực ACK, cache, giới hạn timeout, huỷ queue theo event engine; không để lỗi TTS làm engine vào ERROR.
- `apps/server/src/app.ts`: routes được bảo vệ cho Voice Settings, test voice, pre-generate/progress và asset cache nội bộ. API config chỉ trả dữ liệu đã che.
- `apps/overlay/src/net/useSnapshot.ts`, component MC trong `apps/overlay/src/v3/`: nhận voice command, chỉ playback khi là lease owner, phát ACK play/ended/error; các overlay phụ mute.
- Dashboard do **Codex 2** triển khai: bổ sung API client và trang Voice Settings gồm endpoint (hoặc dùng env), nhập/đổi token, trạng thái provider/voice, Test Voice có chủ ý, pre-generate bộ câu đã duyệt và tiến độ, cache/trạng thái fallback, đọc/volume/tối đa thời gian. Không hiển thị token đầy đủ.
- Dữ liệu key/cache lưu ở app data, ngoài repo. MP3 đầu vào, file cache và asset giọng vẫn ở `assets-local/`/app data, không commit.
- `scripts/privacy-check.mjs`: chặn pattern riêng lấy từ `PRIVACY_EXTRA_PATTERNS` hoặc file local `assets-local/privacy-patterns.txt`, cùng Bearer/token-like string dài. Các pattern riêng không ghi vào repo.

## 5. Các mốc triển khai và kiểm thử

| Mốc | Phạm vi | Tiêu chí kiểm thử |
|---|---|---|
| 0. Đề xuất này | Survey + quyết định kiến trúc; chưa code | Coordinator/người dùng duyệt phạm vi, thời gian trần, cách cấp lease |
| 1. Contract + engine | `READING`, timer, ACK hoàn tất qua input đã xác thực, pause/skip/stop/recovery | Unit `packages/quiz-core/src/engine.test.ts`: ACK mở nhận đúng 1 lần; timer trần; stale/duplicate ACK; pause/resume; void không ghi điểm; comment ngoài ACCEPTING không được tính |
| 2. Backend provider/cache | ClipAI adapter và fake server, app-data cache, secret redaction, voice routes | Fake tests đủ các nhánh lỗi ở trên; không network thật; cache hit không submit; integration bảo đảm TTS lỗi không FATAL engine |
| 3. Overlay playback | Owner lease, tải asset nội bộ, queue, ACK, animation idle/talking | Unit test queue/lease/reconnect; nhiều overlay chỉ một nguồn có tiếng; reconnect không phát lại line FINISHED; autoplay/error chuyển fallback |
| 4. Dashboard Settings (Codex 2) | Control/config/progress và mute | Dashboard E2E: che token, test voice chỉ khi thao tác chủ ý, progress pre-generate, không phát âm thanh tại dashboard |
| 5. Tích hợp/review | Bộ luồng câu hỏi và phát LIVE trong môi trường mock | `tests/e2e/live-round.test.ts`, `tests/e2e/overlay.spec.ts`, `tests/e2e/dashboard.test.ts`: đồng hồ trả lời chỉ bắt đầu sau intro hoặc fallback; score/reveal không đổi; pause/skip/stop dọn queue |

Trước khi gọi dịch vụ thật, coordinator thực hiện Test Voice/pre-generate sau khi được người dùng duyệt. Codex chỉ kiểm thử bằng fake server.

## 6. Rủi ro và lựa chọn cần duyệt

| Rủi ro | Xử lý đề xuất |
|---|---|
| OBS/browser autoplay chặn audio | Hướng dẫn operator mở khóa một lần bằng thao tác; phát thử ở overlay chính; nếu `play()` reject thì fallback chữ, không treo timer |
| Nhiều browser source phát trùng | Backend cấp một lease duy nhất; dashboard và overlay còn lại luôn mute |
| ACK đến trễ hoặc reconnect phát lặp | ACK idempotent theo playback identity; lưu line hoàn tất; stateVersion/lease mismatch bị bỏ |
| ClipAI chậm, lỗi, mất credit | Pre-generate; LIVE chỉ cache; cap thời gian; không auto-submit lại; fallback chữ |
| Câu dài vượt thời gian cho phép | Trần đọc tổng đề xuất 20 giây; file vượt trần bị rút gọn/đánh dấu cần sửa trước khi duyệt bộ câu |
| Secret hoặc metadata lộ vào repo/log/client | Secrets chỉ ở server/app data/env; redact log; chạy privacy check; public WS chỉ chứa asset identity nội bộ |
| Chất lượng âm thanh lệch mẫu | Dùng mẫu Kelly để đo loudness/định dạng/khoảng lặng; chốt ngưỡng sau khi coordinator kiểm tra mẫu thật |

Cần coordinator/người dùng duyệt trước khi code: (1) trần đọc ban đầu 20 giây; (2) chính sách cấp/đổi audio lease khi overlay chính reconnect; (3) nơi lưu token ưu tiên OS secret store hay app settings ngoài repo; (4) chuẩn loudness/trim đo từ mẫu; (5) thời điểm cho phép coordinator gọi Test Voice và tạo cache thật. Nhà cung cấp/giọng đã chốt là ClipAI/giọng Kelly; bước này không yêu cầu chọn lại provider hay gửi token cho Codex.
