import { useEffect, useState, type FormEvent } from 'react';
import { useLocation } from 'react-router';
import { api } from '../api';
import { Breadcrumb, EmptyState, ErrorState, ProductGrid } from '../components/common';
import { useQuickView } from '../components/ProductDetail';
import { useApp } from '../context';
import { colorHex, money } from '../format';
import { useAsync } from '../hooks/useAsync';
import { usePageReady } from '../hooks/usePageReady';
import { Icon } from '../icons';
import type { ProductPage } from '../types';

const PRICES: [string, string][] = [['', 'Tất cả mức giá'], ['700000', 'Dưới 700.000đ'], ['1000000', 'Dưới 1.000.000đ'], ['1500000', 'Dưới 1.500.000đ'], ['2500000', 'Dưới 2.500.000đ']];
const SORTS: [string, string][] = [['featured', 'Tuyển chọn nổi bật'], ['newest', 'Mới nhất'], ['popular', 'Được yêu thích nhất'], ['price-asc', 'Giá: thấp đến cao'], ['price-desc', 'Giá: cao đến thấp']];
const SIZES = ['S', 'M', 'L', 'XL', 'Freesize', '35', '36', '37', '38', '39'];

function pageTitle(params: URLSearchParams) {
  const gender = params.get('gender') || '';
  if (params.get('q')) return `Kết quả cho “${params.get('q')}”`;
  if (gender === 'Nữ') return 'Nét riêng của nàng';
  if (gender === 'Nam') return 'Phong thái của chàng';
  if (gender === 'Unisex') return 'Phong cách không giới hạn';
  if (gender === 'Phụ kiện') return 'Chi tiết làm nên khác biệt';
  if (params.get('sort') === 'newest') return 'Một mùa cảm hứng mới';
  return 'Khám phá mọi thiết kế';
}

export default function Catalog() {
  const { search } = useLocation();
  const { go, categories, brands } = useApp();
  const openQuick = useQuickView();
  const params = new URLSearchParams(search);
  const [filtersOpen, setFiltersOpen] = useState(false);

  const { data, error } = useAsync(() => {
    const apiParams = new URLSearchParams(search);
    apiParams.set('limit', '12');
    return api<ProductPage>('/products?' + apiParams);
  }, [search]);
  usePageReady(!!data, '/san-pham' + search);

  useEffect(() => {
    document.body.classList.toggle('filters-open', filtersOpen);
    return () => document.body.classList.remove('filters-open');
  }, [filtersOpen]);
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') setFiltersOpen(false); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  function updateQuery(changes: Record<string, string>) {
    const next = new URLSearchParams(window.location.search);
    Object.entries(changes).forEach(([key, value]) => (value ? next.set(key, value) : next.delete(key)));
    go(window.location.pathname + (next.size ? '?' + next : ''), { scroll: false });
  }

  if (error) return <ErrorState error={error} />;
  if (!data) return null;

  const gender = params.get('gender') || '';
  const style = params.get('style') || '';
  const current = +(params.get('page') || 1);
  const chips = [...params.entries()].filter(([key, value]) => !['sort', 'page', 'q'].includes(key) && value).map(([key, value]) => {
    const name = key === 'category' ? categories.find(c => c.id === +value)?.name
      : key === 'brand' ? brands.find(b => b.id === +value)?.name
      : key === 'max_price' ? 'Dưới ' + money(+value)
      : key === 'sale' ? 'Đang có ưu đãi' : value;
    return { key, label: name || value };
  });

  const onFilterChange = (event: FormEvent<HTMLFormElement>) => {
    const form = event.currentTarget;
    const values = Object.fromEntries(new FormData(form)) as Record<string, string>;
    updateQuery({ ...values, sale: (form.elements.namedItem('sale') as HTMLInputElement | null)?.checked ? 'true' : '', page: '' });
  };

  return (
    <section className="container page-space">
      <Breadcrumb label="Bộ sưu tập" />
      <div className="page-intro">
        <span className="small-label">BỘ SƯU TẬP VELASTYLE</span>
        <h1>{pageTitle(params)}</h1>
        <p>Những thiết kế được tuyển chọn để đồng hành cùng bạn, từ ngày thường đến những dịp đặc biệt.</p>
        <div className="catalog-editorial"><div><span>CHỌN CÓ CHỦ ĐÍCH. MẶC CÓ PHONG CÁCH.</span><p>Một thiết kế đúng gu có thể làm đẹp cả một ngày.</p></div><span>✳</span></div>
      </div>
      <div className="catalog-layout">
        <aside className={`filter-sidebar ${filtersOpen ? 'mobile-open' : ''}`.trim()} id="filter-sidebar">
          <div className="filter-drawer-head">
            <div><span className="small-label">CHỌN ĐÚNG GU CỦA BẠN</span><h2>Bộ lọc thiết kế</h2></div>
            <button className="icon-btn" data-studio-action="close-filters" aria-label="Đóng bộ lọc" onClick={() => setFiltersOpen(false)}><Icon name="close" /></button>
          </div>
          <form id="filter-form" key={search} onChange={onFilterChange} onSubmit={event => event.preventDefault()}>
            <div className="filter-group">
              <h3>Gu của bạn <span>−</span></h3>
              <select name="style" aria-label="Phong cách" defaultValue={style}>
                <option value="">Tự do khám phá</option>
                {['Tối giản', 'Thanh lịch', 'Nữ tính', 'Năng động'].map(s => <option key={s}>{s}</option>)}
              </select>
            </div>
            <div className="filter-group">
              <h3>Phong cách dành cho <span>−</span></h3>
              {['Tất cả', 'Nữ', 'Nam', 'Unisex', 'Phụ kiện'].map(v => {
                const value = v === 'Tất cả' ? '' : v;
                return <label key={v} className="filter-option"><input type="radio" name="gender" value={value} defaultChecked={value === gender} />{v}</label>;
              })}
            </div>
            <div className="filter-group">
              <h3>Danh mục <span>−</span></h3>
              <select name="category" aria-label="Danh mục" defaultValue={params.get('category') || ''}>
                <option value="">Tất cả danh mục</option>
                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div className="filter-group">
              <h3>Khoảng giá <span>−</span></h3>
              {PRICES.map(([value, label]) => <label key={value} className="filter-option"><input type="radio" name="max_price" value={value} defaultChecked={value === (params.get('max_price') || '')} />{label}</label>)}
            </div>
            <div className="filter-group">
              <h3>Màu sắc <span>−</span></h3>
              <div className="filter-color-list">
                {Object.entries(colorHex).map(([name, hex]) => (
                  <button key={name} type="button" className={`color-button ${params.get('color') === name ? 'active' : ''}`} style={{ background: hex }} data-filter-color={name} title={name} aria-label={`Màu ${name}`} aria-pressed={params.get('color') === name}
                    onClick={() => updateQuery({ color: params.get('color') === name ? '' : name, page: '' })} />
                ))}
              </div>
            </div>
            <div className="filter-group">
              <h3>Kích thước <span>−</span></h3>
              <select name="size" aria-label="Kích thước" defaultValue={params.get('size') || ''}>
                <option value="">Tất cả kích thước</option>
                {SIZES.map(v => <option key={v}>{v}</option>)}
              </select>
            </div>
            <div className="filter-group">
              <h3>Thương hiệu <span>−</span></h3>
              <select name="brand" aria-label="Thương hiệu" defaultValue={params.get('brand') || ''}>
                <option value="">Tất cả thương hiệu</option>
                {brands.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
            </div>
            <button type="button" className="filter-clear" data-action="clear-filters" onClick={() => go('/san-pham')}>Xóa tất cả bộ lọc</button>
            <div className="filter-group"><label className="filter-option"><input name="sale" type="checkbox" value="true" defaultChecked={params.get('sale') === 'true'} />Chỉ xem thiết kế ưu đãi</label></div>
          </form>
          <div className="filter-drawer-footer"><button className="button primary wide" data-studio-action="close-filters" onClick={() => setFiltersOpen(false)}>Xem thiết kế phù hợp →</button></div>
        </aside>
        <button className="filter-scrim" data-studio-action="close-filters" aria-label="Đóng bộ lọc" onClick={() => setFiltersOpen(false)} />
        <div>
          <form className="catalog-search" id="catalog-search" key={'q' + (params.get('q') || '')} onSubmit={event => {
            event.preventDefault();
            updateQuery({ q: String(new FormData(event.currentTarget).get('q') || '').trim(), page: '' });
          }}>
            <Icon name="search" />
            <input name="q" placeholder="Tìm thiết kế bạn yêu…" defaultValue={params.get('q') || ''} aria-label="Tìm trong bộ sưu tập" />
            <button className="icon-btn" type="submit" aria-label="Tìm kiếm"><Icon name="arrow" /></button>
          </form>
          <div className="catalog-toolbar">
            <p>{data.total} thiết kế {params.size ? 'phù hợp' : 'trong bộ sưu tập'}</p>
            <button className="filter-mobile-toggle" data-action="toggle-filters" aria-expanded={filtersOpen} onClick={() => setFiltersOpen(open => !open)}><Icon name="filter" /> Bộ lọc</button>
            <select id="catalog-sort" aria-label="Sắp xếp" value={params.get('sort') || 'featured'} onChange={event => updateQuery({ sort: event.target.value, page: '' })}>
              {SORTS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
          </div>
          {chips.length > 0 && (
            <div className="active-filters">
              {chips.map(chip => <button key={chip.key} className="filter-chip" data-clear-filter={chip.key} onClick={() => updateQuery({ [chip.key]: '', page: '' })}>{chip.label} <Icon name="close" /></button>)}
              <button className="filter-clear" data-action="clear-filters" onClick={() => go('/san-pham')}>Xóa tất cả</button>
            </div>
          )}
          {data.items.length
            ? <ProductGrid items={data.items} catalog onQuick={openQuick} />
            : <EmptyState title="Chưa tìm thấy thiết kế phù hợp" description="Thử đổi từ khóa hoặc bớt một vài bộ lọc để khám phá thêm nhé." button="Xem tất cả" href="/san-pham" icon="search" />}
          {data.pages > 1 && (
            <div className="pagination">
              {Array.from({ length: data.pages }, (_, i) => {
                const n = i + 1;
                const hidden = data.pages > 9 && n !== 1 && n !== data.pages && Math.abs(n - current) > 2;
                return <button key={n} data-page={n} className={data.page === n ? 'active' : ''} aria-label={`Trang ${n}`} hidden={hidden} onClick={() => updateQuery({ page: String(n) })}>{n}</button>;
              })}
              <span className="page-description">Trang {current} / {data.pages}</span>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
