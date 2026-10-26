import { useEffect, useState, type FormEvent, type ReactNode } from 'react';
import { useParams } from 'react-router';
import { api, errorMessage } from '../../api';
import { EmptyState, ErrorState } from '../../components/common';
import { useApp } from '../../context';
import { colorHex, formatDate, GENDERS, money, orderCode, STYLES } from '../../format';
import { useAsync } from '../../hooks/useAsync';
import { usePageReady } from '../../hooks/usePageReady';
import { Icon } from '../../icons';
import type { AdminEvent, AdminUser, AIStatus, DatasetInfo, Dashboard, EvalRun, ModelRun, Named, Order, Product } from '../../types';
import { AuthPanel } from '../Auth';
import { AdminHead, AdminShell, BarChart, eventLabels, methodLabels, ProductCell, RunList, Table } from './adminUi';

/** Loads a section's data and applies the shared page polish once it has arrived. */
function useSection<T>(section: string, loader: () => Promise<T>) {
  const result = useAsync(loader, [section]);
  usePageReady(!!result.data, '/quan-tri/' + section);
  return result;
}

/** Polls the AI task list every 2.5 s until nothing is running, then reports and refreshes the section. */
function useRunPolling(onSettled: () => void) {
  const { toast } = useApp();
  const [active, setActive] = useState(false);
  const [tick, setTick] = useState(0);
  const [runs, setRuns] = useState<ModelRun[] | null>(null);
  useEffect(() => {
    if (!active) return;
    const timer = setTimeout(async () => {
      try {
        const data = await api<AIStatus>('/admin/ai/status');
        setRuns(data.runs);
        if (data.runs.some(r => r.status === 'running')) { setTick(t => t + 1); return; }
        setActive(false);
        const failed = data.runs[0]?.status === 'failed';
        toast(failed ? 'Tác vụ AI có lỗi. Xem nhật ký để biết chi tiết.' : 'Đã hoàn tất tác vụ AI.', failed);
        onSettled();
      } catch (err) {
        toast(errorMessage(err), true);
        setActive(false);
      }
    }, 2500);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, tick]);
  return { runs, start: () => { setActive(true); setTick(t => t + 1); } };
}

function Dashboard() {
  const { data: d, error } = useSection('', () => api<Dashboard>('/admin/dashboard'));
  if (error) return <ErrorState error={error} />;
  if (!d) return null;
  return (
    <>
      <AdminHead title="Một ngày mới tại VELASTYLE." description="Tổng quan cửa hàng, tương tác và hệ gợi ý." />
      <div className="admin-note">Dữ liệu thử nghiệm: {d.simulated_interactions} tương tác được mô phỏng. Đơn hàng và doanh thu là mô phỏng.</div>
      <div className="admin-metrics">
        {([['SẢN PHẨM', d.products, 'Thiết kế đang hoạt động'], ['NGƯỜI DÙNG', d.users, 'Gồm tài khoản mô phỏng'], ['ĐƠN HÀNG', d.orders, 'Đơn được lưu trong SQLite'], ['DOANH THU', money(d.revenue), 'Giá trị đơn hàng mô phỏng']] as [string, ReactNode, string][]).map(([label, value, hint]) => (
          <article className="metric-card" key={label}><span className="small-label">{label}</span><strong>{value}</strong><p>{hint}</p></article>
        ))}
      </div>
      <div className="admin-panels">
        <article className="admin-panel">
          <h2>Tương tác với sản phẩm</h2>
          <BarChart items={d.events.map(e => ({ label: eventLabels[e.name] || e.name, value: e.count }))} precision={0} />
          <p style={{ marginTop: 20 }}>Tổng {d.interactions} tương tác được ghi nhận.</p>
        </article>
        <article className="admin-panel">
          <h2>Doanh thu theo ngày</h2>
          {d.revenue_chart.length ? <BarChart items={d.revenue_chart.map(r => ({ label: r.date, value: r.total }))} precision={0} /> : <p>Chưa có đơn hàng. Biểu đồ sẽ xuất hiện sau khi đơn đầu tiên được tạo.</p>}
        </article>
      </div>
      <div className="admin-panel"><h2>Những thiết kế được quan tâm</h2>
        <Table headers={['Thiết kế', 'Điểm tương tác', 'Giá']} rows={d.popular.map(p => [<ProductCell thumbnail={p.thumbnail} name={p.name} />, p.interactions_score, money(p.price)])} />
      </div>
      <div className="admin-panel"><h2>Nhật ký mô hình gần nhất</h2><RunList runs={d.runs} /></div>
    </>
  );
}

function ProductForm({ product, onSaved }: { product: (Product & { clip_text?: string }) | null; onSaved: () => void }) {
  const { categories, brands, closeModal, toast } = useApp();
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const p = product;

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const values = Object.fromEntries(new FormData(event.currentTarget)) as Record<string, any>;
    setError('');
    setBusy(true);
    try {
      let thumbnail = values.thumbnail as string;
      const photo = values.photo as File | undefined;
      if (photo && photo.size) {
        const body = new FormData();
        body.append('file', photo);
        thumbnail = (await api<{ path: string }>('/admin/uploads', { method: 'POST', body })).path;
      }
      const payload: Record<string, unknown> = { ...values, thumbnail, price: +values.price, original_price: values.original_price ? +values.original_price : null, category_id: +values.category_id, brand_id: +values.brand_id, stock: +values.stock, sizes: String(values.sizes).split(',').map(s => s.trim()).filter(Boolean) };
      delete payload.photo;
      await api('/admin/products' + (p ? '/' + p.id : ''), { method: p ? 'PUT' : 'POST', body: payload });
      closeModal();
      toast('Đã lưu thiết kế vào bộ sưu tập.');
      onSaved();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <h2>{p ? 'Chỉnh sửa thiết kế' : 'Thêm thiết kế mới'}</h2>
      <form id="admin-product-form" data-id={p?.id || ''} onSubmit={submit}>
        <div className="field"><label htmlFor="product-name">Tên thiết kế</label><input id="product-name" name="name" defaultValue={p?.name ?? ''} required minLength={3} maxLength={150} /></div>
        <div className="field-row">
          <div className="field"><label htmlFor="product-price">Giá bán (đ)</label><input id="product-price" type="number" name="price" defaultValue={p?.price ?? 890000} required min={1} max={100000000} /></div>
          <div className="field"><label htmlFor="product-original-price">Giá gốc (nếu có)</label><input id="product-original-price" type="number" name="original_price" defaultValue={p?.original_price ?? ''} min={1} /></div>
        </div>
        <div className="field-row">
          <div className="field"><label htmlFor="product-category">Danh mục</label><select id="product-category" name="category_id" defaultValue={p?.category_id}>{categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
          <div className="field"><label htmlFor="product-brand">Thương hiệu</label><select id="product-brand" name="brand_id" defaultValue={p?.brand_id}>{brands.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}</select></div>
        </div>
        <div className="field-row">
          <div className="field"><label htmlFor="product-gender">Dành cho</label><select id="product-gender" name="gender" defaultValue={p?.gender}>{GENDERS.map(v => <option key={v}>{v}</option>)}</select></div>
          <div className="field"><label htmlFor="product-color">Màu sắc</label><select id="product-color" name="color" defaultValue={p?.color}>{Object.keys(colorHex).map(v => <option key={v}>{v}</option>)}</select></div>
        </div>
        <div className="field-row">
          <div className="field"><label htmlFor="product-material">Chất liệu</label><input id="product-material" name="material" defaultValue={p?.material ?? 'Cotton'} required /></div>
          <div className="field"><label htmlFor="product-style">Phong cách</label><select id="product-style" name="style" defaultValue={p?.style}>{STYLES.map(v => <option key={v}>{v}</option>)}</select></div>
        </div>
        <div className="field"><label htmlFor="product-description">Mô tả tiếng Việt</label><textarea id="product-description" name="description" defaultValue={p?.description ?? ''} required minLength={10} maxLength={5000} /></div>
        <div className="field"><label htmlFor="product-clip-text">Mô tả tiếng Anh cho CLIP (khuyến nghị)</label><input id="product-clip-text" name="clip_text" defaultValue={p?.clip_text ?? ''} maxLength={1000} placeholder="A woman wearing a beige linen midi dress" /></div>
        <div className="field">
          <label htmlFor="product-photo-upload">Ảnh thiết kế thật</label>
          <input id="product-photo-upload" name="photo" type="file" accept="image/jpeg,image/png,image/webp" required={!p} />
          <input type="hidden" name="thumbnail" defaultValue={p?.thumbnail ?? ''} />
          {p && <img src={p.thumbnail} alt="Ảnh hiện tại" style={{ width: 70, height: 90, marginTop: 8 }} />}
          <p className="form-hint">Tối đa 5 MB. JPG, PNG hoặc WebP.</p>
        </div>
        <div className="field-row">
          <div className="field"><label htmlFor="product-sizes">Kích thước (ngăn bởi dấu phẩy)</label><input id="product-sizes" name="sizes" defaultValue={p?.variants.map(v => v.size).join(', ') || 'S, M, L, XL'} required /></div>
          <div className="field"><label htmlFor="product-stock">Tồn kho mỗi kích thước</label><input type="number" id="product-stock" name="stock" min={0} max={10000} defaultValue={p?.variants[0]?.stock ?? 20} required /></div>
        </div>
        <div className="form-error">{error}</div>
        <button type="submit" className="button primary wide" disabled={busy}>Lưu thiết kế <Icon name="check" /></button>
      </form>
    </>
  );
}

function ProductsSection() {
  const { showModal, closeModal, toast } = useApp();
  const { data: products, error, reload } = useSection('san-pham', () => api<(Product & { clip_text?: string })[]>('/admin/products'));
  if (error) return <ErrorState error={error} />;
  if (!products) return null;
  const edit = (p: (typeof products)[number] | null) => showModal(<ProductForm product={p} onSaved={reload} />, true);
  const archive = (id: number) => showModal(
    <>
      <h2>Ngừng bán thiết kế này?</h2>
      <p style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 25 }}>Thiết kế sẽ được lưu trữ để giữ nguyên lịch sử đơn hàng.</p>
      <button className="button primary" data-confirm-archive={id} onClick={async () => {
        try { await api('/admin/products/' + id, { method: 'DELETE' }); closeModal(); toast('Đã ngừng bán thiết kế.'); reload(); } catch (err) { toast(errorMessage(err), true); }
      }}>Xác nhận ngừng bán</button>
    </>, true);
  return (
    <>
      <AdminHead title="Quản lý thiết kế" description={`${products.length} sản phẩm trong bộ sưu tập.`} action={<button className="button primary small" data-action="admin-add-product" onClick={() => edit(null)}><Icon name="plus" /> Thêm thiết kế</button>} />
      <Table headers={['Thiết kế', 'Danh mục', 'Giá bán', 'Tồn kho', 'Thao tác']} rows={products.map(p => [
        <ProductCell thumbnail={p.thumbnail} name={p.name} />, p.category, money(p.price), p.stock,
        <><button className="table-action" data-edit-product={p.id} onClick={() => edit(p)}>Chỉnh sửa</button><button className="table-action danger" data-archive-product={p.id} onClick={() => archive(p.id)}>Ngừng bán</button></>,
      ])} />
    </>
  );
}

function TaxonomyForm({ kind, item, onSaved }: { kind: string; item: Named | null; onSaved: () => void }) {
  const { closeModal, refreshTaxonomy, toast } = useApp();
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const values = Object.fromEntries(new FormData(event.currentTarget));
    setError('');
    setBusy(true);
    try {
      await api('/admin/taxonomy/' + kind + (item ? '/' + item.id : ''), { method: item ? 'PUT' : 'POST', body: values });
      closeModal();
      await refreshTaxonomy();
      toast('Đã lưu thay đổi.');
      onSaved();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <h2>{item ? 'Chỉnh sửa' : 'Thêm'} {kind === 'categories' ? 'danh mục' : 'thương hiệu'}</h2>
      <form id="taxonomy-form" data-kind={kind} data-id={item?.id || ''} onSubmit={submit}>
        <div className="field"><label htmlFor="taxonomy-name">Tên</label><input id="taxonomy-name" name="name" required minLength={2} maxLength={100} defaultValue={item?.name || ''} /></div>
        <div className="field"><label htmlFor="taxonomy-description">Mô tả</label><textarea id="taxonomy-description" name="description" maxLength={1000} defaultValue={item?.description || ''} /></div>
        <div className="form-error">{error}</div>
        <button type="submit" className="button primary wide" disabled={busy}>Lưu thay đổi <Icon name="check" /></button>
      </form>
    </>
  );
}

function TaxonomySection({ section }: { section: 'danh-muc' | 'thuong-hieu' }) {
  const { showModal, closeModal, refreshTaxonomy, toast } = useApp();
  const kind = section === 'danh-muc' ? 'categories' : 'brands';
  const { data: items, error, reload } = useSection(section, () => api<Named[]>('/' + kind));
  if (error) return <ErrorState error={error} />;
  if (!items) return null;
  const form = (item: Named | null) => showModal(<TaxonomyForm kind={kind} item={item} onSaved={reload} />, true);
  const remove = (id: number) => showModal(
    <>
      <h2>Xóa mục này?</h2>
      <p className="form-hint" style={{ marginBottom: 25 }}>Chỉ có thể xóa mục chưa được sản phẩm sử dụng.</p>
      <button className="button primary" data-confirm-taxonomy={id} data-kind={kind} onClick={async () => {
        try { await api(`/admin/taxonomy/${kind}/${id}`, { method: 'DELETE' }); closeModal(); await refreshTaxonomy(); toast('Đã xóa.'); reload(); } catch (err) { toast(errorMessage(err), true); }
      }}>Xác nhận xóa</button>
    </>, true);
  return (
    <>
      <AdminHead title={section === 'danh-muc' ? 'Danh mục sản phẩm' : 'Những thương hiệu'} description={`${items.length} ${section === 'danh-muc' ? 'danh mục' : 'thương hiệu'} đang được quản lý.`}
        action={<button className="button primary small" data-add-taxonomy={kind} onClick={() => form(null)}><Icon name="plus" /> Thêm mới</button>} />
      <Table headers={['ID', 'Tên', 'Mô tả', 'Thao tác']} rows={items.map(t => [
        t.id, t.name, t.description,
        <><button className="table-action" data-edit-taxonomy={t.id} data-kind={kind} onClick={() => form(t)}>Sửa</button><button className="table-action danger" data-delete-taxonomy={t.id} data-kind={kind} onClick={() => remove(t.id)}>Xóa</button></>,
      ])} />
    </>
  );
}

function UsersSection() {
  const { data: users, error } = useSection('nguoi-dung', () => api<AdminUser[]>('/admin/users'));
  if (error) return <ErrorState error={error} />;
  if (!users) return null;
  return (
    <>
      <AdminHead title="Những người đồng hành" description={`${users.length} tài khoản trong hệ thống.`} />
      <Table headers={['Họ tên', 'Email', 'Vai trò', 'Dữ liệu', 'Ngày tham gia']} rows={users.map(u => [
        u.name, u.email, u.role === 'admin' ? 'Quản trị' : 'Khách hàng', u.simulated ? <span className="status-pill">Mô phỏng</span> : 'Đăng ký thật', formatDate(u.created_at),
      ])} />
    </>
  );
}

function OrdersSection() {
  const { showModal, toast } = useApp();
  const { data: orders, error, reload } = useSection('don-hang', () => api<Order[]>('/admin/orders'));
  if (error) return <ErrorState error={error} />;
  if (!orders) return null;
  const detail = (o: Order) => showModal(
    <>
      <h2>Đơn hàng #{o.id}</h2>
      <p>{o.full_name} · {o.phone}</p>
      <p style={{ fontSize: 11, color: 'var(--muted)', margin: '8px 0 20px' }}>{o.address}</p>
      {o.items.map((i, index) => <div className="order-line" key={index}><img src={i.thumbnail} alt="" /><div>{i.name}<br /><span>{i.size} · {i.quantity} × {money(i.unit_price)}</span></div></div>)}
      <p className="order-card-total">Tổng cộng: {money(o.total)}</p>
    </>, true);
  return (
    <>
      <AdminHead title="Những lựa chọn đã được gửi gắm" description="Quản lý và cập nhật trạng thái đơn hàng mô phỏng." />
      <Table headers={['Mã đơn', 'Người nhận', 'Tổng tiền', 'Ngày tạo', 'Trạng thái', 'Chi tiết']} rows={orders.map(o => [
        '#' + orderCode(o.id), o.full_name, money(o.total), formatDate(o.created_at),
        <select data-order-status={o.id} aria-label={`Trạng thái đơn ${o.id}`} defaultValue={o.status} onChange={async event => {
          try { await api('/admin/orders/' + o.id, { method: 'PATCH', body: { status: event.target.value } }); toast('Đã cập nhật trạng thái đơn hàng.'); } catch (err) { toast(errorMessage(err), true); reload(); }
        }}>{['Đã xác nhận', 'Đang giao', 'Đã giao', 'Đã hủy'].map(s => <option key={s}>{s}</option>)}</select>,
        <button className="table-action" data-order-detail={o.id} onClick={() => detail(o)}>Xem đơn</button>,
      ])} />
    </>
  );
}

function InteractionsSection() {
  const { data: events, error } = useSection('tuong-tac', () => api<AdminEvent[]>('/admin/interactions'));
  if (error) return <ErrorState error={error} />;
  if (!events) return null;
  return (
    <>
      <AdminHead title="Từng tương tác, một tín hiệu" description="100 tương tác gần nhất. Hành vi mua và thêm giỏ chỉ được ghi từ luồng thật." />
      <Table headers={['Người dùng', 'Thiết kế', 'Hành vi', 'Trọng số', 'Nguồn', 'Ngày']} rows={events.map(e => [e.user, e.product, eventLabels[e.type], e.weight, e.simulated ? 'Mô phỏng' : 'Ứng dụng', formatDate(e.created_at)])} />
    </>
  );
}

function AiSection({ section }: { section: 'ai' | 'cai-dat' }) {
  const { toast } = useApp();
  const { data: a, error, reload } = useSection(section, () => api<AIStatus>('/admin/ai/status'));
  const polling = useRunPolling(reload);
  const [alpha, setAlpha] = useState<number | null>(null);
  const [formError, setFormError] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  useEffect(() => { if (a) { setAlpha(a.alpha); if (a.runs.some(r => r.status === 'running')) polling.start(); } }, [a]); // eslint-disable-line react-hooks/exhaustive-deps
  if (error) return <ErrorState error={error} />;
  if (!a || alpha === null) return null;
  const runs = polling.runs ?? a.runs;

  async function startTask(kind: string) {
    setBusy(kind);
    try {
      await api(`/admin/ai/${kind}?k=10`, { method: 'POST' });
      toast('Đã bắt đầu tác vụ. Bạn có thể tiếp tục dùng website.');
      polling.start();
      reload();
    } catch (err) {
      toast(errorMessage(err), true);
    } finally {
      setBusy(null);
    }
  }
  async function saveAlpha(event: FormEvent) {
    event.preventDefault();
    setFormError('');
    try { await api('/admin/ai/settings', { method: 'PUT', body: { alpha } }); toast('Đã lưu trọng số kết hợp.'); } catch (err) { setFormError(errorMessage(err)); }
  }

  return (
    <>
      <AdminHead title={section === 'ai' ? 'Một hệ gợi ý, nhiều góc nhìn.' : 'Cấu hình trải nghiệm'} description="Quản lý CLIP, lọc cộng tác và trọng số kết hợp." />
      <div className="admin-ai-grid">
        <article className="admin-panel">
          <h2>Đặc trưng hình ảnh & văn bản</h2>
          <div className="ai-status-line"><span>Mô hình</span><b>{a.model}</b></div>
          <div className="ai-status-line"><span>Thiết bị</span><b>{a.device.toUpperCase()}</b></div>
          <div className="ai-status-line"><span>Embedding hợp lệ</span><b>{a.embeddings} / {a.products}</b></div>
          <div className="ai-status-line"><span>Trạng thái</span><span className="status-pill">{a.ready ? 'Đã có đặc trưng CLIP' : 'Chờ tạo đặc trưng'}</span></div>
          <p>Ảnh 60% + văn bản 40%, chuẩn hóa L2. Chỉ cập nhật khi nội dung hoặc mô hình thay đổi. Lần chạy đầu cần tải mô hình từ Hugging Face.</p>
          <div className="ai-task-buttons"><button className="button primary small" data-ai-task="generate-embeddings" disabled={busy === 'generate-embeddings'} onClick={() => void startTask('generate-embeddings')}><Icon name="sparkles" /> Tạo / cập nhật CLIP</button></div>
        </article>
        <article className="admin-panel">
          <h2>Lọc cộng tác & kết hợp</h2>
          <p>Item-based CF từ ma trận thưa user–item và cosine similarity. Trọng số: xem 1, yêu thích 3, giỏ hàng 4, mua 5. Trọng số CF giảm khi lịch sử còn ít.</p>
          <form id="ai-settings-form" onSubmit={saveAlpha}>
            <label className="form-hint" htmlFor="alpha">Trọng số α cho Collaborative Filtering</label>
            <div className="range-field"><input type="range" id="alpha" name="alpha" min={0} max={1} step={0.05} value={alpha} onChange={event => setAlpha(+event.target.value)} /><output id="alpha-value">{alpha.toFixed(2)}</output></div>
            <p className="form-hint">Hybrid = α × CF + (1 − α) × CLIP</p>
            <div className="ai-task-buttons">
              <button type="submit" className="button outline small">Lưu trọng số <Icon name="check" /></button>
              <button type="button" className="button primary small" data-ai-task="rebuild-cf" disabled={busy === 'rebuild-cf'} onClick={() => void startTask('rebuild-cf')}>Xây dựng lại CF <Icon name="return" /></button>
            </div>
            <div className="form-error">{formError}</div>
          </form>
        </article>
      </div>
      <article className="admin-panel"><h2>Nhật ký thực thi</h2><div id="ai-runs"><RunList runs={runs} /></div></article>
    </>
  );
}

function EvaluationSection() {
  const { toast } = useApp();
  const { data: evaluations, error, reload } = useSection('danh-gia', () => api<EvalRun[]>('/admin/evaluations'));
  const polling = useRunPolling(reload);
  const [k, setK] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const last = evaluations?.[0];
  useEffect(() => { if (evaluations) setK(last?.result.results[0]?.k || 10); }, [evaluations]); // eslint-disable-line react-hooks/exhaustive-deps
  if (error) return <ErrorState error={error} />;
  if (!evaluations || k === null) return null;

  async function run() {
    setBusy(true);
    try {
      await api(`/admin/ai/evaluate?k=${k}`, { method: 'POST' });
      toast('Đã bắt đầu tác vụ. Bạn có thể tiếp tục dùng website.');
      polling.start();
    } catch (err) {
      toast(errorMessage(err), true);
    } finally {
      setBusy(false);
    }
  }
  const r = last?.result;
  const metricKeys = ['precision_at_k', 'recall_at_k', 'ndcg_at_k', 'hit_rate_at_k', 'coverage'] as const;
  return (
    <>
      <AdminHead title="Hiểu điều gì thực sự phù hợp." description="So sánh bốn mô hình bằng chỉ số tính từ kết quả xếp hạng thực tế."
        action={<div style={{ display: 'flex', gap: 9 }}>
          <select id="evaluation-k" aria-label="Chọn K" style={{ background: 'transparent', border: '1px solid var(--line)', padding: 7 }} value={k} onChange={event => setK(+event.target.value)}>{[5, 10, 20].map(v => <option key={v} value={v}>K = {v}</option>)}</select>
          <button className="button primary small" data-ai-task="evaluate" disabled={busy} onClick={() => void run()}><Icon name="chart" /> Chạy đánh giá</button>
        </div>} />
      {!last || !r ? (
        <EmptyState title="Chưa có kết quả đánh giá" description="Tạo đầy đủ embedding CLIP rồi chạy đánh giá. Hệ thống không hiển thị chỉ số khi chưa có dữ liệu hợp lệ." button="" icon="chart" />
      ) : (
        <>
          <div className="admin-note">{r.simulated ? 'Kết quả trên tương tác MÔ PHỎNG, không phải thực nghiệm khách hàng thật. ' : ''}{r.users} người dùng · {r.train_interactions} tương tác train · α = {r.alpha} · {formatDate(last.created_at)}</div>
          <div className="evaluation-chart-grid">
            {([['precision_at_k', 'Precision@K'], ['recall_at_k', 'Recall@K'], ['ndcg_at_k', 'NDCG@K'], ['inference_time_ms', 'Thời gian suy luận (ms)']] as const).map(([key, label]) => (
              <article className="admin-panel" key={key}><h2>{label}</h2>
                <BarChart items={r.results.map(v => ({ label: methodLabels[v.model_name] || v.model_name, value: v[key] }))} percent={key !== 'inference_time_ms'} precision={key === 'inference_time_ms' ? 3 : 1} />
              </article>
            ))}
          </div>
          <Table headers={['Phương pháp', 'K', 'Precision', 'Recall', 'NDCG', 'Hit Rate', 'Coverage', 'Thời gian']} rows={r.results.map(v => [
            methodLabels[v.model_name] || v.model_name, v.k, ...metricKeys.map(key => (v[key] * 100).toFixed(2) + '%'), v.inference_time_ms.toFixed(3) + ' ms',
          ])} />
          <article className="admin-panel" style={{ marginTop: 25 }}>
            <h2>Quy trình thực nghiệm</h2>
            <p>{r.protocol}</p>
            <p style={{ marginTop: 12 }}>{r.latency_scope}</p>
            <p style={{ marginTop: 12 }}>Precision chia cho K cố định; mỗi người có 1 sản phẩm test nên Recall và Hit Rate bằng nhau. K lớn so với catalog nhỏ có thể làm Recall cao; cần mở rộng dataset thật trước khi rút ra kết luận.</p>
          </article>
        </>
      )}
    </>
  );
}

function DatasetSection() {
  const { data: d, error } = useSection('dataset', () => api<DatasetInfo>('/admin/dataset'));
  if (error) return <ErrorState error={error} />;
  if (!d) return null;
  return (
    <>
      <AdminHead title="Dữ liệu tốt, gợi ý có ý nghĩa." description="Nguồn dữ liệu, trạng thái ảnh và nhập catalog." />
      <div className="admin-metrics">
        {([['SẢN PHẨM', d.products], ['ẢNH HỢP LỆ', d.valid_images], ['TÀI KHOẢN MÔ PHỎNG', d.simulated_users], ['TƯƠNG TÁC MÔ PHỎNG', d.simulated_interactions]] as [string, number][]).map(([label, value]) => (
          <article className="metric-card" key={label}><span className="small-label">{label}</span><strong>{value}</strong></article>
        ))}
      </div>
      <article className="admin-panel">
        <h2>Nguồn dữ liệu</h2>
        <p>{d.source}</p>
        <p style={{ marginTop: 13 }}>Catalog hiện có {d.products} thiết kế có ảnh riêng, {d.simulated_users} tài khoản và {d.simulated_interactions} tương tác mô phỏng. Ảnh và metadata nguồn được lưu trong manifest; giá, thông tin mua hàng và lịch sử seed là minh họa.</p>
      </article>
      <article className="admin-panel">
        <h2>Nhập dữ liệu CSV trên máy</h2>
        <p>Chạy lệnh trong thư mục dự án. Ảnh phải nằm trong static/images hoặc static/uploads và có đường dẫn /static/... hợp lệ. Bản ghi trùng tên được bỏ qua; lỗi được báo theo dòng.</p>
        <div className="dataset-columns">python scripts/import_dataset.py data/raw/products.csv</div>
        <p style={{ marginTop: 17 }}>Các cột hỗ trợ</p>
        <div className="dataset-columns">{d.csv_columns.join(', ')}</div>
      </article>
    </>
  );
}

function Missing() {
  usePageReady(true, '/quan-tri/?');
  return <AdminHead title="Không tìm thấy trang quản trị" description="Chọn một mục trong thanh điều hướng." />;
}

function Section({ section }: { section: string }) {
  switch (section) {
    case '': return <Dashboard />;
    case 'san-pham': return <ProductsSection />;
    case 'danh-muc': case 'thuong-hieu': return <TaxonomySection section={section} />;
    case 'nguoi-dung': return <UsersSection />;
    case 'don-hang': return <OrdersSection />;
    case 'tuong-tac': return <InteractionsSection />;
    case 'ai': case 'cai-dat': return <AiSection section={section} />;
    case 'danh-gia': return <EvaluationSection />;
    case 'dataset': return <DatasetSection />;
    default: return <Missing />;
  }
}

export default function AdminPage() {
  const { user } = useApp();
  const { section = '' } = useParams();
  if (!user) return <AuthPanel />;
  if (user.role !== 'admin') {
    return <section className="container page-space"><EmptyState title="Góc này dành cho quản trị viên" description="Bạn vẫn có cả một thế giới cảm hứng để khám phá." button="Về cửa hàng" href="/" icon="shield" /></section>;
  }
  return <AdminShell section={section}><Section key={section} section={section} /></AdminShell>;
}
