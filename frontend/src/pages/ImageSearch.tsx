import { useEffect, useState, type DragEvent } from 'react';
import { api, errorMessage } from '../api';
import { Breadcrumb, EmptyState, ProductGrid, Skeletons } from '../components/common';
import { useQuickView } from '../components/ProductDetail';
import { useApp } from '../context';
import { usePageReady } from '../hooks/usePageReady';
import { Icon } from '../icons';
import type { Product } from '../types';

interface SearchResult { items: Product[]; method: string; model?: string }
type Output = { preview: string; status: 'loading' } | { preview: string; status: 'done'; result: SearchResult } | { preview: string; status: 'error'; message: string };

const modelLabel = (model?: string) => (!model || model === 'openai/clip-vit-base-patch32' ? 'CLIP ViT-B/32' : model.split('/').at(-1));

export default function ImageSearch() {
  const { requireLogin, toast } = useApp();
  const openQuick = useQuickView();
  const [output, setOutput] = useState<Output | null>(null);
  const [dragging, setDragging] = useState(false);
  usePageReady(true, '/tim-bang-anh');
  useEffect(() => () => { if (output) URL.revokeObjectURL(output.preview); }, [output]);

  async function submit(file: File | undefined) {
    if (!requireLogin() || !file) return;
    if (file.size > 5 * 1024 * 1024) { toast('Ảnh tối đa 5 MB. Vui lòng chọn ảnh nhỏ hơn.', true); return; }
    const preview = URL.createObjectURL(file);
    setOutput({ preview, status: 'loading' });
    const form = new FormData();
    form.append('file', file);
    try {
      const result = await api<SearchResult>('/recommendations/image-search', { method: 'POST', body: form });
      setOutput({ preview, status: 'done', result });
    } catch (err) {
      setOutput({ preview, status: 'error', message: errorMessage(err) });
    }
  }

  const onDrag = (active: boolean) => (event: DragEvent) => { event.preventDefault(); setDragging(active); };
  return (
    <section className="container page-space">
      <Breadcrumb label="Tìm bằng hình ảnh" />
      <div className="page-intro">
        <span className="small-label">NHÌN THẤY. YÊU THÍCH. TÌM THẤY.</span>
        <h1>Cảm hứng đến từ một tấm ảnh.</h1>
        <p>Một chiếc váy lướt qua, một phong cách bạn thích. Tải ảnh lên để tìm những thiết kế có hình ảnh tương đồng bằng CLIP.</p>
      </div>
      <label className={`upload-area ${dragging ? 'dragover' : ''}`.trim()} id="image-drop" htmlFor="image-file"
        onDragEnter={onDrag(true)} onDragOver={onDrag(true)} onDragLeave={onDrag(false)}
        onDrop={event => { onDrag(false)(event); void submit(event.dataTransfer.files[0]); }}>
        <Icon name="camera" />
        <h2>Cho chúng mình xem cảm hứng của bạn.</h2>
        <p>Kéo thả ảnh vào đây hoặc nhấn để chọn ảnh</p>
        <span className="button outline small"><Icon name="upload" /> Chọn hình ảnh</span>
        <span className="form-hint">JPG, PNG, WebP · Tối đa 5 MB · 25 megapixel</span>
      </label>
      <input id="image-file" type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={event => { void submit(event.target.files?.[0]); event.target.value = ''; }} />
      <div id="image-search-output">
        {output && (
          <div className="image-search-layout">
            <div><span className="small-label">CẢM HỨNG CỦA BẠN</span><img src={output.preview} className="image-preview" alt="Ảnh bạn vừa tải lên" style={{ marginTop: 15 }} /></div>
            <div className="image-search-results">
              {output.status === 'loading' && <><p className="recommendation-note">Đang tìm những thiết kế đồng điệu với ảnh của bạn…</p><Skeletons n={4} /></>}
              {output.status === 'done' && <><p className="recommendation-note">{output.result.items.length} thiết kế có hình ảnh tương đồng · {modelLabel(output.result.model)}</p><ProductGrid items={output.result.items} score onQuick={openQuick} /></>}
              {output.status === 'error' && <EmptyState title="Cảm hứng cần thêm một chút chuẩn bị" description={output.message} button="" icon="camera" />}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
