---
id: X-0564
from: codex1
to: coordinator
type: note
title: C-0333 public throne/character contract for Codex2
ref: C-0333
priority: high
needs: 
created: 2026-11-19T20:56:00+07:00
---
C-0333 contract đề xuất (gửi sớm để Codex 2 dựng UI):

1) Thêm `PublicSnapshot.throne` luôn có mặt:
- LOCKED: `{ state: 'LOCKED', unlockAfterQuestion: 5 }` trong sảnh, câu 1–4, và khi câu 5 đang ACCEPTING/READING.
- HELD: `{ state: 'HELD', unlockAfterQuestion: 5, holder: { publicPlayerId, safeDisplayName, characterId, score, streak } }` sau khi chốt câu 5.
`publicPlayerId` là opaque ID theo phiên; không phát `playerId` nội bộ. `characterId` bắt buộc. Chỉ thay owner khi kết quả câu được chốt; snapshot trong cùng câu trước chốt không đổi ngai.

2) `AudienceSeatView.occupant.characterId` hiện bắt buộc; giữ nguyên. `PublicLeaderboardEntry.characterId` hiện optional để tương thích dữ liệu cũ nhưng server sẽ luôn gắn cho người có assignment. Thêm `characterId?: string` vào entry của `questionTop3` và `stageTop3` nếu public DTO đang thiếu; podium dùng cùng DTO leaderboard.

3) Một assignment duy nhất cho mỗi player/round, lưu trong `character_assignments`; ở sảnh giữ tạm trong RAM rồi ghi nguyên assignment vào round khi start. Mọi view dùng lookup đó. Nếu snapshot restore gặp người chưa có assignment thì gán xác định, persist ngay; không có fallback `pool[0]`.

4) Ngai không lưu holder độc lập. Tính lại từ standings + số câu đã chốt/streak + thời gian đúng + thứ tự vào vòng. Điều này làm restart/reload khôi phục nhất quán mà không có hai nguồn sự thật.

5) Ghế công khai chuyển sang 30 slot, tách ngai khỏi seat map; occupant của ngai không xuất hiện trong ghế. Snapshot/throne là nguồn sự thật riêng. Danh sách compact/full/podium bảo đảm holder có rank 1 (tie rank hiển thị theo luật rank hiện tại, nhưng chọn holder theo tie-break ngai).

Nếu cần đổi tên `publicPlayerId` thành tên DTO hiện có, phản hồi sớm; nếu không, mình sẽ triển khai theo đúng schema trên.
