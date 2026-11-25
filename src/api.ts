const INVENTORY_API = import.meta.env.VITE_INVENTORY_API ?? "http://localhost:4001";
const ORDERS_API = import.meta.env.VITE_ORDERS_API ?? "http://localhost:5080";

export interface Product {
  sku: string;
  name: string;
  price: number;
  stock: number;
  active: boolean;
  lowStock: boolean;
}

export type OrderStatus = "Pending" | "Paid" | "Cancelled" | "Expired";

export interface OrderLine {
  sku: string;
  name: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
}

export interface Order {
  id: string;
  customerEmail: string;
  lines: OrderLine[];
  discountCode: string | null;
  subtotal: number;
  discount: number;
  shippingFee: number;
  total: number;
  refundDue: number;
  status: OrderStatus;
  createdAt: string;
  paidAt: string | null;
}

export interface NewOrder {
  customerEmail: string;
  lines: { sku: string; quantity: number }[];
  discountCode: string | null;
}

/** Error returned by either backend, with the machine-readable code when there is one. */
export class ApiError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly status: number,
  ) {
    super(message);
  }
}

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...init,
    headers: { "Content-Type": "application/json", ...init?.headers },
  });
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new ApiError(body.message ?? `Request failed (${response.status})`, body.code ?? "UNKNOWN", response.status);
  }
  return (await response.json()) as T;
}

export const listProducts = () => request<Product[]>(`${INVENTORY_API}/api/products`);

export const listOrders = (email: string) =>
  request<Order[]>(`${ORDERS_API}/api/orders?email=${encodeURIComponent(email)}`);

export const createOrder = (order: NewOrder) =>
  request<Order>(`${ORDERS_API}/api/orders`, { method: "POST", body: JSON.stringify(order) });

export const payOrder = (id: string) => request<Order>(`${ORDERS_API}/api/orders/${id}/pay`, { method: "POST" });

export const cancelOrder = (id: string) => request<Order>(`${ORDERS_API}/api/orders/${id}/cancel`, { method: "POST" });
