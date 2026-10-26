import { useEffect, useState, type FormEvent } from 'react';
import { useLocation } from 'react-router';
import { api, errorMessage } from '../api';
import { A, Breadcrumb, EmptyState, ErrorState } from '../components/common';
import { useApp } from '../context';
import { money, orderCode } from '../format';
import { useAsync } from '../hooks/useAsync';
import { usePageReady } from '../hooks/usePageReady';
import { Icon } from '../icons';
import { EMPTY_CART, type Cart } from '../types';
import { AuthPanel } from './Auth';

function Summary({ cart, checkout = false, busy = false }: { cart: Cart; checkout?: boolean; busy?: boolean }) {
  return (
    <aside className="order-summary">
      <h2>Một lựa chọn thật đẹp.</h2>
      <div className="summary-line"><span>Tạm tính ({cart.count} sản phẩm)</span><span>{money(cart.total)}</span></div>
      <div className="summary-line"><span>Phí vận chuyển</span><span>{cart.shipping ? money(cart.shipping) : 'Miễn phí'}</span></div>
      <div className="summary-line total"><span>Tổng cộng</span><span>{money(cart.total + cart.shipping)}</span></div>
      {checkout ? (
        <>
          <p style={{ textAlign: 'left', marginBottom: 13 }}>Đặt hàng mô phỏng, không thu tiền và không giao hàng thật.</p>
          <button type="submit" form="checkout-form" className="button primary wide" disabled={busy}>Xác nhận đặt hàng <Icon name="arrow" /></button>
        </>
      ) : <A href="/thanh-toan" className="button primary wide">Tiến hành đặt hàng <Icon name="arrow" /></A>}
      <p><Icon name="shield" /> Thông tin của bạn được bảo vệ.</p>
    </aside>
  );
}

function CheckoutSteps({ pathname }: { pathname: string }) {
  return (
    <ol className="checkout-steps">
      <li className="done"><span>01</span> Giỏ đồ của bạn</li>
      <li className={pathname === '/thanh-toan' ? 'active' : ''}><span>02</span> Thông tin nhận hàng</li>
      <li><span>03</span> Hoàn tất lựa chọn</li>
    </ol>
  );
}

export function CartPage() {
  const { user, setCart, toast } = useApp();
  const { pathname } = useLocation();
  const { data: cart, error, mutate } = useAsync(() => (user ? api<Cart>('/cart') : Promise.resolve(EMPTY_CART)), [user?.id]);
  usePageReady(!!cart, '/gio-hang');
  useEffect(() => { if (cart && user) setCart(cart); }, [cart, user, setCart]);

  async function change(run: () => Promise<Cart>, message?: string) {
    try {
      const next = await run();
      mutate(next);
      setCart(next);
      if (message) toast(message);
    } catch (err) {
      toast(errorMessage(err), true);
    }
  }

  if (error) return <ErrorState error={error} />;
  if (!cart) return null;
  const c = cart;
  return (
    <section className="container page-space">
      <Breadcrumb label="Giỏ hàng" />
      <div className="page-intro">
        <span className="small-label">NIỀM VUI TRONG TỦ ĐỒ</span>
        <h1>Tủ đồ sắp có thêm niềm vui.</h1>
        <p>{c.count ? `${c.count} thiết kế đã được bạn lựa chọn.` : 'Mỗi món đồ đẹp đều bắt đầu từ một lần khám phá.'}</p>
      </div>
      {c.items.length > 0 && <CheckoutSteps pathname={pathname} />}
      {c.items.length ? (
        <div className="cart-layout">
          <div>
            {c.items.map(item => (
              <article key={item.id} className="cart-item">
                <img src={item.product.thumbnail} alt={item.product.name} />
                <div>
                  <h3><A href={`/san-pham/${item.product.id}`}>{item.product.name}</A></h3>
                  <p>{item.product.color} · Kích thước {item.size}</p>
                  <div className="quantity-control">
                    <button data-quantity-id={item.id} data-quantity={item.quantity - 1} aria-label="Giảm số lượng" disabled={item.quantity === 1}
                      onClick={() => void change(() => api<Cart>('/cart/' + item.id, { method: 'PATCH', body: { quantity: item.quantity - 1 } }))}>−</button>
                    <span>{item.quantity}</span>
                    <button data-quantity-id={item.id} data-quantity={item.quantity + 1} aria-label="Tăng số lượng" disabled={item.quantity >= Math.min(20, item.stock)}
                      onClick={() => void change(() => api<Cart>('/cart/' + item.id, { method: 'PATCH', body: { quantity: item.quantity + 1 } }))}>+</button>
                  </div>
                </div>
                <div className="cart-item-total">{money(item.product.price * item.quantity)}
                  <button data-remove-cart={item.id} onClick={() => void change(() => api<Cart>('/cart/' + item.id, { method: 'DELETE' }), 'Đã bỏ thiết kế khỏi giỏ hàng.')}>Xóa</button>
                </div>
              </article>
            ))}
            <p className="cart-shipping-note"><Icon name="truck" />{c.shipping ? `Thêm ${money(999000 - c.total)} để được miễn phí vận chuyển.` : 'Đơn hàng của bạn được miễn phí vận chuyển.'}</p>
            <div className="shipping-progress"><span style={{ width: `${Math.min(c.total / 999000 * 100, 100)}%` }} /></div>
            <A className="underlined" href="/san-pham" style={{ marginTop: 24 }}>Tiếp tục khám phá →</A>
          </div>
          <Summary cart={c} />
        </div>
      ) : (
        <EmptyState title="Một khoảng trống cho những điều đẹp" description="Chọn vài thiết kế bạn yêu để bắt đầu câu chuyện phong cách mới."
          button={user ? 'Khám phá bộ sưu tập' : 'Đăng nhập để mua sắm'} href={user ? '/san-pham' : '/tai-khoan'} />
      )}
    </section>
  );
}

export function CheckoutPage() {
  const { user, setCart, toast } = useApp();
  const { pathname } = useLocation();
  const { data: cart, error } = useAsync(() => (user ? api<Cart>('/cart') : Promise.resolve(EMPTY_CART)), [user?.id]);
  const [placed, setPlaced] = useState<{ id: number; total: number } | null>(null);
  const [formError, setFormError] = useState('');
  const [busy, setBusy] = useState(false);
  usePageReady(!user || !!cart, '/thanh-toan' + (placed ? '-xong' : ''));
  useEffect(() => { if (cart && user) setCart(cart); }, [cart, user, setCart]);

  if (!user) return <AuthPanel />;
  if (error) return <ErrorState error={error} />;
  if (!cart) return null;

  if (placed) {
    return (
      <section className="container page-space">
        <div className="success-state">
          <div className="success-icon">✓</div>
          <span className="small-label">CẢM ƠN BẠN ĐÃ CHỌN VELASTYLE</span>
          <h1>Một lựa chọn thật đẹp, {user.full_name.split(' ').at(-1)}.</h1>
          <p>Đơn hàng #{orderCode(placed.id)} đã được lưu thành công.<br />Tổng cộng: {money(placed.total)} · Thanh toán và giao hàng mô phỏng.</p>
          <A className="button primary" href="/don-hang">Xem đơn hàng <Icon name="box" /></A>
          <A className="button outline" href="/san-pham">Tiếp tục khám phá <Icon name="arrow" /></A>
        </div>
      </section>
    );
  }
  if (!cart.items.length) {
    return <section className="container page-space"><EmptyState title="Giỏ hàng đang trống" description="Hãy chọn một thiết kế trước khi đặt hàng." /></section>;
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const values = Object.fromEntries(new FormData(event.currentTarget));
    setFormError('');
    setBusy(true);
    try {
      const order = await api<{ id: number; total: number }>('/orders', { method: 'POST', body: values });
      setCart(EMPTY_CART);
      setPlaced(order);
      window.scrollTo(0, 0);
    } catch (err) {
      setFormError(errorMessage(err));
      toast(errorMessage(err), true);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="container page-space">
      <Breadcrumb label="Hoàn tất lựa chọn" />
      <div className="page-intro">
        <span className="small-label">SẮP THÀNH CỦA BẠN</span>
        <h1>Một bước nữa thôi.</h1>
        <p>Kiểm tra thông tin để hoàn tất đơn hàng mô phỏng của bạn.</p>
      </div>
      <CheckoutSteps pathname={pathname} />
      <div className="checkout-layout">
        <form id="checkout-form" onSubmit={submit}>
          <h2 style={{ font: '27px var(--serif)', marginBottom: 25 }}>Thông tin nhận hàng</h2>
          <div className="field-row">
            <div className="field"><label htmlFor="checkout-name">Họ và tên người nhận</label><input id="checkout-name" name="full_name" defaultValue={user.full_name} required minLength={2} maxLength={100} autoComplete="name" /></div>
            <div className="field"><label htmlFor="checkout-phone">Số điện thoại</label><input type="tel" id="checkout-phone" name="phone" pattern="0[0-9]{9,10}" placeholder="09xxxxxxxx" required maxLength={11} autoComplete="tel" /></div>
          </div>
          <div className="field"><label htmlFor="checkout-address">Địa chỉ nhận hàng</label><textarea id="checkout-address" name="address" placeholder="Số nhà, đường, phường/xã, tỉnh/thành phố" required minLength={10} maxLength={500} autoComplete="street-address" /></div>
          <div className="admin-note">Thanh toán mô phỏng. Không cần nhập thông tin thẻ ngân hàng.</div>
          <div className="form-error">{formError}</div>
          <h2 style={{ font: '24px var(--serif)', margin: '28px 0 20px' }}>Những thiết kế bạn chọn</h2>
          {cart.items.map(i => (
            <div key={i.id} className="order-line"><img src={i.product.thumbnail} alt={i.product.name} /><div>{i.product.name}<br /><span>{i.size} · {i.quantity} sản phẩm · {money(i.product.price)}</span></div></div>
          ))}
        </form>
        <Summary cart={cart} checkout busy={busy} />
      </div>
    </section>
  );
}
