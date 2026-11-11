# Báo cáo tình hình — Bá Vương Đại Chiến LIVE Quiz

Lập lúc **11/11/2026 ~23:25** bởi phiên coordinator (Claude). Mốc sự kiện: tổng duyệt 12/11, thi đấu 13–14/11.

## 1. Tóm tắt

- **Phần lõi game đã chạy được**: engine, chấm điểm kiểu Kahoot, server, khôi phục sau sự cố, dashboard, bộ cài Windows, kết nối TikTok (thư viện cộng đồng, chỉ đọc). Main hiện 231 unit test xanh; e2e 42 xanh theo report của Codex 1 (coordinator chưa tự chạy lại e2e trong phiên này).
- **Phần chưa đạt là giao diện overlay**: người dùng chưa duyệt màn câu hỏi (6 điểm trong C-0080) và màn Victory (lệch hẳn ref). Đây là việc đang chặn tổng duyệt.
- **Chưa thử được LIVE thật**: tài khoản chưa có quyền LIVE trên PC, chưa có @username để thử bình luận thật.
- **Spam mail CI đã hết**: CI xanh lại từ 22:45 và không còn chạy cho commit hòm thư/tài liệu.

## 2. Ai đang làm gì

| Làn | Đang làm | Tiếp theo | Ghi chú |
|---|---|---|---|
| coordinator (phiên này) | Điều phối qua hòm thư, rà report, gộp nhánh, báo cáo người dùng | Rà + gộp C-0080/C-0082 khi Codex 2 report; cập nhật `TIEN_DO.md`, `BOARD.md` | Không tự viết code tính năng |
| codex1 (test, dữ liệu, công cụ) | **C-0078** giọng MC — mốc 1: tách pha PREPARE → READING → ACCEPTING trong engine | Mốc 2 backend voice (mock, chưa gọi API thật), mốc 3 phát trên overlay | C-0077 đã xong và đã gộp |
| codex2 (giao diện) | **C-0080 + C-0082**: sửa overlay theo ref, làm lại Victory bằng ảnh có sẵn | **C-0079** màn Voice Settings trên dashboard | Code còn chưa commit trong worktree `c0068-victory-ref` |
| cloud Z (mới) | **C-0083**: rà toàn bộ quy trình theo plan — lệch hướng, sai, thiếu sót | Report + file `docs/review/RA_SOAT_QUY_TRINH.md` trên nhánh cloud | Chỉ đọc và viết báo cáo; không render được overlay vì `assets-local/` nằm ngoài git |

## 3. Việc phiên này đã làm (11/11 22:50 → 23:25)

### 3.1 Spam mail CI — đã xử lý
- **Nguyên nhân**: workflow chạy cho MỌI lần push, kể cả từng thư hòm thư (mỗi thư = 1 commit); CI đỏ ở bước "Kiểm tra quyền riêng tư" vì `fixtures/replay/tiktok-comments-normalization.json` chứa chuỗi số 9–12 chữ số bị coi là ID. Mỗi push = 1 mail báo lỗi.
- **Đã làm**:
  1. Gộp bản sửa C-0077 của Codex 1 (commit `af045de`) vào main. Kiểm tra lại trên nhánh đó: privacy check PASS, typecheck sạch, 231 test xanh.
  2. Sửa `.github/workflows/ci.yml`: chỉ chạy cho `main`, `codex1/**`, `codex2/**`; bỏ qua push chỉ đụng `mailbox/**`, `docs/**`, `*.md`.
- **Kết quả**: 4 lần chạy CI gần nhất trên GitHub đều `success` (kiểm tra lúc 22:46).
- **Còn lại**: mail cũ trong hộp thư người dùng phải tự xoá.

### 3.2 Phiên cloud Z — đã nối vào hòm thư
- Gộp nhánh `claude/zen-dijkstra-sop0bt` vào main (`tools/mb.py` thêm vai `cloud`, `mailbox/README.md` mục 8). `py tools/mb.py status` hiện dòng `cloud`.
- Cơ chế: coordinator gửi thư vào `mailbox/to_cloud/` trên main; cloud trả lời trên nhánh riêng, `mb.py` ở main tự nhập thư về `to_coordinator/` với số `Z-xxxx`.
- Đã gửi C-0081 (quy ước làn) và C-0083 (rà quy trình).
- Sai sót của coordinator: ban đầu tự vá `mb.py` trước khi biết phiên cloud đã làm sẵn, sau đó bỏ bản vá. Còn sót file `mailbox/state/cloud.json` trên main từ lần thử — vô hại.

### 3.3 Rà vì sao Victory chưa giống ref — đã có kết luận
- **Kết luận**: sai hướng dựng, không phải sai toạ độ. Ref là ảnh render 3D; bản trên main (commit `f84b658`, 21:53) vẽ tay bằng SVG/CSS: cúp phẳng kiểu icon, bão là vài đường tròn, sét là nét zigzag, khán đài là khung dây, bục là hình thang, không có ảnh nền.
- **Asset đúng mẫu đã có sẵn nhưng bị bỏ**: `assets-local/victory/trophy-stage.png` (đúng cúp + bục bát giác của ref) và `victory/bg.jpg` (nền bão). Bản trước `f84b658` từng dùng hai ảnh này.
- **Nguyên nhân gốc**:
  1. Thư giao việc của coordinator (C-0065 ghi "dựng bằng CSS/SVG, không cần asset mới"; C-0068 tả ref bằng chữ) → Codex 2 làm đúng theo chữ.
  2. Nghiệm thu không so hình: e2e chỉ kiểm vùng an toàn và sự tồn tại phần tử; phiên trước gộp mà không đặt ảnh cạnh ref.
  3. Chibi nguồn chỉ rộng ~160 px nên phóng to bị mờ.
- **Đã làm**: gửi C-0082 (ưu tiên cao) cho Codex 2 — bỏ toàn bộ phần vẽ tay, dùng lại 2 ảnh raster, bố cục theo tỉ lệ đo từ ref, bắt buộc ghép ảnh chụp cạnh ref trước khi report. Codex 2 đã ACK (Y-0128, 22:53).

### 3.4 Việc khác
- Nhận gói bàn giao (`docs/HANDOFF.md` đã ghi "ĐÃ NHẬN").
- Xử lý thư X-0126 (ACK C-0078), X-0127 (report C-0077), Y-0128 (ACK C-0082).

## 4. Trạng thái các mốc (theo `docs/TIEN_DO.md`, cập nhật lại)

| Mốc | Nội dung | Trạng thái thật |
|---|---|---|
| M0–M7 | Engine, server, dashboard, kiểm tra kết nối, 36 câu đề xuất, bộ cài, Setup Wizard | Xong, đã gộp |
| M8 | Bố cục overlay theo `ref/storm-arena-ref.png` | **Chưa được người dùng duyệt** — C-0080 đang sửa 6 điểm: bám ref, logo ≥40 %, đồng hồ đếm ngược che chữ, đáp án bị cắt, bỏ icon sét ở ô thoại MC, MC đổi chuyển động theo pha |
| M9–M10 | Overlay V3, 35 ghế khán giả, đếm đáp án realtime, tải 2.000 người | Xong |
| M11 | Kết nối TikTok LIVE | Code xong; **chưa thử với LIVE thật** |
| M12 | Victory theo ref | **Lệch hướng, đang làm lại** (C-0082) |
| M13 | Tổng duyệt kỹ thuật bằng Mock | E2E trọn vòng xong; chưa thử OBS/LIVE Studio thật |
| M14 | Sẵn sàng LIVE thật | Bị chặn bởi M11 |
| M15 | MC Kelly PNG Sequence | Chờ frame từ người dùng |
| M16 | Giọng MC | Đang code mốc 1 (C-0078); chưa gọi dịch vụ giọng thật |
| M17 | Mô phỏng UI TikTok + safe zone | Xong |

## 5. Tiếp theo sẽ làm

Theo thứ tự ưu tiên:

1. **Chờ report C-0080/C-0082 của Codex 2** → coordinator tự chụp 6 ảnh (câu hỏi câu dài, câu hỏi + HUD, reveal, victory, victory đồng hạng, top 10), đặt cạnh ref, chạy typecheck + test + e2e, rồi mới gộp, build overlay và gửi ảnh cho người dùng duyệt. Nếu còn lệch thì trả lại kèm ảnh khoanh chỗ sai, không gộp.
2. **Nhận báo cáo rà quy trình của cloud (C-0083)** → chuyển các phát hiện P0/P1 thành thư giao việc; báo người dùng phần cần quyết định.
3. **Rà + gộp C-0078 mốc 1** của Codex 1 (đụng engine nên phải chạy lại toàn bộ test tích hợp).
4. **Cập nhật `docs/TIEN_DO.md` và `mailbox/BOARD.md`** — cả hai đang cũ (BOARD còn ghi trạng thái từ sáng 11/11; heartbeat coordinator còn ghi việc đã xong).
5. **Sửa quy trình nghiệm thu giao diện**: mọi thư giao việc UI phải chỉ đích danh file ref + asset được dùng; report phải kèm ảnh ghép cạnh ref.
6. **Tổng duyệt 12/11**: chạy trọn trận Mock qua LIVE Studio thật khi người dùng thêm được nguồn overlay.

## 6. Đang chờ người dùng

| Việc | Vì sao cần |
|---|---|
| Duyệt 36 câu Free Fire (`docs/review/DE_XUAT_CAU_HOI_FF.md`) | Chưa duyệt thì không câu nào được vào vòng công khai |
| @username + quyền LIVE trên PC (LIVE Studio đang báo "No access") | Chưa thử được bình luận thật (M11, M14) |
| Thêm nguồn Link `http://127.0.0.1:8787/overlay/` trong LIVE Studio | Coordinator không bấm được app native |
| Bộ chibi độ phân giải cao hơn (cao ≥ ~400 px), nếu có | Chibi hiện ~160 px, phóng to ở Victory bị mờ |
| PNG tư thế MC vào `assets-local/mc/kelly/{welcome,ask,react,celebrate,idle}` | MC đang dùng ảnh tĩnh |
| Muốn phiên cloud Z làm gì sau khi rà xong | Hiện chỉ có 1 task |

## 7. Rủi ro đang thấy

- **Thời gian**: tổng duyệt là ngày mai (12/11) mà hai màn chính của overlay chưa được duyệt.
- **Kết nối TikTok** dùng thư viện không chính thức, chưa từng thử với phòng LIVE thật của tài khoản này.
- **Không có kiểm thử so hình với ref** → lỗi kiểu Victory có thể lặp lại ở màn khác.
- **Tồn đọng**: ~50 worktree/nhánh cũ trong `.claude/worktrees/`, chưa dọn.
