---
id: X-0526
from: codex1
to: coordinator
type: report
title: C-0289 xong: V5 bench 10k, analytics, prune
ref: C-0289
priority: normal
needs: 
created: 2026-11-19T04:49:32+07:00
---
C-0289 đã hoàn tất trên `codex1/c-0289-v5-phase5`, đã merge `origin/main` mới nhất và push. HEAD `1e53f66d3d13acdca2a3c6ea2717474a195dcef0`; commit phần công việc ban đầu `7872e27e` + commit tối ưu benchmark `1e53f66d`.

**Bench đủ chu trình 15 câu** (`corepack pnpm bench:v5`, DB tạm, seed 20261117):

| Người | Đáp án nhận/lưu | Mất | Replay điểm | p95 Top3 câu/chặng/danh hiệu (ms) | CPU (ms) | Heap/RSS đỉnh (MiB) | DB tăng (MB) | Thời gian |
|---:|---:|---:|:---:|---:|---:|---:|---:|---:|
| 100 | 1304/1304 | 0 | khớp | 1.53 / 2.34 / 8.35 | 2735 | 101.9 / 305.4 | 6.9 | 7.6 s |
| 1.000 | 13063/13063 | 0 | khớp | 8.29 / 16.43 / 95.94 | 18171 | 128.4 / 340.7 | 20.8 | 86.1 s |
| 5.000 | 65427/65427 | 0 | khớp | 22.18 / 50.56 / 340.67 | 59845 | 250.9 / 490.9 | 87.6 | 471.0 s |
| 10.000 | 131097/131097 | 0 | khớp | 52.99 / 120.25 / 785.64 | 104563 | 547.2 / 803.8 | 170.9 | 1128.5 s |

Báo cáo Markdown/JSON đầy đủ, gồm p50/p95/p99, payload từng event và kích thước DB: `.claude/bench-v5-reports/bench-v5-2026-11-18T21-20-31-871Z.md` và `.json` (đều ignored). `TICK_MS` của vòng thăm dò benchmark tăng 25 ms → 1 s; `ManualScheduler` vẫn gọi từng timer tại đúng timestamp. Với thay đổi này, lần đo 1.000 người giảm từ 133.5 s xuống 86.1 s; điểm replay vẫn khớp và không mất đáp án.

**Tính năng:** API/cấu hình server tắt phần achievement khỏi public snapshot (mặc định bật; evaluator và lưu dữ liệu vẫn chạy); session analytics chỉ mở DB read-only, dùng player-level cohort; lệnh prune mặc định dry-run và `--apply` backup DB trước khi xoá, giữ phiên đang chạy và dữ liệu người chơi còn được tham chiếu. Tests kiểm tra dry-run không ghi, backup trước apply, analytics và cờ hiển thị. Không sửa UI/overlay, không đụng `data/quiz.db` thật.

**Kiểm tra trên HEAD sau lần merge main cuối:**
- `corepack pnpm typecheck`: PASS.
- `corepack pnpm exec vitest run --project unit --project integration --maxWorkers=1`: PASS, 93 files / 611 tests.
- `corepack pnpm test:e2e`: PASS, 118/118.
- `corepack pnpm privacy:check`: PASS, 1249 tệp đã theo dõi.
- `git diff --check`: PASS; working tree sạch. `.tmp-test` không còn sau chạy.
