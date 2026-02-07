export interface AiBinding {
  run: (
    model: string,
    inputs: {
      text: string | string[];
    }
  ) => Promise<unknown>;
}

export interface Env {
  GREETING: string;
  KV?: KVNamespace;         // Bật khi bạn cấu hình KV trong wrangler.toml
  DB?: D1Database;          // Bật khi bạn cấu hình D1
  BUCKET?: R2Bucket;        // Bật khi bạn cấu hình R2
  COUNTER?: DurableObjectNamespace; // Bật khi bạn cấu hình Durable Objects
  AI?: AiBinding;           // Bật khi bạn cấu hình Workers AI binding
  EMBEDDING_MODEL?: string; // Model Workers AI dùng cho /v1/embeddings
  OPENAI_API_KEY?: string;  // Optional: bật auth Bearer cho OpenAI-compatible API
}
