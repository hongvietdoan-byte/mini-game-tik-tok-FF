# Rà soát quy trình theo plan — C-0083 (làn cloud, 11/11/2026 ~23:10)

Phạm vi: đối chiếu plan (`CLAUDE_MASTER_BUILD_PLAN_V2.md`, `STORM_ARENA_CLAUDE_BUILD_SPEC_V3.md`, `mailbox/BOARD.md`,
`docs/TIEN_DO.md`, `docs/HANDOFF.md`, `docs/DECISIONS.md`, `docs/V3_AUDIT.md`, `docs/specs/MC_VOICE_SPEC.md`, `docs/HUONG_DAN_LIVE.md`)
với thực tế: 83 thư coordinator → Codex/cloud, 129 thư Codex/cloud → coordinator, `git log origin/main` (586 commit), nhánh remote,
lịch sử GitHub Actions trên `main`, code hiện có. Chỉ đọc + chạy kiểm tra; không sửa code.

**Giới hạn:** phiên cloud không có `assets-local/` (ảnh ref, chibi, Kelly, logo, Victory) và không có Edge/Windows,
nên mọi nhận định về **độ giống ảnh mẫu** là **CHƯA KIỂM CHỨNG** — chỉ dựa vào chữ trong thư/report.

## 0. Kết luận ngắn

1. **Lõi game đạt plan và được test tốt**: engine, chấm điểm Kahoot, chống trùng, khôi phục sau crash, 35 ghế khán giả, kết nối TikTok qua thư viện cộng đồng.
   Bằng chứng chạy lại ở cloud: `privacy:check` PASS (383 tệp), `typecheck` sạch, `test` 231/231 xanh.
2. **Lệch lớn nhất nằm ở overlay, và lặp lại**: chu trình "tả ref bằng chữ → Codex dựng → report 'xong' kèm e2e xanh → coordinator gộp → người dùng chê" đã lặp ít nhất 4 vòng
   (C-0032 → C-0054 → C-0060/63 → C-0065 → C-0080/82; Victory C-0055 → C-0068 → C-0082). Không có bước nghiệm thu bằng hình so với ref trước khi gộp.
3. **CI đỏ ~5 giờ liền** trên `main`: xanh lần cuối 17:29, rồi ~198 lượt liên tiếp thất bại tới 22:37, xanh lại từ 22:43 (lượt lỗi gần nhất dừng ở bước privacy-check), trong khi `TIEN_DO` vẫn ghi "CI ✅". E2E **không chạy trên CI**.
4. **Tài liệu điều phối đã cũ và mâu thuẫn**: BOARD còn ghi "chỉ Phase 0+1", "chưa có test nào", C-0005/C-0018/C-0008 "CHỜ"; quyết định #16 (Victory không bục) trái với yêu cầu mới của người dùng (đứng TRÊN bục) nhưng chưa sửa.
5. **Rủi ro P0 trước tổng duyệt 12/11 và thi đấu 13–14/11**: chưa có buổi LIVE thật nào đọc được bình luận; 36 câu Free Fire chưa được duyệt (TikTok mode không cho dùng câu DEMO → hiện **không chạy được vòng LIVE**); overlay chưa được người dùng duyệt; giọng MC đang code dở.

## 1. Lệch hướng (làm không khớp plan / yêu cầu người dùng)

| # | Lệch | Bằng chứng | Mức |
|---|---|---|---|
| L1 | **Victory dựng bằng SVG/CSS thay vì asset raster theo ref.** Report đã tự khai, coordinator vẫn gộp. | Y-0124 ("cúp, khán đài, bão, confetti và sàn dựng bằng SVG/CSS"); gộp `6d10bb0`; C-0082 thừa nhận thư C-0065/C-0068 viết "dựng bằng CSS/SVG" | Cao |
| L2 | **Overlay câu hỏi lệch ref nhiều vòng**: logo quá bé (C-0073 làm ~25 % rộng, sau đó C-0080 đòi ≥40 %), vòng đếm ngược đè chữ câu dài, đáp án bị cắt dòng, icon sét thừa ở ô thoại MC. E2E vẫn xanh vì không có case câu/đáp án dài. | Y-0124 ("logo chung khoảng 25 % rộng"); C-0080 mục 2–5 | Cao |
| L3 | **Quy tắc Victory đảo chiều không ghi lại.** V3 §11 + BOARD #16: *không* có bục TOP 1/2/3, chibi đứng *sàn phía trước*. Người dùng sau đó đòi chibi đứng *TRÊN* bục theo `victory-ref-2` (C-0055, C-0068, C-0080 mục 6). BOARD #16 chưa sửa → Codex nhận hai chỉ dẫn ngược nhau. | BOARD #16; V3 §11; C-0055; TIEN_DO M12 | TB |
| L4 | **"Không đầu tư animation" (BOARD #15, D-18) bị thay bằng yêu cầu MC đổi động tác theo phase + MC voice đồng bộ PNG Sequence** mà không ghi quyết định mới. | BOARD #15; D-18; C-0080 mục 7; `docs/specs/MC_VOICE_SPEC.md` | TB |
| L5 | **Bỏ gate wireframe của V3 §19-4** ("trình bày wireframe 1080×1920 và preview HUD trước khi code"); V3_AUDIT §7 GĐ A cũng đặt gate "người dùng duyệt wireframe". Thực tế coordinator tự dựng overlay V3 (C-0028 tạm dừng làn codex2) rồi giao chỉnh theo ảnh. | V3_AUDIT §7; C-0028; C-0029 | TB |
| L6 | **Thiếu tài liệu V3 §19-3**: không có `GAME_STATE_MACHINE.md`, `EVENT_CONTRACTS.md`, `AUDIENCE_SEATING_SPEC.md`, `UI_LAYOUT_SPEC.md` (V3_AUDIT §4 GĐ A đã liệt kê). | `ls docs/` | Thấp |
| L7 | **Đường chạy LIVE thực tế ≠ đường đóng gói đã làm.** M6 xây bộ cài Electron + NSIS (dữ liệu %APPDATA%), nhưng hướng dẫn LIVE dùng `CHAY_GAME.cmd` chạy thẳng mã nguồn bằng `tsx`, cần `node_modules`, dữ liệu ở `data/` trong repo. Bộ cài chưa thử trên máy sạch. | `CHAY_GAME.cmd`; `docs/HUONG_DAN_LIVE.md`; TIEN_DO M6 | TB |
| L8 | **Phân làn bị vượt**: coordinator (sở hữu server/lõi) tự dựng overlay V3 (C-0028/C-0029) và sửa code, trong khi HANDOFF/memory ghi "coordinator chỉ điều phối". Không sai về kết quả, nhưng làm mờ trách nhiệm nghiệm thu (người dựng = người duyệt). | C-0028; `d420374`, `f485321`; HANDOFF dòng 5 | Thấp |
| L9 | **Fixtures đặt `approvalStatus: 'APPROVED'`** cho 36 câu DEMO, trái chữ của BOARD #13 ("AI/fixtures không bao giờ tự đặt APPROVED"). Có chặn bằng `verificationStatus: DEMO` + chỉ MOCK, nên rủi ro thấp, nhưng nên ghi ngoại lệ rõ. | `fixtures/questions.ts:289`; `docs/review/DE_XUAT_CAU_HOI_FF.md` dòng 5 | Thấp |

Luật chơi, luồng TikTok: **không thấy lệch** so với BOARD #1–#9, #12, #17 (đã có test khoá hành vi; `runtime.ts:677,989` chỉ cho DEMO khi `mode=MOCK && allowDemoQuestions`).

## 2. Sai (vi phạm quyết định, mâu thuẫn, "xong" chưa đủ bằng chứng, task bị bỏ)

### 2.1 Report "xong" nhưng tiêu chí chưa đạt / bằng chứng không đủ
- **Mọi report overlay chỉ có bằng chứng là test xanh + đường dẫn ảnh cục bộ Windows** (ví dụ Y-0124 liệt kê 5 file `test-results/…/screenshots/*.png` trong worktree). Không report nào có ảnh **ghép cạnh ref**; C-0080/C-0082 mới bắt đầu yêu cầu điều này.
- **Y-0124 báo e2e 42/42 xanh** trong khi người dùng cùng lúc thấy chữ bị đè/cắt (C-0080) → e2e chỉ kiểm bounding box với mock câu ngắn; "xanh" không đồng nghĩa "đạt yêu cầu hình ảnh".
- **TIEN_DO M5 "CI ✅"** (cập nhật 21:35) trong khi CI `main` đỏ liên tục 17:29–22:43 (xem §4.1-3). TIEN_DO M17 ghi "✅ 21:20", sau đó e2e C-0067 phát hiện vi phạm safe-zone phải sửa ở C-0076 (21:46).

### 2.2 Task không có report riêng / bị thay thế âm thầm
| Thư | Tình trạng | Ghi chú |
|---|---|---|
| C-0026 (lớp khán giả 35 ghế, codex2) | Chỉ ACK (Y-0049), không report | Bị C-0028 (coordinator tự làm overlay) thay thế; BOARD không ghi huỷ |
| C-0030 → C-0037/C-0038 | Chuyển làn đúng thủ tục | OK |
| C-0039 | ACK Y-0067, gộp vào report Y-0080 | OK nhưng khó tra |
| C-0069 → C-0070 | Thay thế có thư | OK |
| C-0075 (ClipAI) | Chỉ ACK X-0117; nội dung nhập vào X-0121 | OK nhưng không có `ref` C-0075 trong report |
| C-0078 (voice mốc 1–3, codex1) | ACK X-0126, **đang làm** | Hạn 12/11 |
| C-0079 (Voice Settings, codex2) | ACK Y-0123, **xếp sau C-0080/C-0082** | Hạn 12/11 |
| C-0080 + C-0082 (overlay + Victory, codex2) | ACK Y-0125/Y-0128, **đang làm** | Chặn tổng duyệt |

### 2.3 Nhánh đã push nhưng chưa gộp
- Toàn bộ 33 nhánh `codex1/**`, `codex2/**` trên remote **đã có nội dung trong main** (`git cherry` cho 7 nhánh còn "không merged" đều trả `-` = đã gộp bằng commit tương đương). **Không có việc bị bỏ rơi trên nhánh.**
- Nhưng 33 nhánh cũ **chưa xoá** → nhiễu; worktree cục bộ trên máy Windows: **CHƯA KIỂM CHỨNG** (cloud không thấy).

### 2.4 Thư/quyết định mâu thuẫn nhau
- BOARD #16 ↔ C-0055/C-0068/C-0080 (Victory sàn vs trên bục) — L3.
- BOARD #15 ↔ C-0080 mục 7 / MC voice — L4.
- BOARD #11 ("Phase 1 chỉ token màu, chưa dùng asset") — đã bị vượt từ 15:00 (overlay dùng chibi/Kelly/logo thật) nhưng chưa ghi là hết hiệu lực.
- C-0021/C-0022/C-0023: mã việc trùng/đính chính hai lần (C-0021 codex1 ↔ setup wizard codex2) → đã sửa bằng thư đính chính, nhưng là dấu hiệu đánh số thủ công dễ nhầm.
- `README.md` vẫn ghi "Kết nối TikTok thật **chưa có** (`LIVE_CONNECTOR_BLOCKED`)" và chạy dev ở :5173/:5174 — trái với BOARD #17 và `HUONG_DAN_LIVE.md` (một cổng :8787).

## 3. Thiếu sót

### 3.1 Hạng mục plan chưa có task
| Plan | Hạng mục | Tình trạng |
|---|---|---|
| V2 Phase 2 / V3 P3 | Theme Pack runtime, Question Bank CRUD đầy đủ, import/export, SMART_RANDOM 7/5/3 | `packages/theme-core` = stub 2 dòng; chỉ có màn duyệt câu (C-0024). Được hoãn có chủ đích nhưng **không có quyết định ghi "hoãn sau sự kiện"** trên BOARD |
| V2 Phase 3 / V3 P6 | AI Question Studio | `packages/ai-core` = stub; hoãn hợp lý |
| V2 Phase 6 | Backup/restore định kỳ, purge/export dữ liệu | Không có code (`grep backup apps/server/src` rỗng) |
| V2 §12 | `AUTO_MODE` preflight (đủ câu đã duyệt, asset, kết nối) | Chỉ có cờ `autoMode` trong engine; không có preflight |
| V2 Phase 6 | "6 vòng mock liên tiếp" + "1 buổi LIVE tổng duyệt có xác minh" | Chưa có test/biên bản nào |
| V3 §17-6 | 7×5 ghế ở **720×1280** | Không có test nào ở 720×1280 |
| V3 §17-9 | Tắt animation (reduced motion) vẫn rõ chữ | Có CSS `prefers-reduced-motion`, **không có test** |
| V3 §17-12 | HUD TikTok **test thật** trên điện thoại | Chỉ có mô phỏng theo 3 ảnh chụp |
| V2 DoD | "Top 10 và Victory kiểm bằng mắt trên điện thoại; cúp không bị che" | Chưa có biên bản |

### 3.2 Khoảng trống kiểm thử
1. **Không có so khớp hình ảnh với ref.** `toHaveScreenshot` chỉ bật khi `E2E_SCREENSHOTS=1` và so với baseline của chính nó (`tests/e2e/overlay.spec.ts:133`), không so với `ref/*.png`. Baseline C-0008 vẫn "chưa chốt" (BOARD #15).
2. **E2E không chạy trên CI** (`.github/workflows/ci.yml` chỉ privacy + typecheck + unit/integration; dòng TODO "thêm Playwright…").
3. **E2E phụ thuộc asset ngoài git và đường dẫn cứng** `resolve(process.cwd(), '../../../assets-local')` (`playwright.config.ts:4`, `tests/e2e/live-round.test.ts:42`, `overlay.spec.ts:22`). Đường này chỉ đúng khi chạy từ `.claude/worktrees/<tên>`; chạy ở checkout chính sẽ trỏ ra ngoài thư mục dự án. Chỉ một test có `test.skip` khi thiếu asset, các test khác **fail cứng**.
   Chạy thử ở cloud (Chromium thay Edge, không có `assets-local`): **29 pass / 12 fail / 1 skip** — 8 test safe-zone (logo dự phòng nhỏ/lệch), live-round (0/35 ghế), Victory podium, FPS 35 ghế, HUD readable. Kết quả này **không chứng minh lỗi trên máy Windows có asset**, nhưng chứng minh e2e không tái lập được ngoài máy người dùng.
4. **Không có case nội dung dài nhất** (câu hỏi/đáp án dài nhất của bộ Free Fire) → lỗi C-0080 mục 3–4 lọt qua. C-0080 đã yêu cầu bổ sung.
5. **Chưa có test với bình luận TikTok thật**: C-0043/C-0062 dùng replay giả lập; M11 chưa có buổi LIVE nào đọc được comment.

### 3.3 Rủi ro trước LIVE thật (12/11 tổng duyệt, 13–14/11 thi đấu)
| # | Rủi ro | Trạng thái | Ưu tiên |
|---|---|---|---|
| R-a | **Quyền LIVE trên PC**: LIVE Studio báo "No access" (HANDOFF) | Chờ người dùng/TikTok; tool không xử lý được | P0 |
| R-b | **Connector không chính thức** (thư viện cộng đồng, ký request qua bên thứ ba): có thể hỏng/bị chặn bất kỳ lúc nào; chưa từng chạy với LIVE thật | Chưa thử thật; chưa có phương án dự phòng vận hành (ví dụ chạy MOCK + nhập tay) được ghi vào hướng dẫn | P0 |
| R-c | **36 câu Free Fire chưa duyệt** → phiên TikTok không có câu hợp lệ (DEMO bị chặn ngoài MOCK) | Chờ người dùng duyệt trong Dashboard | P0 |
| R-d | **Overlay chưa được người dùng duyệt** (C-0080/C-0082 đang làm) | codex2 | P0 |
| R-e | **Bản overlay cũ trên máy LIVE**: `CHAY_GAME.cmd` chỉ build khi thiếu `dist/` → sau khi gộp code mới, không tự build lại nếu không chạy `build:web` thủ công | HANDOFF có nhắc; hướng dẫn LIVE chỉ ghi khi "trắng/404" | P1 |
| R-f | **Asset MC**: thư mục tư thế `mc/kelly/{welcome,ask,react,celebrate,idle}` trống; chibi nguồn ~160 px ngang sẽ mờ khi phóng ở Victory (C-0082 mục 4) | Chờ người dùng | P1 |
| R-g | **Giọng MC (ClipAI)**: phụ thuộc mạng + token người dùng nhập; chưa chạy thật; mốc 1–3 đang code (C-0078), Voice Settings xếp sau (C-0079) | Có fallback "cache → không giọng/chữ" theo đề xuất | P1 |
| R-h | **Asset ngoài git chỉ ở một máy** (`assets-local/`): không có bản sao/kiểm kê băm; máy hỏng = mất toàn bộ hình | Chưa có | P1 |
| R-i | Quyền sử dụng hình nhân vật Free Fire/Kelly/logo trên stream (V3_AUDIT Q5, R4) | Chưa thấy ghi xác nhận | P2 |

## 4. Quy trình coordinator ↔ Codex qua hòm thư

### 4.1 Điểm yếu đã gây hậu quả
1. **Ref được tả bằng chữ**, kèm cả cách dựng ("CSS/SVG") → Codex làm đúng thư nhưng sai ý (L1). Codex không thấy ảnh ref trừ khi tự mở `assets-local/` và không có bước bắt buộc so ảnh.
2. **Nghiệm thu = test xanh.** Không có cổng "ảnh ghép cạnh ref + danh sách điểm lệch" trước khi gộp; người dùng thành bộ phát hiện lỗi cuối cùng.
3. **CI đỏ kéo dài, không ai xử lý**: đỏ từ sau 17:29, chỉ được sửa ở C-0077 (`af045de`, 22:37) sau khi phải đổi CI để "hết spam mail" (`5d3aca2`). Nguyên nhân phụ: mỗi thư/heartbeat là một push lên `main` → mỗi push chạy CI Windows → hàng trăm email lỗi, dễ bị phớt lờ.
4. **Gộp thẳng vào `main` không qua PR**, CI chỉ chạy *sau* khi gộp → main có thể đỏ mà không chặn được gì.
5. **Tài liệu trạng thái không tự cập nhật**: BOARD dừng ở buổi sáng; IMPLEMENTATION_BACKLOG còn 🔄 cho việc đã xong; HANDOFF có hai khối trạng thái (22:45 và 19:50) mâu thuẫn trong cùng file; TIEN_DO trễ ~1,5 giờ.
6. **Gộp thư nhiều việc vào một nhánh/một report** (C-0080 gộp C-0068/C-0073/C-0076; C-0082 gộp vào C-0080) → report to, khó nghiệm thu từng tiêu chí; một mục chưa đạt kéo cả lô.
7. **Handoff giữa phiên phụ thuộc trí nhớ ngữ cảnh** (HANDOFF tự viết khi ~70 % context). Đã có hook nạp lại, nhưng khối "Hàng chờ Codex" trong HANDOFF đã lỗi thời (liệt kê C-0060/C-0055/C-0062 là còn chờ).
8. **33 nhánh đã gộp còn trên remote**; số worktree trên máy: CHƯA KIỂM CHỨNG.

### 4.2 Đề xuất sửa cụ thể
1. **Cổng nghiệm thu hình ảnh** (bắt buộc cho mọi task overlay): Codex chạy một script sinh ảnh ghép `ref | bản dựng | diff` cho từng scene 1080×1920 (sau ≥8 s animation), kèm bảng "vùng → lệch → lý do"; coordinator chỉ gộp sau khi đã **gửi ảnh ghép cho người dùng và người dùng duyệt**. Không tả cách dựng trong thư, chỉ tả kết quả + đường dẫn ref.
2. **Thêm test nội dung cực trị**: mock lấy câu hỏi + đáp án dài nhất từ bộ Free Fire; kiểm không giao nhau giữa vòng đếm, chữ câu hỏi, ô đáp án; kiểm không bị `overflow` cắt dòng.
3. **E2E tái lập được**: thay `'../../../assets-local'` bằng biến `QUIZ_ASSETS_DIR` (mặc định `<repo>/assets-local`); tạo bộ asset giữ chỗ không bản quyền trong repo cho CI; test nào cần asset thật thì `skip` có nhãn. Sau đó bật job e2e (Chromium) trên CI.
4. **CI**: giữ `paths-ignore` cho mailbox; thêm luật "CI `main` đỏ = coordinator dừng gộp, sửa trước" và ghi trạng thái CI thật (không ghi tay) vào TIEN_DO. Cân nhắc gộp qua PR hoặc ít nhất chạy `corepack pnpm ci` trong worktree gộp trước khi push.
5. **Một nguồn sự thật cho quyết định**: cập nhật BOARD ngay khi người dùng đổi ý (#11, #15, #16 cần sửa/ghi "thay bằng…"); đánh dấu BOARD bảng "Đang làm" là lịch sử, chuyển trạng thái việc sang TIEN_DO; xoá/lưu trữ `IMPLEMENTATION_BACKLOG` cũ.
6. **Một task = một tiêu chí nghiệm thu đo được**; không gộp nhiều task vào một report trừ khi cùng file và cùng ảnh nghiệm thu.
7. **HANDOFF chỉ giữ một khối trạng thái** (xoá khối cũ khi viết khối mới); `py tools/mb.py status` là nguồn hàng chờ, không chép tay.
8. **Dọn nhánh**: xoá nhánh `codex*/` đã gộp; `git worktree prune` trên máy Windows.
9. **Kế hoạch dự phòng LIVE** viết vào `HUONG_DAN_LIVE.md`: nếu connector hỏng giữa buổi → chế độ nào chạy tiếp (MOCK trình diễn / tạm dừng chương trình), ai quyết định; và bước `corepack pnpm build:web` sau mỗi lần cập nhật code.

## 5. Bảng tổng hợp

| Mốc | Trạng thái thật | Bằng chứng | Việc cần làm tiếp | Ưu tiên |
|---|---|---|---|---|
| M0 Engine, chấm điểm, server, khôi phục | Xong | `test` 231/231 xanh (cloud, 11/11 ~23:00) | — | — |
| M1 V3 GĐ B (BXH sau mỗi câu, PREPARE, MC trạng thái, `seq`) | Xong | D-10; test engine | — | — |
| M2 Chống trùng bền, Connection Manager, kiểm tra 9 bước | Xong | TIEN_DO `2999f2a`; test tích hợp | — | — |
| M3–M4 Dashboard + Connection Test | Xong | C-0007/16/18; e2e dashboard (C-0040) | — | — |
| M5 36 câu FF + privacy + CI | **Dở**: CI mới xanh lại từ 22:45; **36 câu chưa duyệt** | Actions `main`: ~198 lượt fail 17:29–22:43; DE_XUAT dòng 5 | Người dùng duyệt câu trong Dashboard; giữ CI xanh | P0 |
| M6 Bộ cài Windows | **Lệch**: bộ cài có nhưng LIVE dùng `CHAY_GAME.cmd` từ mã nguồn; chưa thử máy sạch | `CHAY_GAME.cmd`; TIEN_DO M6 | Chốt một đường chạy cho buổi LIVE; nếu dùng `CHAY_GAME.cmd` thì luôn build lại | P1 |
| M7 Setup Wizard + phiên TikTok + duyệt câu | Xong | C-0021/24, e2e dashboard | — | — |
| M8–M9 Overlay theo ref | **Lệch/dở**: người dùng chưa duyệt; lỗi đè/cắt chữ, logo bé | C-0080; Y-0124 | C-0080 + cổng nghiệm thu ảnh (§4.2-1) | P0 |
| M10 35 ghế, đếm realtime, tải 2.000 | Xong (unit/load); e2e ghế cần asset | TIEN_DO; X-0079 soak | Test 720×1280 (§17-6) | P2 |
| M11 Kết nối TikTok LIVE | **Chưa kiểm chứng thật** | BOARD #17; HANDOFF "No access" | Người dùng có quyền LIVE → buổi thử đọc comment thật; ghi biên bản | P0 |
| M12 Victory theo ref | **Lệch** (SVG thay raster), đang làm lại | Y-0124; C-0082 | C-0082; sửa BOARD #16 | P0 |
| M13 Tổng duyệt Mock + OBS/LIVE Studio | Dở: e2e trọn vòng có; OBS/LIVE Studio thật chưa | C-0062; HUONG_DAN_LIVE | Tổng duyệt có biên bản: 6 vòng liên tiếp, đóng/mở lại, mất mạng | P0 |
| M14 Sẵn sàng LIVE (V3.1 G) | Chưa đạt | phụ thuộc M5/M8/M11/M12 | Checklist G có người ký | P0 |
| M15 MC PNG Sequence | Trình phát xong, **chưa có frame** | C-0037; thư mục pose trống | Người dùng cấp frame; tạm động tác CSS theo phase (C-0080 mục 7) | P1 |
| M16 Giọng MC ClipAI | Dở: đề xuất duyệt, mốc 1–3 đang code | C-0078 ACK X-0126; C-0079 xếp sau | Hoàn tất mốc 1–3 trước tổng duyệt; thử thật với token người dùng | P1 |
| M17 Mô phỏng HUD + safe zone | Xong trên mô phỏng; chưa thử điện thoại thật | C-0067, C-0076 | Thử trên điện thoại khi LIVE thử | P1 |
| Phase 2/3 (Theme Pack, Question Bank đầy đủ, AI Studio) | Chưa bắt đầu (stub) | `theme-core`, `ai-core` 2 dòng | Ghi quyết định "hoãn sau 14/11" lên BOARD | P2 |
| Phase 6 backup/purge/auto-preflight | Chưa bắt đầu | không có code | Tối thiểu: sao lưu `data/quiz.db` + `assets-local/` trước mỗi ngày thi | P1 |
| Quy trình: CI e2e, ảnh so ref, dọn nhánh, BOARD | Thiếu | §4 | Theo §4.2 | P1 |

## 6. Mục chưa kiểm chứng (không suy đoán)
- Độ giống ref của overlay/Victory hiện tại (không có `assets-local/` ở cloud).
- Kết quả e2e trên Windows + Edge có asset (report Y-0124 ghi 42/42; cloud tái lập được 29/42 do thiếu asset/khác trình duyệt).
- Số worktree/nhánh cục bộ trên máy Windows; trạng thái thư mục `dist/` đang phục vụ buổi LIVE.
- Bộ cài NSIS trên máy không có Node.
- Kết nối TikTok với buổi LIVE thật.
