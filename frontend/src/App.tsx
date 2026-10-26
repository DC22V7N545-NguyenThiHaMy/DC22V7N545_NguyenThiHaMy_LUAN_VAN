import { Route, Routes } from 'react-router';
import { EmptyState } from './components/common';
import { Layout } from './components/Layout';
import { usePageReady } from './hooks/usePageReady';
import { AccountPage, FavoritesPage, OrdersPage } from './pages/Account';
import AdminPage from './pages/admin/Admin';
import { CartPage, CheckoutPage } from './pages/Cart';
import Catalog from './pages/Catalog';
import Detail from './pages/Detail';
import ForYou from './pages/ForYou';
import Home from './pages/Home';
import ImageSearch from './pages/ImageSearch';
import { InfoPageView, JournalPage } from './pages/Journal';

function NotFound() {
  usePageReady(true, location.pathname, 'Không tìm thấy trang');
  return (
    <section className="container page-space">
      <EmptyState title="Hình như bạn đang lạc vào một trang mới" description="Trở lại bộ sưu tập để tiếp tục khám phá nhé." />
    </section>
  );
}

export default function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/san-pham" element={<Catalog />} />
        <Route path="/san-pham/:id" element={<Detail />} />
        <Route path="/danh-rieng-cho-ban" element={<ForYou />} />
        <Route path="/tai-khoan" element={<AccountPage />} />
        <Route path="/yeu-thich" element={<FavoritesPage />} />
        <Route path="/gio-hang" element={<CartPage />} />
        <Route path="/thanh-toan" element={<CheckoutPage />} />
        <Route path="/don-hang" element={<OrdersPage />} />
        <Route path="/tim-bang-anh" element={<ImageSearch />} />
        <Route path="/cam-hung" element={<JournalPage />} />
        <Route path="/cam-hung/:slug" element={<JournalPage />} />
        <Route path="/thong-tin/:slug" element={<InfoPageView />} />
        <Route path="/quan-tri" element={<AdminPage />} />
        <Route path="/quan-tri/:section" element={<AdminPage />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Layout>
  );
}
