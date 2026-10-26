import { useEffect, useState, type FormEvent } from 'react';
import { useParams } from 'react-router';
import { api, errorMessage } from '../api';
import { A, Breadcrumb, EmptyState, ErrorState, ProductGrid } from '../components/common';
import { ProductDetailView, useQuickView } from '../components/ProductDetail';
import { useApp } from '../context';
import { formatDate } from '../format';
import { useAsync } from '../hooks/useAsync';
import { usePageReady } from '../hooks/usePageReady';
import { Icon } from '../icons';
import type { Product, Review, Similar } from '../types';

function ReviewForm({ productId, onSaved }: { productId: number; onSaved: () => void }) {
  const { toast } = useApp();
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const values = Object.fromEntries(new FormData(event.currentTarget)) as Record<string, string>;
    setError('');
    setBusy(true);
    try {
      await api(`/products/${productId}/reviews`, { method: 'POST', body: { rating: +values.rating, comment: values.comment } });
      toast('Cảm ơn bạn đã chia sẻ cảm nhận.');
      onSaved();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <form id="review-form" className="review-form" data-id={productId} onSubmit={submit}>
      <div className="field">
        <label htmlFor="review-rating">Đánh giá của bạn</label>
        <select id="review-rating" name="rating" defaultValue="5">
          <option value="5">★★★★★ — Rất yêu thích</option><option value="4">★★★★☆ — Hài lòng</option><option value="3">★★★☆☆ — Khá ổn</option>
          <option value="2">★★☆☆☆ — Chưa hài lòng</option><option value="1">★☆☆☆☆ — Cần cải thiện</option>
        </select>
      </div>
      <div className="field">
        <label htmlFor="review-comment">Chia sẻ cảm nhận</label>
        <textarea name="comment" id="review-comment" required minLength={3} maxLength={2000} placeholder="Phom dáng, chất liệu hay cảm giác khi mặc…" />
      </div>
      <button className="button outline small" type="submit" disabled={busy}>Gửi đánh giá <Icon name="arrow" /></button>
      <div className="form-error">{error}</div>
    </form>
  );
}

export default function Detail() {
  const { id } = useParams();
  const productId = Number(id);
  const { user } = useApp();
  const openQuick = useQuickView();
  const { data, error, reload } = useAsync(async () => {
    const [p, similar, reviews] = await Promise.all([
      api<Product>(`/products/${productId}`), api<Similar>(`/recommendations/similar/${productId}`), api<Review[]>(`/products/${productId}/reviews`),
    ]);
    return { p, similar, reviews };
  }, [productId]);
  usePageReady(!!data, '/san-pham/' + id);
  // Only a loaded product page gets the room reserved for the mobile buy bar.
  useEffect(() => {
    if (!data) return;
    document.body.classList.add('detail-route');
    return () => document.body.classList.remove('detail-route');
  }, [!!data]); // eslint-disable-line react-hooks/exhaustive-deps

  if (error) return <ErrorState error={error} />;
  if (!data) return null;
  const { p, similar, reviews } = data;

  return (
    <section className="container page-space">
      <Breadcrumb label={p.name} previous />
      <ProductDetailView key={p.id} p={p} />
      <div className="review-section">
        <h2>Những cảm nhận chân thành</h2>
        {reviews.length ? reviews.map((r, i) => (
          <div key={i} className="review-item" data-simulated={!!r.simulated}>
            {r.simulated && <span className="demo-review-tag">Đánh giá mẫu · Mô phỏng</span>}
            <b>{r.name}</b> <span className="review-stars">{'★'.repeat(r.rating)}{'☆'.repeat(5 - r.rating)}</span>
            <p>{r.comment}</p><time>{formatDate(r.created_at)}</time>
          </div>
        )) : <p className="form-hint">Chưa có đánh giá. Hãy là người đầu tiên kể câu chuyện của bạn với thiết kế này.</p>}
        {user ? <ReviewForm productId={productId} onSaved={reload} /> : <A href="/tai-khoan" className="underlined" style={{ marginTop: 16 }}>Đăng nhập để chia sẻ cảm nhận →</A>}
      </div>
      <div className="section" style={{ paddingBottom: 0 }}>
        <div className="section-heading"><div><span className="small-label">CÙNG MỘT CẢM HỨNG</span><h2>Có thể bạn <em>cũng yêu.</em></h2><p>{similar.message}</p></div></div>
        {similar.items.length ? <ProductGrid items={similar.items} onQuick={openQuick} /> : <EmptyState title="Một thiết kế thật riêng" description="Những lựa chọn cùng phong cách sẽ sớm xuất hiện." />}
      </div>
    </section>
  );
}
