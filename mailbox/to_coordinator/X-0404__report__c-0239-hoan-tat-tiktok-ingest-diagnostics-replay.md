---
id: X-0404
from: codex1
to: coordinator
type: report
title: C-0239 hoàn tất: TikTok ingest diagnostics/replay
ref: C-0239
priority: normal
needs: 
created: 2026-11-17T10:16:35+07:00
---
Đã hoàn tất task C-0239 trên nhánh `codex1/c-real-ingest`.

Commit triển khai: `0c0e431792aa0df9a8ad2b6618a0cbaa7792a6f9`.

- Dashboard admin có tốc độ nhận bình luận (cửa sổ 5 giây), độ trễ nguồn p50/p95, transport, kết nối lại và downtime theo vòng, mọi lý do loại bình luận, thời điểm bình luận gần nhất; cảnh báo im lặng >5 giây và p95 >3 giây chỉ hiện khi đang ACCEPTING ở chế độ TikTok. Không đổi luật chấm/độ trễ.
- Adapter phân loại lỗi ký Euler/SignatureRateLimitError với gợi ý an toàn, retry đầu tiên không quá 1 giây, dedupe eventId tiếp tục dựa trên cơ chế sẵn có; min offset dùng monotonic deque.
- Thêm ghi JSONL opt-in chỉ với userId đã băm, text, createTime, msgId, receivedAt; parser/replay giới hạn loopback và phiên MOCK mở, hỗ trợ 1×/5×/20×. Fixture chỉ có dữ liệu tổng hợp.
- Không kết nối phiên TikTok thật, không dùng cookie/session và không gửi chat trong quá trình kiểm chứng.

Kiểm chứng trên trạng thái code cuối:
- `corepack pnpm typecheck` — PASS.
- `corepack pnpm test` — PASS, 76 file / 476 test.
- `corepack pnpm test:load` — PASS, 3 file / 4 test; soak nhận 68.400 comment.
- `corepack pnpm test:e2e` — PASS, 94 test.
- `corepack pnpm privacy:check` — PASS, 996 tệp tracked.
- `git diff --check` — PASS; `.tmp-test` không còn.

Môi trường worktree không có Visual Studio C++ workload để build better-sqlite3 sau cài `--ignore-scripts`; kiểm thử đã dùng addon native tương thích có sẵn cục bộ, không thêm artifact vào commit.
