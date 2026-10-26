export interface Variant { id: number; size: string; color: string; stock: number }

export interface Product {
  id: number; name: string; description: string; price: number; original_price: number | null;
  gender: string; color: string; material: string; style: string; thumbnail: string;
  category_id: number; brand_id: number; category: string; brand: string; stock: number;
  created_at: string; is_new: boolean; variants: Variant[]; images: string[];
  rating?: number | null; review_count?: number; simulated_review_count?: number;
  score?: number; reason?: string; clip_text?: string;
}

export interface Preferences { gender?: string; style?: string; color?: string; budget?: number }

export interface User {
  id: number; full_name: string; email: string; username: string | null; phone: string | null;
  role: 'admin' | 'customer'; google_linked: boolean; has_password: boolean; preferences: Preferences;
}

export interface CartItem { id: number; quantity: number; size: string; stock: number; variant_id: number; product: Product }
export interface Cart { items: CartItem[]; total: number; shipping: number; count: number }
export const EMPTY_CART: Cart = { items: [], total: 0, shipping: 0, count: 0 };

export interface Named { id: number; name: string; description: string }
export interface Providers { google: boolean; email_delivery: boolean }

export interface ProductPage { items: Product[]; total: number; page: number; pages: number }
export interface Review { name: string; rating: number; comment: string; created_at: string; simulated?: boolean }
export interface Recommendations { items: Product[]; method: string; status: string; clip_ready: boolean; alpha: number; effective_alpha: number; message: string }
export interface Similar { items: Product[]; status: string; message: string }

export interface OrderItem { name: string; thumbnail: string; size: string; quantity: number; unit_price: number }
export interface Order { id: number; total: number; status: string; full_name: string; phone: string; address: string; created_at: string; items: OrderItem[] }

export interface Storefront {
  total: number; genders: Record<string, number>; categories: { id: number; name: string; count: number }[];
  styles: Record<string, number>; colors: string[]; brands: number; price_range: { min: number; max: number };
}
export interface JournalItem { slug: string; title: string; category: string; image: string; minutes: number; intro: string }
export interface JournalArticle extends JournalItem { sections: [string, string][]; cta: string; href: string }
export interface InfoPage { title: string; content: string }

export interface ModelRun { id: number; kind: string; status: 'running' | 'completed' | 'failed'; message: string; result: unknown; created_at: string; finished_at: string | null }
export interface AIStatus { model: string; device: string; products: number; embeddings: number; ready: boolean; alpha: number; runs: ModelRun[] }
export interface EvalRow { model_name: string; k: number; precision_at_k: number; recall_at_k: number; ndcg_at_k: number; hit_rate_at_k: number; coverage: number; inference_time_ms: number }
export interface EvalResult { results: EvalRow[]; users: number; train_interactions: number; test_interactions: number; simulated: boolean; protocol: string; latency_scope: string; alpha: number }
export interface EvalRun extends Omit<ModelRun, 'result'> { result: EvalResult }
export interface Dashboard {
  users: number; orders: number; interactions: number; embeddings: number; products: number; revenue: number; alpha: number; simulated_interactions: number;
  events: { name: string; count: number }[]; revenue_chart: { date: string; total: number }[];
  popular: (Product & { interactions_score: number })[]; runs: ModelRun[];
}
export interface AdminUser { id: number; name: string; email: string; username: string | null; phone: string | null; email_verified: boolean; google_linked: boolean; role: string; simulated: boolean; created_at: string }
export interface AdminEvent { id: number; user: string; product: string; type: string; weight: number; simulated: boolean; created_at: string }
export interface DatasetInfo { products: number; valid_images: number; simulated_users: number; simulated_interactions: number; source: string; csv_columns: string[] }
