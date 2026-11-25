const vnd = new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" });

export const money = (amount: number): string => vnd.format(amount);

export const dateTime = (iso: string): string => new Date(iso).toLocaleString();

export function escapeHtml(text: string): string {
  return text.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
}
