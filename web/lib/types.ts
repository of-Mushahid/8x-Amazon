export type Category = { id: string; name: string; slug: string; description: string; image_url: string };
export type Variant = { id: string; product_id: string; sku: string; variant_name: string; price_delta: number; stock_quantity: number };
export type Review = { id: string; rating: number; title: string; body: string; author: string; created_at: string };
export type Product = {
  id: string; name: string; slug: string; description: string; price: number; compare_at_price: number | null;
  category_id: string; brand: string; rating: number; review_count: number; stock_quantity: number;
  images: string[]; features: string[]; is_featured: boolean; color: string; delivery_days: number;
  variants: Variant[]; reviews: Review[];
};
export type CartItem = { productId: string; variantId: string; quantity: number };
export type Address = { fullName: string; street: string; city: string; state: string; zip: string; country: "US" };
export type CheckoutInput = { items: CartItem[]; email: string; shipping: Address; paymentMethod: "demo"; idempotencyKey: string };
export type OrderItem = { product_id: string; variant_id: string; quantity: number; price_at_purchase: number; name: string; image: string; variant_name: string };
export type Order = { id: string; status: string; total_amount: number; subtotal: number; shipping_cost: number; tax: number; shipping_address: Address; payment_method: string; created_at: string; items: OrderItem[] };
