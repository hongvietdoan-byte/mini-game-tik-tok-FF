import React, { useCallback, useEffect, useMemo, useState } from 'react';
import type { Question, QuestionReview } from '@quiz/contracts';
import type { DashboardClient } from './api/client';
import { approvedQuestionCount, filterQuestions, questionStatusBucket, type QuestionStatusFilter } from './tiktokSessionLogic';

type QuestionReviewPageProps = {
  client: DashboardClient;
  token: string;
  questionsPerRound: number;
  onQuestionsPerRoundChange: (count: number) => void;
  onQuestionsChanged: () => void;
};

const statusLabels: Record<QuestionStatusFilter, string> = {
  ALL: 'Tất cả trạng thái',
  PENDING: 'Chờ duyệt (DEMO / PENDING)',
  APPROVED: 'Đã duyệt',
  REJECTED: 'Từ chối',
};

function difficultyLabel(difficulty: Question['difficulty']) {
  return difficulty === 'EASY' ? 'Dễ' : difficulty === 'MEDIUM' ? 'Trung bình' : 'Khó';
}

function topicLabel(topic: string) {
  return topic.replace(/[-_]/g, ' ').replace(/^./, (first) => first.toLocaleUpperCase('vi'));
}

function isPending(question: Question) {
  return questionStatusBucket(question) === 'PENDING';
}

export function QuestionReviewPage({ client, token, questionsPerRound, onQuestionsPerRoundChange, onQuestionsChanged }: QuestionReviewPageProps) {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [statusFilter, setStatusFilter] = useState<QuestionStatusFilter>('PENDING');
  const [topicFilter, setTopicFilter] = useState('');
  const [difficultyFilter, setDifficultyFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [bulkConfirmOpen, setBulkConfirmOpen] = useState(false);
  const [rejectingQuestion, setRejectingQuestion] = useState<Question | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const refresh = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      setQuestions(await client.getQuestions(token));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Không tải được danh sách câu hỏi.');
    } finally {
      setLoading(false);
    }
  }, [client, token]);

  useEffect(() => { void refresh(); }, [refresh]);

  const filteredQuestions = useMemo(() => filterQuestions(questions, {
    status: statusFilter,
    topic: topicFilter,
    difficulty: difficultyFilter,
  }), [questions, statusFilter, topicFilter, difficultyFilter]);
  const pendingFilteredQuestions = useMemo(() => filteredQuestions.filter(isPending), [filteredQuestions]);
  const approvedCount = useMemo(() => approvedQuestionCount(questions), [questions]);
  const topics = useMemo(() => [...new Set(questions.map((question) => question.subtopicId))].sort(), [questions]);

  async function review(question: Question, decision: QuestionReview['decision'], reason?: string) {
    setBusyId(question.id);
    setError('');
    setNotice('');
    try {
      await client.reviewQuestion(token, question.id, decision, reason);
      setNotice(decision === 'APPROVE' ? 'Đã duyệt câu hỏi.' : 'Đã từ chối câu hỏi.');
      if (decision === 'REJECT') {
        setRejectingQuestion(null);
        setRejectReason('');
      }
      await refresh();
      onQuestionsChanged();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Không cập nhật được trạng thái câu hỏi.');
    } finally {
      setBusyId(null);
    }
  }

  async function approveFilteredQuestions() {
    const pending = pendingFilteredQuestions;
    if (!pending.length) {
      setBulkConfirmOpen(false);
      return;
    }
    setBusyId('*');
    setError('');
    setNotice('');
    setBulkConfirmOpen(false);
    let approved = 0;
    try {
      for (const question of pending) {
        await client.reviewQuestion(token, question.id, 'APPROVE');
        approved += 1;
      }
      setNotice(`Đã duyệt ${approved} câu hỏi.`);
    } catch (cause) {
      setError(`Đã duyệt ${approved}/${pending.length} câu. ${cause instanceof Error ? cause.message : 'Có lỗi khi duyệt câu hỏi.'}`);
    } finally {
      if (approved > 0) onQuestionsChanged();
      await refresh();
      setBusyId(null);
    }
  }

  function submitRejection(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!rejectingQuestion || !rejectReason.trim()) return;
    void review(rejectingQuestion, 'REJECT', rejectReason.trim());
  }

  return <section className="question-review-page" aria-labelledby="question-review-title">
    <div className="review-heading">
      <div><span className="eyebrow">NGÂN HÀNG CÂU HỎI</span><h1 id="question-review-title">Duyệt câu hỏi</h1><p>Chỉ câu đã duyệt mới được dùng trong phiên TikTok LIVE.</p></div>
      <button className="secondary-button" type="button" onClick={() => void refresh()} disabled={loading || busyId !== null}>{loading ? 'Đang tải…' : 'Tải lại'}</button>
    </div>

    {error && <div className="alert alert-error" role="alert">{error}<button type="button" aria-label="Đóng" onClick={() => setError('')}>×</button></div>}
    {notice && <div className="alert alert-success" role="status">{notice}<button type="button" aria-label="Đóng" onClick={() => setNotice('')}>×</button></div>}

    <div className="review-summary panel">
      <div><span className="eyebrow">SẴN SÀNG CHO TIKTOK LIVE</span><strong>Đã duyệt {approvedCount} / cần {questionsPerRound} cho một vòng</strong></div>
      <label>Số câu mỗi vòng<select value={questionsPerRound} onChange={(event) => onQuestionsPerRoundChange(Number(event.target.value))}><option value={10}>10 câu</option><option value={15}>15 câu</option><option value={20}>20 câu</option></select></label>
    </div>

    <div className="review-toolbar panel">
      <label>Trạng thái<select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as QuestionStatusFilter)}>{Object.entries(statusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
      <label>Chủ đề<select value={topicFilter} onChange={(event) => setTopicFilter(event.target.value)}><option value="">Tất cả chủ đề</option>{topics.map((topic) => <option key={topic} value={topic}>{topicLabel(topic)}</option>)}</select></label>
      <label>Độ khó<select value={difficultyFilter} onChange={(event) => setDifficultyFilter(event.target.value)}><option value="">Mọi độ khó</option><option value="EASY">Dễ</option><option value="MEDIUM">Trung bình</option><option value="HARD">Khó</option></select></label>
      <span className="review-result-count">{filteredQuestions.length} câu</span>
    </div>

    <div className="review-bulk-row">
      <span>{pendingFilteredQuestions.length} câu đang chờ duyệt trong kết quả lọc</span>
      <button className="primary-button" type="button" disabled={loading || busyId !== null || pendingFilteredQuestions.length === 0} onClick={() => setBulkConfirmOpen(true)}>Duyệt tất cả câu đang lọc ({pendingFilteredQuestions.length})</button>
    </div>

    {loading ? <div className="panel empty-state">Đang tải câu hỏi…</div> : filteredQuestions.length === 0 ? <div className="panel empty-state">Không có câu hỏi phù hợp bộ lọc.</div> : <div className="question-review-list">
      {filteredQuestions.map((question) => {
        const status = questionStatusBucket(question);
        const demo = question.verificationStatus === 'DEMO' || question.tags.includes('DEMO');
        const isBusy = busyId === question.id || busyId === '*';
        return <article className="question-review-card panel" key={question.id}>
          <header className="question-card-header">
            <div><span className={`review-status-tag status-${(status ?? 'pending').toLowerCase()}`}>{status ? statusLabels[status] : 'Chưa phân loại'}</span>{demo && <span className="demo-tag">DEMO</span>}<span className="question-taxonomy">{topicLabel(question.subtopicId)} · {difficultyLabel(question.difficulty)}</span></div>
            <span className="question-version">v{question.version}</span>
          </header>
          <h2>{question.prompt}</h2>
          <ol className="review-options">{question.options.map((option, index) => {
            const correct = option.id === question.correctOptionId;
            return <li className={correct ? 'is-correct' : ''} key={option.id}><b>{String.fromCharCode(65 + index)}</b><span>{option.text}</span>{correct && <strong>Đáp án đúng</strong>}</li>;
          })}</ol>
          <div className="question-explanation"><b>Giải thích</b><p>{question.explanation || 'Chưa có giải thích.'}</p></div>
          <footer className="question-card-footer"><small>Sửa câu: sắp có</small><div>
            {status === 'PENDING' && <>
              <button className="secondary-button" type="button" disabled={isBusy || busyId !== null} onClick={() => { setRejectingQuestion(question); setRejectReason(''); }}>Từ chối</button>
              <button className="primary-button" type="button" disabled={isBusy || busyId !== null} onClick={() => void review(question, 'APPROVE')}>{busyId === question.id ? 'Đang duyệt…' : 'Duyệt'}</button>
            </>}
          </div></footer>
        </article>;
      })}
    </div>}

    {bulkConfirmOpen && <div className="modal-backdrop" role="presentation"><section className="review-modal" role="dialog" aria-modal="true" aria-labelledby="bulk-review-title">
      <span className="eyebrow">XÁC NHẬN THAO TÁC</span><h2 id="bulk-review-title">Duyệt {pendingFilteredQuestions.length} câu hỏi?</h2><p>Hệ thống sẽ duyệt {pendingFilteredQuestions.length} câu đang chờ trong kết quả lọc hiện tại. Các câu đã duyệt hoặc bị từ chối không bị thay đổi.</p>
      <div className="modal-actions"><button className="secondary-button" type="button" onClick={() => setBulkConfirmOpen(false)}>Huỷ</button><button className="primary-button" type="button" disabled={!pendingFilteredQuestions.length || busyId !== null} onClick={() => void approveFilteredQuestions()}>Xác nhận duyệt</button></div>
    </section></div>}

    {rejectingQuestion && <div className="modal-backdrop" role="presentation"><form className="review-modal" role="dialog" aria-modal="true" aria-labelledby="reject-review-title" onSubmit={submitRejection}>
      <span className="eyebrow">TỪ CHỐI CÂU HỎI</span><h2 id="reject-review-title">Nhập lý do từ chối</h2><p>{rejectingQuestion.prompt}</p>
      <label>Lý do <textarea autoFocus required maxLength={500} value={rejectReason} onChange={(event) => setRejectReason(event.target.value)} placeholder="Nêu lý do để người biên soạn xử lý" /></label>
      <div className="modal-actions"><button className="secondary-button" type="button" onClick={() => setRejectingQuestion(null)}>Huỷ</button><button className="danger-button" type="submit" disabled={!rejectReason.trim() || busyId !== null}>Từ chối câu hỏi</button></div>
    </form></div>}
  </section>;
}
