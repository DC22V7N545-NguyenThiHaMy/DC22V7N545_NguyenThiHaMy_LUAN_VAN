import { useState, type FormEvent } from 'react';
import { api, errorMessage } from '../api';
import { A, Breadcrumb, EmptyState, ErrorState, ProductGrid } from '../components/common';
import { useQuickView } from '../components/ProductDetail';
import { useApp } from '../context';
import { colorHex, formatDate, GENDERS, money, orderCode, STYLES } from '../format';
import { useAsync } from '../hooks/useAsync';
import { usePageReady } from '../hooks/usePageReady';
import { Icon } from '../icons';
import type { Order, Product, User } from '../types';
import { AuthPanel } from './Auth';

export function AccountSidebar() {
  const { user, syncUser, toast, go } = useApp();
  if (!user) return null;
  async function logout() {
    try {
      await api('/auth/logout', { method: 'POST' });
      await syncUser();
      toast('Hẹn gặp lại bạn, với thật nhiều cảm hứng mới.');
      go('/');
    } catch (err) {
      toast(errorMessage(err), true);
    }
  }
  return (
    <aside className="account-side">
      <div className="avatar">{user.full_name[0]}</div>
      <h3>{user.full_name}</h3>
      <p>{user.email}</p>
      {user.username && <p>@{user.username}</p>}
      <nav>
        <A href="/tai-khoan"><Icon name="user" /> Hồ sơ & sở thích</A>
        <A href="/don-hang"><Icon name="box" /> Đơn hàng của tôi</A>
        <A href="/yeu-thich"><Icon name="heart" /> Thiết kế yêu thích</A>
        <A href="/danh-rieng-cho-ban"><Icon name="sparkles" /> Dành riêng cho bạn</A>
        {user.role === 'admin' && <A href="/quan-tri"><Icon name="grid" /> Quản trị cửa hàng</A>}
        <button data-action="logout" onClick={() => void logout()}><Icon name="logout" /> Đăng xuất</button>
      </nav>
    </aside>
  );
}

function ProfileForm({ user, onSaved }: { user: User; onSaved: () => void }) {
  const { setUser, toast } = useApp();
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const p = user.preferences;

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const values = Object.fromEntries(new FormData(event.currentTarget)) as Record<string, string>;
    setError('');
    setBusy(true);
    try {
      setUser(await api<User>('/profile', { method: 'PUT', body: { ...values, budget: +values.budget } }));
      toast('Đã lưu sở thích. Chúng mình hiểu bạn thêm một chút.');
      onSaved();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <form id="profile-form" className="profile-form" onSubmit={submit}>
      <span className="small-label">RẤT RIÊNG, RẤT BẠN</span>
      <h2>Gu của bạn. Cảm hứng của chúng mình.</h2>
      <div className="field"><label htmlFor="profile-name">Họ và tên</label><input id="profile-name" name="full_name" defaultValue={user.full_name} required minLength={2} maxLength={100} autoComplete="name" /></div>
      <div className="field-row">
        <div className="field"><label htmlFor="profile-gender">Bạn quan tâm</label>
          <select id="profile-gender" name="gender" defaultValue={p.gender || ''}><option value="">Tất cả</option>{GENDERS.map(v => <option key={v}>{v}</option>)}</select></div>
        <div className="field"><label htmlFor="profile-style">Phong cách yêu thích</label>
          <select id="profile-style" name="style" defaultValue={p.style || ''}><option value="">Tự do khám phá</option>{STYLES.map(v => <option key={v}>{v}</option>)}</select></div>
      </div>
      <div className="field-row">
        <div className="field"><label htmlFor="profile-color">Màu sắc yêu thích</label>
          <select id="profile-color" name="color" defaultValue={p.color || ''}><option value="">Mọi màu sắc</option>{Object.keys(colorHex).map(v => <option key={v}>{v}</option>)}</select></div>
        <div className="field"><label htmlFor="profile-budget">Ngân sách mỗi thiết kế (đ)</label>
          <input id="profile-budget" type="number" name="budget" min={0} max={100000000} defaultValue={p.budget || 2000000} required /></div>
      </div>
      <div className="form-error">{error}</div>
      <button className="button primary" type="submit" disabled={busy}>Lưu sở thích của bạn <Icon name="check" /></button>
    </form>
  );
}

export function AccountPage() {
  const { user } = useApp();
  const openQuick = useQuickView();
  const { data: history, error, reload } = useAsync(() => (user ? api<Product[]>('/history') : Promise.resolve([] as Product[])), [user?.id]);
  usePageReady(!!user ? !!history : true, '/tai-khoan');
  if (!user) return <AuthPanel />;
  if (error) return <ErrorState error={error} />;
  if (!history) return null;
  return (
    <section className="container page-space">
      <Breadcrumb label="Tài khoản của bạn" />
      <div className="account-layout">
        <AccountSidebar />
        <div>
          <ProfileForm user={user} onSaved={reload} />
          {history.length > 0 && (
            <>
              <div className="section-heading" style={{ marginTop: 50 }}><div><span className="small-label">DẤU CHÂN PHONG CÁCH</span><h2>Bạn đã <em>ghé xem.</em></h2></div></div>
              <ProductGrid items={history.slice(0, 6)} onQuick={openQuick} />
            </>
          )}
        </div>
      </div>
    </section>
  );
}

export function FavoritesPage() {
  const { user, favoritesVersion } = useApp();
  const openQuick = useQuickView();
  const { data: items, error } = useAsync(() => (user ? api<Product[]>('/favorites') : Promise.resolve([] as Product[])), [user?.id, favoritesVersion]);
  usePageReady(!!items, '/yeu-thich');
  if (error) return <ErrorState error={error} />;
  if (!items) return null;
  return (
    <section className="container page-space">
      <Breadcrumb label="Yêu thích" />
      <div className="page-intro">
        <span className="small-label">MỘT GÓC NHỎ ĐỂ YÊU</span>
        <h1>Những điều khiến bạn <em>rung động.</em></h1>
        <p>Một góc nhỏ lưu lại những thiết kế bạn yêu, để cảm hứng luôn ở đây khi bạn cần.</p>
      </div>
      {items.length
        ? <ProductGrid items={items} onQuick={openQuick} />
        : <EmptyState title={user ? 'Tủ đồ yêu thích đang chờ bạn' : 'Lưu lại những thiết kế bạn yêu'}
            description={user ? 'Chạm vào trái tim trên mỗi thiết kế để lưu vào góc nhỏ này.' : 'Đăng nhập để những lựa chọn của bạn luôn được lưu lại.'}
            button={user ? 'Tìm thiết kế yêu thích' : 'Đăng nhập'} href={user ? '/san-pham' : '/tai-khoan'} icon="heart" />}
    </section>
  );
}

export function OrdersPage() {
  const { user } = useApp();
  const { data: items, error } = useAsync(() => (user ? api<Order[]>('/orders') : Promise.resolve([] as Order[])), [user?.id]);
  usePageReady(!user || !!items, '/don-hang');
  if (!user) return <AuthPanel />;
  if (error) return <ErrorState error={error} />;
  if (!items) return null;
  return (
    <section className="container page-space">
      <Breadcrumb label="Đơn hàng của tôi" />
      <div className="account-layout">
        <AccountSidebar />
        <div>
          <div className="page-intro">
            <span className="small-label">HÀNH TRÌNH PHONG CÁCH</span>
            <h1>Những lựa chọn đã thành câu chuyện.</h1>
            <p>Lịch sử đơn hàng mô phỏng của bạn.</p>
          </div>
          {items.length ? items.map(o => (
            <article key={o.id} className="order-card">
              <div className="order-card-head"><div><b>Đơn hàng #{orderCode(o.id)}</b><br /><span className="form-hint">{formatDate(o.created_at)}</span></div><span className="order-status">{o.status}</span></div>
              {o.items.map((i, index) => (
                <div key={index} className="order-line"><img src={i.thumbnail} alt={i.name} /><div>{i.name}<br /><span>Kích thước {i.size} · SL {i.quantity} · {money(i.unit_price)}</span></div></div>
              ))}
              <div className="order-card-total">Tổng cộng: <b>{money(o.total)}</b></div>
            </article>
          )) : <EmptyState title="Câu chuyện mua sắm chưa bắt đầu" description="Những đơn hàng của bạn sẽ được lưu tại đây." />}
        </div>
      </div>
    </section>
  );
}
