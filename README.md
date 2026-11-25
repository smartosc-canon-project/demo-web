# demo-web

This repo holds `storefront-web`, one of the four ShopLite demo apps used to test Canon.

| App | Repo |
|---|---|
| `inventory-service` | `demo-inventory` |
| `orders-api` | `demo-api` |
| `storefront-web` | `demo-web` |
| `notify-worker` | `demo-worker` |

ShopLite demo: storefront for browsing products, placing orders, paying and cancelling. TypeScript, Vite, no UI framework.

```
npm install
npm run dev      # http://localhost:5173
npm run build
```

Reads products from `inventory-service` and works with orders through `orders-api`. Backend addresses come from
`VITE_INVENTORY_API` and `VITE_ORDERS_API` (copy `.env.example` to `.env.local` to change them).
