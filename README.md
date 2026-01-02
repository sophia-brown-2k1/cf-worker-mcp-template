
# Cloudflare Workers Skeleton (TypeScript)

Một skeleton đầy đủ để bạn bắt đầu nhanh với Cloudflare Workers: routes, utils, services, bindings (KV/D1/R2), Durable Objects, cron.

## Yêu cầu
- Node.js >= 18
- Wrangler CLI: `npm i -g wrangler`

## Cách dùng
```bash
npm i
npm run dev
# hoặc
npm run deploy
```

### Bật các tích hợp (KV/D1/R2/DO)
- **KV**: `wrangler kv namespace create KV` → cập nhật `wrangler.toml` với `id` trả về.
- **D1**: `wrangler d1 create mydb` → thêm binding trong `wrangler.toml`. Tạo bảng/migration: `wrangler d1 execute mydb --file schema.sql`.
- **R2**: Tạo bucket trong Dashboard, rồi thêm binding với `bucket_name`.
- **Durable Objects**: bật mục `[durable_objects]` và binding `COUNTER`. 
- **Cron**: bỏ comment khối `triggers.crons` với lịch `CRON` mong muốn.

### Routes vào domain riêng
Bật `routes` trong `wrangler.toml` và đảm bảo zone nằm trong Cloudflare.

## Cấu trúc thư mục
```
src/
  index.ts
  routes/
    hello.ts
    api.ts
    kv.ts
    d1.ts
    r2.ts
    counter.ts
  utils/
    response.ts
    cors.ts
  services/
    db.ts
    storage.ts
  types/
    env.d.ts
  do/
    Counter.ts
```

## Ghi chú
- Nếu chưa bật binding nào (KV/D1/R2/DO), hãy giữ nguyên comment trong `wrangler.toml` để `deploy` không lỗi.
- `compatibility_date` nên cập nhật định kỳ để dùng API mới.
