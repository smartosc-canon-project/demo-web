import type { Product } from "./api";

/** Mirrors the limits enforced by orders-api so the user sees them before submitting. */
export const MAX_LINES = 10;
export const MAX_QUANTITY_PER_LINE = 20;
export const FREE_SHIPPING_THRESHOLD = 500_000;
export const SHIPPING_FEE = 30_000;

export interface CartLine {
  product: Product;
  quantity: number;
}

const STORAGE_KEY = "shoplite.cart";

export class Cart {
  private lines = new Map<string, CartLine>();

  constructor() {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]") as CartLine[];
      for (const line of saved) this.lines.set(line.product.sku, line);
    } catch {
      // A corrupt saved cart is dropped.
    }
  }

  get items(): CartLine[] {
    return [...this.lines.values()];
  }

  get subtotal(): number {
    return this.items.reduce((sum, l) => sum + l.product.price * l.quantity, 0);
  }

  /** Estimate only: the discount is applied by orders-api, and may change the shipping fee. */
  get estimatedShipping(): number {
    return this.subtotal >= FREE_SHIPPING_THRESHOLD ? 0 : SHIPPING_FEE;
  }

  /** Adds one unit. Returns a message when the cart limits or stock stop it. */
  add(product: Product): string | null {
    const line = this.lines.get(product.sku);
    const next = (line?.quantity ?? 0) + 1;
    if (!line && this.lines.size >= MAX_LINES) return `A cart can hold at most ${MAX_LINES} different products.`;
    if (next > MAX_QUANTITY_PER_LINE) return `At most ${MAX_QUANTITY_PER_LINE} units per product.`;
    if (next > product.stock) return `Only ${product.stock} left of ${product.name}.`;
    this.lines.set(product.sku, { product, quantity: next });
    this.save();
    return null;
  }

  remove(sku: string): void {
    const line = this.lines.get(sku);
    if (!line) return;
    if (line.quantity <= 1) this.lines.delete(sku);
    else line.quantity -= 1;
    this.save();
  }

  clear(): void {
    this.lines.clear();
    this.save();
  }

  private save(): void {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(this.items));
  }
}
