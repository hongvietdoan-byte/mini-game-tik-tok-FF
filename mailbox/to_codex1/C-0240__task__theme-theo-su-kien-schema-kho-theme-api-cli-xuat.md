---
id: C-0240
from: coordinator
to: codex1
type: task
title: Theme theo sự kiện: schema, kho theme, API, CLI xuất theme mặc định
ref: 
priority: high
needs: 
created: 2026-11-17T12:09:03+07:00
---
## Bối cảnh
Người dùng muốn tính năng **đổi theme theo sự kiện**: mỗi sự kiện mới họ tự cập nhật một gói theme (schema JSON + token CSS + asset) để đổi giao diện, KHÔNG cần sửa code. Sau đó cần xuất **1 theme mặc định** (đúng giao diện hiện tại) để họ lấy làm gốc sửa cho lần sau.

Chia 2 lane chạy song song:
- **codex1 (thư này, C-0240):** schema trong contracts, kho theme + API + phục vụ file phía server, CLI kiểm tra / xuất theme mặc định.
- **codex2 (C-0241):** đổi CSS overlay sang token, overlay áp theme, trang chọn theme trên Dashboard.

## Quy ước chung (cả hai lane theo đúng)
- Gói theme là một thư mục `<themesDir>/<themeId>/`:
  - `theme.json`
  - `assets/...`: ảnh, video, âm thanh
  - `fonts/...`: woff2
- `themesDir` mặc định là `data/themes`, có thể đổi bằng env `QUIZ_THEMES_DIR`. Thư mục này nằm trong `data/` (đã ignore). **Repo public nên không commit asset của người dùng.**
- `theme.json` (schemaVersion 1):
  ```json
  {
    "schemaVersion": 1,
    "id": "default",
    "name": "Bá Vương Đại Chiến",
    "description": "",
    "tokens": { "deep": "#2d387f", "gold": "#ffcc58", "font-body": "'Segoe UI', sans-serif" },
    "fonts": [{ "family": "Ten Font", "file": "fonts/x.woff2", "weight": 400, "style": "normal" }],
    "assets": { "arena.background": "assets/arena/bg.jpg", "brand.logo": "assets/brand/logo.png" }
  }
  ```
- **Token:**
  - Key khớp `^[a-z][a-z0-9-]{0,63}$`. Overlay đặt mỗi key thành biến CSS `--theme-<key>`.
  - Giá trị là chuỗi ≤200 ký tự, không chứa `;`, `{`, `}`, `<`, `url(`, `expression`.
  - Màu, độ dài, font-family, gradient đều được chấp nhận.
  - Tập key là **mở**, nhưng phải có danh sách key mặc định ở `packages/contracts/src/theme-default-tokens.ts`. **File này codex2 sở hữu.** Codex1 chỉ tạo stub nếu chưa có, gồm 9 biến gốc hiện tại: deep, violet, gold, sky, pink, coral, ink, neon, paper, cùng font-body. Codex2 sẽ mở rộng; coordinator xử lý xung đột khi gộp.
- **Asset slot:** danh sách đóng (enum) trong contracts.
  - Tự rà mọi đường dẫn `/assets/...` trong `apps/overlay/src`, cả trong `*.css` (`url(...)`). Hiện có: `arena.background`, `arena.questionBackground`, `arena.flag.0`..`7`, `arena.loopVideoWebm`, `arena.loopVideoMp4`, `brand.logo`, `mc.static`, `mc.sequenceDir`, các ảnh victory, chibi nếu có, và `audio.<slot>` cho từng slot của audio-engine.
  - Ghi danh sách cuối cùng vào report.
  - Slot nào theme không khai báo thì overlay dùng asset gốc `/assets/...` như hiện tại.
- **Đường dẫn file trong theme:** chỉ đường dẫn tương đối nằm trong thư mục theme, không có `..`, không tuyệt đối, không symlink ra ngoài. Đuôi file cho phép: png, jpg, jpeg, webp, gif, svg, webm, mp4, mp3, ogg, wav, woff2. Giới hạn kích thước hợp lý (ví dụ 50 MB mỗi file).
- **Bố cục cố định** (luật của người dùng): theme chỉ đổi màu, font, ảnh, video, âm thanh. Theme **không** đổi vị trí hoặc kích thước khung. Không nhận token vị trí hay kích thước khung.

## Yêu cầu codex1
1. `packages/contracts/src/theme.ts`:
   - `ThemeManifestSchema` (zod), enum `ThemeAssetSlot`, type public `ResolvedTheme = { id, name, version, tokens, fonts: [{family, url, weight, style}], assets: Partial<Record<slot, url>> }`.
   - Thêm `themeVersion?: number` vào public snapshot, giống `hudVersion`.
2. **Server:**
   - Kho theme đọc `themesDir`, kiểm tra từng theme.
   - Theme hỏng không làm sập server: liệt kê kèm lỗi và không cho áp dụng.
   - Theme đang chọn lưu bền (DB hoặc settings), khởi động lại vẫn giữ.
   - Không có theme nào, hoặc theme đang chọn mất hay hỏng, thì trả theme rỗng: overlay dùng mặc định trong code.
3. **API:**
   - `GET /api/theme` (public): ResolvedTheme đang dùng, URL dạng `/themes/<id>/<path>?v=<version>`.
   - `GET /api/admin/themes`: danh sách id, name, hợp lệ hay lỗi, đang dùng hay không.
   - `PUT /api/admin/themes/active {themeId}`.
   - `POST /api/admin/themes/reload`: quét lại thư mục sau khi người dùng chép theme mới vào.
   - Đổi theme hoặc reload thì tăng `themeVersion` và phát qua WS để overlay tải lại không cần F5.
   - Phục vụ tĩnh `/themes/<id>/...`: chống path traversal, MIME đúng, chỉ các đuôi cho phép.
4. **CLI:**
   - `pnpm theme:validate <thư mục>`: in lỗi dễ hiểu bằng tiếng Việt.
   - `pnpm theme:export-default [--out <dir>] [--assets <dir>]`:
     - Mặc định `--assets` là `QUIZ_ASSETS_DIR` hoặc `assets-local`, `--out` là `data/themes/default`.
     - Chép mọi asset hiện có theo slot vào `assets/` của theme. File nào không có thì bỏ slot và in cảnh báo.
     - Ghi `theme.json` với token = giá trị mặc định từ `theme-default-tokens.ts`.
     - Không ghi đè thư mục đích đã có, trừ khi có `--force`.
5. **Docs:** `docs/THEME.md` bằng tiếng Việt, cho người không lập trình:
   - cấu trúc thư mục, ý nghĩa từng token và slot, kích thước ảnh khuyến nghị (1080×1920 cho nền dọc),
   - cách tạo theme mới bằng cách copy default, đổi id, sửa,
   - cách validate, cách chọn trên Dashboard.

   Thêm `docs/theme.example.json` với asset giữ chỗ, không chứa asset thật.
6. **Test:** schema (hợp lệ, sai key, giá trị nguy hiểm, path traversal), API, phục vụ tĩnh, chuyển theme làm tăng version, theme hỏng thì fallback, export-default trên `fixtures/assets-placeholder`.

## Ràng buộc
- Không đụng overlay hoặc dashboard UI (codex2 làm). Được sửa contracts, server, scripts, docs, tests.
- typecheck, test, e2e (cả với `QUIZ_ASSETS_DIR=fixtures/assets-placeholder`) và privacy phải xanh. Không commit asset thật.
- Nhánh `codex1/c-theme-server` tạo từ main mới nhất. Push rồi gửi report kèm hash và danh sách slot cuối cùng. Dọn `.tmp-test`.
