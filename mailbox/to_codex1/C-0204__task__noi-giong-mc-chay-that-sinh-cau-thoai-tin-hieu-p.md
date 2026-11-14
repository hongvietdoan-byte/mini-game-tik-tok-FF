---
id: C-0204
from: coordinator
to: codex1
type: task
title: Nối giọng MC chạy thật: sinh câu thoại, tín hiệu phát trong snapshot, validator không đọc tên
ref: X-0339
priority: high
needs: 
created: 2026-11-14T11:40:08+07:00
---
Nhận X-0339, bản ứng viên tốt. Kết luận quan trọng của bạn: giọng MC chưa hề được phát trên overlay. Người dùng yêu cầu bản hoàn thiện phải test được KÈM giọng MC, nên đây là việc ưu tiên cao nhất bây giờ.

C-0204 (phần server, nhánh riêng trên nền `codex1/release-candidate-1114`):
1. Rà và báo ngắn: pipeline giọng hiện có gì (service, cache, pre-generate, `/api/mc-voice/assets/:assetId`), `main.ts` đã nối service thật khi có credential trong môi trường chưa, vì sao phiên `mcVoiceEnabled: true` không sinh/phát gì.
2. Nối cho chạy thật: khi phiên bật giọng và có credential, runtime sinh câu thoại theo `McVoiceEvent` (chào sảnh, đọc câu hỏi + 4 đáp án ở READING, hối thúc, công bố đáp án đúng, giới thiệu BXH, vinh danh chung chung), sinh trước (pre-generate) các câu của vòng ngay khi chọn bộ câu để không trễ; dùng cache theo `voicePolicyVersion`.
3. Đưa vào public snapshot một trường tín hiệu phát (ví dụ `mcVoiceCue`: id duy nhất, loại sự kiện, URL asset công khai, thời lượng ms, thời điểm bắt đầu theo đồng hồ server) để overlay phát đúng lúc và không phát lặp khi nhận lại snapshot/kết nối lại. URL asset phải đọc được từ overlay không cần token quản trị, không lộ thông tin nhạy cảm.
4. Quy tắc cứng theo đặc tả: KHÔNG câu nào chứa tên/ID người chơi — validator chặn ở server, có test (kể cả với `fastestCorrectAnswer`: chỉ hiện chữ, không đọc). Nhà cung cấp lỗi/chậm quá hạn → bỏ qua câu đó, game không được chờ; ghi telemetry.
5. Pha READING: thời lượng pha theo độ dài audio (trần `MAX_MC_READING_MS`), thiếu audio thì dùng thời lượng mặc định.
6. Test bằng provider giả (không gọi mạng trong CI); thêm một script/chế độ để coordinator chạy thử thật trên máy có credential. Không ghi credential, tên miền hay ID nội bộ của nhà cung cấp vào thư, log hay repo.
7. Report: tên trường + kiểu dữ liệu chính xác (để tôi chuyển Codex 2 làm phần phát trên overlay), danh sách câu thoại mẫu theo từng sự kiện, kết quả test, và cách chạy thử thật.
Dọn `.tmp-test`, không chạy trong checkout chính.
