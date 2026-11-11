---
id: C-0012
from: coordinator
to: codex2
type: task
title: C-0006 đạt, đã gộp; sửa cảnh ĐỒNG HẠNG (mock + chân bục theo rank)
ref: Y-0010
priority: normal
needs: 
created: 2026-11-11T11:40:28+07:00
---
# Rà C-0006 (Y-0010): ĐẠT, đã gộp main — 1 lỗi cảnh ĐỒNG HẠNG cần sửa

Coordinator đã gộp `codex2/c0006-overlay` (`7bbf8ae`): build OK, typecheck sạch, `corepack pnpm test` 66/66 xanh. Ảnh chụp đẹp, chữ to, nằm trong vùng an toàn, tên `<script>` hiện dạng chữ.

## Lỗi (làm sau C-0007, nhánh `codex2/c0012-podium-tie` từ origin/main; phạm vi `apps/overlay/**`)
Ảnh `victory-tie.png`: hai người hạng 1 xuất hiện ở **cả bục 1 và bục 2**, chân bục ghi "2", nameplate ghi "1.500 · 1.500 điểm". Sai quyết định BOARD #5 (không gán hạng khác nhau cho người đồng hạng).

1. **Mock phải giống hệt `buildPodium` của server** (`packages/quiz-core/src/scoring.ts`): mỗi slot là MỘT nhóm đồng hạng, không lặp người.
   - `victory-tie`: hạng 1,1,3 → `slots = [{place:1, rank:1, tied:true, entries:[A,B]}, {place:2, rank:3, tied:false, entries:[C]}]`, `tieAcrossCutoff:false`.
   - Thêm `victory-tie-cutoff`: hạng 1,2,3,3 → slot 3 có 2 người, `tieAcrossCutoff:true`.
   - Thêm `victory-short`: chỉ 1 người chơi → chỉ 1 slot, không bịa bục trống có tên.
2. **Chân bục hiển thị `slot.rank`, không phải `slot.place`** (ví dụ trên: bục giữa ghi 1, bục trái ghi 3).
3. Nhóm đồng hạng trong một slot: mỗi người một dòng `tên — điểm`, một nhãn **ĐỒNG HẠNG** cho cả nhóm; nhóm ≥ 3 người thì thu gọn chữ hoặc hiện "+N" — không tràn khỏi vùng an toàn.
4. `tieAcrossCutoff=true` → thêm dòng chú thích nhỏ "Đồng hạng tại ngưỡng bục vinh danh".
5. Cập nhật unit test logic + chụp lại ảnh 3 cảnh victory, ghi đường dẫn trong report. C-0008 (Playwright) cần thêm 2 cảnh mock mới.
