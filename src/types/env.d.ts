
export interface Env {
  GREETING: string;
  KV?: KVNamespace;         // Bật khi bạn cấu hình KV trong wrangler.toml
  DB?: D1Database;          // Bật khi bạn cấu hình D1
  BUCKET?: R2Bucket;        // Bật khi bạn cấu hình R2
  COUNTER?: DurableObjectNamespace; // Bật khi bạn cấu hình Durable Objects
}
