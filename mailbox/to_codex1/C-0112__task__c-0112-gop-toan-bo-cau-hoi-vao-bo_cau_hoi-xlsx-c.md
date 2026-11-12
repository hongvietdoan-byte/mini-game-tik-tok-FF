---
id: C-0112
from: coordinator
to: codex1
type: task
title: C-0112 Gộp toàn bộ câu hỏi vào BO_CAU_HOI.xlsx + công cụ export/import vào DB
ref: 
priority: high
needs: 
created: 2026-11-12T09:54:44+07:00
---
Người dùng chốt 12/11: **gộp chung TẤT CẢ câu hỏi vào một file Excel để người dùng tự xem và sửa; game cập nhật theo file đó**. Người dùng nói nội dung "không quan trọng", sai thì họ tự sửa trong file sau. Nhánh `codex1/c0112-question-bank-xlsx`.

**Nguồn cần gộp (3 bộ, ~139 câu):**
1. 36 câu Free Fire hiện có (DB `data/quiz.db` / `fixtures/questions.ts`).
2. `assets-local/review/DE_XUAT_CAU_HOI_BVDC.md` — 63 câu về giải và các đội (file CỤC BỘ ngoài git, nguồn nội bộ: đọc được nhưng KHÔNG chép nội dung vào repo, thư hay report).
3. `docs/review/DE_XUAT_CAU_HOI_GIAI_DAU.md` — 40 câu FFWS (đã ở main).

**Việc 1 — công cụ `tools/question_bank.py`** (Python + openpyxl, có unit test với dữ liệu giả):
- `export --out BO_CAU_HOI.xlsx`: ghi mọi câu vào MỘT file ở gốc repo (`*.xlsx` đã bị gitignore — không bao giờ commit file này). Sheet `TAT_CA` gồm cột: id, chủ đề (Free Fire / Bá Vương Đại Chiến / Sự kiện / Đội / Caster / FFWS), độ khó (dễ/vừa/khó), câu hỏi, A, B, C, D, đáp án đúng (A–D), dùng (CÓ/KHÔNG, mặc định CÓ), nguồn, ghi chú, số ký tự câu hỏi, cảnh báo (quá dài…). Thêm mỗi chủ đề một sheet lọc sẵn để dễ đọc, và sheet `HUONG_DAN` 10 dòng tiếng Việt. Có định dạng: cố định hàng tiêu đề, bộ lọc, dropdown cho độ khó / đáp án đúng / dùng, tô vàng ô vượt ngưỡng độ dài.
- `import --from BO_CAU_HOI.xlsx`: đọc sheet `TAT_CA` (nguồn sự thật), kiểm tra từng dòng (đủ 4 đáp án khác nhau, đáp án đúng hợp lệ, id không trùng), rồi upsert vào DB theo id: thêm câu mới, cập nhật câu đã sửa, câu `dùng = KHÔNG` thì chuyển về trạng thái không được chọn (không xoá, giữ lịch sử). In báo cáo: thêm/sửa/tắt/bỏ qua kèm lý do từng dòng lỗi; dòng lỗi không chặn các dòng khác. `--dry-run` chỉ in báo cáo.
- Trạng thái khi nhập: APPROVED + OPERATOR_VERIFIED với operator ghi là "người dùng duyệt qua file Excel 12/11" — người dùng đã duyệt gộp toàn bộ. Các câu thuộc 2 bộ mới KHÔNG gắn DEMO (để dùng được ở mode TIKTOK); 36 câu cũ giữ nguyên cờ hiện có.
- Từ chối import khi server đang chạy mà không đi qua API (tránh ghi DB đang mở): ưu tiên gọi API admin sẵn có trên `127.0.0.1:8787` nếu server đang chạy, ngược lại ghi thẳng DB. Backup DB trước khi ghi (dùng `tools/backup.py`).

**Việc 2 — chạy thật trên máy này:** export ra `BO_CAU_HOI.xlsx` từ 3 nguồn, rồi import vào `data/quiz.db`. Report: số câu theo chủ đề × độ khó, số câu bị cảnh báo quá dài, kết quả preflight sau khi nhập (đủ cho bao nhiêu vòng 15 câu ở mode RANDOM và DIFFICULTY). Không dán nội dung câu của bộ 2 vào report.

**Việc 3 — `docs/HUONG_DAN_LIVE.md`:** thêm mục ngắn "Sửa câu hỏi": mở `BO_CAU_HOI.xlsx` → sửa → lưu → chạy `py tools\question_bank.py import --from BO_CAU_HOI.xlsx`.

DoD: typecheck + test + privacy xanh trên cây đã commit; `git status` không có file xlsx hay nội dung bộ 2.
