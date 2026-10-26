import { useState } from 'react';
import { api, errorMessage } from '../api';
import { useApp } from '../context';
import { colorHex, money } from '../format';
import { Icon } from '../icons';
import type { Cart, Product } from '../types';
import { A } from './common';
import { SizeGuide, ZoomPhoto } from './modals';

/** Product detail shared by the full page and the quick-view dialog (`modal`). */
export function ProductDetailView({ p, modal = false }: { p: Product; modal?: boolean }) {
  const { favorites, toggleFavorite, requireLogin, setCart, toast, closeModal, showModal } = useApp();
  const available = p.variants.filter(v => v.stock > 0);
  const [variantId, setVariantId] = useState<number | null>(available[0]?.id ?? null);
  const [quantity, setQuantity] = useState(1);
  const [busy, setBusy] = useState(false);
  const [collapsed, setCollapsed] = useState(true);
  const variant = p.variants.find(v => v.id === variantId);
  const maxQuantity = Math.min(20, variant?.stock || 1);
  const sku = `VELA-${String(p.id).padStart(5, '0')}`;
  const stars = Math.round(p.rating || 0);
  const longDescription = !modal && p.description.length > 280;

  async function addToCart() {
    if (!requireLogin()) return;
    if (!variantId) { toast('Chọn một kích thước vừa vặn với bạn nhé.', true); return; }
    setBusy(true);
    try {
      setCart(await api<Cart>('/cart', { method: 'POST', body: { variant_id: variantId, quantity } }));
      closeModal();
      toast('Một lựa chọn thật đẹp. Đã thêm vào giỏ hàng.');
    } catch (err) {
      toast(errorMessage(err), true);
    } finally {
      setBusy(false);
    }
  }

  const zoom = () => showModal(<ZoomPhoto src={p.thumbnail} alt={p.name} caption={`${p.name} · ${p.color}`} />);
  const imageProps = modal ? {} : {
    'data-studio-zoom': 'true', role: 'button', tabIndex: 0, 'aria-label': 'Phóng to ảnh thiết kế', onClick: zoom,
    onKeyDown: (event: React.KeyboardEvent) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); zoom(); } },
  };

  return (
    <>
      <div className="product-detail">
        <div className={`detail-image ${!modal && p.thumbnail.includes('/catalog-') ? 'catalog-detail-photo' : ''}`.trim()} {...imageProps}>
          <img src={p.thumbnail} alt={p.name} width={700} height={900} fetchPriority="high" />
          {p.original_price ? <span className="product-badge sale">ƯU ĐÃI ĐẶC BIỆT</span> : null}
          {!modal && <span className="image-zoom-hint"><Icon name="search" /> Chạm để xem kỹ hơn</span>}
        </div>
        <div className="detail-copy">
          <span className="small-label">{p.brand} · {p.category}</span>
          <h1>{p.name}</h1>
          <div className="detail-rating">
            {p.rating ? (
              <>
                <span className="review-stars">{'★'.repeat(stars)}{'☆'.repeat(5 - stars)}</span> {p.rating} · {p.review_count} đánh giá
                {p.simulated_review_count ? <> <span className="demo-review-tag">Có đánh giá mẫu</span></> : null}
              </>
            ) : 'Một thiết kế mới, chờ câu chuyện của bạn.'}
          </div>
          <div className="detail-price">{money(p.price)}{p.original_price ? <span className="old-price">{money(p.original_price)}</span> : null}</div>
          <p className={`detail-description ${longDescription && collapsed ? 'description-collapsed' : ''}`.trim()}>{p.description}</p>
          {longDescription && (
            <button className="description-toggle" data-expand-description aria-expanded={!collapsed} onClick={() => setCollapsed(c => !c)}>
              {collapsed ? 'Đọc đầy đủ mô tả +' : 'Thu gọn mô tả −'}
            </button>
          )}
          <div className="detail-label"><span>Màu sắc: <b>{p.color}</b></span><span style={{ background: colorHex[p.color] || '#b4a589' }} className="swatch" /></div>
          <div className="detail-label">
            <span>Chọn kích thước</span>
            <A href="/thong-tin/kich-thuoc" className="text-button" style={{ fontSize: 9 }} data-size-guide onClick={event => { event.preventDefault(); showModal(<SizeGuide />, true, 'Hướng dẫn chọn kích thước'); }}>Hướng dẫn kích thước</A>
          </div>
          <div className="size-list">
            {p.variants.map(v => (
              <button key={v.id} className={`size-button ${v.id === variantId ? 'active' : ''}`} data-variant={v.id} disabled={v.stock === 0} onClick={() => { setVariantId(v.id); setQuantity(1); }}>{v.size}</button>
            ))}
          </div>
          <p className="detail-stock">{available.length ? 'Sẵn sàng trong tủ đồ của bạn' : 'Tạm hết hàng'}</p>
          <div className="detail-purchase-row">
            <div className="quantity-control detail-quantity">
              <button data-detail-quantity="-1" aria-label="Giảm số lượng chọn mua" disabled={quantity <= 1} onClick={() => setQuantity(q => Math.max(1, q - 1))}>−</button>
              <span id="detail-quantity-value">{quantity}</span>
              <button data-detail-quantity="1" aria-label="Tăng số lượng chọn mua" disabled={quantity >= maxQuantity} onClick={() => setQuantity(q => Math.min(maxQuantity, q + 1))}>+</button>
            </div>
            <span className="quantity-hint">Số lượng bạn muốn chọn</span>
          </div>
          <div className="detail-actions">
            <button className="button primary" data-add-cart={p.id} disabled={!available.length || busy} onClick={() => void addToCart()}><Icon name="bag" /> Thêm vào giỏ hàng</button>
            <button className={`icon-btn ${favorites.has(p.id) ? 'saved' : ''}`} data-favorite={p.id} aria-label="Yêu thích sản phẩm" onClick={() => void toggleFavorite(p.id)}><Icon name="heart" /></button>
          </div>
          <div className="detail-perks">
            <div><Icon name="truck" /> Miễn phí vận chuyển cho đơn từ 999.000đ</div>
            <div><Icon name="return" /> An tâm đổi trả trong vòng 30 ngày</div>
          </div>
          <div className="detail-editorial-note"><span>✧</span><p>Một thiết kế, nhiều cách là chính bạn.<br /><b>{p.style}</b> · {p.gender} · Mã {sku}</p></div>
          <div className="detail-meta"><span>Chất liệu: {p.material}</span><span>Phong cách: {p.style}</span></div>
          {modal && <A className="underlined" href={`/san-pham/${p.id}`} style={{ marginTop: 22 }}>Xem đầy đủ thiết kế <Icon name="arrow" /></A>}
          {!modal && (
            <div className="detail-accordions">
              <details open>
                <summary>Thiết kế & chất liệu <span>−</span></summary>
                <div className="accordion-content">
                  <dl className="spec-list">
                    <div><dt>Thương hiệu</dt><dd>{p.brand}</dd></div>
                    <div><dt>Chất liệu tham khảo</dt><dd>{p.material}</dd></div>
                    <div><dt>Màu sắc</dt><dd>{p.color}</dd></div>
                    <div><dt>Phong cách</dt><dd>{p.style}</dd></div>
                    <div><dt>Mã thiết kế</dt><dd>{sku}</dd></div>
                  </dl>
                  <p className="form-hint">Giá và thông tin chất liệu trong catalog mẫu dùng cho trải nghiệm đồ án; xem mô tả nguồn của từng sản phẩm.</p>
                </div>
              </details>
              <details>
                <summary>Giữ món đồ bạn yêu bền đẹp <span>+</span></summary>
                <div className="accordion-content">
                  <p>Ưu tiên hướng dẫn trên nhãn chăm sóc thực tế. Tách màu trước khi giặt, hạn chế tác động mạnh và phơi nơi thoáng mát. Chất liệu đặc biệt như da, len hoặc lụa cần được chăm sóc riêng.</p>
                  <A href="/cam-hung/cham-soc-trang-phuc" className="underlined">Đọc cẩm nang chăm sóc →</A>
                </div>
              </details>
              <details>
                <summary>Giao hàng & đổi trả <span>+</span></summary>
                <div className="accordion-content">
                  <p>Miễn phí giao hàng cho đơn từ 999.000đ; đơn nhỏ hơn có phí mô phỏng 30.000đ. Chính sách tham khảo: đổi trả trong 30 ngày khi còn nguyên tem và chưa sử dụng.</p>
                  <A href="/thong-tin/giao-hang" className="underlined">Xem thông tin chi tiết →</A>
                </div>
              </details>
            </div>
          )}
        </div>
      </div>
      {!modal && (
        <div className="mobile-buy-bar">
          <div><span>{p.name}</span><b>{money(p.price)}</b></div>
          <button className="button primary" data-add-cart={p.id} disabled={!p.stock || busy} onClick={() => void addToCart()}><Icon name="bag" /> Thêm vào giỏ</button>
        </div>
      )}
    </>
  );
}

/** Opens the quick-view dialog for a product id. */
export function useQuickView() {
  const { showModal, toast } = useApp();
  return async (id: number) => {
    try {
      const p = await api<Product>('/products/' + id);
      showModal(<ProductDetailView key={p.id} p={p} modal />);
    } catch (err) {
      toast(errorMessage(err), true);
    }
  };
}
