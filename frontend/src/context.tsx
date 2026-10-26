import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useLocation, useNavigate } from 'react-router';
import { api, errorMessage } from './api';
import { EMPTY_CART, type Cart, type Named, type Providers, type User } from './types';

interface ModalState { content: ReactNode; small: boolean; label: string }
interface ToastItem { id: number; message: string; error: boolean }
interface GoOptions { replace?: boolean; scroll?: boolean }

interface AppValue {
  user: User | null;
  setUser: (user: User | null) => void;
  favorites: Set<number>;
  favoritesVersion: number;
  cart: Cart;
  setCart: (cart: Cart) => void;
  categories: Named[];
  brands: Named[];
  providers: Providers;
  homeTab: string;
  setHomeTab: (tab: string) => void;
  syncUser: () => Promise<User | null>;
  refreshTaxonomy: () => Promise<void>;
  requireLogin: () => boolean;
  toggleFavorite: (id: number) => Promise<void>;
  go: (url: string, options?: GoOptions) => void;
  toast: (message: string, error?: boolean) => void;
  modal: ModalState | null;
  showModal: (content: ReactNode, small?: boolean, label?: string) => void;
  closeModal: () => void;
  ready: boolean;
  bootError: string | null;
}

const AppContext = createContext<AppValue | null>(null);

export function useApp() {
  const value = useContext(AppContext);
  if (!value) throw new Error('useApp must be used inside AppProvider');
  return value;
}

const OAUTH_MESSAGES: Record<string, string> = {
  ok: 'Đã đăng nhập bằng Google.',
  cancelled: 'Bạn đã hủy đăng nhập bằng Google.',
  state: 'Phiên đăng nhập Google đã hết hạn hoặc không hợp lệ. Vui lòng thử lại.',
  unverified: 'Tài khoản Google này chưa xác minh email.',
  error: 'Chưa kết nối được Google. Vui lòng thử lại sau.',
};

export function AppProvider({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [user, setUser] = useState<User | null>(null);
  const [favorites, setFavorites] = useState<Set<number>>(new Set());
  const [favoritesVersion, setFavoritesVersion] = useState(0);
  const [cart, setCart] = useState<Cart>(EMPTY_CART);
  const [categories, setCategories] = useState<Named[]>([]);
  const [brands, setBrands] = useState<Named[]>([]);
  const [providers, setProviders] = useState<Providers>({ google: false, email_delivery: true });
  const [homeTab, setHomeTab] = useState('Tất cả');
  const [modal, setModal] = useState<ModalState | null>(null);
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const toastId = useRef(0);
  const userRef = useRef<User | null>(null);
  userRef.current = user;
  const lastFocus = useRef<Element | null>(null);

  const toast = useCallback((message: string, error = false) => {
    const id = ++toastId.current;
    setToasts(items => [...items, { id, message, error }]);
    setTimeout(() => setToasts(items => items.filter(item => item.id !== id)), 4200);
  }, []);

  const closeModal = useCallback(() => {
    setModal(current => {
      if (current) (lastFocus.current as HTMLElement | null)?.focus?.();
      return null;
    });
  }, []);

  const showModal = useCallback((content: ReactNode, small = false, label = 'Thông tin thiết kế') => {
    lastFocus.current = document.activeElement;
    setModal({ content, small, label });
  }, []);

  const syncUser = useCallback(async () => {
    const me = await api<User | null>('/auth/me');
    setUser(me);
    if (me) {
      const [saved, nextCart] = await Promise.all([api<{ id: number }[]>('/favorites'), api<Cart>('/cart')]);
      setFavorites(new Set(saved.map(p => p.id)));
      setCart(nextCart);
    } else {
      setFavorites(new Set());
      setCart(EMPTY_CART);
    }
    return me;
  }, []);

  const refreshTaxonomy = useCallback(async () => {
    const [nextCategories, nextBrands] = await Promise.all([api<Named[]>('/categories'), api<Named[]>('/brands')]);
    setCategories(nextCategories);
    setBrands(nextBrands);
  }, []);

  const go = useCallback((url: string, { replace = false, scroll = true }: GoOptions = {}) => {
    setModal(null);
    navigate(url, { replace });
    if (scroll) window.scrollTo(0, 0);
  }, [navigate]);

  const requireLogin = useCallback(() => {
    if (userRef.current) return true;
    toast('Đăng nhập để lưu phong cách và tiếp tục mua sắm.');
    sessionStorage.setItem('vela_return', location.pathname + location.search);
    go('/tai-khoan');
    return false;
  }, [go, location.pathname, location.search, toast]);

  const toggleFavorite = useCallback(async (id: number) => {
    if (!requireLogin()) return;
    try {
      const data = await api<{ favorite: boolean }>('/favorites/' + id, { method: 'POST' });
      setFavorites(current => {
        const next = new Set(current);
        if (data.favorite) next.add(id); else next.delete(id);
        return next;
      });
      setFavoritesVersion(version => version + 1);
      toast(data.favorite ? 'Đã cất vào góc yêu thích của bạn.' : 'Đã bỏ khỏi danh sách yêu thích.');
    } catch (err) {
      toast(errorMessage(err), true);
    }
  }, [requireLogin, toast]);

  // Browser back/forward and any navigation dismiss an open dialog.
  useEffect(() => { setModal(null); }, [location.pathname, location.search]);

  // Modal behaviour shared by every dialog: body lock, Escape, focus trap.
  useEffect(() => {
    document.body.classList.toggle('modal-open', !!modal);
    if (!modal) return;
    document.querySelector<HTMLElement>('.modal-close')?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closeModal();
      if (event.key === 'Tab') {
        const root = document.querySelector('.modal');
        if (!root) return;
        const focusables = [...root.querySelectorAll<HTMLElement>('a,button:not(:disabled),input,select,textarea')];
        const first = focusables[0], last = focusables.at(-1);
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [modal, closeModal]);

  // Initial load: session, taxonomy and sign-in providers, then the one-shot Google result notice.
  const [ready, setReady] = useState(false);
  const [bootError, setBootError] = useState<string | null>(null);
  useEffect(() => {
    (async () => {
      try {
        await Promise.all([syncUser(), refreshTaxonomy(), api<Providers>('/auth/providers').then(setProviders).catch(() => undefined)]);
        const params = new URLSearchParams(window.location.search);
        const result = params.get('google');
        if (result) {
          params.delete('google');
          navigate(window.location.pathname + (params.size ? '?' + params : ''), { replace: true });
          toast(OAUTH_MESSAGES[result] || OAUTH_MESSAGES.error, result !== 'ok');
        }
        setReady(true);
      } catch (err) {
        setBootError(errorMessage(err));
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const value = useMemo<AppValue>(() => ({
    user, setUser, favorites, favoritesVersion, cart, setCart, categories, brands, providers, homeTab, setHomeTab,
    syncUser, refreshTaxonomy, requireLogin, toggleFavorite, go, toast, modal, showModal, closeModal, ready, bootError,
  }), [user, favorites, favoritesVersion, cart, categories, brands, providers, homeTab, syncUser, refreshTaxonomy, requireLogin, toggleFavorite, go, toast, modal, showModal, closeModal, ready, bootError]);

  return (
    <AppContext.Provider value={value}>
      {children}
      <div id="modal-root">
        {modal && (
          <div className="modal-overlay" onClick={event => { if (event.target === event.currentTarget) closeModal(); }}>
            <section className={`modal ${modal.small ? 'small-modal' : ''}`} role="dialog" aria-modal="true" aria-label={modal.label}>
              <button className="icon-btn modal-close" data-action="close-modal" aria-label="Đóng" onClick={closeModal}>
                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18" /></svg>
              </button>
              {modal.content}
            </section>
          </div>
        )}
      </div>
      <div id="toast-root" className="toast-root" aria-live="polite" aria-atomic="true">
        {toasts.map(item => (
          <div key={item.id} className={'toast' + (item.error ? ' error' : '')}>
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d={item.error ? 'm6 6 12 12M18 6 6 18' : 'm5 12 4 4L19 6'} /></svg>
            <span>{item.message}</span>
          </div>
        ))}
      </div>
    </AppContext.Provider>
  );
}
