import type { AdminSnapshot, SpamWarningReason } from '@quiz/contracts';

type SpamWarning = NonNullable<AdminSnapshot['spamWarnings']>[number];

const reasonLabels: Record<SpamWarningReason, string> = {
  DUPLICATE_ANSWER: 'Trả lời lặp',
  NOT_ACCEPTING: 'Gửi khi chưa mở',
  EARLY: 'Gửi quá sớm',
  LATE: 'Gửi sau khi hết giờ',
};

export function spamWarningReasonLabel(reason: SpamWarningReason) {
  return reasonLabels[reason];
}

export function formatSpamWarningTime(timestampMs: number) {
  return new Date(timestampMs).toLocaleTimeString('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  });
}

export function SpamWarningsPanel({ warnings }: { warnings: AdminSnapshot['spamWarnings'] }) {
  const items = warnings ?? [];
  return <section className="panel spam-warnings-panel" data-testid="spam-warnings" aria-labelledby="spam-warnings-title">
    <div className="panel-title">
      <div><span className="eyebrow">THEO DÕI BÌNH LUẬN</span><h2 id="spam-warnings-title">Cảnh báo spam</h2></div>
      {items.length > 0 && <span className="spam-warning-badge" aria-label={`${items.length} người có cảnh báo`}>{items.length}</span>}
    </div>
    {items.length === 0
      ? <p className="spam-warnings-empty">Chưa có ai spam</p>
      : <ul className="spam-warnings-list">{items.map((item) => <li className="spam-warning-row" key={item.playerId}>
        <div className="spam-warning-person"><strong>{item.safeDisplayName}</strong><span>{item.count} lần</span></div>
        <div className="spam-warning-details"><span>{spamWarningReasonLabel(item.primaryReason)}</span><time dateTime={new Date(item.lastAtMs).toISOString()}>{formatSpamWarningTime(item.lastAtMs)}</time></div>
      </li>)}</ul>}
  </section>;
}
