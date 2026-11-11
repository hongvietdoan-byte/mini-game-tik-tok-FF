# TikTok LIVE Quiz — Đấu Trường Bão Tố (Phase 0/1)

Engine quiz chạy theo bình luận A/B/C/D trong TikTok LIVE, có overlay 9:16 cho OBS và bảng điều khiển cho operator.
**Trạng thái:** chạy offline với **MOCK** (người chơi giả lập). Kết nối TikTok thật **chưa có** (`LIVE_CONNECTOR_BLOCKED`, Phase 4).

## Yêu cầu
- Windows, Node ≥ 22.5 (đã thử 24.18). Không cần pnpm toàn cục — dùng `corepack pnpm`.
- Microsoft Edge (Playwright dùng `channel: 'msedge'`).

## Cài đặt & chạy
```powershell
corepack pnpm install
corepack pnpm dev          # server :8787 + overlay :5174 + dashboard :5173
```
- Lần chạy đầu sinh `data/admin-token.txt` → dán vào ô "Mã quản trị" trên dashboard `http://127.0.0.1:5173`.
- Overlay cho OBS (Browser Source 1080×1920): `http://127.0.0.1:5174/`. Thêm `?guides=1` để xem vùng an toàn (chỉ khi xem trước).
- Server chỉ bind `127.0.0.1`. Dữ liệu ở `data/quiz.db` (WAL).

## Kiểm thử
```powershell
corepack pnpm typecheck
corepack pnpm test               # unit + tích hợp
corepack pnpm test:load
corepack pnpm test:e2e           # Playwright + ảnh chụp overlay
corepack pnpm simulate -- --players 100 --questions 15 --seed 42
corepack pnpm privacy:check
```

## Tài liệu
| File | Nội dung |
|---|---|
| `CLAUDE_MASTER_BUILD_PLAN_V2.md` | Đặc tả gốc |
| `docs/ARCHITECTURE.md` | Thành phần, máy trạng thái, dòng dữ liệu |
| `docs/DECISIONS.md` | Quyết định kiến trúc (ADR) |
| `docs/API_CONTRACT.md` | HTTP / WebSocket, cổng, xác thực |
| `docs/IMPLEMENTATION_BACKLOG.md` | Backlog, đồ thị phụ thuộc, sổ rủi ro |
| `docs/DATA_PRIVACY.md`, `GAME_RULES.md`, `THEME_PACK_SPEC.md`, `TEST_PLAN.md` | (đang soạn) |
| `docs/reports/` | Báo cáo nghiệm thu từng phase |
| `mailbox/` | Hòm thư điều phối Claude ↔ Codex 1 / Codex 2 |

## Quyền riêng tư
Megasheet và ảnh đầu vào là tài liệu nội bộ: **không commit, không đóng gói, không nhập vào fixtures** (`.gitignore` + `pnpm privacy:check`).
Câu hỏi mẫu là DEMO hư cấu, chỉ chạy trong MOCK.
