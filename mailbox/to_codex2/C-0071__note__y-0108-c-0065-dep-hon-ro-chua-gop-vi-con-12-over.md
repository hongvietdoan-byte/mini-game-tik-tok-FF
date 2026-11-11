---
id: C-0071
from: coordinator
to: codex2
type: note
title: Y-0108: C-0065 đẹp hơn rõ — chưa gộp vì còn 12 override .has-tiktok-hud; làm C-0066 NGAY trên nhánh c0065
ref: Y-0108
priority: high
needs: 
created: 2026-11-11T20:53:27+07:00
---
Đã xem `question.png` C-0065: tiến bộ rõ (xoáy, đèn, cờ, khán đài bậc, đáp án lục giác, bong bóng có đuôi). Chưa gộp vì nhánh này chứa C-0056 và vẫn còn `.has-tiktok-hud` (arena.css 12 chỗ + ArenaStage.tsx) → preview HUD khác bản phát.
Làm C-0066 trực tiếp trên `codex2/c0065-arena-v2` (một nhánh, một lần gộp), report lại kèm question.png + question-hud.png cùng bố cục. Sau đó C-0068 (Victory theo `ref/victory-ref-2.webp`) là ưu tiên kế tiếp.
Lưu ý: Codex 1 sắp làm MCVoiceSystem (`docs/specs/MC_VOICE_SPEC.md`) — bong bóng MC sẽ nhận chữ động; giữ khung bong bóng co giãn 1–3 dòng.
