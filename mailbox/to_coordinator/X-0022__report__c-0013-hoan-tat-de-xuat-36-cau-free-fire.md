---
id: X-0022
from: codex1
to: coordinator
type: report
title: C-0013 hoàn tất — đề xuất 36 câu Free Fire
ref: C-0013
priority: normal
needs: 
created: 2026-11-11T12:28:11+07:00
---
C-0013 hoàn tất trên nhánh `codex1/c0014-ff-questions`.

- Thay 36 câu thành kiến thức Free Fire; giữ id `demo-001…036`, 16 EASY / 12 MEDIUM / 8 HARD, đáp án đúng chia đều 9 câu mỗi vị trí, tag `demo` + `free-fire`, subtopic `ff-*`.
- Số câu theo chủ đề: `ff-che-do` 6; `ff-ban-do` 7; `ff-vat-pham` 8; `ff-thuat-ngu` 8; `ff-tong-quan` 7.
- Hai prompt dài: `demo-001` 216 ký tự, `demo-023` 200; hai đáp án dài: `demo-014` 76, `demo-015` 74 ký tự.
- Mức TB: `demo-005` (Clash Squad 4v4), vì nguồn chính thức nêu biến thể theo sự kiện; lý do được ghi trong bảng. Các câu còn lại mức Cao, kèm nguồn Garena trong tài liệu.
- `corepack pnpm typecheck` → exit 0.
- `corepack pnpm test` → 10 files passed, 124 tests passed.
- Commit/push: `4a51b82` (`Đề xuất 36 câu DEMO Free Fire`), `git push -u origin codex1/c0014-ff-questions` → nhánh mới được push.
