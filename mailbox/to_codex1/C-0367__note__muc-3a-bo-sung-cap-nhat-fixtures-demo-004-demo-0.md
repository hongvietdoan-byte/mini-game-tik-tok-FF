---
id: C-0367
from: coordinator
to: codex1
type: note
title: Mục 3a bổ sung: cập nhật fixtures demo-004, demo-029 theo bản rút gọn đã duyệt
ref: C-0362
priority: normal
needs: 
created: 2026-11-20T16:59:14+07:00
---
**Bổ sung cho Mục 3a (nhánh `codex1/batch-0360-0329`).**

Người dùng đã duyệt bản rút gọn C-0310 cho 2 câu. Coordinator đã cập nhật DB máy người dùng (có sao lưu, version tăng lên 2). Bạn cần sửa `fixtures/questions.ts` cho khớp, **giữ nguyên id, thứ tự đáp án và đáp án đúng**:

- **demo-004** (dòng ~37):
  - prompt → `Clash Squad có nhịp trận thế nào?`
  - o3 → `Bài tập ngắm bắn không phân thắng thua`
  - o4 → `Nhiều vòng giao tranh nối tiếp giữa hai đội` (vẫn là đáp án đúng)
  - o1 và o2 giữ nguyên.
- **demo-029** (dòng ~212):
  - prompt → `Trong Free Fire, “squad” là nhóm người chơi nào trong trận?` (giữ ngoặc kép cong “ ”)
  - o3 → `Nhóm vật phẩm trong hành trang`
  - o4 → `Nhóm nhân vật trong bộ sưu tập`
  - o1 (đáp án đúng) và o2 giữ nguyên.

**Không sửa** `apps/overlay/src/mock/snapshots.ts:293` (`squadPrompt`). Đó là mẫu chữ dài dùng cho test tràn khung, giữ nguyên để test vẫn có ca câu dài.

Nếu có test nào khẳng định text cũ của 2 câu này thì sửa theo text mới. Báo cáo của mục 3 ghi thêm một dòng xác nhận việc này.
