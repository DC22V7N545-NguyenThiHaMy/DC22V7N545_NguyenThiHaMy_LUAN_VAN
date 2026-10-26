import { useRef } from 'react';
import { useLocation } from 'react-router';
import { api } from '../api';
import { A, Breadcrumb, EmptyState, ErrorState, ProductGrid } from '../components/common';
import { MuseExplainer, StyleQuiz } from '../components/modals';
import { useQuickView } from '../components/ProductDetail';
import { useApp } from '../context';
import { money, motionAllowed } from '../format';
import { useAsync } from '../hooks/useAsync';
import { useEditorialMotion } from '../hooks/useEditorialMotion';
import { usePageReady } from '../hooks/usePageReady';
import { Icon } from '../icons';
import type { Product, Recommendations } from '../types';

// "als" is served by the API and measured in the admin evaluation, but is not offered as a shopper-facing mode.
const MODES: [string, string, string, string][] = [
  ['hybrid', 'sparkles', 'Gợi ý kết hợp', 'Hành vi gặp gỡ phong cách'],
  ['collaborative', 'heart', 'Cùng gu với bạn', 'Cảm hứng từ những người cùng gu'],
  ['clip', 'eye', 'Cảm hứng tương đồng', 'Đồng điệu từ hình ảnh & mô tả'],
];

function MusePortrait({ product, index }: { product: Product; index: number }) {
  return (
    <A className={`muse-portrait muse-portrait-${index} ${product.thumbnail.includes('/catalog-') ? 'muse-catalog-portrait' : ''}`.trim()} href={`/san-pham/${product.id}`} aria-label={`Xem ${product.name}`}>
      <span className="muse-portrait-index">0{index + 1} / TUYỂN CHỌN</span>
      <img src={product.thumbnail} alt={product.name} width={380} height={510} loading="eager" />
      <div className="muse-portrait-caption"><span>{product.name}</span><b>{money(product.price)}</b></div>
      <span className="muse-portrait-arrow"><Icon name="arrow-diagonal" /></span>
    </A>
  );
}

export default function ForYou() {
  const { search } = useLocation();
  const { user, go, showModal } = useApp();
  const openQuick = useQuickView();
  const params = new URLSearchParams(search);
  const method = params.get('method') || 'hybrid';
  const gender = params.get('gender') || '';
  const max = params.get('max_price') || '';
  const { data, error } = useAsync(
    () => api<Recommendations>(`/recommendations/${method}?k=18&gender=${encodeURIComponent(gender)}${max ? '&max_price=' + max : ''}`),
    [method, gender, max, user?.id],
  );
  const hero = useRef<HTMLElement>(null);
  useEditorialMotion(hero, '.muse-kicker,.muse-intro-line,.muse-hero h1,.muse-hero-copy>p,.muse-hero-actions,.muse-personal-signature,.muse-portrait', [data]);
  usePageReady(!!data, '/danh-rieng-cho-ban' + search);

  function updateQuery(changes: Record<string, string>) {
    const next = new URLSearchParams(window.location.search);
    Object.entries(changes).forEach(([key, value]) => (value ? next.set(key, value) : next.delete(key)));
    go(window.location.pathname + (next.size ? '?' + next : ''), { scroll: false });
  }

  if (error) return <ErrorState error={error} />;
  if (!data) return null;

  const prefs = user?.preferences || {};
  const firstName = user?.full_name.split(' ')[0] || '';
  const personalized = !!user && data.status === 'personalized';
  const moodItems = data.items.slice(0, 3);
  const gu = prefs.style || 'Đang khám phá';
  const budget = max ? money(+max) : prefs.budget ? money(prefs.budget) : 'Tự do lựa chọn';
  const quiz = () => showModal(<StyleQuiz />, true);

  return (
    <section className="container page-space muse-page">
      <Breadcrumb label="Dành riêng cho bạn" />
      <section ref={hero} className="for-you-hero muse-hero" aria-label="Tuyển chọn phong cách cá nhân">
        <div className="muse-hero-copy">
          <div className="muse-kicker"><span><Icon name="sparkles" /> TUYỂN CHỌN RIÊNG CỦA {user ? firstName.toUpperCase() : 'BẠN'}</span><i>VELA / PHIÊN BẢN CÁ NHÂN</i></div>
          <span className="muse-intro-line">Giữa hàng trăm lựa chọn, có những điều rất riêng.</span>
          <h1>{user ? <><span className="muse-title-lead">Một chút cảm hứng</span><br />cho <em>{firstName}.</em></> : <>Gu của bạn.<br /><em>Một phiên bản riêng.</em></>}</h1>
          <p>{personalized
            ? 'Từ những thiết kế bạn dừng lại ngắm, những món bạn lưu và những lựa chọn bạn yêu — chúng mình gom thành một góc cảm hứng dành riêng cho bạn.'
            : user
              ? 'Từ một vài điều bạn yêu, chúng mình bắt đầu một câu chuyện phong cách. Khám phá và lưu lại thiết kế đầu tiên để tủ đồ ngày càng hiểu gu của bạn.'
              : 'Không cần chạy theo một khuôn mẫu. Chọn vài điều bạn thích, khám phá một chút — để mỗi lựa chọn đều mang dấu ấn của bạn.'}</p>
          <div className="muse-hero-actions">
            <a href="#muse-selection" className="button muse-primary" data-muse-scroll onClick={event => {
              event.preventDefault();
              document.getElementById('muse-selection')?.scrollIntoView({ behavior: motionAllowed() ? 'smooth' : 'instant', block: 'start' });
            }}>Khám phá tuyển chọn <Icon name="arrow" /></a>
            <button className="muse-preference-link" data-studio-action="quiz" onClick={quiz}><Icon name="settings" /> {prefs.style ? 'Làm mới gu của tôi' : 'Tìm gu của tôi'}</button>
          </div>
          <div className="muse-personal-signature">
            <span>{user ? firstName[0] : '✧'}</span>
            <p>{personalized ? 'Tuyển chọn từ lịch sử tương tác của bạn' : 'Mỗi lựa chọn là một chút hiểu bạn hơn'}<small>{user ? 'Bạn chọn gu. VELA tìm cảm hứng.' : 'Đăng nhập để lưu tủ đồ phong cách của bạn.'}</small></p>
            <i>✳</i>
          </div>
        </div>
        <div className="muse-gallery" aria-label="Một vài thiết kế từ tuyển chọn">
          <div className="muse-orbit orbit-a" /><div className="muse-orbit orbit-b" />
          <span className="muse-spark muse-spark-one">✧</span><span className="muse-spark muse-spark-two">✳</span>
          <span className="muse-gallery-note">MỘT CHÚT CẢM HỨNG.<br />MỘT PHIÊN BẢN RẤT BẠN.</span>
          {moodItems.length ? moodItems.map((p, i) => <MusePortrait key={p.id} product={p} index={i} />) : <img className="muse-empty-art" src="/static/images/wardrobe.jpg" alt="Một tủ đồ đầy cảm hứng" />}
          <div className="muse-curated-seal"><span>ĐƯỢC CHỌN</span><b>bằng gu.</b><span>VELASTYLE</span></div>
        </div>
      </section>
      <div className="muse-style-pass">
        <span className="style-pass-title"><Icon name="user" /> THẺ PHONG CÁCH <i>của {user ? firstName : 'bạn'}</i></span>
        <div><small>GU BẠN ĐÃ CHỌN</small><b>{gu}</b></div>
        <div><small>{max ? 'GIỚI HẠN ĐANG LỌC' : 'NGÂN SÁCH THAM KHẢO'}</small><b>{budget}</b></div>
        <div><small>TRONG TUYỂN CHỌN NÀY</small><b>{data.items.length} <span>thiết kế</span></b></div>
        <button data-studio-action="quiz" aria-label="Chỉnh sửa sở thích phong cách" onClick={quiz}><Icon name="settings" /><span>Điều chỉnh</span></button>
      </div>
      <section className="muse-selection" id="muse-selection">
        <div className="muse-selection-heading">
          <div><span className="small-label">BẠN CÓ THỂ SẼ YÊU NHỮNG ĐIỀU NÀY</span><h2>Một góc riêng, <em>đúng gu bạn.</em></h2></div>
          <button className="muse-how-link" data-muse-about onClick={() => showModal(<MuseExplainer />, true, 'Cách VELA gợi ý phong cách')}><Icon name="sparkles" /> VELA chọn cho bạn thế nào?</button>
        </div>
        <div className="recommendation-controls muse-controls">
          <div className="product-tabs muse-modes" aria-label="Chọn góc nhìn gợi ý">
            {MODES.map(([m, icon, title, description], i) => (
              <button key={m} className={`tab-button muse-mode ${method === m ? 'active' : ''}`} data-method={m} aria-pressed={method === m} onClick={() => updateQuery({ method: m })}>
                <span className="muse-mode-icon"><Icon name={icon} /></span><span><b>{title}</b><small>{description}</small></span><i>0{i + 1}</i>
              </button>
            ))}
          </div>
        </div>
        <div className="muse-filter-row">
          <p className="recommendation-note"><span className="muse-live-dot" />{data.message}{method !== 'collaborative' && method !== 'als' && !data.clip_ready ? ' · CLIP đang chờ được chuẩn bị.' : ''}</p>
          <div className="muse-selects">
            <label><Icon name="filter" />
              <select id="recommend-gender" aria-label="Danh mục gợi ý" value={gender} onChange={event => updateQuery({ gender: event.target.value })}>
                <option value="">Tất cả phong cách</option>
                {['Nữ', 'Nam', 'Unisex', 'Phụ kiện'].map(v => <option key={v}>{v}</option>)}
              </select>
            </label>
            <label>
              <select id="recommend-budget" aria-label="Ngân sách" value={max} onChange={event => updateQuery({ max_price: event.target.value })}>
                <option value="">Mọi mức giá</option>
                {[['700000', 'Dưới 700.000đ'], ['1000000', 'Dưới 1.000.000đ'], ['1500000', 'Dưới 1.500.000đ']].map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </label>
          </div>
        </div>
        <div className="muse-products">
          {data.items.length
            ? <ProductGrid items={data.items} reason onQuick={openQuick} />
            : <EmptyState title="Chừa một khoảng trống cho cảm hứng mới" description="Thử điều chỉnh phong cách hoặc mức giá để khám phá thêm nhé." button="Xem mọi gợi ý" href="/danh-rieng-cho-ban" />}
        </div>
        <div className="muse-closing">
          <span>✧</span>
          <div><h3>Gu của bạn luôn có thể thay đổi.</h3><p>Thử một điều mới. Lưu một thiết kế bạn yêu. Chúng mình sẽ tiếp tục lắng nghe.</p></div>
          <button className="button outline round" data-studio-action="quiz" onClick={quiz}>Kể thêm về gu của tôi <Icon name="arrow" /></button>
        </div>
      </section>
    </section>
  );
}
