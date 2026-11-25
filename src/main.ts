import { ApiError, cancelOrder, createOrder, listOrders, listProducts, payOrder, type Order, type Product } from "./api";
import { Cart } from "./cart";
import { dateTime, escapeHtml, money } from "./format";
import "./style.css";

const el = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;

const productsEl = el<HTMLDivElement>("products");
const cartEl = el<HTMLDivElement>("cart");
const ordersEl = el<HTMLDivElement>("orders");
const messageEl = el<HTMLParagraphElement>("message");
const emailEl = el<HTMLInputElement>("email");
const discountEl = el<HTMLInputElement>("discount");

const EMAIL_KEY = "shoplite.email";
const cart = new Cart();
let products: Product[] = [];

function showMessage(text: string, isError = false): void {
  messageEl.textContent = text;
  messageEl.className = isError ? "error" : "";
}

function describe(err: unknown): string {
  if (err instanceof ApiError) return `${err.message} (${err.code})`;
  return "Could not reach the server. Are orders-api and inventory-service running?";
}

function renderProducts(): void {
  productsEl.innerHTML = products
    .map((p) => {
      const stock = p.stock === 0 ? "Out of stock" : p.lowStock ? `Only ${p.stock} left` : "In stock";
      return `<article class="card">
        <h3>${escapeHtml(p.name)}</h3>
        <p>${money(p.price)} · <span class="${p.stock === 0 ? "error" : ""}">${stock}</span></p>
        <button data-add="${escapeHtml(p.sku)}" ${p.stock === 0 ? "disabled" : ""}>Add to cart</button>
      </article>`;
    })
    .join("");
}

function renderCart(): void {
  if (cart.items.length === 0) {
    cartEl.innerHTML = "<p>Your cart is empty.</p>";
    return;
  }
  const rows = cart.items
    .map(
      (l) => `<tr>
        <td>${escapeHtml(l.product.name)}</td>
        <td>${l.quantity}</td>
        <td>${money(l.product.price * l.quantity)}</td>
        <td><button data-remove="${escapeHtml(l.product.sku)}">−</button></td>
      </tr>`,
    )
    .join("");
  cartEl.innerHTML = `<table>${rows}</table>
    <p>Subtotal ${money(cart.subtotal)} · Shipping (before discount) ${money(cart.estimatedShipping)}</p>`;
}

function renderOrders(orders: Order[]): void {
  if (orders.length === 0) {
    ordersEl.innerHTML = "<p>No orders for this email.</p>";
    return;
  }
  ordersEl.innerHTML = orders
    .map((o) => {
      const lines = o.lines.map((l) => `${l.quantity} × ${escapeHtml(l.name)}`).join(", ");
      const canPay = o.status === "Pending";
      const canCancel = o.status === "Pending" || o.status === "Paid";
      return `<article class="card">
        <h3>${o.id.slice(0, 8)} · <span class="status ${o.status.toLowerCase()}">${o.status}</span></h3>
        <p>${dateTime(o.createdAt)} · ${lines}</p>
        <p>Subtotal ${money(o.subtotal)} − discount ${money(o.discount)} + shipping ${money(o.shippingFee)} = <strong>${money(o.total)}</strong></p>
        ${o.refundDue > 0 ? `<p>Refund due: ${money(o.refundDue)}</p>` : ""}
        ${canPay ? `<button data-pay="${o.id}">Pay</button>` : ""}
        ${canCancel ? `<button data-cancel="${o.id}">Cancel</button>` : ""}
      </article>`;
    })
    .join("");
}

async function loadProducts(): Promise<void> {
  products = await listProducts();
  renderProducts();
}

async function loadOrders(): Promise<void> {
  const email = emailEl.value.trim();
  if (!email) {
    ordersEl.innerHTML = "<p>Enter your email to see your orders.</p>";
    return;
  }
  renderOrders(await listOrders(email));
}

productsEl.addEventListener("click", (event) => {
  const sku = (event.target as HTMLElement).dataset.add;
  const product = products.find((p) => p.sku === sku);
  if (!product) return;
  const problem = cart.add(product);
  if (problem) showMessage(problem, true);
  else showMessage(`${product.name} added.`);
  renderCart();
});

cartEl.addEventListener("click", (event) => {
  const sku = (event.target as HTMLElement).dataset.remove;
  if (!sku) return;
  cart.remove(sku);
  renderCart();
});

ordersEl.addEventListener("click", async (event) => {
  const { pay, cancel } = (event.target as HTMLElement).dataset;
  try {
    if (pay) {
      await payOrder(pay);
      showMessage("Payment recorded.");
    } else if (cancel) {
      if (!confirm("Cancel this order?")) return;
      await cancelOrder(cancel);
      showMessage("Order cancelled.");
    } else {
      return;
    }
    await Promise.all([loadOrders(), loadProducts()]);
  } catch (err) {
    showMessage(describe(err), true);
  }
});

el<HTMLFormElement>("checkout").addEventListener("submit", async (event) => {
  event.preventDefault();
  if (cart.items.length === 0) {
    showMessage("Add something to the cart first.", true);
    return;
  }
  try {
    const order = await createOrder({
      customerEmail: emailEl.value.trim(),
      lines: cart.items.map((l) => ({ sku: l.product.sku, quantity: l.quantity })),
      discountCode: discountEl.value.trim() || null,
    });
    localStorage.setItem(EMAIL_KEY, order.customerEmail);
    cart.clear();
    discountEl.value = "";
    renderCart();
    showMessage(`Order ${order.id.slice(0, 8)} placed. Pay within 30 minutes or it expires.`);
    await Promise.all([loadOrders(), loadProducts()]);
  } catch (err) {
    showMessage(describe(err), true);
  }
});

el<HTMLButtonElement>("refresh-orders").addEventListener("click", () => {
  loadOrders().catch((err) => showMessage(describe(err), true));
});

emailEl.value = localStorage.getItem(EMAIL_KEY) ?? "";
renderCart();
Promise.all([loadProducts(), loadOrders()]).catch((err) => showMessage(describe(err), true));
