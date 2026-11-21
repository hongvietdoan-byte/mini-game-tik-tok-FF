import { useCallback, useEffect, useState } from 'react';
import type { AdminRoundWinner, DashboardClient } from './api/client';

function profileUrl(winner: AdminRoundWinner) {
  if (winner.source !== 'TIKTOK') return null;
  if (winner.uniqueId?.trim()) return `https://www.tiktok.com/@${encodeURIComponent(winner.uniqueId.trim().replace(/^@+/u, ''))}`;
  return `https://www.tiktok.com/share/user/${encodeURIComponent(winner.sourceUserId)}`;
}

function endTime(value: number | null) {
  return value === null ? 'Đang diễn ra' : new Date(value).toLocaleString('vi-VN');
}

export function WinnersPage({ client, token }: { client: DashboardClient; token: string }) {
  const [winners, setWinners] = useState<AdminRoundWinner[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const refresh = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      setWinners((await client.getRoundWinners(token)).winners);
    } catch (cause) {
      setWinners([]);
      setError(cause instanceof Error ? cause.message : 'Không tải được bảng người thắng.');
    } finally {
      setLoading(false);
    }
  }, [client, token]);

  useEffect(() => { void refresh(); }, [refresh]);

  return <section className="page-content winners-page" data-testid="winners-page">
    <div className="page-heading">
      <div><span className="eyebrow">LỊCH SỬ PHIÊN</span><h2>Người thắng</h2><p>Top 3 của từng vòng trong phiên hiện tại và các phiên trước.</p></div>
      <div className="page-actions"><button className="secondary-button" type="button" onClick={() => void refresh()} disabled={loading}>Tải lại</button></div>
    </div>
    {error && <div className="alert alert-error" role="alert">{error}</div>}
    {loading ? <p className="checks-placeholder" role="status">Đang tải kết quả…</p> : winners.length === 0
      ? <p className="empty-state">Chưa có vòng nào có người thắng.</p>
      : <div className="winners-table-wrap"><table className="winners-table">
        <thead><tr>
          <th scope="col">Phiên / vòng</th><th scope="col">Giờ kết thúc</th><th scope="col">Hạng</th>
          <th scope="col">Tên hiển thị</th><th scope="col">@ tài khoản</th><th scope="col">Mã TikTok</th>
          <th scope="col">Điểm</th><th scope="col">Câu đúng</th><th scope="col">Hồ sơ</th>
        </tr></thead>
        <tbody>{winners.map((winner) => {
          const url = profileUrl(winner);
          return <tr data-testid="winner-row" key={`${winner.sessionId}:${winner.roundId}:${winner.rank}`}>
            <td><b>{winner.sessionName}</b><small>Vòng {winner.roundNumber}</small></td>
            <td>{endTime(winner.endedAtMs)}</td>
            <td><strong>{winner.rank}</strong></td>
            <td>{winner.displayName}</td>
            <td>{winner.uniqueId ? `@${winner.uniqueId.replace(/^@+/u, '')}` : '—'}</td>
            <td>{winner.sourceUserId}</td>
            <td>{winner.score.toLocaleString('vi-VN')}</td>
            <td>{winner.correctCount}</td>
            <td>{url ? <a href={url} target="_blank" rel="noreferrer">Mở TikTok ↗</a> : '—'}</td>
          </tr>;
        })}</tbody>
      </table></div>}
  </section>;
}
