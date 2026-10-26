import { useState } from 'react';
import { api, errorMessage } from '../api';
import { useApp } from '../context';
import { Icon } from '../icons';
import type { User } from '../types';

export function ZoomPhoto({ src, alt, caption }: { src: string; alt: string; caption: string }) {
  return <div className="zoom-photo"><img src={src} alt={alt} /><span>{caption}</span></div>;
}

export function SizeGuide() {
  return (
    <div className="size-guide">
      <span className="small-label">MỘT THIẾT KẾ, VỪA VẶN VỚI BẠN</span>
      <h2>Tìm kích thước vừa vặn.</h2>
      <p>Số đo tham khảo cho trang phục trong catalog mẫu. Hãy so sánh với món đồ bạn đang mặc thoải mái; bảng kích thước có thể khác nhau giữa các nhãn hàng.</p>
      <table>
        <thead><tr><th>Kích thước</th><th>Vòng ngực</th><th>Vòng eo</th></tr></thead>
        <tbody>
          {[['S', '82–86', '64–68'], ['M', '86–90', '68–72'], ['L', '90–94', '72–76'], ['XL', '94–98', '76–80']].map(([size, chest, waist]) => (
            <tr key={size}><td>{size}</td><td>{chest} cm</td><td>{waist} cm</td></tr>
          ))}
        </tbody>
      </table>
      <p className="form-hint">Giày và phụ kiện sử dụng kích thước hiển thị riêng trên từng sản phẩm; bảng trên dành cho trang phục, không phải bảng quy đổi giày.</p>
      <div className="size-measuring-note"><Icon name="user" /> Đo ở tư thế tự nhiên, giữ thước vừa sát và không kéo quá chặt.</div>
    </div>
  );
}

type QuizKey = 'gender' | 'style' | 'budget';
const QUIZ_STEPS: { label: string; title: string; key: QuizKey; options: [string | number, string][] }[] = [
  { label: 'MỞ ĐẦU TỪ BẠN', title: 'Tủ đồ này dành cho ai?', key: 'gender', options: [['Nữ', 'Nét riêng của nàng'], ['Nam', 'Phong thái của chàng'], ['Unisex', 'Tự do là chính mình'], ['Phụ kiện', 'Một chi tiết. Rất riêng.']] },
  { label: 'MỘT CHÚT VỀ GU', title: 'Điều gì khiến bạn rung động?', key: 'style', options: [['Tối giản', 'Ít hơn, nhưng có chủ đích'], ['Thanh lịch', 'Chỉn chu, không gắng gượng'], ['Nữ tính', 'Nhẹ nhàng và đầy cảm hứng'], ['Năng động', 'Thoải mái theo từng nhịp sống']] },
  { label: 'VỪA GU, VỪA TÚI TIỀN', title: 'Một khoảng giá thoải mái?', key: 'budget', options: [[700000, 'Dưới 700.000đ'], [1000000, 'Dưới 1.000.000đ'], [1500000, 'Dưới 1.500.000đ'], [3000000, 'Dưới 3.000.000đ']] },
];

/** Three-step taste quiz; saves the answers to the profile when signed in, then opens the filtered catalog. */
export function StyleQuiz() {
  const { user, setUser, toast, closeModal, go } = useApp();
  const [stepIndex, setStepIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<QuizKey, string | number>>({ gender: 'Nữ', style: 'Thanh lịch', budget: 1500000 });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const step = QUIZ_STEPS[stepIndex];

  async function finish() {
    setBusy(true);
    try {
      if (user) {
        const saved = await api<User>('/profile', { method: 'PUT', body: { full_name: user.full_name, ...user.preferences, ...answers, color: user.preferences.color || '' } });
        setUser(saved);
        toast('Đã lưu gu của bạn. Cảm hứng mới đang chờ.');
      }
      const query = new URLSearchParams({ gender: String(answers.gender), style: String(answers.style), max_price: String(answers.budget) });
      closeModal();
      go('/san-pham?' + query);
    } catch (err) {
      setError(errorMessage(err));
      setBusy(false);
    }
  }

  return (
    <div className="style-quiz">
      <div className="quiz-progress">{QUIZ_STEPS.map((_, i) => <span key={i} className={i <= stepIndex ? 'active' : ''} />)}</div>
      <span className="small-label">{step.label} · {stepIndex + 1}/3</span>
      <h2>{step.title}</h2>
      <p>Không có lựa chọn đúng sai. Chỉ có điều bạn thích.</p>
      <div className="quiz-options">
        {step.options.map(([value, label]) => (
          <button key={value} className={`quiz-option ${String(answers[step.key]) === String(value) ? 'selected' : ''}`} data-quiz-key={step.key} data-quiz-value={value}
            onClick={() => setAnswers(current => ({ ...current, [step.key]: step.key === 'budget' ? +value : value }))}>
            <span>{step.key === 'budget' ? label : value}</span><small>{step.key === 'budget' ? 'Mỗi thiết kế' : label}</small><i><Icon name="check" /></i>
          </button>
        ))}
      </div>
      <div className="quiz-actions">
        {stepIndex ? <button className="text-button" data-quiz-back onClick={() => setStepIndex(i => i - 1)}>← Quay lại</button> : <span className="form-hint">Chỉ mất khoảng 30 giây</span>}
        <button className="button primary round" data-quiz-next disabled={busy} onClick={() => (stepIndex < 2 ? setStepIndex(i => i + 1) : void finish())}>
          {stepIndex === 2 ? 'Tìm thiết kế của tôi' : 'Tiếp tục'} <Icon name="arrow" />
        </button>
      </div>
      <div className="form-error" id="quiz-error">{error}</div>
    </div>
  );
}

export function MuseExplainer() {
  const items = [
    ['sparkles', 'Gợi ý kết hợp', 'Kết hợp tín hiệu từ lịch sử xem, yêu thích, giỏ hàng và mua sắm với đặc trưng hình ảnh, văn bản của sản phẩm.'],
    ['heart', 'Cùng gu với bạn', 'Lọc cộng tác tìm mối liên hệ giữa những sản phẩm được các nhóm người dùng cùng quan tâm.'],
    ['eye', 'Cảm hứng tương đồng', 'CLIP so sánh đặc trưng ảnh và mô tả với những thiết kế bạn từng quan tâm.'],
  ];
  return (
    <div className="muse-explainer">
      <span className="small-label">ĐƯỢC CHỌN BẰNG GU. ĐƯỢC HIỂU BẰNG CÔNG NGHỆ.</span>
      <h2>Một chút hiểu bạn,<br />thêm nhiều cảm hứng.</h2>
      <p>Không có một khuôn mẫu chung cho tất cả. Bạn có thể khám phá cùng một catalog từ ba góc nhìn.</p>
      {items.map(([name, title, text]) => <div key={title}><Icon name={name} /><section><h3>{title}</h3><p>{text}</p></section></div>)}
      <small>Khi chưa có đủ tín hiệu, VELA sử dụng tuyển chọn phổ biến và sở thích bạn đã chọn. Gợi ý là gợi mở để bạn khám phá; điểm xếp hạng không phải xác suất bạn sẽ yêu thích sản phẩm.</small>
    </div>
  );
}
