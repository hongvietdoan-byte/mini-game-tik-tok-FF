---
id: C-0070
from: coordinator
to: codex1
type: task
title: C-0070: THAY C-0069 — MCVoiceSystem theo spec người dùng; BƯỚC 0 = khảo sát + đề xuất, CHƯA CODE
ref: C-0069
priority: high
needs: 
created: 2026-11-11T20:51:34+07:00
---
Người dùng gửi spec đầy đủ: `docs/specs/MC_VOICE_SPEC.md` (main b44ac81). **Spec này THAY THẾ C-0069** (bỏ ý "chỉ TTS offline": spec yêu cầu TTS Provider Adapter, API key chỉ ở backend). Nếu đã bắt đầu C-0069 thì dừng, giữ lại phần dùng được.

**Bước 0 — chỉ khảo sát + đề xuất, KHÔNG code** (spec yêu cầu). Report dạng `docs/review/MC_VOICE_DE_XUAT.md` (commit trên nhánh `codex1/c0070-mc-voice-plan`) gồm:
1. **Hiện trạng âm thanh**: overlay/dashboard đang có audio gì (SFX, nhạc, `<audio>`, WebAudio?), McSequence/mc-sequence-player (state idle/welcome/ask/react/celebrate) tái dùng được gì cho idle/talking/excited/victory; asset `assets-local/mc/kelly/*`.
2. **Engine**: luồng hiện tại QUESTION → ACCEPTING → LOCKED; đề xuất chèn pha đọc (vd `READING`/`QUESTION_INTRO`) trước ACCEPTING sao cho: timer do backend điều khiển, KHÔNG đổi logic chấm điểm, recovery/pause/skip đúng, comment trong lúc đọc xử lý thế nào (bỏ/cách ly — nêu lựa chọn), giới hạn thời gian đọc tối đa + fallback khi audio lỗi/timeout. Ảnh hưởng tới contracts/snapshot/e2e hiện có.
3. **Ai là "audio output chính"**: phát ở overlay (OBS browser source "Control audio via OBS") hay ở server/app Electron ra thiết bị âm thanh; cách đảm bảo chỉ 1 nguồn phát (nhiều overlay mở cùng lúc, reconnect không phát lại lời đã xong), cách overlay báo tiến độ SPEAKING/FINISHED về backend (ACK) để backend mở ACCEPTING.
4. **TTS Provider Adapter**: interface (synthesize(text, voice, rate) → file+duration), danh sách ứng viên giọng tiếng Việt: offline (Windows System.Speech/OneCore vi-VN), online (Azure/Google/FPT.AI/Zalo/ElevenLabs/OpenAI… — chỉ liệt kê, so chất lượng/giá/độ trễ/điều khoản; KHÔNG đăng ký, KHÔNG gọi thử dịch vụ ngoài). Lưu key ở backend (env/secret store của app, không log, không ra overlay). Cache theo hash(nội dung+voice settings), pre-generate khi duyệt bộ câu, timeout.
5. **Voice state machine + Audio queue**: IDLE/PREPARING/SPEAKING/FINISHED/INTERRUPTED/ERROR, lineId gắn roundId/questionInstanceId/gameState; ưu tiên, cancel khi Skip, pause/resume.
6. **Dashboard Settings** (mục 7 spec): danh sách control + API; ghi rõ phần UI sẽ do Codex 2 làm.
7. **Kế hoạch chia task** (mốc nhỏ, mỗi mốc test được), ước lượng, rủi ro (OBS không thu speechSynthesis của trình duyệt, autoplay policy, độ trễ TTS online), phần nào cần người dùng quyết (nhà cung cấp/giọng, có thu âm sẵn không).
Gửi report → coordinator duyệt (và hỏi người dùng các điểm cần quyết) rồi mới code. Lời thoại MC (kho câu) vẫn cần người dùng duyệt như kho câu hỏi.
