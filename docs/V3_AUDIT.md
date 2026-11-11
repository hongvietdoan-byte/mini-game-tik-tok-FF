# Audit V2 → V3 (Storm Arena Build Spec V3.0) — 11/11/2026

Trạng thái: **báo cáo, CHƯA sửa code**. Chờ người dùng xác nhận các mục ở §6 trước khi triển khai.
Nguyên tắc: giữ kiến trúc + module V2 đang đúng; V3 ưu tiên khi mâu thuẫn về UI / khán giả / animation.

## 1. Hiện trạng source (main, 11/11 ~11:50)

| Module | Trạng thái | Kiểm chứng |
|---|---|---|
| `packages/contracts` | Zod schema, DTO, WS message | typecheck |
| `packages/quiz-core` | parse A/B/C/D, cửa sổ end-exclusive, chấm điểm + chuỗi, xếp hạng đồng hạng, podium, chọn câu có seed, reducer | 41 unit test (C-0002) |
| `packages/persistence` | SQLite WAL, 19 bảng, `Store` | (C-0004 đang chờ) |
| `packages/live-adapters` | Mock, TikTok BLOCKED, Scheduler, Simulator | dùng trong test tích hợp |
| `apps/server` | SessionRuntime (transaction + outbox), Fastify, WS theo vai, khôi phục sau crash | 14 test tích hợp + 1 test tải |
| `fixtures` | 36 câu DEMO (đang viết lại chủ đề Free Fire — C-0013) | 6 test |
| `apps/overlay` | 8 cảnh, sân khấu 1080×1920, mock, WS client, vùng an toàn động — **bố cục V2, chưa có MC/khán giả** | 4 test + 13 ảnh |
| `apps/dashboard` | Live Control — đang làm (C-0007) | — |
| `theme-core`, `ai-core` | stub | — |

Tổng: `corepack pnpm test` 67/67 xanh.

## 2. Bảng đối chiếu V2 → V3

Ký hiệu: ✅ đã có, giữ nguyên · 🟡 có nhưng cần sửa · ❌ chưa có, cần bổ sung · ⏸ để phase sau.

### 2.1 Engine / server / dữ liệu
| Mục V3 | Hiện tại | TT | Việc cần làm |
|---|---|---|---|
| §5 comment: chỉ A/B/C/D chính xác, first-answer-wins, dedupe eventId, sau deadline từ chối | Đúng như V3 | ✅ | — |
| §5 adapter không có userId ổn định → không chấm | Từ chối `INVALID_EVENT` khi thiếu userId | ✅ | Thêm cảnh báo adapter trên dashboard |
| §5 JOIN comment (tuỳ chọn) | Chưa có | ❌ | Cờ cấu hình `allowJoinComment` (mặc định tắt) — Giai đoạn C |
| §9 điểm +100, chuỗi 3/5/10, không thưởng tốc độ, đồng hạng | Đúng | ✅ | — |
| §9 SMART_RANDOM 7/5/3 mặc định | Chỉ RANDOM có seed | 🟡 | ⏸ P3 (Theme + Question Bank) như V3 xếp |
| §4 PREPARE hiện câu hỏi + 4 đáp án nhưng chưa nhận | `question` = null ở PREPARE | 🟡 | Đổi `publicSnapshot` (1 hàm, server) |
| §4 trạng thái `ANSWER_OPEN`, `ANSWER_LOCKED`, `FINISHED` | `ACCEPTING`, chốt + chấm điểm nguyên tử khi sang `REVEAL`, `ROUND_END` | 🟡 | **Đề xuất giữ tên nội bộ**, ánh xạ trong `GAME_STATE_MACHINE.md`; phát sự kiện `question.locked` ngay lúc chốt (xem §6-Q3) |
| §4 LEADERBOARD 4 s **sau mỗi câu**, BXH lớn mỗi 5 câu | LEADERBOARD chỉ ở mốc 5/10/15 (D-10) | 🟡 | Cần xác nhận (§6-Q1) — sửa reducer `afterQuestion` + test |
| §10 Top 10 compact bên trái trong lúc hỏi | Trong câu hỏi không có BXH; REVEAL có Top 3 | 🟡 | `publicSnapshot` gửi Top 10 compact ở mọi cảnh câu hỏi (cập nhật khi chốt câu, không đổi trong lúc trả lời) |
| §6 Audience: 35 ghế, gán nhân vật lưu DB, hàng chờ, rotation mỗi N câu, pin ≤ 5, `seatRotationId` | Chưa có | ❌ | Package mới `packages/audience-engine` (thuần) + bảng DB + tích hợp runtime — Giai đoạn C |
| §7 MC Kelly: trạng thái idle/welcome/ask/react/celebrate, bubble theo state, không phải player | Chưa có | ❌ | Hàm thuần `mcStateFor(snapshot)` + `bubbleText` (server, trong snapshot) — Giai đoạn B |
| §13 bảng `audience_slots`, `audience_assignments`, `character_definitions`, `character_assignments`, `logs` | Chưa có | ❌ | Migration `0001_*` — Giai đoạn C |
| §13 score_events idempotency | UNIQUE + tính lại toàn vòng | ✅ | — |
| §14 event `session.snapshot`, `question.*`, `audience.*`, `mc.state_changed`, `sequence` monotonic | `STATE_SNAPSHOT`… theo `stateVersion`; chưa có audience/mc; chưa có `sequence` | 🟡 | Thêm `seq` toàn cục cho mọi thông điệp + loại mới; giữ snapshot là nguồn thật; tài liệu ánh xạ tên trong `EVENT_CONTRACTS.md` (§6-Q3) |
| §2 routes `/dashboard`, `/overlay`, `/preview` | 2 app Vite riêng (:5173 dashboard, :5174 overlay) | 🟡 | Giữ 2 app; overlay thêm đường `/preview` (HUD giả lập). Không gộp app |
| §2 tên package `shared`, `game-engine`, … | `contracts`, `quiz-core`, … | ✅ | Giữ tên V2 (yêu cầu giữ kiến trúc); bảng ánh xạ trong ARCHITECTURE |
| §12 AI Studio | stub | ⏸ | P6 theo V3 |
| §15 safe-zone editor, preset `TikTok Standard` / `High Comment Density` / `Custom`, offset/scale từng layer, lưu theo Theme Pack | 1 preset cố định `INITIAL_TEST_SAFE_ZONE`, overlay có `?guides=1` | 🟡 | Contract `LayoutPreset` (layer → offset/scale) + bảng `settings` + API + editor trong dashboard — Giai đoạn E |

### 2.2 Overlay / giao diện
| Mục V3 | Hiện tại (C-0006) | TT | Việc cần làm |
|---|---|---|---|
| §3 bố cục: header 80–250, quiz board 260–760 (Top 10 trái + câu hỏi/timer/đáp án), MC 760–1070, audience 1080–1850 | Câu hỏi chiếm 230–1230, Top 10 là cảnh riêng | 🟡 | Dựng lại cảnh QUESTION/REVEAL theo khung V3; giữ client WS, mock, scale, test logic |
| §3 tách layer `background-storm` … `transitions` | DOM tách lớp nhưng tên khác, chưa có MC/audience | 🟡 | Đổi cấu trúc layer theo danh sách V3 |
| §6.2 7 hàng × 5 ghế, phối cảnh, tên ngắn 10–14 ký tự | ❌ | ❌ | Lớp `audience-*` (Giai đoạn D/E) |
| §8 PNG Sequence player (rAF + delta, cache texture, fallback static, reduced motion) | ❌ | ❌ | Module renderer mới trong overlay — đề xuất **Canvas 2D**, không thêm PixiJS ở MVP (§6-Q4) |
| §7 MC Kelly bên trái + bubble | ❌ | ❌ | Giai đoạn D |
| §11 Victory: cúp gốc giữa, 3 chibi đứng sàn trước bục, **không có 3 khối bục TOP 1/2/3** | Đang vẽ 3 khối bục + silhouette | 🟡 | **Trái V3** — làm lại khi có asset cúp/sân tách nền (P4). Tạm dừng C-0012 (đang làm đẹp 3 khối bục) |
| §10 BXH lớn mỗi 5 câu, rank-change 250–400 ms | Cảnh Top 10 phân trang 5/5 | ✅/🟡 | Giữ; thêm animation đổi hạng |
| §15 `/preview` HUD TikTok giả lập + slider mật độ comment | ❌ | ❌ | Giai đoạn E |
| Màu `#2D387F #7049F5 #FFCC58 #8CC8FB #D24470 #E47E5F` | Đã dùng | ✅ | — |

## 3. Kiểm kê asset thực có (rút gọn — bản đủ sẽ là `docs/ASSET_INVENTORY.md`)

| Nguồn V3 nhắc | Có trong thư mục? | Phân loại |
|---|---|---|
| `a_highly_detailed_neon_esports_quiz_livestream_pos.png` (mẫu đã duyệt mới nhất) | **KHÔNG** | missing — cần người dùng gửi |
| `1920x1080*.jpeg` (Visual Guide, 7 file) | **KHÔNG** | missing |
| `IMG_2124/2125/2134/2141/2142.jpeg` | **KHÔNG** theo tên; có 14 file `Ảnh ChatGPT …jpg` có vẻ tương ứng (cúp + bục nền xám, sân 16:9, cổng năng lượng 9:16, chibi tham chiếu, poster đội) | requires cutting + cần xác nhận ánh xạ |
| `2026-11-11_chibi_kho/` (mới) | Có: **67 PNG 1152×2048, RGB — không có alpha**, nền xám gradient; 62 nhân vật Free Fire + biến thể; `Kelly.png`; bảng duyệt `_bang_duyet_1/2.jpg`; 203 MB | requires cutting (tách nền) + requires new export (kích thước ≤ ~512 px cao, WebP/PNG alpha) |
| PNG Sequence (idle/react/victory) cho Kelly hoặc chibi | Không | requires new export — MVP dùng PNG tĩnh + chuyển động transform 1–2 % (đúng V3 §7) |
| Logo Storm Arena / Bá Vương Đại Chiến bản trong suốt | Không (chỉ có trong poster) | missing |
| Cúp + sân khấu gốc tách nền | Không (ảnh nền xám) | requires cutting |
| Font GFF | Không | dùng font hệ thống tiếng Việt (V2 đã chốt) |

Đã thêm `/2026-11-11_chibi_kho/` vào `.gitignore` (repo đang PUBLIC). Chưa có file nào trong đó bị commit.

## 4. File cần chỉnh sửa / thêm

| Giai đoạn | File | Loại |
|---|---|---|
| A (tài liệu) | `docs/ASSET_INVENTORY.md`, `UI_LAYOUT_SPEC.md` (+ wireframe 1080×1920 có safe zone), `GAME_STATE_MACHINE.md`, `EVENT_CONTRACTS.md`, `AUDIENCE_SEATING_SPEC.md`, cập nhật `TEST_PLAN.md`, `ARCHITECTURE.md`, `DECISIONS.md` | thêm/sửa |
| B (engine/server nhỏ) | `packages/contracts/src/index.ts` (MC state, `seq`, Top 10 compact, layout preset), `packages/quiz-core/src/engine.ts` (nếu Q1 = có), `apps/server/src/runtime.ts` (`publicSnapshot`, `mcStateFor`, sự kiện), test tương ứng | sửa |
| C (khán giả) | `packages/audience-engine/**` (mới, thuần), `packages/persistence/src/schema.ts` + migration `0001`, `Store` (ghế, nhân vật), `runtime.ts` (gán ghế khi answer đầu, rotation giữa câu), test 500/35 + reload | thêm/sửa |
| D (renderer + MC) | `apps/overlay/src/render/sequencePlayer.ts`, `render/manifest.ts` (Zod), `scripts/validate-sequences.mjs`, `scripts/prepare-chibi.mjs` (resize/xuất WebP), lớp Kelly | thêm |
| E (bố cục V3 + preview) | `apps/overlay/src/main.tsx` tách thành `layers/*.tsx`, `style.css`, `mock/snapshots.ts`, đường `/preview` + HUD giả lập; `apps/dashboard` thêm safe-zone editor | sửa/thêm |
| F (Victory, P4 V3) | cảnh Victory dựa trên cúp/sân tách nền | sửa — chờ asset |

## 5. Rủi ro

| # | Rủi ro | Mức | Giảm thiểu |
|---|---|---|---|
| V1 | Thiếu ảnh mẫu đã duyệt + Visual Guide → dựng bố cục theo mô tả chữ, dễ lệch ý | Cao | Wireframe trước, người dùng duyệt rồi mới code |
| V2 | Chibi/Kelly không có alpha, nền gradient xám, tóc bạc/xám → tách nền tự động dễ lem | Cao | Cần bản PNG trong suốt từ nguồn gốc hoặc công cụ tách nền + duyệt bằng mắt; trước đó dùng placeholder có nhãn |
| V3 | Quyền dùng nhân vật Free Fire + Kelly trên stream; repo public | TB | Không commit asset tới khi có `ASSET_APPROVALS.json`; asset để ngoài git |
| V4 | 35 nhân vật + MC ở 30 fps trên máy phát | TB | Ảnh đã thu nhỏ ≤ 512 px, 1 canvas, nhân vật xa dùng tĩnh, benchmark CPU/RAM |
| V5 | Vùng câu hỏi V3 (260–760) hẹp hơn hiện tại (230–1230) + HUD phải → chữ nhỏ | TB | Kiểm cỡ chữ tối thiểu ở wireframe; câu dài tự co; preset HUD |
| V6 | Audience nằm vùng comment TikTok che | Thấp | V3 chấp nhận che một phần; dữ liệu bắt buộc không đặt ở đó |
| V7 | Đổi luật LEADERBOARD mỗi câu làm vòng dài thêm 15 × 4 s = 60 s | Thấp | Cấu hình được |
| V8 | Codex đang làm overlay/e2e theo bố cục V2 → làm lại | TB | Tạm dừng C-0012; C-0008 chưa chốt baseline ảnh |

## 6. Cần người dùng xác nhận trước khi code

- **Q1.** LEADERBOARD 4 s sau **mỗi** câu (V3 §4) thay cho chỉ ở mốc 5/10/15 (V2 D-10)? Đề xuất: theo V3; BXH lớn vẫn mỗi 5 câu, các câu khác chỉ cập nhật panel Top 10 compact.
- **Q2.** PREPARE hiện câu hỏi + 4 đáp án trước khi mở nhận (V3) — đề xuất: theo V3.
- **Q3.** Giữ tên trạng thái/thông điệp nội bộ V2 (`ACCEPTING`, `STATE_SNAPSHOT`…) và chỉ ánh xạ sang tên V3 trong tài liệu + thêm `seq` và các sự kiện mới, thay vì đổi tên toàn bộ? Đề xuất: giữ tên (đỡ rủi ro, test hiện có giữ nguyên).
- **Q4.** Renderer PNG Sequence bằng **Canvas 2D** (không thêm thư viện) thay vì PixiJS ở MVP; chuyển Pixi chỉ khi benchmark không đạt 30 fps.
- **Q5.** Asset: gửi ảnh mẫu `a_highly_detailed_neon_esports_quiz_livestream_pos.png` + 7 file Visual Guide; xác nhận ánh xạ `IMG_21xx` ↔ `Ảnh ChatGPT …`; có bản PNG trong suốt của chibi/Kelly không, hay để tool tách nền (chất lượng cần duyệt)? Có quyền dùng 62 nhân vật + Kelly trên LIVE không?
- **Q6.** Tạm dừng C-0012 (làm đẹp 3 khối bục — V3 cấm) và chưa chốt ảnh baseline của C-0008 cho tới khi bố cục V3 được duyệt.

## 7. Kế hoạch triển khai (sau khi được xác nhận)

| GĐ | Nội dung | Ai | Gate |
|---|---|---|---|
| A | Tài liệu §4 + **wireframe 1080×1920 có safe zone và HUD giả lập** (trang xem được) | coordinator | Người dùng duyệt wireframe |
| B | Engine/server: Q1–Q3, Top 10 compact, MC state + bubble, `seq` | coordinator; codex1 viết test | Test cũ + mới xanh |
| C | `audience-engine` + DB + runtime (35 ghế, hàng chờ, rotation, pin, reload giữ ghế) | coordinator (engine), codex1 (test 500/35, reload) | Test §17-4, §17-7 |
| D | PNG Sequence player + manifest + validator + chuẩn bị ảnh chibi (resize, alpha khi có) + MC Kelly tĩnh có chuyển động nhẹ | codex2 | §17-8, §17-9 |
| E | Overlay bố cục V3 (header, quiz board + Top 10 trái, MC, 7×5 khán giả), `/preview` HUD, safe-zone editor + preset | codex2 (+ dashboard) | Ảnh 1080×1920 và 720×1280, §17-6, §17-12 (giả lập) |
| F | Victory giữ cúp gốc (V3 P4) | sau khi có asset tách nền | §17-11 |

Không thay đổi: logic chấm điểm, nhận comment, khôi phục, idempotency, schema hiện có (chỉ thêm bảng), AI Studio/Theme Pack (vẫn là phase sau).

---

# Phụ lục V3.1 — Cài đặt & kết nối LIVE (audit, CHƯA sửa code)

Ký hiệu: ✅ có + đã kiểm thử tự động · 🧪 có nhưng **chưa kiểm thử** trong điều kiện thật · 🟡 có một phần · ❌ chưa có.

## A. Bộ cài Windows
| Hạng mục | TT | Hiện trạng |
|---|---|---|
| Bộ cài, không cần Node/terminal | ❌ | Chỉ chạy dev bằng `corepack pnpm dev` (3 tiến trình, 3 cổng) |
| Tự quản lý backend/frontend/DB | 🟡 | Server tự tạo DB + migrate + token khi khởi động; frontend vẫn là Vite dev server |
| Phục vụ overlay/dashboard bản build từ server | ❌ | Chưa có — cần cho cả bộ cài lẫn OBS |
| Thư mục dữ liệu người dùng (%APPDATA%) | ❌ | Đang dùng `data/` cạnh source |
| Native module `better-sqlite3` trong bản đóng gói | ❌ | Rủi ro chính khi đóng gói (ABI) |

## B. First-Run Setup Wizard — ❌ chưa có (các bước con dưới đây đều chưa có UI)
| Bước | Có gì để dựa vào |
|---|---|
| 1 Kiểm tra hệ thống | — |
| 2 Khởi tạo DB | ✅ migrate tự động lúc khởi động |
| 3 Kiểm tra Theme Pack | ❌ theme-core còn stub |
| 4 Cấu hình TikTok Connector | ❌ |
| 5 Kiểm tra Mock Mode | ✅ MockAdapter + simulator (qua API, chưa có UI wizard) |
| 6 Hướng dẫn OBS/LIVE Studio | ❌ |
| 7 Kiểm tra Overlay | 🟡 overlay chạy được, chưa có bước xác nhận |
| 8 Hoàn tất / bỏ qua TikTok để chạy offline | ❌ |

## C. TikTok Connection Manager
| Hạng mục | TT | Hiện trạng |
|---|---|---|
| Interface adapter (connect/disconnect/status/onComment/onStatus/healthCheck) | ✅ | `LiveAdapter` |
| Adapter TikTok thật | ❌ | `TikTokAdapterBlocked` — **chưa có connector được xác minh là hợp lệ**; chưa spike khả thi |
| Nhập username, Connect/Disconnect, Reconnect | ❌ | Chỉ có giả lập rớt/có mạng cho MOCK (`/connection LOSE|RESTORE`) |
| Trạng thái kết nối | 🟡 | `ConnectionStatus` có trong snapshot; chưa tách "LIVE status" và "đang nhận comment" |
| Comment gần nhất, đếm sự kiện | 🟡 | `metrics` (received/accepted/rejected) có; chưa có `lastCommentAt` |
| Health monitoring, chẩn đoán lỗi | 🟡 | `/api/diagnostics` cơ bản; `connection_events` được ghi; chưa có UI/cảnh báo im lặng lâu |

## D. OBS / TikTok LIVE Studio
| Hạng mục | TT | Hiện trạng |
|---|---|---|
| Overlay URL nội bộ | 🟡 | `http://127.0.0.1:5174/` — chỉ khi chạy dev |
| 1080×1920 | ✅ | sân khấu cố định, scale theo cửa sổ |
| Preview overlay, HUD Simulator | 🟡 | `?mock=…`, `?guides=1`; HUD giả lập chưa có |
| Copy URL, hướng dẫn Browser Source / Window Capture | ❌ | Dashboard (C-0007) chỉ có nút mở overlay |
| Xác minh OBS đã nhận nguồn | ❌ | Có thể làm gián tiếp: server đếm số client overlay đang kết nối WS (không khẳng định OBS/LIVE Studio đang phát) |

## E. Trang Connection Test — ❌ chưa có
| Bước | Có cơ sở để kiểm tự động? |
|---|---|
| 1 Backend | ✅ `/health` |
| 2 Database | 🟡 `/api/diagnostics` (path, WAL) — cần thêm ghi/đọc thử |
| 3 Theme Pack | ❌ |
| 4 Overlay hiển thị | 🟡 đếm client overlay WS (cần thêm) |
| 5 Mock comment | ✅ `/comments` + ingest |
| 6 TikTok kết nối | ❌ (BLOCKED) |
| 7 Nhận comment thử | ❌ với TikTok; ✅ với MOCK |
| 8 Engine ghi nhận đáp án | ✅ (test tích hợp) — cần chế độ "phiên kiểm thử" tách khỏi phiên LIVE |
| 9 Overlay cập nhật đúng | 🟡 overlay báo lại `stateVersion` đã render (cần thêm ACK) |

## F. Runtime Recovery
| Hạng mục | TT | Ghi chú |
|---|---|---|
| Không tự tiếp tục khi khởi động lại (PAUSED/RECOVERY, chờ operator) | ✅ | test crash giữa câu / sau reveal / huỷ câu |
| Không mất / không cộng trùng điểm | ✅ | sổ cái idempotent, đối chiếu toàn vẹn khi khôi phục |
| Mất kết nối giữa câu → treo, có mạng lại không tự chạy | ✅ (MOCK) / 🧪 (thật) | |
| Reconnect thủ công | 🟡 | chỉ MOCK |
| Không xử lý trùng comment cũ | 🟡 | Trùng `eventId` chỉ chặn trong bộ nhớ (mất khi restart); đáp án trùng người/câu luôn bị chặn bởi DB; comment cũ phát lại sau khi resume vẫn có thể được tính như đáp án MỚI nếu nguồn không gửi `sourceTimestamp` → **cần lưu eventId vào DB + chính sách cách ly khi connector thật** |
| Hiển thị lỗi rõ ràng | 🟡 | lỗi có trong AdminSnapshot; UI đang làm (C-0007) |
| Đóng ứng dụng an toàn | 🟡 | SIGINT/SIGTERM đóng server + DB; chưa có nút trong UI |

## G. Tiêu chí sẵn sàng LIVE — hiện **KHÔNG đạt**
| Tiêu chí | TT |
|---|---|
| Bộ cài Windows hoạt động | ❌ |
| Mở Dashboard không cần terminal | ❌ |
| Phát Overlay qua phần mềm LIVE | 🧪 chưa thử OBS/LIVE Studio |
| Kết nối nguồn comment thật được hỗ trợ | ❌ BLOCKED |
| Nhận và xử lý comment thật | ❌ |
| Chạy trọn một trận | ✅ MOCK (test + `simulate`); 🧪 qua UI |
| Lưu kết quả | ✅ |
| Ngắt kết nối + đóng an toàn | 🟡 |

## Đề xuất kiến trúc đóng gói (cần xác nhận — Q7)
- **Electron** (V2 đã dự kiến "Electron packaging later"): tiến trình chính chạy Fastify **trong cùng process**, phục vụ bản build dashboard (`/dashboard`) và overlay (`/overlay`, `/preview`) cùng một origin `http://127.0.0.1:<port>`; cửa sổ Electron mở dashboard; dữ liệu ở `%APPDATA%\StormArena`; bộ cài NSIS (electron-builder), `better-sqlite3` rebuild theo ABI Electron.
- Lý do: người dùng không cần Node; một cổng duy nhất cho OBS Browser Source; tray icon + thoát an toàn.
- Phương án khác: Node runtime nhúng + launcher — nhẹ hơn nhưng phải tự viết launcher/tray/updater.

## Đề xuất TikTok Connector (cần xác nhận — Q8)
- Chưa có bằng chứng về API chính thức cho phép đọc comment LIVE theo thời gian thực. Các thư viện cộng đồng đọc webcast không chính thức có thể dựa vào dịch vụ ký request/cơ chế không được nền tảng công bố → **có thể trái điều khoản / "vượt cơ chế bảo vệ"**; không dùng khi chưa được người dùng và bên pháp lý chấp thuận.
- Việc cần làm: spike khả thi có tài liệu nguồn (TikTok for Developers / chương trình đối tác LIVE / công cụ do Garena/TikTok cung cấp cho giải đấu), kết luận PASS/BLOCKED. UI Connection Manager vẫn xây được trên `LiveAdapter` + MOCK ngay bây giờ.

## Kế hoạch bổ sung (gộp với V3, sau khi được xác nhận)
| GĐ | Nội dung | Ai |
|---|---|---|
| G1 | Server phục vụ bản build overlay/dashboard một origin; `QUIZ_DATA_DIR` = %APPDATA%; đếm client overlay; `lastCommentAt`; lưu `eventId` đã xử lý vào DB | coordinator |
| G2 | Trang Connection Test (9 bước PASS/FAIL/NOT TESTED) + Connection Manager UI (MOCK, TikTok hiển thị BLOCKED) + trang hướng dẫn OBS (copy URL, Browser Source/Window Capture) | codex2 |
| G3 | First-Run Wizard (8 bước, cho bỏ qua TikTok) | codex2 |
| G4 | Đóng gói Electron + NSIS, kiểm trên máy sạch không có Node | coordinator + codex1 (script/CI build) |
| G5 | Spike TikTok connector → báo cáo PASS/BLOCKED (không code connector trước khi được duyệt) | coordinator |
