# Cinema Mode V6: audit, danh sách asset thiếu và kế hoạch triển khai

Nhà Thông Thái Free Fire · 24/11/2026 · Coordinator · **bản chờ duyệt, chưa có dòng code nào**

Căn cứ:
- Đặc tả `NHA_THONG_THAI_FREE_FIRE_CINEMA_MODE_PLAN_V6.pdf` (10 trang, 3 ảnh concept);
- codebase main `2df0b9b8`;
- kho `assets-local/`, cùng các thư mục `E:\Tai xuong`, Downloads, Desktop, Documents và thư mục font của Windows.

---

## 0. Người dùng chốt 27/11 (đè lên các mục bên dưới nếu khác)

1. **Chuyển chế độ = một nút bật/tắt riêng trên Dashboard.**
   - Nút gạt Quiz ↔ Cinema luôn nằm ở thanh trên cùng của Dashboard, tách khỏi các trang điều khiển của từng chế độ.
   - Bấm là đổi ngay, không có hộp thoại xác nhận nhiều bước.
   - Nếu đang có vòng Quiz hoặc poll đang mở thì nút bị khoá và ghi rõ lý do (ví dụ "Đang chạy vòng 3 — kết thúc vòng để chuyển").
   - Kết nối TikTok và cửa sổ Overlay giữ nguyên khi chuyển, không phải mở lại LIVE Studio.
2. **Mức tải mục tiêu là 20.000 người xem cho CẢ HAI chế độ** (kênh chính có lúc đạt 10.000–20.000 người).
   - Cinema: Phase 4 đo ở 10.000 và **20.000** người.
   - Quiz cũng phải đạt 20.000 người khi chạy **trọn vòng** (không chỉ phần nhận comment). Bằng chứng hiện có: bench 20k của C-0237 chỉ đo phần nhận comment và chấm điểm (p99 ~2 ms); vòng MOCK trọn vẹn 20/11 mới đo ở 2.000 người và event-loop p99 đã là 806 ms. Việc này độc lập với Cinema và làm trước, song song với P1 (xem mục 6, "Phase Q").
3. **Chibi quay lưng (A6): tự gen bằng AI, không còn là điểm chặn.**
   - Gen ≥ 12 mẫu cùng phong cách với bộ chibi hiện có, cùng góc nhìn và ánh sáng, cộng 3–4 mẫu giơ tay. Tách nền bằng quy trình đã dùng cho kho chibi.
   - Người dùng duyệt bộ ảnh trước khi đưa vào theme.

---

## 1. Kết luận nhanh

1. **Làm được trên codebase hiện tại mà không viết lại Quiz Mode.**
   - Tái dùng nguyên các phần: TikTok adapter, chống trùng eventId, bộ lọc tên, WebSocket, theme loader, giọng MC/TTS, launcher và SQLite migration.
   - Phần làm mới: router theo mode, `CinemaRuntime`, Poll Engine, media endpoint có HTTP Range, cảnh Cinema trên Overlay và các màn điều khiển trên Dashboard.
2. **Asset là điểm nghẽn lớn nhất.**
   - Toàn bộ 6 tệp thiết kế Free Fire Awards mà PDF liệt kê **không có trên máy**: logo, Frametext, KV layered, BACKGROUND, HUD_FFA và font NVN Motherland Signature.
   - Kho chibi có 62 nhân vật, nhưng **tất cả đều nhìn thẳng ra trước**. Ảnh concept lại cần khán giả **quay lưng** nhìn lên màn chiếu.
   - Theo PDF, thiếu sprite quay lưng thì phải báo thiếu, không tự chế. Vì vậy Phase 1 dựng được bộ khung bằng ảnh giữ chỗ, nhưng **chưa nghiệm thu hình ảnh được** khi chưa có asset.
3. **Video tìm thấy không dùng được nguyên trạng.**
   - Tệp `E:\Tai xuong\1111_PVAN KOL FFA.mp4` là video **dọc 1080×1920**, mã hoá HEVC, dài 64 giây.
   - Đặt vào màn chiếu 16:9 thì chỉ còn khung 324×576 ở giữa, hai bên là viền đen.
   - Mã hoá HEVC không chắc phát được trong Edge/LIVE Studio trên mọi máy. Cần bản **16:9, H.264/AAC**, kèm xác nhận quyền phát lại trên LIVE.
4. **YouTube chỉ nên là tuỳ chọn hạn chế.**
   - Điều khoản YouTube API không cho phủ nội dung lên player. Phát lại video YouTube trên TikTok LIVE cũng cần quyền riêng, không phải cứ nhúng được là được phát.
   - Đề xuất: dùng **video local làm nguồn chính**. YouTube để ở Phase 3; khi mở bình chọn thì tạm dừng và ẩn player, popup hiện trên nền chờ.
5. **Ba rủi ro kỹ thuật chính:**
   - `runtime.ts` dài 3.379 dòng và tự đăng ký nhận comment ở `runtime.ts:490-495`. Muốn chuyển mode thì phải tách lớp định tuyến comment ra ngoài, và việc này đụng vào Quiz.
   - `serveAssets` (`static.ts:66-88`) đọc cả tệp bằng `readFileSync`, không hỗ trợ Range. Video 80 MB trở lên không tua được và tốn RAM.
   - Snapshot đã có trường `mode` mang nghĩa nguồn MOCK/TIKTOK (`contracts/src/index.ts:1163`). Mode mới phải đặt tên khác là `appMode` để không phá client cũ.

---

## 2. Hiện trạng codebase: tái dùng được gì

| Thành phần | Vị trí | Tình trạng | Dùng cho Cinema |
|---|---|---|---|
| TikTok adapter (đọc comment, theo lô) | `packages/live-adapters/src/tiktok.ts`, `adapter.ts` | Ổn định, đã chạy live | Dùng nguyên. Chỉ đổi nơi đăng ký nhận comment |
| Simulator comment | `packages/live-adapters/src/simulator.ts` | Có | Mở rộng thành simulator phiếu 5k/10k |
| Chống trùng eventId | `runtime.ts:2259-2266` (`seenEvents`), bảng processed events | Có | Dùng lại logic, tách thành hàm dùng chung |
| Bộ lọc tên người xem | `packages/name-filter` (`filterPlayerName`, `normalizeForMatch`) | Có, đã sửa lỗi chặn nhầm 21/11 | Lọc tên trên nameplate. Bộ lọc nội dung phiếu viết riêng |
| WebSocket snapshot, seq, stateVersion | `contracts/src/index.ts:1152-1350`, `app.ts` | Có | Thêm `appMode` và `cinema` theo kiểu bổ sung |
| Theme pack (manifest, tokens, chọn trên Dashboard, export/import) | `contracts/src/theme.ts`, `server/src/theme-store.ts`, `dashboard/src/ThemePage.tsx` | Có, vừa gộp C-0386/C-0407 | Thêm khoá `cinema.*`. Schema đang `.strict()` nên phải mở rộng có kiểm soát |
| Giọng MC và chat MC do operator nhập | `server/src/voice/*`, `dashboard/src/McChatPanel.tsx` | Có, có hàng đợi và an toàn | Dùng nguyên cho lời dẫn đã duyệt. Không đọc tên từ comment |
| SQLite + drizzle migration | `packages/persistence/migrations/0000…0007` | 8 migration | Thêm `0008_cinema` theo kiểu bổ sung |
| Sao lưu DB chỉ đọc, dọn dữ liệu cũ | `readonly-backup.ts`, `data-prune.ts` | Có | Dùng cho TTL dữ liệu Cinema |
| Preflight, web_build, launcher | `server/src/preflight-*.ts`, `tools/web_build.py`, `CHAY_GAME` | Có | Thêm mục kiểm tra Cinema (asset, video) |
| Bài test tải và soak | `tests/load/*` | Có, vừa sửa GC | Thêm bài tải phiếu 10k |
| Phục vụ asset | `server/src/static.ts:66` | Đọc cả tệp, không Range | **Phải viết endpoint media mới** |
| Khán giả, ghế | `audience-engine`, `server/src/audience.ts` | Gắn với Quiz: 30 ghế, xếp theo điểm | Không dùng. Cinema có bố cục đứng tự do riêng |
| Overlay | `apps/overlay/src/main.tsx` (chọn scene), `v3/ArenaStage.tsx` | Chỉ có cảnh Quiz | Thêm `CinemaStage` riêng, rẽ nhánh ở `main.tsx:286` |
| Dashboard | `apps/dashboard/src/main.tsx` (953 dòng) + các trang con | Chỉ có Quiz | Thêm thanh chọn mode và trang Cinema riêng |

**Không đụng:** chấm điểm, ngân hàng câu hỏi, Top 10, Victory, ngai, xếp ghế theo điểm.

---

## 3. Kiểm kê asset

### 3.1 Đã có và dùng được

| Asset | Đường dẫn | Ghi chú |
|---|---|---|
| Ảnh MC Kelly | `assets-local/mc/kelly.png`, `mc/kelly/` | Ảnh tĩnh. Đủ cho bản đầu vì PDF cho phép dùng ảnh tĩnh |
| 62 chibi (nhìn thẳng) | `assets-local/chibi/*.png` (154×360, có alpha) | **Sai hướng** so với concept. Chỉ dùng tạm làm ảnh giữ chỗ khi dev |
| Âm thanh giao diện | `assets-local/audio`, `audio-src` | Dùng tạm cho cue mở/đóng bình chọn |
| Video FFA | `E:\Tai xuong\1111_PVAN KOL FFA.mp4` | 1080×1920 dọc, HEVC, 64 s, 80 MB. Chỉ dùng để test phát hoặc letterbox |
| Bảng hạng mục và đề cử FFA 2026 | `E:\Tai xuong\Sự kiện FFA 2026 của Free Fire.xlsx` | Có thể làm nguồn registry KOL. Có tên người chơi nên **chỉ để trong `data/`, không commit** |
| Font `UTM Mother.ttf` | Thư mục font của Windows | Không phải NVN Motherland Signature. Cần bạn xác nhận có dùng thay được không |

### 3.1b Người dùng gửi 24/11

Tất cả lưu ở `assets-local/cinema-ffa/` (bị gitignore, không commit).

| Asset | Tệp | Kiểm tra | Dùng cho |
|---|---|---|---|
| Logo FFA | `nguon/logo-FFA-nen-xam.jpg` (2000×2000, nền xám phẳng 68,68,68) → **`logo-ffa-tach-nen.png`** (1856×535, có alpha) | Đã tách nền bằng cách trừ màu nền phẳng. Soi phóng to trên nền tối và nền lụa: không viền xám | **A1 xong** |
| Nền lụa vàng | `nguon/nen-lua-vang-3840x2160.png` (16:9, 28 MB) | Không chữ | **A5 xong** (nền chờ trong màn chiếu). Cắt/làm tối góc để làm lớp lụa trang trí quanh logo |
| KV cúp FFA | `nguon/KV-cup-FFA.jpg` (2576×1445, 16:9) | Không chữ | Nền chờ thứ hai trong màn chiếu (luân phiên) hoặc nền màn kết quả |
| Mẫu popup câu hỏi | `nguon/mau-popup-cau-hoi.png` (895×495) | Chữ in sẵn trong ảnh | **Chỉ làm tham chiếu style**: tab logo phía trên, nền lụa, cúp góc phải dưới, chữ in hoa đậm, từ khoá tô vàng. Dựng lại bằng các lớp riêng |
| HUD_FFA | `nguon/HUD_FFA-anh-chup-man-hinh.jpg` (1320×724, chụp từ điện thoại) | Độ phân giải thấp, không phải PSD | Tham chiếu style khung: thanh vàng chuyển sắc, ô tối, móc vàng cong 2 bên, 4 thẻ dọc (hợp với Top 4). Dựng khung bằng CSS/SVG theo style này |
| Font NVN Motherland Signature | `nguon/NVN-MOTHERLAND-SIGNATURE.ttf` | 551 glyph, **đủ 134 ký tự tiếng Việt**. Bản quyền của người dùng | **A7 xong**. Đây là font chữ ký viết tay, khó đọc khi câu dài; dấu chữ in hoa sát mép trên. **Chỉ dùng cho chữ trang trí ngắn** (ví dụ chữ "Kết quả" ở tiêu đề). Câu hỏi, tên KOL và số liệu dùng sans-serif đậm dễ đọc như mẫu popup |
| Quyền video | Người dùng xác nhận 24/11: **toàn quyền bản quyền** video của đội | – | A10: quyền đã rõ, **còn thiếu tệp video 16:9** |

### 3.2 Còn thiếu: cần bạn cung cấp

> Cập nhật 24/11: A1, A5 và A7 đã có (mục 3.1b). A11 đã chốt (mục 5.5b). A10 đã có quyền nhưng chưa có tệp 16:9.
>
> Còn thiếu:
> - **A6 chibi quay lưng** (chặn nghiệm thu hình ảnh);
> - **A3 nền nhà hát dọc**: nếu không có, đề xuất dựng từ lớp nền tối, sàn phản chiếu bằng CSS và lụa cắt từ ảnh nền lụa;
> - **A4 khung màn chiếu**: dựng bằng CSS/SVG theo style HUD_FFA nếu không có PSD;
> - **tệp video 16:9**.

| # | Asset | Quy cách đề xuất | Bắt buộc ở phase |
|---|---|---|---|
| A1 | **Logo FFA tách nền** (thay cho `FFA LOGO FINAL_1.jpeg`, vì JPEG không có nền trong suốt) | PNG có alpha, rộng ≥ 960 px. Vùng hiển thị x 300–780, y 120–250 | P1 |
| A2 | **`FFA26_Frametext.png`** | PNG gốc | P1, nếu dùng cho tiêu đề popup |
| A3 | **Nền nhà hát tối sạch**: không logo, không màn chiếu, không khán giả, không chữ (lấy từ KV layered hoặc BACKGROUND.jpeg) | 1080×1920 JPG/PNG. Tách riêng lớp dải lụa vàng ở các góc nếu có | P1 |
| A4 | **Khung màn chiếu vàng** | PNG có alpha, ôm ngoài vùng 1024×576. Có thể làm 9-slice hoặc khung liền 1080×640 | P1 |
| A5 | **Nền chờ trong màn chiếu** (nền FFA khi chưa phát video) | 1024×576 (hoặc 2048×1152), không chữ động | P1 |
| A6 | **Chibi quay lưng** | ≥ 12 mẫu khác nhau, PNG alpha, cao ≥ 600 px, cùng góc nhìn và ánh sáng. Nên có thêm 3–4 mẫu giơ tay | **P1 (chặn nghiệm thu hình ảnh)** |
| A7 | **Font NVN Motherland Signature** và giấy phép dùng | TTF/OTF hoặc WOFF2, có dấu tiếng Việt | P1 |
| A8 | **Khung popup câu hỏi và khung kết quả** (viền vàng, biểu tượng bình luận, hòm phiếu, nguyệt quế, vương miện vàng/bạc/đồng) | PNG alpha từng lớp riêng, hoặc chấp nhận dựng bằng CSS giống concept | P2 (mặc định dựng bằng CSS nếu không có) |
| A9 | **HUD_FFA.psd** | PSD có lớp | Không bắt buộc. Chỉ để tham chiếu |
| A10 | **Video 16:9 có quyền phát lại trên LIVE** | MP4 H.264/AAC, 1920×1080 hoặc 1280×720, kèm xác nhận quyền | P1 để test, P3 để phát thật |
| A11 | **Danh sách KOL và alias đã duyệt** | Tên chuẩn, alias được phép, KOL nào tạm tắt | P2 |
| A12 | Âm cue Cinema: mở bình chọn, 10 giây cuối, công bố kết quả, nhạc chờ | OGG/MP3, đã chuẩn hoá âm lượng | P2 (tạm dùng âm có sẵn) |

---

## 4. Gap Matrix

Ghi chú:
- **Có** = có sẵn, **Một phần** = phải mở rộng, **Chưa** = làm mới.
- C1 = Codex 1 (server, test, fixture). C2 = Codex 2 (UI, theme).

| # | Yêu cầu | Hiện trạng | File/module | Phụ thuộc | Rủi ro | Test | Nghiệm thu |
|---|---|---|---|---|---|---|---|
| 1 | Giữ nguyên Quiz Mode | Có | Toàn bộ | – | Tách nơi nhận comment chạm `runtime.ts` | Toàn bộ test hiện có (vitest 688, Playwright 176 ×2 + placeholder, soak) | Bộ test cũ qua 100%. Chạy thử 1 vòng Quiz MOCK sau khi gộp |
| 2 | Chuyển Quiz ↔ Cinema trên Dashboard | Chưa | Mới: `server/src/mode-router.ts`. Sửa: `runtime.ts:490-495`, `app.ts`. Dashboard: `main.tsx` | Settings DB | Đổi mode khi Quiz đang chạy | Không cho đổi khi đang có vòng hoặc poll đang mở. Đổi xong thì epoch tăng, timer và audio cũ bị huỷ | Đổi qua lại 20 lần không sót timer hay audio, không phải mở lại LIVE Studio |
| 3 | Dùng asset FFA thật | Chưa có asset | Theme `data/themes/ffa-awards` | **A1–A7** | Thiếu asset | Validate manifest: tệp tồn tại, có alpha, đúng kích thước | Screenshot dùng asset thật, không dùng ảnh concept làm nền |
| 4 | Giao diện bán 3D theo concept | Chưa | Mới: `overlay/src/cinema/CinemaStage.tsx`, `cinema.css` | A3, A4, A6 | Lệch concept | So ảnh phóng to theo quy tắc soi UI | Bạn duyệt ảnh 3 trạng thái |
| 5 | Màn chiếu đúng 16:9 trên 1080×1920 | Chưa | `CinemaStage` | – | Video khác tỷ lệ bị kéo giãn | e2e đo bbox video = 1024×576 ±0; video dọc phải dùng `object-fit: contain` | Đo bbox ở cả 3 trạng thái |
| 6 | Không sân khấu, bục, ghế, BXH cố định | Đúng thiết kế mới | `CinemaStage` | – | Vô tình dùng lại thành phần cũ của Arena | e2e: không có `.v3-seat`, `.v3-throne`, `.v3-leaderboard` | Soi ảnh |
| 7 | Chibi đứng tự do, có chiều sâu | Chưa | Mới: `cinema-audience.ts` (server), `CinemaAudience.tsx` | **A6** | Thiếu sprite quay lưng | Vị trí và tỉ lệ cố định theo slot. Gán sprite ổn định theo userId | 3 ảnh trạng thái có cùng toạ độ nhân vật (sai lệch 0 px) |
| 8 | Giảm sáng như rạp khi phát | Chưa | `cinema.css` (lớp lighting) | – | Phủ tối nhầm lên video | e2e: lớp tối không giao vùng video. Pixel trong vùng video không đổi | Ảnh PLAYING so với WAITING |
| 9 | Popup không đổi bố cục | Chưa | `CinemaPopup.tsx` (absolute, trong vùng màn chiếu) | – | Reflow | e2e: bbox mọi nhân vật trước và sau popup bằng nhau | Diff 0 px ngoài vùng màn chiếu |
| 10 | Popup giữa màn khi chờ, popup kiểu phụ đề khi chiếu | Chưa | `CinemaPopup.tsx` | 12 | Che phụ đề thật | e2e 2 kiểu: giữa (840×330) và phụ đề (960×80) | Ảnh popup khi đang phát |
| 11 | MC chỉ hiện khi có thoại | Một phần: có cue giọng MC | `CinemaStage` dùng `mcVoiceCue` / `mcChatBubble` | – | MC che câu hỏi hoặc timer | e2e: không có cue thì MC không có trong DOM | Ảnh khi MC nói |
| 12 | Video local và YouTube | Chưa. Asset video arena có nhưng không có Range | Mới: `server/src/cinema/media-library.ts`, route `/cinema/media/:id` có Range | A10 | Codec, autoplay, quyền phát | Test Range 206, chặn path traversal, chặn đuôi lạ. YouTube: chỉ host hợp lệ | Phát, tạm dừng, tua và phát tiếp trên Edge và LIVE Studio thật |
| 13 | Poll Engine: alias, fuzzy | Chưa | Mới: `packages/cinema-core` (thuần, không IO) | A11 | Gộp nhầm 2 KOL | Bộ test tên Việt: đúng tên, bỏ dấu, gõ sai, alias trùng, nhiều tên, tên ngắn | Tỉ lệ khớp đúng ≥ 99% trên bộ test. 0 lần gộp nhầm |
| 14 | Mỗi người 1 phiếu hợp lệ | Một phần (Quiz có luật 1 đáp án) | `cinema-core` + unique `(poll_id, user_id)` | – | Phiếu đầu sai làm mất quyền vote | Test: phiếu sai không khoá quyền vote, phiếu đúng đầu tiên được tính | Đếm khớp simulator 100% |
| 15 | Top 4 theo số người và % | Chưa | `cinema-core/results.ts` | – | Đồng hạng, N=0, làm tròn | Test bảng: đồng hạng ở hạng 4, N=0, nhóm "Khác", largest remainder | Số liệu khớp bản tính tay |
| 16 | Không đưa comment thô lên Overlay/TTS | Có nguyên tắc từ V4 | Contract `CinemaSnapshot` không có trường raw | – | Rò chuỗi pending | Test contract: snapshot không chứa userId, raw, pending. Privacy check | Quét snapshot 10k phiếu: 0 chuỗi thô |
| 17 | Không rank cá nhân dài hạn | Đúng thiết kế | Không tạo bảng profile/rank | – | – | Test schema không có cột điểm Cinema | – |
| 18 | Tải 5.000–10.000 người | Một phần (soak 68k comment, audience 2.000) | `tests/load/cinema-poll.test.ts` | – | Phát WS cho từng comment | Simulator 10k user, comment trùng dồn dập, gõ sai | p95 xử lý < 5 ms/comment. Phát WS ≤ 4 Hz. Heap ổn định (có GC). Đếm không sai |

---

## 5. Kiến trúc đề xuất

### 5.1 Định tuyến theo mode

```
TikTok adapter ──► ModeRouter (mới, app.ts) ──┬─► SessionRuntime.ingest()     (appMode = QUIZ, giữ nguyên)
                                              └─► CinemaRuntime.ingestVote()  (appMode = CINEMA)
```

- **Đăng ký nhận comment:**
  - Phần đăng ký ở `runtime.ts:490-495` chuyển lên `ModeRouter`; `SessionRuntime` chỉ nhận comment qua `ingest/ingestBatch`.
  - Riêng trạng thái kết nối (`onStatus`) vẫn gửi cho cả hai runtime.
  - Đây là thay đổi duy nhất chạm Quiz. Nó có test hồi quy riêng: comment Quiz đi qua router phải cho kết quả giống hệt hiện tại.
- **`modeEpoch`:**
  - Là số tăng mỗi lần đổi mode, lưu ở bảng settings.
  - Comment, timer và cue mang epoch cũ bị bỏ qua.
- **Luật đổi mode:**
  - Chỉ đổi được khi Quiz đang ở `LOBBY/IDLE` không có vòng chạy và Cinema không có poll `OPEN/LOCKED/REVIEW`.
  - Dashboard bắt operator xác nhận trước khi đổi.
  - Kết nối TikTok giữ nguyên khi đổi mode.
- **Lệnh từ Dashboard:** mỗi lệnh có `commandId` và `expectedRevision`. Server kiểm tra, chống chạy lặp rồi trả ACK, theo mẫu lệnh có `stateVersion` đang dùng ở `contracts/src/index.ts:769`.

### 5.2 Hai state machine độc lập (trong `packages/cinema-core`, thuần)

- **Media:** `EMPTY → LOADING → READY ⇄ PLAYING ⇄ PAUSED → ENDED`, và `ERROR` từ mọi trạng thái.
  - Server giữ `positionMs` và `paused`.
  - Overlay báo lại vị trí đang phát khoảng 1 lần/giây để khôi phục khi mất kết nối.
- **Poll:** `IDLE → DRAFT → OPEN → LOCKED → REVIEW → PUBLISHED → DISMISSED`, có thể sang `CANCELLED` từ `DRAFT/OPEN/LOCKED/REVIEW`.
  - Server giữ `deadlineMs`. Đồng hồ đếm ngược bắt đầu khi Overlay ACK đã hiện câu hỏi; quá 3 giây chưa ACK thì vẫn bắt đầu và gửi cảnh báo lên Dashboard.
  - Bình chọn khoá đúng deadline. Không có REVIEW tự công bố. Mất kết nối thì đánh dấu `degraded`.

### 5.3 Contracts (bổ sung, không phá client cũ)

```ts
PublicSnapshot += {
  appMode?: 'QUIZ' | 'CINEMA';   // vắng = QUIZ
  modeEpoch?: number;
  cinema?: CinemaSnapshot | null;
}

CinemaSnapshot = {
  revision: number;
  media: { state: MediaState; mediaId: string | null; kind: 'LOCAL' | 'YOUTUBE' | null; positionMs: number; paused: boolean; startedAtServerMs: number | null };
  poll: {
    state: PollState; pollId: string | null; question: string | null; hint: string | null;
    deadlineMs: number | null; layout: 'CENTER' | 'SUBTITLE';
    validCount: number;           // chỉ số tổng
    results: PollResult[] | null; // chỉ khi PUBLISHED
    otherPercent: number | null;
    tiedOutside: boolean;
  };
  audience: { slots: { slotId: string; spriteId: string; name: string | null }[] }; // tên đã lọc
  mc: { visible: boolean; text: string | null };
  lighting: 'PLAYING' | 'WAITING' | 'RESULT';
}

PollResult = { entityId: string; approvedLabel: string; count: number; percent: number; rank: number };
```

- Overlay không bao giờ nhận raw comment, userId, nhóm pending hay chuỗi chưa duyệt.
- Phần riêng tư (vote, pending, alias) chỉ gửi qua `ADMIN_SNAPSHOT` cho Dashboard đã xác thực.

### 5.4 Migration `0008_cinema.sql` (chỉ thêm bảng, không sửa bảng Quiz)

| Bảng | Cột chính | Ràng buộc |
|---|---|---|
| `cinema_media` | id, kind (LOCAL/YOUTUBE), label, file_rel_path / youtube_id, duration_ms, codec_ok, created_at | file_rel_path nằm trong thư mục media cho phép |
| `cinema_entities` | id, canonical_name, enabled, approved, registry_id | unique (registry_id, canonical_name) |
| `cinema_aliases` | id, entity_id, alias_exact, alias_folded, approved | unique (registry_id, alias_folded) để chặn alias trùng giữa 2 KOL |
| `cinema_polls` | id, epoch, question, hint, duration_ms, registry_snapshot_json, state, opened_at, deadline_ms, locked_at, published_at, result_json, revision | result_json không đổi sau khi publish. Sửa thì tạo revision mới kèm audit |
| `cinema_votes` | id, poll_id, user_id, event_id, received_at, normalized_text (ngắn), entity_id?, status (ACCEPTED/PENDING/INVALID/DUPLICATE), reason | unique (poll_id, user_id) WHERE status = 'ACCEPTED'; unique (source, event_id) |
| `settings` | thêm khoá `app_mode`, `mode_epoch` | – |

- **Không lưu comment thô.** Chỉ lưu chuỗi đã chuẩn hoá, tối đa 64 ký tự, để duyệt nhóm pending.
- **TTL đề xuất:** chi tiết phiếu 14 ngày, số tổng hợp giữ lâu dài. Bạn duyệt con số này.
- **Rollback:**
  - Trước khi gộp mỗi phase: sao lưu `data/quiz.db` bằng `readonly-backup` và đặt tag git `stable-pre-cinema-pN`.
  - Bảng mới không có khoá ngoại sang bảng Quiz, nên quay về bản cũ chỉ cần checkout tag. Bản cũ bỏ qua các bảng lạ; drizzle không chạy migration ngược.
  - Muốn xoá sạch dữ liệu Cinema thì dùng script `tools/cinema-drop.sql`, chạy tay.

### 5.5 Poll Engine (PDF mục 05, chốt cách làm)

Đường đi của một comment:
1. Kiểm tra `appMode`, `epoch`, trạng thái poll `OPEN` và deadline.
2. Chống trùng `eventId`.
3. Cắt độ dài ≤ 80 ký tự.
4. Lọc từ tục trên chuỗi **còn dấu**.
5. NFKC, chữ thường, gộp khoảng trắng.
6. Khớp alias chính xác (còn dấu).
7. Khớp alias bỏ dấu (đ → d), chỉ khi kết quả là duy nhất.
8. Khớp gần đúng Damerau-Levenshtein:
   - tên 5–8 ký tự: lệch tối đa 1;
   - tên từ 9 ký tự: lệch tối đa 2 và độ giống ≥ 0,85;
   - tên dưới 5 ký tự: chỉ khớp chính xác;
   - phải có đúng một ứng viên tốt nhất, cách ứng viên thứ hai ≥ 0,15.
9. Chuỗi chứa ≥ 2 KOL, URL, hoặc từ xúc phạm/mạo danh → INVALID. Không khớp được → PENDING, gom nhóm theo chuỗi chuẩn hoá, tối đa 200 nhóm.

Hiệu năng:
- Alias tra bằng Map, O(1). Cache kết quả fuzzy theo chuỗi chuẩn hoá (LRU 5.000).
- Ghi DB theo lô mỗi 250 ms. Phát số tổng lên Overlay tối đa 4 lần/giây.
- Không gọi AI cho từng comment.

Phiếu:
- Mỗi userId chỉ có 1 phiếu ACCEPTED: phiếu hợp lệ đầu tiên thắng, phiếu sai không khoá quyền vote.
- Khi duyệt pending, chọn phiếu hợp lệ sớm nhất theo thứ tự server.

Kết quả:
- N = số người có phiếu ACCEPTED; % = 100 × count / N.
- Đồng phiếu thì cùng hạng, xếp theo entityId. Nếu đồng hạng ở vị trí thứ 4 thì ghi chú "có đồng hạng" bên ngoài danh sách.
- "Khác" là phần ACCEPTED ngoài Top 4. Làm tròn bằng largest remainder để Top 4 + Khác cộng đủ 100%.
- N = 0 thì hiện "Chưa có phiếu hợp lệ".

### 5.5b Nguồn danh sách KOL (người dùng chốt 24/11)

1. **Ưu tiên danh sách đề cử.**
   - Nhập từ `Sự kiện FFA 2026 của Free Fire.xlsx`: 23 hạng mục, 171 tên không trùng.
   - Mỗi hạng mục là một registry; thêm registry gộp "Tất cả đề cử User Vote" (15 hạng mục, 157 tên).
   - Khi soạn câu hỏi, operator chọn registry. Ví dụ: "Bạn là fan của KOL nào?" → hạng mục "Nhà Sáng Tạo Được Yêu Thích Nhất" (120 tên).
   - Tên đề cử là tên chuẩn đã duyệt sẵn. Alias ban đầu sinh tự động: bản bỏ dấu, bỏ ký tự trang trí và khoảng trắng đặc biệt, bỏ tiền tố đội (ví dụ `WAG.PLS1` → `pls1`).
   - Alias sinh tự động chỉ được bật nếu không trùng giữa hai tên. Alias trùng thì chờ operator duyệt.
   - Tệp nhập và registry chỉ lưu ở `data/cinema/` (không commit, không đưa vào hòm thư), vì bảng có họ tên thật của người ngoài giới KOL.
2. **Bổ sung theo số đông người comment.**
   - Tên không có trong danh sách được gom nhóm pending và xếp theo **số người khác nhau** đã comment, không theo số comment.
   - Nhóm đạt ngưỡng (mặc định ≥ 20 người hoặc ≥ 1% phiếu hợp lệ) được đẩy lên đầu bảng duyệt, gắn nhãn "đề xuất thêm".
   - Operator duyệt bằng một lần bấm:
     - thêm làm KOL mới;
     - gộp làm alias của một KOL đã có. Cách này cũng dùng để học các cách viết sai phổ biến.
   - Phiếu của nhóm được tính ngay khi duyệt, theo phiếu hợp lệ sớm nhất của từng người.
   - Theo PDF, **chưa duyệt thì không công bố và không lên Overlay**. Số đông chỉ dùng để gợi ý, không tự thêm.
   - Tên đã duyệt trong một poll được lưu lại cho các poll sau của cùng registry.

### 5.6 Hệ toạ độ cảnh (cố định cho mọi trạng thái)

| Lớp (z tăng dần) | Toạ độ trên canvas 1080×1920 | Đổi theo trạng thái |
|---|---|---|
| 0 Nền nhà hát (A3) | 0,0 1080×1920 | Chỉ đổi độ sáng (filter) |
| 1 Dải lụa và hạt sáng trang trí | theo asset | Độ sáng |
| 2 Logo (A1) | x 300–780, y 120–250 | Độ sáng (giảm khi PLAYING) |
| 3 Khung màn chiếu (A4) | bao ngoài vùng x 28, y 340, 1024×576 | Ánh viền |
| 4 Bề mặt màn chiếu: nền chờ (A5), video hoặc YouTube | **x 28, y 340, w 1024, h 576** (đúng 16:9) | Nội dung |
| 5 Ánh sáng môi trường (vùng tối hoặc ánh vàng) | toàn canvas **trừ** vùng màn chiếu | Chuyển 300–600 ms |
| 6 Sàn phản chiếu và bóng | y 970–1920 | Độ sáng |
| 7 Khán giả (40 slot cố định, so le, tỉ lệ theo độ sâu) | y 970–1800 | **Không đổi vị trí, không đổi tỉ lệ** |
| 8 Nameplate (tối đa 10 cái hiện cùng lúc, không chồng nhau) | phía trên slot | Chỉ đổi khi slot đổi người |
| 9 Popup câu hỏi/kết quả | CENTER x 120, y 450, 840×330 · SUBTITLE x 60, y 810, 960×80 · kết quả trong vùng màn chiếu | Hiện/ẩn |
| 10 MC Kelly (chỉ khi có cue) | trong vùng màn chiếu, cạnh popup, không che timer | Hiện/ẩn |

- **Khán giả, bản cập nhật 24/11 theo câu hỏi của người dùng:**
  - Số slot cấu hình được từ 40 đến 100, **mặc định 70**.
  - Chia 6 hàng độ sâu, tỉ lệ 0,4 → 1,0. Hàng xa nhỏ và tối hơn, không có nameplate.
  - Phía sau cùng có thêm lớp "đám đông xa" tĩnh để cảnh trông đông như concept. Lớp này không gắn với người xem nào.
  - Số nameplate vẫn giới hạn tối đa 12 để không chồng nhau.
  - Nghiệm thu P1 phải đo FPS ở 100 slot: mục tiêu ≥ 30, cả khi đang phát video.
- **Khán giả (bản gốc, 40 slot, đã thay bằng mục trên):**
  - Bố trí 40 slot (trong khoảng 35–50 PDF đề xuất), chia 4 hàng độ sâu, tỉ lệ 0,55 → 1,0.
  - Slot được lấp lần lượt theo người comment trong Cinema Mode.
  - Khi đầy, mỗi 10 giây thay tối đa 3 slot của người lâu không hoạt động.
  - **Ngưng thay người khi popup đang hiện.**
  - Sprite gán theo userId và giữ nguyên trong suốt phiên.
- **Vùng che của TikTok:** trên điện thoại thật, vùng bình luận của TikTok (khoảng y 1300–1750, bên trái) sẽ che một phần khán giả. Khán giả chỉ là trang trí nên chấp nhận được; mọi chữ quan trọng nằm trong màn chiếu. Toạ độ chỉ khoá sau khi đo trên HUD TikTok thật (P1).

### 5.7 Video và âm thanh

- **Video local:**
  - Dashboard chọn tệp trong thư mục cho phép `data/cinema/media/`; không đưa vào Git.
  - Server đăng ký `mediaId` và phục vụ tệp ở `/cinema/media/:mediaId`, đọc dạng stream, **có HTTP Range**, chỉ nhận `.mp4/.webm`.
  - Overlay chỉ nhận `mediaId`, không bao giờ nhận đường dẫn tệp.
  - Lúc đăng ký, dùng ffprobe (máy đã có ffmpeg) kiểm codec. Gặp HEVC thì cảnh báo và có nút chuyển mã sang H.264 chạy nền.
- **Một đầu ra âm thanh duy nhất:**
  - Âm thanh phát từ cửa sổ Overlay chương trình. Preview trên Dashboard tắt tiếng mặc định.
  - MC nói thì hạ âm lượng video −12 dB, nói xong khôi phục.
  - Nhạc nền tắt khi đang phát video.
- **Chiếu cùng giờ công chiếu, người dùng chốt 24/11 làm cả 2 cách:**
  - **Cách 1, chính (P1): phát tệp MV gốc trên máy, hẹn giờ.**
    - Operator đặt giờ bắt đầu theo đồng hồ server, chính xác tới giây. Server gửi `startsAtServerMs`, Overlay phát đúng mốc đó.
    - Nếu Overlay mở muộn thì tua tới đúng vị trí đang phát.
    - Popup kiểu phụ đề nằm trong màn chiếu như thiết kế.
  - **Cách 2, dự phòng (P3): nhúng YouTube.**
    - Dùng được cả video công chiếu (Premiere) và video thường.
    - Khi poll mở, popup hiện ở dải **ngay dưới khung màn chiếu** (y ≈ 930–1010), không đè lên player.
    - Có tuỳ chọn khác: tạm ẩn player và hiện popup trong màn chiếu.
    - Dashboard nhắc tắt quảng cáo cho video và cảnh báo khi mạng chậm.
  - **Bản quyền trên TikTok:**
    - Preview của LIVE Studio không gửi gì lên TikTok, nên không kiểm được bản quyền.
    - Muốn biết TikTok có tắt tiếng hay cảnh báo không thì phải phát LIVE thật một lúc ngắn, ví dụ bằng tài khoản phụ.
    - Kết quả thử chỉ để tham khảo, không bảo đảm buổi chính sẽ giống hệt.
- **YouTube (P3):**
  - Dùng IFrame Player API, chỉ nhận host `youtube.com` / `youtu.be`.
  - Mở bình chọn thì tạm dừng và ẩn player, popup hiện trên nền chờ. Không phủ lên player.
  - Dashboard ghi rõ: nhúng được không có nghĩa là được phát lại trên LIVE.

---

## 6. Chia phase và tiêu chí nghiệm thu

Mỗi phase:
- làm trên nhánh riêng;
- gộp thử và chạy đủ test: typecheck, privacy, vitest, Playwright asset thật ×2 + placeholder, soak;
- gửi bạn screenshot thật và số liệu test, chờ bạn **"Duyệt"** mới gộp main và sang phase sau;
- trước khi gộp: sao lưu DB và đặt tag.

### Phase 0 — Audit (tài liệu này)
- **Còn làm sau khi bạn duyệt:** sao lưu `data/quiz.db`, đặt tag `stable-pre-cinema`, ghi DECISIONS/BOARD.
- **Nghiệm thu:** bạn duyệt tài liệu này và trả lời các câu hỏi ở mục 7.

### Phase 1 — Cinema shell (C1 server, C2 UI, làm song song)
- **C1:**
  - `ModeRouter` và `modeEpoch`, cùng luật đổi mode;
  - contracts bổ sung, migration 0008 (chỉ bảng `cinema_media` và settings, còn lại để P2);
  - media library và endpoint Range, ffprobe;
  - lệnh media play/pause/seek/next có ACK;
  - test hồi quy: Quiz đi qua router.
- **C2:**
  - `CinemaStage` với 10 lớp ở mục 5.6;
  - theme `ffa-awards` với các khoá `cinema.*`;
  - khán giả 40 slot, lighting, phát video local;
  - Dashboard: chọn mode, chọn video, điều khiển phát.
- **Nghiệm thu:**
  - Screenshot 1080×1920 của 3 trạng thái (đang chiếu / chờ / màn kết quả giả), **cùng toạ độ nhân vật và màn chiếu (lệch 0 px)**;
  - bbox video = 1024×576;
  - không có ghế, bục, bảng điểm;
  - đổi mode 20 lần không lỗi;
  - Quiz hồi quy 100%;
  - đo vùng che HUD trên TikTok thật.
- **Chặn bởi:** A1, A3, A4, A5, A6, A7 (dev được bằng ảnh giữ chỗ, nhưng ảnh nghiệm thu phải dùng asset thật).

### Phase 2 — Poll Engine (C1 lõi, C2 popup và trang duyệt)
- **C1:**
  - `packages/cinema-core`: chuẩn hoá, alias, fuzzy, phiếu, kết quả;
  - CinemaRuntime: poll state machine, deadline, lưu DB theo lô;
  - registry nhập từ xlsx hoặc Dashboard;
  - chỉ gửi snapshot đã lọc.
- **C2:**
  - popup CENTER và SUBTITLE, kết quả Top 4 dạng 4 hàng và dạng 2×2, MC popup;
  - Dashboard: soạn câu hỏi, quản lý registry/alias, bảng duyệt pending (map, gộp, loại), xem trước Top 4, Publish/Dismiss/Cancel, Stop MC, Stop Media;
  - số valid/pending/invalid/duplicate.
- **Test:**
  - tất cả ca trong PDF trang 9: đúng tên, bỏ dấu, gõ sai, alias trùng, nhiều tên, từ tục, spam, phiếu muộn, duyệt pending, đồng hạng, N=0, "Khác", mất kết nối, khởi động lại.
- **Nghiệm thu:**
  - ảnh popup khi chờ và khi đang phát, ảnh kết quả;
  - diff 0 px ngoài vùng màn chiếu khi popup hiện;
  - snapshot không có chuỗi thô.
- **Chặn bởi:** A11 (danh sách KOL). A8 và A12 không chặn.

### Phase 3 — Media nâng cao (C1 + C2)
- **Phạm vi:**
  - playlist;
  - YouTube theo điều kiện ở 5.7;
  - khôi phục khi lỗi: hết thời gian tải, autoplay bị chặn, codec lỗi, mất tệp;
  - tạm dừng/phát tiếp đúng vị trí khi chính poll đã dừng video;
  - hạ âm lượng video khi MC nói;
  - Overlay nối lại thì tua đúng vị trí.
- **Nghiệm thu:**
  - test trên Windows và **LIVE Studio thật** (âm thanh, hình ảnh, chuyển mode), có log;
  - đã kiểm quyền nội dung trước khi phát.

### Phase Q — Quiz chịu tải 20.000 người (C1, làm ngay, song song P1)
- **Phạm vi:** chạy trọn vòng MOCK 15 câu × 10.000 và 20.000 người (vào sảnh, trả lời, REVEAL, BXH, Victory), có Overlay và Dashboard mở.
- **Đo:** event-loop p99, thời gian REVEAL → BXH, độ trễ snapshot WS, heap, FPS Overlay.
- **Nghiệm thu:** event-loop p99 < 100 ms; đồng hồ đếm ngược không giật; 0 đáp án mất; điểm khớp bản tính tay; toàn bộ test Quiz qua.

### Phase 4 — Tải và hồi quy (C1)
- **Phạm vi:** simulator 5.000, 10.000 và 20.000 người, comment trùng dồn dập, gõ sai.
- **Đo:** p50/p95 thời gian xử lý và phát WS, heap (có GC), FPS Overlay (mục tiêu ≥ 30).
- **Nghiệm thu:**
  - đếm không sai;
  - 0 chuỗi thô rò ra;
  - hàng đợi có trần;
  - toàn bộ test Quiz/V5 qua.

### Gate phát hành
- QA chức năng, hình ảnh và vận hành.
- Video demo chuyển mode, benchmark 10k, log LIVE Studio, danh sách tệp sửa, hướng dẫn operator.
- Cập nhật BOARD/DECISIONS/HANDOFF/THEME.

---

## 7. Cần bạn quyết định hoặc cung cấp

1. **Asset A1–A7 và A10** (bảng 3.2): gửi tệp hoặc chỉ nơi lưu. Riêng **A6 (chibi quay lưng)**: có sẵn từ đội thiết kế không, hay cần đặt vẽ mới?
2. **Video:** có bản 16:9 H.264 không? Video nào đã được phép phát lại trên TikTok LIVE?
3. **Font:** `UTM Mother` có thay được NVN Motherland Signature không, hay chờ tệp gốc kèm giấy phép?
4. ~~**Danh sách KOL**~~ **Đã chốt 24/11:** ưu tiên danh sách đề cử, bổ sung tên được nhiều người comment sau khi operator duyệt (mục 5.5b). A11 không còn chặn Phase 2.
5. **Các thông số mặc định** mình đề xuất, bạn đổi nếu muốn:
   - 40 slot khán giả;
   - tối đa 10 nameplate cùng lúc;
   - lưu chi tiết phiếu 14 ngày;
   - kết quả tự ẩn sau 10 giây khi đang chiếu;
   - poll 60 giây;
   - hạ âm lượng video −12 dB khi MC nói.
6. **YouTube:** đồng ý để YouTube ở Phase 3 với cách "tạm dừng và ẩn player khi mở bình chọn" không?
