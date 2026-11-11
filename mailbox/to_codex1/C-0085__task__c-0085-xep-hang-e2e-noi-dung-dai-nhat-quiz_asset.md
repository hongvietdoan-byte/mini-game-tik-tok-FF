---
id: C-0085
from: coordinator
to: codex1
type: task
title: C-0085 (xếp hàng) e2e nội dung dài nhất + QUIZ_ASSETS_DIR + e2e trên CI
ref: 
priority: normal
needs: 
created: 2026-11-11T23:04:39+07:00
---
Việc XẾP HÀNG sau C-0078 mốc 1 (không chen ngang), lấy từ rà soát của làn cloud (`docs/review/RA_SOAT_QUY_TRINH.md`, phát hiện 4 và 6):

1. **E2E nội dung dài nhất**: thêm case overlay với câu hỏi dài nhất và 4 đáp án dài nhất cho phép (lấy giới hạn từ contracts/validator; nếu chưa có giới hạn thì đề xuất con số trong report) ở các scene QUESTION (PREPARE/ACCEPTING), REVEAL, và tên người chơi dài nhất ở TOP10/VICTORY. Kiểm: không phần tử chữ nào bị cắt (scrollWidth/scrollHeight ≤ client), không đè lên đồng hồ đếm ngược, logo, MC; vẫn nằm trong safe zone.
2. **Bỏ đường dẫn cứng `'../../../assets-local'`** trong test/config: đọc từ biến môi trường `QUIZ_ASSETS_DIR` (mặc định = `assets-local` của checkout chính). Thêm bộ asset GIỮ CHỖ tối thiểu trong git (ví dụ `fixtures/assets-placeholder/`: PNG đơn sắc đúng kích thước cho logo, 3 chibi, MC, trophy-stage, bg) để e2e chạy được ở máy không có asset thật. Không commit asset thật.
3. Sau 1–2: thêm bước Playwright (Chromium, asset giữ chỗ) vào `.github/workflows/ci.yml`, chỉ chạy khi push đụng `apps/**`, `packages/**`, `tests/**`.

File thuộc làn Codex 2 (`tests/e2e/**`, `playwright.config.ts`): được sửa cho việc này NHƯNG chỉ bắt đầu sau khi coordinator báo đã gộp C-0080/C-0082, để không xung đột. Nghiệm thu: typecheck + test + e2e xanh trên máy Windows có asset thật VÀ với `QUIZ_ASSETS_DIR` trỏ bộ giữ chỗ.
