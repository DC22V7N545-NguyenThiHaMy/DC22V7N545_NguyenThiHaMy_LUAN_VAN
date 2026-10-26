import { useParams } from 'react-router';
import { api } from '../api';
import { A, Breadcrumb, ErrorState } from '../components/common';
import { useAsync } from '../hooks/useAsync';
import { usePageReady } from '../hooks/usePageReady';
import { Icon } from '../icons';
import type { InfoPage, JournalArticle, JournalItem } from '../types';

export function JournalCard({ j }: { j: JournalItem }) {
  return (
    <article className="journal-card">
      <A href={`/cam-hung/${j.slug}`} className="journal-photo"><img src={'/static/images/' + j.image} alt={j.title} loading="lazy" /><span>{j.minutes} PHÚT ĐỌC</span></A>
      <span className="small-label">{j.category}</span>
      <h3><A href={`/cam-hung/${j.slug}`}>{j.title}</A></h3>
      <p>{j.intro}</p>
      <A className="underlined" href={`/cam-hung/${j.slug}`}>Đọc câu chuyện <Icon name="arrow-diagonal" /></A>
    </article>
  );
}

function JournalList() {
  const { data, error } = useAsync(() => api<JournalItem[]>('/journal'), []);
  usePageReady(!!data, '/cam-hung');
  if (error) return <ErrorState error={error} />;
  if (!data) return null;
  return (
    <section className="container page-space">
      <Breadcrumb label="Cảm hứng" />
      <div className="page-intro">
        <span className="small-label">NHỮNG CÂU CHUYỆN VỀ PHONG CÁCH</span>
        <h1>Chuyện mặc. <em>Chuyện mình.</em></h1>
        <p>Hiểu hơn một chút về những món đồ bạn yêu. Một góc nhỏ để đọc chậm, chọn kỹ và mặc theo cách của mình.</p>
      </div>
      <div className="journal-grid">{data.map(j => <JournalCard key={j.slug} j={j} />)}</div>
    </section>
  );
}

function Article({ slug }: { slug: string }) {
  const { data: j, error } = useAsync(() => api<JournalArticle>('/journal/' + encodeURIComponent(slug)), [slug]);
  usePageReady(!!j, '/cam-hung/' + slug);
  if (error) return <ErrorState error={error} />;
  if (!j) return null;
  return (
    <article className="article-page container page-space">
      <Breadcrumb label={'Cảm hứng / ' + j.title} />
      <header className="article-heading">
        <span className="small-label">{j.category} · {j.minutes} PHÚT ĐỌC</span>
        <h1>{j.title}</h1>
        <p>{j.intro}</p>
        <span className="article-byline">Ban biên tập VELASTYLE · Cẩm nang tham khảo</span>
      </header>
      <img className="article-hero" src={'/static/images/' + j.image} alt={j.title} />
      <div className="article-body">
        {j.sections.map(([title, content], i) => (
          <section key={title}><span className="article-index">0{i + 1}</span><div><h2>{title}</h2><p>{content}</p></div></section>
        ))}
        <div className="article-cta"><span>ĐỂ CẢM HỨNG TRỞ THÀNH LỰA CHỌN</span><A className="button primary round" href={j.href}>{j.cta} <Icon name="arrow" /></A></div>
        <A className="underlined" href="/cam-hung">← Những câu chuyện khác</A>
      </div>
    </article>
  );
}

export function JournalPage() {
  const { slug } = useParams();
  return slug ? <Article slug={slug} /> : <JournalList />;
}

export function InfoPageView() {
  const { slug = '' } = useParams();
  const { data: p, error } = useAsync(() => api<InfoPage>('/info/' + encodeURIComponent(slug)), [slug]);
  usePageReady(!!p, '/thong-tin/' + slug);
  if (error) return <ErrorState error={error} />;
  if (!p) return null;
  return (
    <section className="info-page">
      <Breadcrumb label={p.title} />
      <span className="small-label">VELASTYLE, VỚI TẤT CẢ QUAN TÂM</span>
      <h1>{p.title}</h1>
      <p>{p.content}</p>
      <A className="underlined" href="/san-pham" style={{ marginTop: 35 }}>Trở lại với cảm hứng <Icon name="arrow" /></A>
    </section>
  );
}
