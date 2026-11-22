export type ThemeSkinGroup = 'K' | 'I' | 'H';
export type ThemeSkinTarget = {
  id: string;
  nhom: ThemeSkinGroup;
  lop: 1 | 2 | 3;
  selector: string;
  scenes: readonly string[];
  nineSlice: { tren: number; phai: number; duoi: number; trai: number } | null;
  /** Opt-in overlays: transparent defaults preserve CSS; only real art enables the effect. */
  defaultHidden?: boolean;
  /** Icon-only targets replace their children; label targets keep live data text over the skin. */
  content?: 'icon' | 'label' | 'frame';
  /** K14 answer states share one directory and select a separate PNG per state. */
  variants?: readonly { file: string; selector: string; legacyId?: string }[];
  /** Preserve selected artwork inside a frame while hiding dynamic sibling content. */
  keepChildren?: readonly string[];
  /** Capture the source pixels for an optional effect even though it is hidden in the default theme. */
  captureDefaultHidden?: boolean;
  /** Explain intentionally transparent targets in DOC-TOI and the default contact sheet. */
  defaultEmptyReason?: string;
  ghiChu: string;
};

/**
 * Selector registry is application-owned. A theme can choose pixels only; it
 * cannot supply selectors, CSS, positions, dimensions, or stacking values.
 */
export const THEME_SKIN_TARGETS: readonly ThemeSkinTarget[] = [
  { id: 'K01', nhom: 'K', lop: 1, selector: '.v3-event-mark', scenes: ['LOBBY', 'QUESTION', 'REVEAL', 'VICTORY'], nineSlice: null, content: 'frame', ghiChu: 'Khung kicker/nhãn sự kiện.' },
  { id: 'K02', nhom: 'K', lop: 1, selector: '.v3-round-card', scenes: ['LOBBY', 'QUESTION', 'REVEAL'], nineSlice: { tren: 20, phai: 24, duoi: 20, trai: 24 }, content: 'frame', ghiChu: 'Thẻ vòng và số người chơi.' },
  { id: 'K03', nhom: 'K', lop: 1, selector: '.v3-title-ribbon', scenes: ['LOBBY', 'QUESTION', 'REVEAL', 'VICTORY'], nineSlice: { tren: 18, phai: 30, duoi: 18, trai: 30 }, content: 'frame', ghiChu: 'Băng rôn tiêu đề.' },
  { id: 'K04', nhom: 'K', lop: 1, selector: '.v3-top10', scenes: ['QUESTION', 'REVEAL'], nineSlice: { tren: 28, phai: 28, duoi: 28, trai: 28 }, ghiChu: 'Khung bảng Top 10.' },
  { id: 'K05', nhom: 'K', lop: 1, selector: '.v3-top10 li.v3-rank-1', scenes: ['QUESTION', 'REVEAL'], nineSlice: { tren: 8, phai: 14, duoi: 8, trai: 14 }, ghiChu: 'Hàng Top 1.' },
  { id: 'K06', nhom: 'K', lop: 1, selector: '.v3-top10 li.v3-rank-2', scenes: ['QUESTION', 'REVEAL'], nineSlice: { tren: 8, phai: 14, duoi: 8, trai: 14 }, ghiChu: 'Hàng Top 2.' },
  { id: 'K07', nhom: 'K', lop: 1, selector: '.v3-top10 li.v3-rank-3', scenes: ['QUESTION', 'REVEAL'], nineSlice: { tren: 8, phai: 14, duoi: 8, trai: 14 }, ghiChu: 'Hàng Top 3.' },
  { id: 'K08', nhom: 'K', lop: 1, selector: '.v3-top10 li.v3-rank-n', scenes: ['QUESTION', 'REVEAL'], nineSlice: { tren: 8, phai: 14, duoi: 8, trai: 14 }, ghiChu: 'Hàng Top 4–10.' },
  { id: 'K09', nhom: 'K', lop: 1, selector: '.v3-board', scenes: ['LOBBY', 'QUESTION', 'REVEAL'], nineSlice: { tren: 36, phai: 36, duoi: 36, trai: 36 }, ghiChu: 'Khung bảng câu hỏi/chào mừng.' },
  { id: 'K10', nhom: 'K', lop: 1, selector: '.v3-board-tab', scenes: ['LOBBY', 'QUESTION', 'REVEAL'], nineSlice: { tren: 14, phai: 18, duoi: 14, trai: 18 }, ghiChu: 'Nhãn CÂU HỎI/SẢNH.' },
  { id: 'K11', nhom: 'K', lop: 1, selector: '.v3-question', scenes: ['LOBBY', 'QUESTION', 'REVEAL'], nineSlice: { tren: 20, phai: 24, duoi: 20, trai: 24 }, ghiChu: 'Khung câu hỏi hoặc lời chào.' },
  { id: 'K12', nhom: 'K', lop: 1, selector: '.v3-timer', scenes: ['QUESTION', 'REVEAL'], nineSlice: null, ghiChu: 'Vòng đồng hồ và nền; trạng thái khẩn cấp dùng K13.' },
  { id: 'K13', nhom: 'K', lop: 1, selector: '.v3-timer.is-urgent', scenes: ['QUESTION'], nineSlice: null, ghiChu: 'Khung đồng hồ sắp hết giờ.' },
  { id: 'K14', nhom: 'K', lop: 1, selector: '.v3-option', variants: [
    { file: 'thuong.png', selector: '.v3-option:not(.is-correct):not(.is-dim):not(.is-hidden)' },
    { file: 'dung.png', selector: '.v3-option.is-correct', legacyId: 'K15' },
    { file: 'sai.png', selector: '.v3-option.is-dim', legacyId: 'K16' },
    { file: 'mo.png', selector: '.v3-option.is-hidden' },
  ], scenes: ['QUESTION', 'REVEAL'], nineSlice: { tren: 16, phai: 20, duoi: 16, trai: 20 }, ghiChu: 'Ô đáp án thường, đúng, sai và mờ.' },
  { id: 'K17', nhom: 'K', lop: 1, selector: '.v3-option-meter', scenes: ['REVEAL'], nineSlice: { tren: 6, phai: 10, duoi: 6, trai: 10 }, ghiChu: 'Thanh phần trăm trong ô đáp án.' },
  { id: 'K18', nhom: 'K', lop: 1, selector: '.v3-lobby-status', scenes: ['LOBBY'], nineSlice: { tren: 14, phai: 18, duoi: 14, trai: 18 }, defaultEmptyReason: 'Mặc định trống — chỉ là vùng chứa; thêm ảnh sẽ hiện ở bbox.', ghiChu: 'Khung SẮP BẮT ĐẦU/đếm ngược.' },
  { id: 'K19', nhom: 'K', lop: 1, selector: '.v3-lobby-seat-summary', scenes: ['LOBBY'], nineSlice: { tren: 12, phai: 16, duoi: 12, trai: 16 }, defaultEmptyReason: 'Mặc định trống — chỉ là vùng chứa; thêm ảnh sẽ hiện ở bbox.', ghiChu: 'Khung thống kê ghế.' },
  { id: 'K20', nhom: 'K', lop: 1, selector: '.v3-bubble', scenes: ['LOBBY', 'QUESTION', 'REVEAL', 'VICTORY', 'INTERIM_TOP10', 'INTERMISSION'], nineSlice: { tren: 24, phai: 30, duoi: 24, trai: 30 }, ghiChu: 'Bóng thoại MC.' },
  { id: 'K21', nhom: 'K', lop: 1, selector: '.v3-mc-plate', scenes: ['LOBBY', 'QUESTION', 'REVEAL', 'VICTORY', 'INTERIM_TOP10', 'INTERMISSION'], nineSlice: { tren: 12, phai: 16, duoi: 12, trai: 16 }, ghiChu: 'Bảng tên MC.' },
  { id: 'K22', nhom: 'K', lop: 1, selector: '.v3-throne', keepChildren: ['.v3-throne-art'], scenes: ['LOBBY'], nineSlice: { tren: 34, phai: 38, duoi: 34, trai: 38 }, ghiChu: 'Khung ngai và bảng tên chủ ngai.' },
  { id: 'K23', nhom: 'K', lop: 1, selector: '.v3-fastest-callout', scenes: ['REVEAL', 'VICTORY'], nineSlice: { tren: 24, phai: 30, duoi: 24, trai: 30 }, ghiChu: 'Khung Top 3 nhanh nhất/nhanh nhất câu.' },
  { id: 'K24', nhom: 'K', lop: 1, selector: '.v3-question-top3', scenes: ['REVEAL'], nineSlice: { tren: 18, phai: 22, duoi: 18, trai: 22 }, defaultEmptyReason: 'Mặc định trống — chỉ là vùng chứa; thêm ảnh sẽ hiện ở bbox.', ghiChu: 'Khung bảng Top 3 trả lời nhanh.' },
  { id: 'K25', nhom: 'K', lop: 1, selector: '.v3-top3-row', scenes: ['REVEAL'], nineSlice: { tren: 8, phai: 12, duoi: 8, trai: 12 }, ghiChu: 'Hàng trong bảng Top 3.' },
  { id: 'K26', nhom: 'K', lop: 1, selector: '.v3-leaderboard-full', scenes: ['INTERIM_TOP10'], nineSlice: { tren: 32, phai: 36, duoi: 32, trai: 36 }, ghiChu: 'Khung BXH tạm thời toàn màn.' },
  { id: 'K27', nhom: 'K', lop: 1, selector: '.v3-full-row.v3-full-rank-n', scenes: ['INTERIM_TOP10'], nineSlice: { tren: 8, phai: 14, duoi: 8, trai: 14 }, ghiChu: 'Hàng BXH toàn màn cho hạng thường 4–10.' },
  { id: 'K28', nhom: 'K', lop: 1, selector: '.v3-intermission', scenes: ['INTERMISSION'], nineSlice: { tren: 30, phai: 36, duoi: 30, trai: 36 }, ghiChu: 'Khung nghỉ giữa vòng.' },
  { id: 'K29', nhom: 'K', lop: 1, selector: '.v3-connection-lost', scenes: ['CONNECTION_LOST'], nineSlice: { tren: 30, phai: 36, duoi: 30, trai: 36 }, ghiChu: 'Khung mất kết nối.' },
  { id: 'K30', nhom: 'K', lop: 1, selector: '.v3v-podium', scenes: ['VICTORY'], nineSlice: { tren: 30, phai: 36, duoi: 30, trai: 36 }, defaultEmptyReason: 'Mặc định trống — chỉ là vùng chứa; thêm ảnh sẽ hiện ở bbox.', ghiChu: 'Khung sân khấu Top 1/2/3 Victory.' },
  { id: 'K31', nhom: 'K', lop: 1, selector: '.v3v-nameplate', scenes: ['VICTORY'], nineSlice: { tren: 12, phai: 16, duoi: 12, trai: 16 }, ghiChu: 'Bảng tên người thắng Victory.' },
  { id: 'K32', nhom: 'K', lop: 1, selector: '.v3v-player-row', scenes: ['VICTORY'], nineSlice: { tren: 8, phai: 12, duoi: 8, trai: 12 }, defaultEmptyReason: 'Mặc định trống — chỉ là vùng chứa; thêm ảnh sẽ hiện ở bbox.', ghiChu: 'Từng hàng tên khi đồng hạng/chuỗi.' },
  { id: 'K33', nhom: 'K', lop: 1, selector: '.v3-throne-copy', scenes: ['LOBBY'], nineSlice: { tren: 20, phai: 24, duoi: 20, trai: 24 }, defaultEmptyReason: 'Mặc định trống — chỉ là vùng chứa; thêm ảnh sẽ hiện ở bbox.', ghiChu: 'Khung bảng tên/chủ ngai.' },
  { id: 'K34', nhom: 'K', lop: 1, selector: '.v3-tiers', scenes: ['LOBBY', 'QUESTION', 'REVEAL', 'INTERIM_TOP10'], nineSlice: null, ghiChu: 'Nền các bậc khán đài.' },
  { id: 'K35', nhom: 'K', lop: 1, selector: '.v3-step', scenes: ['LOBBY', 'QUESTION', 'REVEAL', 'INTERIM_TOP10'], nineSlice: null, ghiChu: 'Viền sáng từng bậc khán đài.' },
  { id: 'K36', nhom: 'K', lop: 1, selector: '.v3-seat-name', scenes: ['QUESTION', 'REVEAL'], nineSlice: { tren: 8, phai: 12, duoi: 8, trai: 12 }, content: 'label', ghiChu: 'Bảng tên trên ghế; nội dung tên người chơi giữ nguyên.' },
  { id: 'K37', nhom: 'K', lop: 1, selector: '.v3-full-row.v3-full-rank-1', scenes: ['INTERIM_TOP10'], nineSlice: { tren: 8, phai: 14, duoi: 8, trai: 14 }, ghiChu: 'Hàng BXH toàn màn Top 1.' },
  { id: 'K38', nhom: 'K', lop: 1, selector: '.v3-full-row.v3-full-rank-2', scenes: ['INTERIM_TOP10'], nineSlice: { tren: 8, phai: 14, duoi: 8, trai: 14 }, ghiChu: 'Hàng BXH toàn màn Top 2.' },
  { id: 'K39', nhom: 'K', lop: 1, selector: '.v3-full-row.v3-full-rank-3', scenes: ['INTERIM_TOP10'], nineSlice: { tren: 8, phai: 14, duoi: 8, trai: 14 }, ghiChu: 'Hàng BXH toàn màn Top 3.' },
  { id: 'K40', nhom: 'K', lop: 1, selector: '.v3v-place-1 .v3v-nameplate', scenes: ['VICTORY'], nineSlice: { tren: 12, phai: 16, duoi: 12, trai: 16 }, ghiChu: 'Bảng tên Victory Top 1.' },
  { id: 'K41', nhom: 'K', lop: 1, selector: '.v3v-place-2 .v3v-nameplate', scenes: ['VICTORY'], nineSlice: { tren: 12, phai: 16, duoi: 12, trai: 16 }, ghiChu: 'Bảng tên Victory Top 2.' },
  { id: 'K42', nhom: 'K', lop: 1, selector: '.v3v-place-3 .v3v-nameplate', scenes: ['VICTORY'], nineSlice: { tren: 12, phai: 16, duoi: 12, trai: 16 }, ghiChu: 'Bảng tên Victory Top 3.' },
  { id: 'K43', nhom: 'K', lop: 1, selector: '.v3-queue', scenes: ['LOBBY', 'QUESTION', 'REVEAL', 'INTERIM_TOP10'], nineSlice: { tren: 8, phai: 12, duoi: 8, trai: 12 }, content: 'label', ghiChu: 'Khung nhãn hàng chờ ghế; nội dung số người được giữ nguyên.' },
  { id: 'I01', nhom: 'I', lop: 2, selector: '.v3v-place-1 .v3v-rank-crown', scenes: ['VICTORY'], nineSlice: null, content: 'icon', ghiChu: 'Vương miện vàng Top 1.' },
  { id: 'I02', nhom: 'I', lop: 2, selector: '.v3-top1-badge', scenes: ['QUESTION', 'REVEAL', 'INTERIM_TOP10', 'VICTORY'], nineSlice: null, content: 'label', ghiChu: 'Huy hiệu chuỗi Top 1.' },
  { id: 'I03', nhom: 'I', lop: 2, selector: '.v3-letter', scenes: ['QUESTION', 'REVEAL'], nineSlice: null, content: 'label', ghiChu: 'Huy hiệu chữ A/B/C/D.' },
  { id: 'I04', nhom: 'I', lop: 2, selector: '.v3-top10 li.v3-rank-1 .v3-rank', scenes: ['QUESTION', 'REVEAL'], nineSlice: null, content: 'label', ghiChu: 'Huy hiệu thứ hạng Top 1 bảng câu hỏi.' },
  { id: 'I05', nhom: 'I', lop: 2, selector: '.v3-question-top3 .v3-top3-row[data-rank="1"] .v3-top3-rank', scenes: ['REVEAL'], nineSlice: null, content: 'label', defaultEmptyReason: 'Mặc định trống — chỉ là vùng chứa; thêm ảnh sẽ hiện ở bbox.', ghiChu: 'Huy hiệu hạng 1 trong Top 3 nhanh nhất.' },
  { id: 'I06', nhom: 'I', lop: 2, selector: '.v3-connection-emblem', scenes: ['CONNECTION_LOST'], nineSlice: null, content: 'icon', ghiChu: 'Biểu tượng mất kết nối.' },
  { id: 'I07', nhom: 'I', lop: 2, selector: '.v3-intermission-emblem', scenes: ['INTERMISSION'], nineSlice: null, content: 'icon', ghiChu: 'Biểu tượng nghỉ giữa vòng.' },
  { id: 'I08', nhom: 'I', lop: 2, selector: '.v3v-laurel', scenes: ['VICTORY'], nineSlice: null, content: 'icon', ghiChu: 'Nhánh nguyệt quế Victory.' },
  { id: 'I09', nhom: 'I', lop: 2, selector: '.v3-fastest-row-badge', scenes: ['QUESTION', 'REVEAL'], nineSlice: null, content: 'icon', ghiChu: 'Huy hiệu trả lời nhanh nhất.' },
  { id: 'I10', nhom: 'I', lop: 2, selector: '.v3-seat-back', scenes: ['LOBBY', 'QUESTION', 'REVEAL', 'INTERIM_TOP10'], nineSlice: null, content: 'icon', ghiChu: 'Biểu tượng ghế khán giả trống/có chủ.' },
  { id: 'I12', nhom: 'I', lop: 2, selector: '.v3-top10 li.v3-rank-2 .v3-rank', scenes: ['QUESTION', 'REVEAL'], nineSlice: null, content: 'label', ghiChu: 'Huy hiệu thứ hạng Top 2 bảng câu hỏi.' },
  { id: 'I13', nhom: 'I', lop: 2, selector: '.v3-top10 li.v3-rank-3 .v3-rank', scenes: ['QUESTION', 'REVEAL'], nineSlice: null, content: 'label', ghiChu: 'Huy hiệu thứ hạng Top 3 bảng câu hỏi.' },
  { id: 'I14', nhom: 'I', lop: 2, selector: '.v3-top10 li.v3-rank-n .v3-rank', scenes: ['QUESTION', 'REVEAL'], nineSlice: null, content: 'label', defaultEmptyReason: 'Mặc định trống — số thứ hạng là dữ liệu động, không có ảnh riêng; thêm ảnh sẽ hiện ở bbox.', ghiChu: 'Huy hiệu thứ hạng thường bảng câu hỏi.' },
  { id: 'I15', nhom: 'I', lop: 2, selector: '.v3-question-top3 .v3-top3-row[data-rank="2"] .v3-top3-rank', scenes: ['REVEAL'], nineSlice: null, content: 'label', defaultEmptyReason: 'Mặc định trống — chỉ là vùng chứa; thêm ảnh sẽ hiện ở bbox.', ghiChu: 'Huy hiệu hạng 2 trong Top 3 nhanh nhất.' },
  { id: 'I16', nhom: 'I', lop: 2, selector: '.v3-question-top3 .v3-top3-row[data-rank="3"] .v3-top3-rank', scenes: ['REVEAL'], nineSlice: null, content: 'label', defaultEmptyReason: 'Mặc định trống — chỉ là vùng chứa; thêm ảnh sẽ hiện ở bbox.', ghiChu: 'Huy hiệu hạng 3 trong Top 3 nhanh nhất.' },
  { id: 'I17', nhom: 'I', lop: 2, selector: '.v3v-place-2 .v3v-rank-crown', scenes: ['VICTORY'], nineSlice: null, content: 'icon', ghiChu: 'Vương miện bạc Top 2.' },
  { id: 'I18', nhom: 'I', lop: 2, selector: '.v3v-place-3 .v3v-rank-crown', scenes: ['VICTORY'], nineSlice: null, content: 'icon', ghiChu: 'Vương miện đồng Top 3.' },
  { id: 'I19', nhom: 'I', lop: 2, selector: '.v3-full-rank-1 .v3-full-rank', scenes: ['INTERIM_TOP10'], nineSlice: null, content: 'label', ghiChu: 'Huy hiệu hạng 1 trong BXH toàn màn.' },
  { id: 'I20', nhom: 'I', lop: 2, selector: '.v3-full-rank-2 .v3-full-rank', scenes: ['INTERIM_TOP10'], nineSlice: null, content: 'label', ghiChu: 'Huy hiệu hạng 2 trong BXH toàn màn.' },
  { id: 'I21', nhom: 'I', lop: 2, selector: '.v3-full-rank-3 .v3-full-rank', scenes: ['INTERIM_TOP10'], nineSlice: null, content: 'label', ghiChu: 'Huy hiệu hạng 3 trong BXH toàn màn.' },
  { id: 'I22', nhom: 'I', lop: 2, selector: '.v3-full-rank-n .v3-full-rank', scenes: ['INTERIM_TOP10'], nineSlice: null, content: 'label', ghiChu: 'Huy hiệu hạng thường trong BXH toàn màn.' },
  { id: 'H01', nhom: 'H', lop: 3, selector: '.v3-storm', scenes: ['LOBBY', 'QUESTION', 'REVEAL'], nineSlice: null, defaultHidden: true, defaultEmptyReason: 'Mặc định trống — hiệu ứng giông bão ẩn trong theme mặc định; thêm ảnh sẽ hiện ở bbox.', ghiChu: 'Ẩn ở bản mặc định; thêm ảnh skin thì hiệu ứng giông bão hiện trong bbox đo từ CSS.' },
  { id: 'H02', nhom: 'H', lop: 3, selector: '.v3-bolt-l, .v3-bolt-r', scenes: ['LOBBY', 'QUESTION', 'REVEAL'], nineSlice: null, defaultHidden: true, defaultEmptyReason: 'Mặc định trống — hiệu ứng tia sét ẩn trong theme mặc định; thêm ảnh sẽ hiện ở bbox.', ghiChu: 'Ẩn ở bản mặc định; thêm ảnh skin thì tia sét hai bên hiện trong bbox đo từ CSS.' },
  { id: 'H03', nhom: 'H', lop: 3, selector: '.v3-lights', scenes: ['LOBBY', 'QUESTION', 'REVEAL'], nineSlice: null, defaultHidden: true, defaultEmptyReason: 'Mặc định trống — hiệu ứng đèn và hạt sáng ẩn trong theme mặc định; thêm ảnh sẽ hiện ở bbox.', ghiChu: 'Ẩn ở bản mặc định; thêm ảnh skin thì đèn và hạt sáng hiện trong bbox đo từ CSS.' },
  { id: 'H04', nhom: 'H', lop: 3, selector: '.overlay-fx-confetti', scenes: ['VICTORY'], nineSlice: null, ghiChu: 'Từng mảnh pháo giấy Victory.' },
  { id: 'H05', nhom: 'H', lop: 3, selector: '.overlay-fx-victory-beam', scenes: ['VICTORY'], nineSlice: null, ghiChu: 'Tia sáng quét sân khấu Victory.' },
  { id: 'H06', nhom: 'H', lop: 3, selector: '.overlay-fx-particle', scenes: ['LOBBY', 'QUESTION', 'REVEAL', 'INTERIM_TOP10'], nineSlice: null, ghiChu: 'Hạt sáng bay quanh overlay.' },
  { id: 'H07', nhom: 'H', lop: 3, selector: '.overlay-fx-bolt', scenes: ['QUESTION', 'REVEAL'], nineSlice: null, content: 'icon', ghiChu: 'Tia sét chớp theo cue câu hỏi/kết quả.' },
  { id: 'H08', nhom: 'H', lop: 3, selector: '.overlay-fx-flash', scenes: ['QUESTION', 'REVEAL', 'INTERMISSION', 'VICTORY'], nineSlice: null, ghiChu: 'Viền/ánh lóe theo cue cảnh.' },
  { id: 'H09', nhom: 'H', lop: 3, selector: '.v3v-trophy-glow', scenes: ['VICTORY'], nineSlice: null, defaultHidden: true, captureDefaultHidden: true, ghiChu: 'Ảnh skin bật quầng sáng và tia quanh cúp Victory; ảnh rỗng giữ nguyên mặc định.' },
  { id: 'H10', nhom: 'H', lop: 3, selector: '.v3v-bg-dim', scenes: ['VICTORY'], nineSlice: null, defaultHidden: true, captureDefaultHidden: true, ghiChu: 'Ảnh skin bật lớp ánh sáng phủ nền Victory; ảnh rỗng giữ nguyên mặc định.' },
  { id: 'H11', nhom: 'H', lop: 3, selector: '.v3v-floor-reflection', scenes: ['VICTORY'], nineSlice: null, defaultHidden: true, captureDefaultHidden: true, ghiChu: 'Ảnh skin bật vệt phản chiếu sàn sân khấu Victory; ảnh rỗng giữ nguyên mặc định.' },
  { id: 'H12', nhom: 'H', lop: 3, selector: '.v3v-confetti i', scenes: ['VICTORY'], nineSlice: null, ghiChu: 'Từng mảnh pháo giấy trên sân khấu Victory.' },
] as const;

export const THEME_SKIN_FILES = ['default.png', 'thuong.png', 'dung.png', 'sai.png', 'mo.png'] as const;

export function skinAssetUrl(directoryUrl: string, file = 'default.png') {
  const query = directoryUrl.indexOf('?');
  const pathname = query < 0 ? directoryUrl : directoryUrl.slice(0, query);
  const version = query < 0 ? '' : directoryUrl.slice(query);
  return `${pathname.replace(/\/+$/u, '')}/${encodeURIComponent(file)}${version}`;
}
