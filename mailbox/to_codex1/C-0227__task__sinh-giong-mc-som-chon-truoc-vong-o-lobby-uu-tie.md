---
id: C-0227
from: coordinator
to: codex1
type: task
title: Sinh giọng MC sớm: chọn trước vòng ở LOBBY, ưu tiên câu 1
ref: 
priority: high
needs: 
created: 2026-11-16T11:43:45+07:00
---
## Mục tiêu
Câu 1 của mỗi vòng phải kịp có giọng MC khi vào READING. Hiện tại `preGenerateRoundVoice()` (apps/server/src/runtime.ts) chỉ chạy ở `ROUND_STARTED`, sau khi `prepareRound()` chọn câu lúc START_ROUND → câu 1 chỉ có ~8 s PREPARE để sinh (đọc câu + 2 đáp án, dễ trễ khi cache trống). Người dùng đã duyệt hướng: sinh giọng SỚM HƠN, không sinh trước toàn bộ ngân hàng câu.

## Yêu cầu
1. **Chọn trước vòng kế tiếp khi đang ở LOBBY** (hoặc ngay khi vòng trước kết thúc): chạy `selectRound` sớm, giữ kết quả (roundId/roundNumber/seed/snapshots), và bắt đầu sinh giọng cho các snapshot đó ngay. Khi START_ROUND tới, dùng lại đúng lựa chọn đã chuẩn bị nếu còn hợp lệ (cùng pack, config, usedInSession không đổi, count khớp); nếu không hợp lệ thì chọn lại như cũ. RESTART_ROUND giữ hành vi hiện tại.
   - Không được đổi thứ tự/xáo đáp án khác với lúc live (text MC phải khớp đúng snapshot sẽ phát).
   - Không ghi round/answers vào store trước START_ROUND; replay/recovery và stateVersion không đổi.
2. **Ưu tiên câu 1**: sinh câu 1 (đọc câu + đáp án) trước, rồi mới câu 2, 3… và reveal; giữ tối đa 2 luồng song song như hiện tại. LEADERBOARD/VICTORY generic để sau câu 1.
3. Giữ cache key/`voiceAssetPromises` hiện có để không sinh trùng; khi bỏ lựa chọn chuẩn bị trước (không hợp lệ) không cần huỷ request đang chạy.
4. Tắt giọng (`voiceEnabled()` false) → không chọn trước, hành vi y như cũ.

## Test cần có
- LOBBY → chọn trước + gọi sinh giọng câu 1 trước các câu khác (mock service).
- START_ROUND dùng lại đúng snapshots đã chọn trước (cùng questionInstanceIds, cùng thứ tự đáp án).
- Lựa chọn trước bị vô hiệu (đổi config/pack hoặc câu đã dùng) → chọn lại, không crash.
- Seed cố định (`config.seed`) cho kết quả giống hệt khi không chọn trước.
- Voice tắt → không gọi service.

## Ràng buộc
- Không chạy thử sinh giọng thật (tốn lượt) — chỉ mock. Không ghi thông số profile giọng vào repo/thư.
- typecheck + toàn bộ test + e2e + privacy phải xanh. Commit trên nhánh codex1, báo lại hash + tóm tắt trong thư report.
