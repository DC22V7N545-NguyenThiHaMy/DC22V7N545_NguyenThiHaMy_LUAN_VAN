import type { AnchorHTMLAttributes, ReactNode } from 'react';
import { useApp } from '../context';
import { colorHex, money } from '../format';
import { Icon } from '../icons';
import type { Product } from '../types';

/** Internal link: client-side navigation for plain left clicks, normal browser behaviour otherwise. */
export function A({ href, children, onClick, ...rest }: AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) {
  const { go } = useApp();
  return (
    <a
      {...rest}
      href={href}
      data-link
      onClick={event => {
        onClick?.(event);
        if (event.defaultPrevented || event.ctrlKey || event.metaKey || event.shiftKey || event.button !== 0) return;
        event.preventDefault();
        go(href);
      }}
    >
      {children}
    </a>
  );
}

export function Breadcrumb({ label, previous = false }: { label: string; previous?: boolean }) {
  return (
    <div className="breadcrumb">
      <A href="/">Trang chủ</A><span>/</span>
      {previous && <><A href="/san-pham">Sản phẩm</A><span>/</span></>}
      <span>{label}</span>
    </div>
  );
}

interface EmptyProps { title: string; description: string; button?: string; href?: string; icon?: string }
export function EmptyState({ title, description, button = 'Khám phá thiết kế', href = '/san-pham', icon = 'bag' }: EmptyProps) {
  return (
    <div className="empty-state">
      <Icon name={icon} />
      <h2>{title}</h2>
      <p>{description}</p>
      {button && <A className="button primary" href={href}>{button} <Icon name="arrow" /></A>}
    </div>
  );
}

export function Skeletons({ n = 6 }: { n?: number }) {
  return (
    <div className="product-grid">
      {Array.from({ length: n }, (_, i) => (
        <div key={i}><div className="skeleton skeleton-photo" /><div className="skeleton skeleton-line" /><div className="skeleton skeleton-line short" /></div>
      ))}
    </div>
  );
}

export function ErrorState({ error }: { error: Error & { status?: number } }) {
  return (
    <section className="container page-space">
      <EmptyState title={error.status === 404 ? 'Thiết kế này chưa có trong tủ đồ' : 'Chưa thể mở cảm hứng'} description={error.message} button="Khám phá bộ sưu tập" href="/san-pham" icon="search" />
    </section>
  );
}

export function SectionHeading({ kicker, title, description, href = '/san-pham', label = 'Khám phá tất cả' }: { kicker: string; title: ReactNode; description?: ReactNode; href?: string | null; label?: string }) {
  return (
    <div className="section-heading">
      <div><span className="small-label">{kicker}</span><h2>{title}</h2>{description && <p>{description}</p>}</div>
      {href && <A href={href} className="button outline round">{label} <Icon name="arrow" /></A>}
    </div>
  );
}

interface CardOptions { reason?: boolean; score?: boolean; index?: number }

export function ProductCard({ p, reason = false, score = false, index = 0, onQuick }: CardOptions & { p: Product; onQuick: (id: number) => void }) {
  const { favorites, toggleFavorite } = useApp();
  const saved = favorites.has(p.id);
  return (
    <article className="product-card">
      <div className={`product-photo ${p.thumbnail.includes('/catalog-') ? 'catalog-product-photo' : ''}`}>
        <A href={`/san-pham/${p.id}`} aria-label={`Xem ${p.name}`} style={{ display: 'block', height: '100%' }}>
          <img src={p.thumbnail} alt={p.name} loading={index < 3 ? 'eager' : 'lazy'} width={600} height={800} />
        </A>
        {p.original_price ? <span className="product-badge sale">−{Math.round((1 - p.price / p.original_price) * 100)}%</span> : p.is_new ? <span className="product-badge">MỚI VỀ</span> : null}
        <button className={`product-heart ${saved ? 'saved' : ''}`} data-favorite={p.id} aria-label={saved ? 'Bỏ yêu thích' : 'Yêu thích sản phẩm'} aria-pressed={saved} onClick={() => void toggleFavorite(p.id)}>
          <Icon name="heart" />
        </button>
        <button className="quick-view" data-quick={p.id} onClick={() => onQuick(p.id)}><Icon name="eye" /> Xem nhanh thiết kế</button>
        {score && p.score !== undefined && <span className="image-search-score">Tương đồng cosine: {p.score.toFixed(3)}</span>}
      </div>
      <div className="product-info">
        <span className="product-category">{p.brand} / {p.category}</span>
        <A className="product-name" href={`/san-pham/${p.id}`}>{p.name}</A>
        <button className="product-cart" data-quick={p.id} aria-label={`Chọn kích thước và thêm ${p.name} vào giỏ`} onClick={() => onQuick(p.id)}><Icon name="bag" /></button>
        <div className="product-price">{money(p.price)}{p.original_price ? <span className="old-price">{money(p.original_price)}</span> : null}</div>
        <div className="swatches">
          <span className="swatch" style={{ background: colorHex[p.color] || '#b5ad98' }} title={p.color} />
          <span style={{ fontSize: 7, color: '#97998a', marginLeft: 3 }}>{p.color}</span>
        </div>
        {reason && p.reason ? <p className="product-reason">✧ {p.reason}</p> : null}
      </div>
    </article>
  );
}

export function ProductGrid({ items, catalog = false, className = '', onQuick, ...options }: CardOptions & { items: Product[]; catalog?: boolean; className?: string; onQuick: (id: number) => void }) {
  return (
    <div className={`product-grid ${catalog ? 'catalog-grid' : ''} ${className}`.trim()}>
      {items.map((p, index) => <ProductCard key={p.id} p={p} index={index} onQuick={onQuick} {...options} />)}
    </div>
  );
}
