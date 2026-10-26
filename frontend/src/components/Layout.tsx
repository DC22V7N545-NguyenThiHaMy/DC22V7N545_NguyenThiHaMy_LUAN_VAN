import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { flushSync } from 'react-dom';
import { useLocation } from 'react-router';
import { api } from '../api';
import { useApp } from '../context';
import { money, motionAllowed } from '../format';
import { Icon } from '../icons';
import type { ProductPage } from '../types';
import { A } from './common';

const MESSAGES = [
  { label: 'QUYỀN LỢI CỦA BẠN', text: 'Miễn phí vận chuyển từ 999.000đ', detail: 'Thêm niềm vui trong tủ đồ', cta: 'Xem chính sách', href: '/thong-tin/giao-hang' },
  { label: 'MUA SẮM THẢNH THƠI', text: 'An tâm đổi trả trong vòng 30 ngày', detail: 'Thoải mái chọn điều bạn yêu', cta: 'Tìm hiểu thêm', href: '/thong-tin/giao-hang' },
  { label: 'CẢM HỨNG MỚI', text: 'Chào một mùa phong cách rất riêng', detail: 'Khám phá tuyển chọn thu–đông của VELA', cta: 'Xem bộ sưu tập', href: '/san-pham?sort=newest' },
  { label: 'DÀNH RIÊNG CHO BẠN', text: 'Một tủ đồ ngày càng hiểu gu của bạn', detail: 'Gợi ý từ những điều bạn quan tâm', cta: 'Tìm gu của tôi', href: '/danh-rieng-cho-ban' },
  { label: 'TÌM BẰNG HÌNH ẢNH', text: 'Thấy một thiết kế khiến bạn rung động?', detail: 'Tìm những lựa chọn đồng điệu từ một tấm ảnh', cta: 'Thử khám phá', href: '/tim-bang-anh' },
  { label: 'GÓC NHỎ PHONG CÁCH', text: 'Giữ những món đồ bạn yêu ở lại lâu hơn', detail: 'Cẩm nang phối đồ & chăm sóc tủ đồ', cta: 'Đọc cảm hứng', href: '/cam-hung' },
];

/** One message at a time, rotating upward without moving the header. */
function Announcement() {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const [reduced, setReduced] = useState(!motionAllowed());
  const line = useRef<HTMLSpanElement>(null);
  const busy = useRef(false);
  const bar = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const query = matchMedia('(prefers-reduced-motion: reduce)');
    const onChange = () => setReduced(query.matches);
    query.addEventListener('change', onChange);
    return () => query.removeEventListener('change', onChange);
  }, []);

  useEffect(() => {
    if (paused || hovered || focused || reduced) return;
    const tick = async () => {
      const el = line.current;
      if (busy.current || document.hidden || !el) return;
      busy.current = true;
      try {
        await el.animate([{ transform: 'translateY(0)', opacity: 1 }, { transform: 'translateY(-22px)', opacity: 0 }], { duration: 300, easing: 'ease-in', fill: 'forwards' }).finished;
        flushSync(() => setIndex(i => (i + 1) % MESSAGES.length));
        el.getAnimations().forEach(animation => animation.cancel());
        await el.animate([{ transform: 'translateY(22px)', opacity: 0 }, { transform: 'translateY(0)', opacity: 1 }], { duration: 380, easing: 'cubic-bezier(.16,1,.3,1)' }).finished;
      } catch {
        // an animation cancelled by navigation or unmount is not an error
      } finally {
        busy.current = false;
      }
    };
    const timer = setInterval(tick, 4000);
    return () => clearInterval(timer);
  }, [paused, hovered, focused, reduced]);

  const message = MESSAGES[index];
  return (
    <div className="announcement announcement-vertical" ref={bar}
      onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}
      onFocus={() => setFocused(true)} onBlur={() => setFocused(!!bar.current?.contains(document.activeElement))}>
      <A className="announcement-brand" href="/"><span className="announcement-emblem" aria-hidden="true">✳</span><span><b>TUYỂN CHỌN VELA</b><i>Mặc điều bạn yêu. Yêu điều bạn mặc.</i></span></A>
      <A className="announcement-ticker" id="announcement-ticker" href={message.href}>
        <span className="announcement-viewport">
          <span className="announcement-line" ref={line}>
            <span className="announcement-message-label">{message.label}</span>
            <span className="announcement-copy">{message.text}</span>
            <span className="announcement-detail">{message.detail}</span>
            <span className="announcement-message-cta">{message.cta}</span>
            <span className="announcement-arrow" aria-hidden="true">↗</span>
          </span>
        </span>
      </A>
      <div className="announcement-links">
        <A href="/thong-tin/giao-hang"><span aria-hidden="true">↶</span> Đổi trả trong 30 ngày</A>
        <span className="announcement-divider" aria-hidden="true" />
        <A href="/san-pham?sort=newest">Khám phá bộ sưu tập <span aria-hidden="true">↗</span></A>
      </div>
      <div className="announcement-playback">
        <span className="announcement-counter" aria-hidden="true"><b>{String(index + 1).padStart(2, '0')}</b><i>/</i>06</span>
        <button className="announcement-toggle" type="button" aria-pressed={paused} aria-label={paused ? 'Tiếp tục dòng thông báo' : 'Tạm dừng dòng thông báo'} onClick={() => setPaused(p => !p)}>{paused ? '▷' : 'Ⅱ'}</button>
      </div>
    </div>
  );
}

function activeNav(pathname: string, params: URLSearchParams) {
  if (pathname === '/') return 'home';
  if (pathname === '/danh-rieng-cho-ban') return 'foryou';
  const gender = params.get('gender');
  if (gender === 'Nữ') return 'women';
  if (gender === 'Nam') return 'men';
  if (gender === 'Phụ kiện') return 'accessories';
  if (params.get('sort') === 'newest') return 'new';
  return '';
}

function Header({ scrolled }: { scrolled: boolean }) {
  const { cart, favorites, go } = useApp();
  const location = useLocation();
  const [searchOpen, setSearchOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<ProductPage['items'] | null>(null);
  const input = useRef<HTMLInputElement>(null);
  const version = useRef(0);
  const nav = activeNav(decodeURI(location.pathname), new URLSearchParams(location.search));

  // Panels close whenever the route changes, like the old go().
  useEffect(() => { setSearchOpen(false); setMenuOpen(false); }, [location.pathname, location.search]);
  useEffect(() => { if (searchOpen) input.current?.focus(); }, [searchOpen]);
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') { setSearchOpen(false); setMenuOpen(false); } };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  // Debounced suggestions; a late answer for an older keystroke is dropped.
  useEffect(() => {
    const mine = ++version.current;
    const text = query.trim();
    if (text.length < 2) { setSuggestions(null); return; }
    const timer = setTimeout(async () => {
      try {
        const data = await api<ProductPage>('/products?limit=4&q=' + encodeURIComponent(text));
        if (mine === version.current) setSuggestions(data.items);
      } catch {
        if (mine === version.current) setSuggestions(null);
      }
    }, 250);
    return () => clearTimeout(timer);
  }, [query]);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    go('/san-pham?q=' + encodeURIComponent(query.trim()));
  };
  const link = (key: string, href: string, label: ReactNode, className?: string) => (
    <A href={href} data-nav={key} className={[className, nav === key ? 'active' : ''].filter(Boolean).join(' ') || undefined}>{label}</A>
  );

  return (
    <header className={`header ${scrolled ? 'header-scrolled' : ''}`.trim()}>
      <div className="header-inner">
        <A href="/" className="wordmark" aria-label="VELASTYLE — Trang chủ">VELASTYLE<span className="brand-star">✳</span></A>
        <nav className="desktop-nav" aria-label="Menu chính">
          {link('home', '/', 'Trang chủ')}
          {link('new', '/san-pham?sort=newest', 'Hàng mới')}
          {link('women', '/san-pham?gender=Nữ', 'Nữ')}
          {link('men', '/san-pham?gender=Nam', 'Nam')}
          {link('accessories', '/san-pham?gender=Phụ kiện', 'Phụ kiện')}
          {link('foryou', '/danh-rieng-cho-ban', <><span>✧</span> Dành cho bạn</>, 'for-you-nav')}
        </nav>
        <div className="header-actions">
          <button className="icon-btn" data-action="search" aria-label="Tìm kiếm" title="Tìm kiếm" onClick={() => setSearchOpen(open => !open)}><Icon name="search" /></button>
          <A className="icon-btn" href="/tai-khoan" aria-label="Tài khoản" title="Tài khoản"><Icon name="user" /></A>
          <A className="icon-btn favorite-nav" href="/yeu-thich" aria-label="Yêu thích" title="Yêu thích"><Icon name="heart" /><span className="dot-counter" id="favorite-count" style={{ display: favorites.size ? 'block' : 'none' }} /></A>
          <A className="icon-btn bag-nav" href="/gio-hang" aria-label="Giỏ hàng" title="Giỏ hàng"><Icon name="bag" /><span className="cart-count" id="cart-count">{cart.count}</span></A>
          <button className="icon-btn mobile-menu-button" data-action="mobile-menu" aria-label="Mở menu" onClick={() => setMenuOpen(open => !open)}><Icon name="menu" /></button>
        </div>
      </div>
      <div className="search-panel" id="search-panel" hidden={!searchOpen}>
        <form id="search-form" onSubmit={submit}>
          <Icon name="search" />
          <input ref={input} id="search-input" name="q" placeholder="Bạn đang tìm điều gì? Đầm, áo khoác, túi xách…" aria-label="Tìm sản phẩm" autoComplete="off" value={query} onChange={event => setQuery(event.target.value)} />
          <button type="button" className="image-search-link" data-action="image-search" onClick={() => go('/tim-bang-anh')}><Icon name="camera" /> Tìm bằng ảnh</button>
          <button className="text-button" type="submit">Tìm kiếm →</button>
          <button className="icon-btn" type="button" data-action="close-search" aria-label="Đóng tìm kiếm" onClick={() => setSearchOpen(false)}><Icon name="close" /></button>
        </form>
        <div id="search-discovery" className="search-discovery">
          <div className="search-trends">
            <span>THỬ MỘT CHÚT CẢM HỨNG</span>
            {['Đầm', 'Áo khoác', 'Túi', 'Quần', 'Giày'].map(q => <A key={q} href={`/san-pham?q=${encodeURIComponent(q)}`}>{q} ↗</A>)}
          </div>
          <div id="search-suggestions">
            {suggestions && (
              <div className="suggestion-list">
                {suggestions.length ? suggestions.map(p => (
                  <A key={p.id} href={`/san-pham/${p.id}`}><img src={p.thumbnail} alt="" /><span>{p.name}<small>{p.category}</small></span><b>{money(p.price)}</b><Icon name="arrow-diagonal" /></A>
                )) : <p>Chưa có thiết kế phù hợp. Thử “đầm”, “quần” hoặc một màu bạn yêu.</p>}
              </div>
            )}
          </div>
        </div>
      </div>
      <nav className="mobile-nav" id="mobile-nav" hidden={!menuOpen} aria-label="Menu di động">
        <A href="/san-pham?sort=newest">Hàng mới về</A><A href="/san-pham?gender=Nữ">Thời trang nữ</A><A href="/san-pham?gender=Nam">Thời trang nam</A>
        <A href="/san-pham?gender=Unisex">Unisex</A><A href="/san-pham?gender=Phụ kiện">Phụ kiện</A><A href="/danh-rieng-cho-ban">✧ Dành riêng cho bạn</A><A href="/tim-bang-anh">Tìm kiếm bằng hình ảnh</A>
      </nav>
    </header>
  );
}

function Footer() {
  return (
    <footer className="footer">
      <div className="footer-main container">
        <div className="footer-brand"><A href="/" className="wordmark">VELASTYLE<span className="brand-star">✳</span></A><p>Thời trang có thể thay đổi.<br />Phong cách là chính bạn.</p><span className="footer-signature">Được chọn bằng gu. Được hiểu bằng công nghệ.</span></div>
        <div><h3>Khám phá</h3><A href="/san-pham?sort=newest">Thiết kế mới</A><A href="/san-pham?gender=Nữ">Thời trang nữ</A><A href="/san-pham?gender=Nam">Thời trang nam</A><A href="/danh-rieng-cho-ban">Dành riêng cho bạn</A></div>
        <div><h3>Chúng mình ở đây</h3><A href="/thong-tin/ve-chung-toi">Về VELASTYLE</A><A href="/thong-tin/giao-hang">Giao hàng & đổi trả</A><A href="/thong-tin/kich-thuoc">Hướng dẫn kích thước</A><A href="/thong-tin/lien-he">Liên hệ & hỗ trợ</A></div>
        <div className="footer-note"><span className="small-label">MỘT CHÚT CẢM HỨNG MỖI NGÀY</span><p>Mặc điều bạn yêu.<br />Yêu điều bạn mặc.</p><A href="/san-pham" className="underlined">Tìm cảm hứng của bạn <span>↗</span></A></div>
      </div>
      <div className="footer-bottom container"><span>© 2026 VELASTYLE. Dự án thời trang & gợi ý cá nhân hóa.</span><A href="/thong-tin/bao-mat">Quyền riêng tư</A><span>Tiếng Việt · VND ₫</span></div>
    </footer>
  );
}

export function Layout({ children }: { children: ReactNode }) {
  const { ready, bootError } = useApp();
  const [scrollY, setScrollY] = useState(0);

  useEffect(() => {
    let queued = false;
    const onScroll = () => {
      if (queued) return;
      queued = true;
      requestAnimationFrame(() => { setScrollY(window.scrollY); queued = false; });
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <>
      <div className="navigation-progress" aria-hidden="true" />
      <a className="skip-link" href="#main">Chuyển đến nội dung</a>
      <Announcement />
      <Header scrolled={scrollY > 25} />
      {bootError ? (
        <main id="main" tabIndex={-1}>
          <section className="container page-space">
            <div className="empty-state"><Icon name="return" /><h2>Chưa kết nối được tủ đồ</h2><p>{bootError}</p><a className="button primary" href="/">Thử lại</a></div>
          </section>
        </main>
      ) : ready ? (
        <main id="main" tabIndex={-1}>{children}</main>
      ) : (
        <main id="main" tabIndex={-1}><div className="initial-loading"><span className="loading-star">✳</span><p>Đang mở tủ đồ của bạn…</p></div></main>
      )}
      <Footer />
      <button className={`back-top icon-btn ${scrollY > 400 ? 'back-top-visible' : ''}`.trim()} data-action="back-top" aria-label="Lên đầu trang" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}><Icon name="arrow-up" /></button>
    </>
  );
}
