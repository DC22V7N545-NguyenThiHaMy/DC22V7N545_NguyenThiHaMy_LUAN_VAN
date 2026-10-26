import type { ReactNode } from 'react';
import { A } from '../../components/common';
import { formatDate } from '../../format';
import { Icon } from '../../icons';
import type { ModelRun } from '../../types';

const NAV: [string, string, string][] = [
  ['', 'Tổng quan', 'grid'], ['san-pham', 'Sản phẩm', 'bag'], ['danh-muc', 'Danh mục', 'grid'], ['thuong-hieu', 'Thương hiệu', 'box'],
  ['nguoi-dung', 'Người dùng', 'user'], ['don-hang', 'Đơn hàng', 'box'], ['tuong-tac', 'Tương tác', 'heart'], ['ai', 'Gợi ý & mô hình AI', 'sparkles'],
  ['danh-gia', 'Đánh giá mô hình', 'chart'], ['dataset', 'Dữ liệu & dataset', 'database'], ['cai-dat', 'Cài đặt', 'settings'],
];

export const methodLabels: Record<string, string> = { collaborative: 'Lọc cộng tác', als: 'ALS (phân rã ma trận)', clip: 'CLIP', hybrid: 'Hybrid' };
export const eventLabels: Record<string, string> = { view: 'Lượt xem', favorite: 'Yêu thích', cart: 'Thêm giỏ', purchase: 'Mua mô phỏng' };
const runLabels: Record<string, string> = { 'generate-embeddings': 'Tạo đặc trưng CLIP', 'rebuild-cf': 'Xây dựng lọc cộng tác', evaluate: 'Đánh giá mô hình' };
const statusLabels = { completed: 'Hoàn tất', running: 'Đang xử lý', failed: 'Có lỗi' };

export function AdminShell({ section, children }: { section: string; children: ReactNode }) {
  return (
    <div className="admin-wrapper">
      <aside className="admin-sidebar">
        <span className="small-label">VELASTYLE / QUẢN TRỊ</span>
        <nav>{NAV.map(([path, label, icon]) => <A key={path} href={`/quan-tri${path ? '/' + path : ''}`} className={section === path ? 'active' : ''}><Icon name={icon} /> {label}</A>)}</nav>
        <A href="/" className="underlined" style={{ margin: '24px 13px 0' }}>Về cửa hàng ↗</A>
      </aside>
      <section className="admin-main">{children}</section>
    </div>
  );
}

export function AdminHead({ title, description, action }: { title: string; description: string; action?: ReactNode }) {
  return <div className="admin-head"><div><h1>{title}</h1><p>{description}</p></div>{action}</div>;
}

export function Table({ headers, rows }: { headers: string[]; rows: ReactNode[][] }) {
  return (
    <div className="admin-table-wrap">
      <table className="admin-table">
        <thead><tr>{headers.map(h => <th key={h}>{h}</th>)}</tr></thead>
        <tbody>
          {rows.length
            ? rows.map((row, i) => <tr key={i}>{row.map((cell, j) => <td key={j}>{cell}</td>)}</tr>)
            : <tr><td colSpan={headers.length} style={{ textAlign: 'center', padding: 35, color: '#929581' }}>Chưa có dữ liệu.</td></tr>}
        </tbody>
      </table>
    </div>
  );
}

export function BarChart({ items, percent = false, precision = 1 }: { items: { label: string; value: number }[]; percent?: boolean; precision?: number }) {
  const max = Math.max(...items.map(i => i.value), 0.001);
  return (
    <div className="bar-chart">
      {items.map(i => (
        <div className="bar-row" key={i.label}>
          <span>{i.label}</span>
          <div className="bar-track"><div className="bar-value" style={{ width: `${Math.max(0, i.value / max * 100)}%` }} /></div>
          <span>{percent ? (i.value * 100).toFixed(precision) + '%' : Number(i.value).toFixed(precision)}</span>
        </div>
      ))}
    </div>
  );
}

export function RunList({ runs }: { runs: ModelRun[] }) {
  if (!runs.length) return <p className="form-hint">Chưa có tác vụ nào được thực hiện.</p>;
  return (
    <>
      {runs.map(r => (
        <div className="run-item" key={r.id}>
          <span>{runLabels[r.kind] || r.kind} · #{r.id}</span>
          <span className={`status-pill ${r.status}`}>{statusLabels[r.status]}</span>
          <p>{r.message} · {formatDate(r.created_at)}</p>
        </div>
      ))}
    </>
  );
}

export function ProductCell({ thumbnail, name }: { thumbnail: string; name: string }) {
  return <div className="admin-product-cell"><img src={thumbnail} alt="" />{name}</div>;
}
