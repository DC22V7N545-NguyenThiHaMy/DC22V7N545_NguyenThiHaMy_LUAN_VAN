import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { api, ApiError, errorMessage } from '../api';
import { A, Breadcrumb } from '../components/common';
import { useApp } from '../context';
import { GoogleMark, Icon } from '../icons';

type Mode = 'login' | 'register' | 'verify' | 'forgot' | 'reset';

interface FieldProps { id: string; name: string; label: string; attrs: Record<string, string | number | boolean> }
const Field = ({ id, name, label, attrs }: FieldProps) => (
  <div className="field"><label htmlFor={id}>{label}</label><input id={id} name={name} {...attrs} /></div>
);
const PasswordField = ({ id, name, label }: { id: string; name: string; label: string }) => (
  <Field id={id} name={name} label={label} attrs={{ type: 'password', required: true, minLength: 8, maxLength: 128, placeholder: 'Ít nhất 8 ký tự', autoComplete: 'new-password' }} />
);

function ResendButton({ resendAt, onResend }: { resendAt: number; onResend: () => Promise<void> }) {
  const [now, setNow] = useState(Date.now());
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);
  const left = Math.ceil((resendAt - now) / 1000);
  return (
    <button type="button" id="resend-code" data-action="resend-code" disabled={left > 0 || busy} onClick={async () => { setBusy(true); try { await onResend(); } finally { setBusy(false); } }}>
      {left > 0 ? `Gửi lại mã sau ${left} giây` : 'Gửi lại mã'}
    </button>
  );
}

/** Login, registration, e-mail verification and password reset in one panel. */
export function AuthPanel() {
  const { providers, syncUser, toast, go } = useApp();
  const [mode, setMode] = useState<Mode>('login');
  const [email, setEmail] = useState('');
  const [resendAt, setResendAt] = useState(0);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const form = useRef<HTMLFormElement>(null);

  const register = mode === 'register';
  const code = mode === 'verify' || mode === 'reset';

  function startCodeStep(nextEmail: string, wait: number, next: Mode) {
    setEmail(nextEmail);
    setMode(next);
    setResendAt(Date.now() + (wait || 0) * 1000);
    setError('');
    window.scrollTo(0, 0);
  }
  useEffect(() => { if (code) document.getElementById('code')?.focus(); }, [code, mode]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const values = Object.fromEntries(new FormData(event.currentTarget)) as Record<string, string>;
    setError('');
    setBusy(true);
    try {
      if ((mode === 'register' || mode === 'reset') && values.password !== values.confirm_password) throw new Error('Mật khẩu nhập lại không khớp.');
      try {
        if (mode === 'register') {
          const result = await api<{ email: string; resend_after: number }>('/auth/register', { method: 'POST', body: values });
          toast('Đã gửi mã xác nhận tới email của bạn.');
          return startCodeStep(result.email, result.resend_after, 'verify');
        }
        if (mode === 'forgot') {
          const result = await api<{ message: string; resend_after: number }>('/auth/forgot-password', { method: 'POST', body: values });
          toast(result.message);
          return startCodeStep(values.email.trim().toLowerCase(), result.resend_after, 'reset');
        }
        if (mode === 'login') await api('/auth/login', { method: 'POST', body: values });
        else if (mode === 'verify') await api('/auth/verify-email', { method: 'POST', body: { email, code: values.code } });
        else await api('/auth/reset-password', { method: 'POST', body: { ...values, email } });
      } catch (err) {
        // Unverified account: move straight to the code step instead of a dead end.
        if (err instanceof ApiError && err.detail?.code === 'email_unverified') {
          toast(err.message);
          return startCodeStep(err.detail.email, 0, 'verify');
        }
        throw err;
      }
      const user = await syncUser();
      toast({ login: 'Chào mừng bạn trở lại.', verify: 'Email đã được xác nhận. Chào mừng bạn đến với VELASTYLE.', reset: 'Đã đặt mật khẩu mới. Các phiên đăng nhập cũ đã được đăng xuất.' }[mode as 'login' | 'verify' | 'reset']);
      const back = sessionStorage.getItem('vela_return');
      sessionStorage.removeItem('vela_return');
      setMode('login');
      go(back?.startsWith('/') && !back.startsWith('//') ? back : user?.role === 'admin' ? '/quan-tri' : '/danh-rieng-cho-ban');
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  async function resend() {
    try {
      const result = await api<{ resend_after: number; message: string }>('/auth/resend-code', { method: 'POST', body: { email, purpose: mode === 'reset' ? 'reset' : 'verify' } });
      setResendAt(Date.now() + result.resend_after * 1000);
      toast(result.message);
    } catch (err) {
      toast(errorMessage(err), true);
    }
  }

  const copy: Record<Mode, [ReactNode, ReactNode, string]> = {
    login: ['Thật vui được gặp lại bạn.', 'Đăng nhập để tìm lại những thiết kế bạn yêu.', 'Đăng nhập'],
    register: ['Bắt đầu câu chuyện mới.', 'Một tài khoản, cả thế giới cảm hứng dành riêng cho bạn.', 'Tạo tài khoản'],
    verify: ['Xác nhận email của bạn.', <>Chúng mình đã gửi mã 6 số tới <b>{email}</b>. Mã có hiệu lực trong 10 phút.</>, 'Xác nhận và đăng nhập'],
    forgot: ['Quên mật khẩu?', 'Nhập email đã đăng ký, chúng mình sẽ gửi mã để bạn đặt mật khẩu mới.', 'Gửi mã đặt lại'],
    reset: ['Đặt mật khẩu mới.', <>Nhập mã 6 số đã gửi tới <b>{email}</b> và mật khẩu mới của bạn.</>, 'Lưu mật khẩu mới'],
  };
  const codeField = (label: string) => <Field id="code" name="code" label={label} attrs={{ required: true, pattern: '[0-9]{6}', maxLength: 6, inputMode: 'numeric', placeholder: '6 chữ số', autoComplete: 'one-time-code' }} />;
  const fields: Record<Mode, ReactNode> = {
    login: <>
      <Field id="identifier" name="identifier" label="Email hoặc tên đăng nhập" attrs={{ required: true, maxLength: 200, placeholder: 'ban@example.com hoặc ten_dang_nhap', autoComplete: 'username' }} />
      <Field id="password" name="password" label="Mật khẩu" attrs={{ type: 'password', required: true, maxLength: 128, placeholder: 'Mật khẩu của bạn', autoComplete: 'current-password' }} />
    </>,
    register: <>
      <Field id="full-name" name="full_name" label="Tên của bạn" attrs={{ required: true, minLength: 2, maxLength: 100, placeholder: 'Chúng mình nên gọi bạn là gì?', autoComplete: 'name' }} />
      <Field id="username" name="username" label="Tên đăng nhập" attrs={{ required: true, pattern: '[A-Za-z0-9_.]{3,30}', maxLength: 30, placeholder: '3–30 ký tự: chữ, số, dấu _ hoặc .', autoComplete: 'username' }} />
      <Field id="email" name="email" label="Email" attrs={{ type: 'email', required: true, maxLength: 200, placeholder: 'ban@example.com', autoComplete: 'email' }} />
      <Field id="phone" name="phone" label="Số điện thoại" attrs={{ type: 'tel', required: true, pattern: '0[0-9]{9,10}', maxLength: 11, placeholder: '0901234567', autoComplete: 'tel' }} />
      <PasswordField id="password" name="password" label="Mật khẩu" />
      <PasswordField id="confirm-password" name="confirm_password" label="Nhập lại mật khẩu" />
    </>,
    verify: codeField('Mã xác nhận'),
    forgot: <Field id="email" name="email" label="Email" attrs={{ type: 'email', required: true, maxLength: 200, placeholder: 'ban@example.com', autoComplete: 'email' }} />,
    reset: <>
      {codeField('Mã đặt lại')}
      <PasswordField id="password" name="password" label="Mật khẩu mới" />
      <PasswordField id="confirm-password" name="confirm_password" label="Nhập lại mật khẩu mới" />
    </>,
  };
  const switchMode = (next: Mode) => { setMode(next); setError(''); };
  const [title, lead, button] = copy[mode];

  return (
    <section className="container page-space">
      <Breadcrumb label="Tài khoản" />
      <div className="auth-page">
        <div className="auth-art"><img src="/static/images/hero-beige.jpg" alt="Phong cách thanh lịch của VELASTYLE" style={{ objectPosition: '62% center' }} /><h2>Một tủ đồ.<br />Rất nhiều phiên bản<br />của chính bạn.</h2></div>
        <div className="auth-form">
          <span className="small-label">CHÀO MỪNG ĐẾN VELASTYLE</span>
          <h1>{title}</h1>
          <p>{lead}</p>
          {(mode === 'login' || register) && (
            <div className="auth-tabs">
              <button className={!register ? 'active' : ''} data-auth-mode="login" onClick={() => switchMode('login')}>Đăng nhập</button>
              <button className={register ? 'active' : ''} data-auth-mode="register" onClick={() => switchMode('register')}>Đăng ký</button>
            </div>
          )}
          {code && !providers.email_delivery && <p className="auth-note">Máy chủ chưa cấu hình SMTP (chế độ phát triển): mã được ghi trong cửa sổ đang chạy server thay vì gửi email.</p>}
          <form id="auth-form" key={mode} ref={form} onSubmit={submit}>
            {fields[mode]}
            <div className="form-error">{error}</div>
            <div className="form-actions"><button type="submit" className="button primary wide" disabled={busy}>{button} <Icon name="arrow" /></button></div>
          </form>
          {code && <div className="auth-links"><ResendButton resendAt={resendAt} onResend={resend} /><button type="button" data-auth-mode="login" onClick={() => switchMode('login')}>Quay lại đăng nhập</button></div>}
          {mode === 'forgot' && <div className="auth-links"><button type="button" data-auth-mode="login" onClick={() => switchMode('login')}>Quay lại đăng nhập</button></div>}
          {mode === 'login' && <div className="auth-links"><button type="button" data-auth-mode="forgot" onClick={() => switchMode('forgot')}>Quên mật khẩu?</button></div>}
          {(mode === 'login' || register) && providers.google && (
            <>
              <div className="auth-divider"><span>hoặc</span></div>
              <a className="button outline wide google-button" href="/api/auth/google/start"><GoogleMark /> {register ? 'Đăng ký' : 'Đăng nhập'} bằng Google</a>
            </>
          )}
          {(mode === 'login' || register) && <p className="form-hint" style={{ marginTop: 17 }}>Khi tiếp tục, bạn đồng ý với <A href="/thong-tin/bao-mat" style={{ textDecoration: 'underline' }}>chính sách quyền riêng tư</A>.</p>}
        </div>
      </div>
    </section>
  );
}
