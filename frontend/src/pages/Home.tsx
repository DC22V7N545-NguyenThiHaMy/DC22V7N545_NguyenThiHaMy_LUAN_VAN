import { Fragment, useEffect, useRef, useState, type ReactNode } from 'react';
import { api } from '../api';
import { A, EmptyState, ErrorState, ProductCard, ProductGrid, SectionHeading } from '../components/common';
import { useQuickView } from '../components/ProductDetail';
import { StyleQuiz } from '../components/modals';
import { useApp } from '../context';
import { motionAllowed } from '../format';
import { useAsync } from '../hooks/useAsync';
import { useEditorialMotion } from '../hooks/useEditorialMotion';
import { usePageReady } from '../hooks/usePageReady';
import { Icon } from '../icons';
import type { JournalItem, Product, ProductPage, Recommendations, Storefront } from '../types';
import { JournalCard } from './Journal';

interface Slide { eyebrow: string; title: ReactNode; description: ReactNode; image: string; caption: string; label: string; href: string; button: string }

const SLIDES: Slide[] = [
  { eyebrow: 'BỘ SƯU TẬP THU / ĐÔNG 2026', title: <>Phong cách.<br /><em>Là chính bạn.</em></>, description: <>Không chỉ là những gì bạn mặc.<br />Là cách bạn kể câu chuyện của riêng mình.</>, image: 'hero-beige.jpg', caption: 'Vẻ đẹp từ những điều giản đơn.', label: 'NGHỆ THUẬT CỦA ĐỜI THƯỜNG', href: '/san-pham?sort=newest', button: 'Khám phá bộ sưu tập' },
  { eyebrow: 'NHỮNG NGÀY THẬT DỊU DÀNG', title: <>Một chút nắng.<br /><em>Một chút riêng.</em></>, description: <>Những phom dáng thảnh thơi, gam màu nhẹ tênh.<br />Để mỗi ngày đều có một lý do để đẹp.</>, image: 'dress-satin.jpg', caption: 'Mang theo một khoảng trời riêng.', label: 'CẢM HỨNG NỮ TÍNH', href: '/san-pham?gender=Nữ&style=Nữ tính', button: 'Tìm nét riêng của nàng' },
  { eyebrow: 'TỦ ĐỒ CÓ CHỦ ĐÍCH', title: <>Giản đơn.<br /><em>Không đơn điệu.</em></>, description: <>Thiết kế dễ mặc, dễ kết hợp và luôn đúng gu.<br />Cho những ngày bạn muốn là chính mình.</>, image: 'store.jpg', caption: 'Những điều bạn muốn mặc lại.', label: 'THIẾT KẾ CHO MỖI NGÀY', href: '/san-pham?style=Tối giản', button: 'Khám phá đồ thiết yếu' },
];
const INSET_IMAGES = ['dress-garden.jpg', 'dress-floral.jpg', 'jacket-casual.jpg'];
const INSET_LABELS = ['Chút riêng của nàng.', 'Nhẹ một chút, yêu hơn.', 'Đơn giản mà có gu.'];
const HERO_ALTS = ['Hai nàng thơ trong những thiết kế màu kem thanh lịch', 'Đầm maxi xanh nhẹ nhàng trên bãi biển', 'Tuyển chọn áo khoác cho những ngày thường'];
const TAB_LABEL: Record<string, string> = { Nữ: 'Thời trang nữ', Nam: 'Thời trang nam' };

function Hero({ total }: { total: number }) {
  const { showModal } = useApp();
  const [slide, setSlide] = useState(0);
  const [paused, setPaused] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const area = useRef<HTMLElement>(null);
  const photo = useRef<HTMLImageElement>(null);
  const copy = useRef<HTMLDivElement>(null);
  const first = useRef(true);
  const current = SLIDES[slide];

  useEditorialMotion(area, '.cover-edition,.atelier-cover-copy .eyebrow,.atelier-cover-copy h1,.atelier-cover-copy>p,.cover-cta-row,.cover-footnote,.cover-inset', []);
  useEffect(() => { SLIDES.slice(1).forEach(s => { new Image().src = '/static/images/' + s.image; }); }, []);

  useEffect(() => {
    if (!motionAllowed() || paused || hovered || focused) return;
    const timer = setInterval(() => { if (!document.hidden) setSlide(s => (s + 1) % SLIDES.length); }, 7500);
    return () => clearInterval(timer);
  }, [paused, hovered, focused]);

  useEffect(() => {
    if (first.current) { first.current = false; return; }
    if (!motionAllowed()) return;
    photo.current?.animate([{ opacity: 0.35, transform: 'scale(1.06)' }, { opacity: 1, transform: 'scale(1)' }], { duration: 900, easing: 'ease-out' });
    copy.current?.animate([{ opacity: 0, transform: 'translateY(14px)' }, { opacity: 1, transform: 'translateY(0)' }], { duration: 550, easing: 'ease-out' });
    document.querySelector('.cover-inset')?.animate([{ opacity: 0.2, translate: '0 12px' }, { opacity: 1, translate: '0 0' }], { duration: 600, easing: 'ease-out' });
  }, [slide]);

  const change = (index: number) => setSlide((index + 3) % 3);
  return (
    <section ref={area} className="hero editorial-hero atelier-hero" aria-label="Cảm hứng thời trang VELASTYLE" aria-roledescription="bộ sưu tập trình chiếu"
      onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}
      onFocus={() => setFocused(true)} onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setFocused(false); }}>
      <div className="hero-copy atelier-cover-copy" ref={copy}>
        <div className="cover-edition"><span>VELA / TUYỂN TẬP PHONG CÁCH</span><span>THU — ĐÔNG 2026</span></div>
        <span className="eyebrow">{current.eyebrow}</span>
        <h1>{current.title}</h1>
        <p>{current.description}</p>
        <div className="cover-cta-row">
          <A href={current.href} className="button primary hero-cta">{current.button} <Icon name="arrow" /></A>
          <button className="cover-personal-link" data-studio-action="quiz" onClick={() => showModal(<StyleQuiz />, true)}>Tìm gu của tôi <span>✧</span></button>
        </div>
        <div className="cover-footnote">
          <span className="cover-footnote-mark">✳</span>
          <div><b>Được chọn bằng gu.</b><span>Được hiểu bằng công nghệ.</span></div>
          <div className="cover-catalog-count"><b>{total}</b><span>thiết kế để khám phá</span></div>
        </div>
        <span className="cover-watermark" aria-hidden="true">V.</span>
      </div>
      <div className="hero-image atelier-cover-image">
        <img ref={photo} id="hero-photo" src={'/static/images/' + current.image} alt={HERO_ALTS[slide]} style={{ objectPosition: slide === 1 ? '50% 35%' : '50% 40%' }} fetchPriority="high" width={1800} height={1200} />
        <div className="cover-image-topline"><span>MỘT MÙA CẢM HỨNG MỚI</span><span>VELASTYLE ®</span></div>
        <div className="cover-roundel" aria-hidden="true">
          <svg viewBox="0 0 100 100"><defs><path id="vela-roundel-path" d="M50,50 m-36,0 a36,36 0 1,1 72,0 a36,36 0 1,1 -72,0" /></defs><text><textPath href="#vela-roundel-path" textLength="222">MỘT CHÚT TINH TẾ · MỘT PHIÊN BẢN RIÊNG · </textPath></text></svg>
          <span>✳</span>
        </div>
        <A className="cover-inset" href={current.href} aria-label="Khám phá cảm hứng nữ tính">
          <div className="inset-pin" aria-hidden="true" />
          <img id="hero-inset-photo" src={'/static/images/' + INSET_IMAGES[slide]} alt={INSET_LABELS[slide]} width={400} height={550} />
          <span><i>{INSET_LABELS[slide]}</i><Icon name="arrow-diagonal" /></span>
        </A>
        <div className="hero-image-label"><span>{current.label}</span><p>{current.caption}</p></div>
        <span className="cover-vertical-label">PHONG CÁCH KHÔNG CẦN MỘT KHUÔN MẪU.</span>
      </div>
      <div className="hero-slider-controls cover-slider-footer">
        <div className="cover-current"><span className="hero-slide-number"><b id="slide-number">{String(slide + 1).padStart(2, '0')}</b><span> / 03</span></span><span className="cover-current-label">Một mùa. Nhiều cảm hứng.</span></div>
        <div className="hero-dots cover-collection-tabs">
          {[['Thanh lịch tự nhiên', 'hero-beige.jpg'], ['Một khoảng trời riêng', 'dress-satin.jpg'], ['Giản đơn mỗi ngày', 'store.jpg']].map(([label, image], i) => (
            <button key={image} className={`hero-dot ${i === slide ? 'active' : ''}`} data-hero-slide={i} aria-label={`Bộ sưu tập ${i + 1}`} aria-pressed={i === slide} onClick={() => change(i)}>
              <img src={'/static/images/' + image} alt="" width={38} height={43} /><span><small>0{i + 1} / CẢM HỨNG</small><b>{label}</b></span><i aria-hidden="true" />
            </button>
          ))}
        </div>
        <div className="hero-arrows">
          <button className="hero-pause" data-hero-pause aria-label={paused ? 'Tiếp tục trình chiếu' : 'Tạm dừng trình chiếu'} aria-pressed={paused} onClick={() => setPaused(p => !p)}>{paused ? '▷' : 'Ⅱ'}</button>
          <button data-hero-direction="-1" aria-label="Bộ sưu tập trước" onClick={() => change(slide - 1)}><Icon name="arrow" /></button>
          <button data-hero-direction="1" aria-label="Bộ sưu tập tiếp theo" onClick={() => change(slide + 1)}><Icon name="arrow" /></button>
        </div>
      </div>
    </section>
  );
}

function HomeProducts({ total }: { total: number }) {
  const { user, homeTab, setHomeTab } = useApp();
  const openQuick = useQuickView();
  const query = homeTab === 'Tất cả' ? '' : `&gender=${encodeURIComponent(homeTab)}`;
  const { data, loading } = useAsync(
    () => (user ? api<Recommendations>('/recommendations/hybrid?k=6' + query) : api<ProductPage>('/products?limit=6' + query)) as Promise<{ items: Product[] }>,
    [homeTab, user?.id],
  );
  const grid = useRef<HTMLDivElement>(null);
  const first = useRef(true);
  useEffect(() => {
    if (first.current) { if (data) first.current = false; return; }
    if (!motionAllowed()) return;
    grid.current?.querySelectorAll('.product-card').forEach((card, i) =>
      card.animate([{ opacity: 0, transform: 'translateY(15px)' }, { opacity: 1, transform: 'none' }], { duration: 450, delay: i * 45, fill: 'both', easing: 'ease-out' }));
  }, [data]);

  return (
    <>
      <div className="product-tabs">
        {['Tất cả', 'Nữ', 'Nam', 'Unisex', 'Phụ kiện'].map(tab => (
          <button key={tab} className={`tab-button ${homeTab === tab ? 'active' : ''}`} data-home-tab={tab} onClick={() => setHomeTab(tab)}>{TAB_LABEL[tab] ?? tab}</button>
        ))}
        <span className="collection-count">{total} thiết kế, vô vàn câu chuyện.</span>
      </div>
      <div id="home-products" ref={grid} aria-busy={loading || undefined}>
        {data && (data.items.length
          ? <ProductGrid items={data.items} reason={!!user} onQuick={openQuick} />
          : <EmptyState title="Một chút cảm hứng mới đang đến" description="Hãy ghé các bộ sưu tập khác nhé." />)}
      </div>
    </>
  );
}

const GENDER_TILES = [['Nữ', 'Nét riêng của nàng', 'dress-floral.jpg'], ['Nam', 'Phong thái của chàng', 'mens-suit.jpg'], ['Unisex', 'Tự do là chính mình', 'jacket-casual.jpg'], ['Phụ kiện', 'Một chi tiết. Rất riêng.', 'bag-leather.jpg']];
const STYLE_TILES = [['Tối giản', 'Ít một chút, đủ một chút.', 'wardrobe.jpg'], ['Thanh lịch', 'Chỉn chu mà không gắng gượng.', 'blouse-cotton.jpg'], ['Nữ tính', 'Dịu dàng, không có khuôn mẫu.', 'dress-rose.jpg'], ['Năng động', 'Theo nhịp của chính bạn.', 'dress-sunshine.jpg']];
const FAQ = [
  ['Làm thế nào để tìm đúng kích thước?', 'Mỗi thiết kế có các kích thước và tình trạng tồn kho riêng. Mở “Hướng dẫn kích thước” trên trang sản phẩm, so sánh số đo với món đồ bạn đang mặc thoải mái. Bảng số đo là tham khảo.'],
  ['Gợi ý dành cho bạn hoạt động như thế nào?', 'VELASTYLE kết hợp lịch sử xem, yêu thích và mua sắm với đặc trưng hình ảnh, văn bản CLIP. Khi bạn chưa có lịch sử, chúng mình bắt đầu từ sở thích bạn chọn và những thiết kế đang được quan tâm.'],
  ['Tôi có thể tìm thiết kế bằng một tấm ảnh không?', 'Có. Đăng nhập, chọn biểu tượng máy ảnh trong phần tìm kiếm và tải ảnh JPG, PNG hoặc WebP tối đa 5 MB. CLIP sẽ tìm thiết kế có hình ảnh tương đồng. Ảnh tìm kiếm không được lưu lại.'],
  ['Đơn hàng có thu tiền và giao hàng thật không?', 'Đây là website đồ án. Đặt hàng, phí giao hàng và trạng thái đơn được mô phỏng để bạn trải nghiệm luồng mua sắm; không có khoản thanh toán hoặc giao hàng thực tế.'],
];

export default function Home() {
  const openQuick = useQuickView();
  const { showModal } = useApp();
  const rail = useRef<HTMLDivElement>(null);
  const { data, error } = useAsync(async () => {
    const [summary, latest, popular, articles] = await Promise.all([
      api<Storefront>('/storefront'), api<ProductPage>('/products?sort=newest&limit=8'), api<ProductPage>('/products?sort=popular&limit=4'), api<JournalItem[]>('/journal'),
    ]);
    return { summary, latest, popular, articles };
  }, []);
  usePageReady(!!data, '/');
  if (error) return <ErrorState error={error} />;
  if (!data) return null;
  const { summary, latest, popular, articles } = data;
  const scrollRail = (direction: number) => rail.current?.scrollBy({ left: direction * (rail.current.clientWidth * 0.8), behavior: motionAllowed() ? 'smooth' : 'instant' });

  return (
    <>
      <Hero total={summary.total} />
      <div className="container"><div className="benefit-strip">
        <div><Icon name="truck" /> Miễn phí vận chuyển từ 999.000đ</div><div><Icon name="return" /> Đổi trả dễ dàng trong 30 ngày</div>
        <div><Icon name="shield" /> An tâm trong từng lựa chọn</div><div><Icon name="sparkles" /> Phong cách dành riêng cho bạn</div>
      </div></div>
      <section className="container section category-section">
        <SectionHeading kicker="TÌM CẢM HỨNG TỪ NHỮNG ĐIỀU BẠN YÊU" title={<>Mỗi ngày, <em>một phiên bản mới.</em></>} description="Một tủ đồ đủ phong phú, cho mọi nhịp sống của bạn." href={null} />
        <div className="category-grid">
          {GENDER_TILES.map(([g, title, image], i) => (
            <A key={g} href={`/san-pham?gender=${encodeURIComponent(g)}`} className="category-card" style={{ '--card-index': i } as React.CSSProperties}>
              <div className="category-photo"><img src={'/static/images/' + image} alt={'Thời trang ' + g} loading="lazy" width={400} height={500} /><span className="category-number">0{i + 1}</span></div>
              <div className="category-info"><div><h3>{title}</h3><span>{summary.genders[g] || 0} thiết kế · {g === 'Phụ kiện' ? 'Túi, giày & điểm nhấn' : 'Thời trang ' + g.toLowerCase()}</span></div><span className="category-link"><Icon name="arrow-diagonal" /></span></div>
            </A>
          ))}
        </div>
      </section>
      <section className="container section selected-section" id="selected">
        <SectionHeading kicker="TUYỂN CHỌN BỞI VELASTYLE" title={<>Những lựa chọn <em>dành cho bạn</em> <span className="sparkle">✧</span></>} description={<>Đẹp một cách tự nhiên. Được chọn một cách tinh tế.<br />Khám phá những thiết kế có thể trở thành món đồ yêu thích tiếp theo.</>} label="Xem tất cả thiết kế" />
        <HomeProducts total={summary.total} />
        <div className="section-bottom"><A href="/san-pham" className="button outline round">Xem thêm trong tủ đồ VELA <Icon name="arrow" /></A></div>
      </section>
      <section className="season-story">
        <div className="story-image"><img src="/static/images/dress-garden.jpg" alt="Thiết kế đầm hoa trong nắng" loading="lazy" /><span className="story-caption">MỘT KHOẢNG TRỜI, MỘT CHÚT RIÊNG.</span></div>
        <div className="story-copy">
          <span className="small-label">CÂU CHUYỆN CỦA MÙA</span><span className="story-decoration" aria-hidden="true">✳</span>
          <h2>Chậm một nhịp.<br /><em>Đẹp theo cách riêng.</em></h2>
          <p>Một buổi sáng không vội. Một bộ đồ khiến bạn thoải mái. Đôi khi, cảm hứng đến từ những điều giản đơn nhất.</p>
          <p>Khám phá những thiết kế có thể đi cùng bạn từ quán cà phê quen đến một cuộc hẹn bất chợt.</p>
          <A href="/san-pham?style=Nữ tính" className="button outline round">Ghé thăm bộ sưu tập <Icon name="arrow-diagonal" /></A>
          <span className="story-edition">VELASTYLE / CẢM HỨNG 2026</span>
        </div>
      </section>
      <div className="brand-marquee" aria-hidden="true"><div>{Array.from({ length: 4 }, (_, i) => <Fragment key={i}><span>MẶC ĐIỀU BẠN YÊU</span><i>✳</i><span>YÊU ĐIỀU BẠN MẶC</span><i>✳</i></Fragment>)}</div></div>
      <section className="container section new-section">
        <SectionHeading kicker="MỚI ĐẾN TRONG TỦ ĐỒ" title={<>Chào những cảm hứng <em>mới.</em></>} description="Những thiết kế vừa có mặt. Có lẽ, món bạn đang tìm ở ngay đây." href="/san-pham?sort=newest" label="Tất cả hàng mới" />
        <div className="rail-wrap">
          <div className="product-rail" id="new-rail" ref={rail}>{latest.items.map((p, index) => <ProductCard key={p.id} p={p} index={index} onQuick={openQuick} />)}</div>
          <div className="rail-controls">
            <span>Kéo ngang để khám phá thêm</span>
            <div>
              <button data-rail="new-rail" data-direction="-1" aria-label="Thiết kế mới trước" onClick={() => scrollRail(-1)}><Icon name="arrow" /></button>
              <button data-rail="new-rail" data-direction="1" aria-label="Thiết kế mới tiếp theo" onClick={() => scrollRail(1)}><Icon name="arrow" /></button>
            </div>
          </div>
        </div>
      </section>
      <section className="container section style-section">
        <SectionHeading kicker="KHÔNG CẦN GIỐNG AI KHÁC" title={<>Hôm nay, bạn muốn <em>là ai?</em></>} description="Chọn một phong cách. Để phần cảm hứng còn lại cho chúng mình." href={null} />
        <div className="style-grid">
          {STYLE_TILES.map(([style, text, image]) => (
            <A key={style} href={`/san-pham?style=${encodeURIComponent(style)}`} className="style-tile">
              <img src={'/static/images/' + image} alt={'Cảm hứng ' + style.toLowerCase()} loading="lazy" />
              <div><span>{summary.styles[style] || 0} THIẾT KẾ</span><h3>{style}</h3><p>{text}</p></div>
              <span className="style-arrow"><Icon name="arrow-diagonal" /></span>
            </A>
          ))}
        </div>
      </section>
      <section className="quiz-banner container">
        <div className="quiz-art"><span>✧</span><div className="quiz-orbit orbit-one" /><div className="quiz-orbit orbit-two" /><span className="quiz-mini-label">GU CỦA BẠN<br />CẢM HỨNG CỦA VELA</span></div>
        <div className="quiz-copy">
          <span className="small-label">MỘT TRỢ LÝ, HIỂU GU CỦA BẠN</span>
          <h2>Một tủ đồ <em>hiểu bạn.</em></h2>
          <p>Ba lựa chọn nhỏ để tìm thấy những thiết kế gần với phong cách của bạn hơn. Chúng mình sẽ tiếp tục học từ những món bạn xem và yêu thích.</p>
          <button className="button primary round" data-studio-action="quiz" onClick={() => showModal(<StyleQuiz />, true)}>Tìm gu của tôi <Icon name="sparkles" /></button>
          <A className="quiz-direct" href="/danh-rieng-cho-ban">Xem gợi ý dành cho bạn →</A>
        </div>
      </section>
      <section className="container section popular-section">
        <SectionHeading kicker="NHỮNG THIẾT KẾ ĐƯỢC QUAN TÂM" title={<>Một chút yêu thích, <em>thêm chút cảm hứng.</em></>} description="Sắp xếp theo tương tác trong cửa hàng. Dữ liệu thử nghiệm có bao gồm tương tác mô phỏng." href="/san-pham?sort=popular" label="Xem bộ sưu tập" />
        <ProductGrid items={popular.items} className="four-column" onQuick={openQuick} />
      </section>
      <section className="journal-section"><div className="container section">
        <SectionHeading kicker="GÓC NHỎ CỦA NHỮNG NGƯỜI YÊU MẶC ĐẸP" title={<>Chuyện mặc. <em>Chuyện mình.</em></>} description="Một chút kiến thức, một chút cảm hứng — để mỗi lựa chọn đều có ý nghĩa." href="/cam-hung" label="Đọc thêm cảm hứng" />
        <div className="journal-grid">{articles.map(j => <JournalCard key={j.slug} j={j} />)}</div>
      </div></section>
      <section className="container section faq-section">
        <div>
          <span className="small-label">CHÚNG MÌNH Ở ĐÂY CÙNG BẠN</span>
          <h2>Để mỗi lựa chọn<br /><em>đều thật an tâm.</em></h2>
          <p>Có một vài điều bạn muốn biết trước khi bắt đầu? Những câu trả lời nhỏ ở ngay đây.</p>
          <A className="underlined" href="/thong-tin/lien-he">Thêm thông tin hỗ trợ <Icon name="arrow" /></A>
        </div>
        <div className="faq-list">{FAQ.map(([q, a]) => <details key={q} className="faq-item"><summary>{q}<span>+</span></summary><div className="accordion-content"><p>{a}</p></div></details>)}</div>
      </section>
      <div className="container"><div className="editor-note">
        <span className="small-label">TINH THẦN VELASTYLE</span>
        <h2>“Xu hướng đến rồi đi.<br />Cảm giác được là chính mình thì luôn ở lại.”</h2>
        <span className="small-label">MẶC ĐIỀU BẠN YÊU. YÊU ĐIỀU BẠN MẶC.</span>
      </div></div>
    </>
  );
}
