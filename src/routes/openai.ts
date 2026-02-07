import type { Env } from "../types/env";
import { json } from "../utils/response";

const DEFAULT_OPENAI_MODEL = "bge-m3";
const DEFAULT_WORKERS_EMBEDDING_MODEL = "@cf/baai/bge-m3";

const OPENAI_TO_WORKERS_MODEL = new Map<string, string>([
  ["text-embedding-3-small", "@cf/google/embeddinggemma-300m"],
  ["text-embedding-3-large", "@cf/google/embeddinggemma-300m"],
  ["text-embedding-ada-002", "@cf/google/embeddinggemma-300m"],
  ["bge-m3", "@cf/baai/bge-m3"],
]);

type OpenAiErrorType =
  | "invalid_request_error"
  | "server_error"
  | "authentication_error";

type EmbeddingResult = {
  data?: unknown;
};

function openAiError(
  status: number,
  message: string,
  type: OpenAiErrorType = "invalid_request_error",
  param: string | null = null,
  code: string | null = null
): Response {
  return json(
    {
      error: {
        message,
        type,
        param,
        code,
      },
    },
    { status }
  );
}

function normalizePath(pathname: string): string {
  if (pathname.startsWith("/openai/")) {
    return pathname.slice("/openai".length);
  }
  return pathname;
}

function requireAuth(request: Request, env: Env): Response | null {
  const expectedApiKey = env.OPENAI_API_KEY?.trim();
  if (!expectedApiKey) return null;

  const authorization = request.headers.get("authorization") ?? "";
  const prefix = "bearer ";
  const lower = authorization.toLowerCase();
  if (!lower.startsWith(prefix)) {
    return openAiError(
      401,
      "Missing bearer token.",
      "authentication_error",
      "authorization",
      "invalid_api_key"
    );
  }

  const token = authorization.slice(prefix.length).trim();
  if (token !== expectedApiKey) {
    return openAiError(
      401,
      "Invalid API key.",
      "authentication_error",
      "authorization",
      "invalid_api_key"
    );
  }

  return null;
}

function resolveModel(
  requestedModel: unknown,
  env: Env
): { responseModel: string; workersModel: string } | Response {
  const configuredModel =
    env.EMBEDDING_MODEL?.trim() || DEFAULT_WORKERS_EMBEDDING_MODEL;

  if (requestedModel === undefined || requestedModel === null) {
    return {
      responseModel: DEFAULT_OPENAI_MODEL,
      workersModel: configuredModel,
    };
  }

  if (typeof requestedModel !== "string" || requestedModel.trim() === "") {
    return openAiError(
      400,
      "Field `model` must be a non-empty string.",
      "invalid_request_error",
      "model"
    );
  }

  const model = requestedModel.trim();
  if (model.startsWith("@cf/")) {
    return { responseModel: model, workersModel: model };
  }

  const aliasModel = OPENAI_TO_WORKERS_MODEL.get(model);
  if (!aliasModel) {
    const supported = Array.from(OPENAI_TO_WORKERS_MODEL.keys()).join(", ");
    return openAiError(
      400,
      `Unsupported model '${model}'. Supported aliases: ${supported}, or any @cf/* model id.`,
      "invalid_request_error",
      "model",
      "model_not_found"
    );
  }

  return {
    responseModel: model,
    workersModel: env.EMBEDDING_MODEL?.trim() || aliasModel,
  };
}

function normalizeInput(input: unknown): string[] | Response {
  if (typeof input === "string") {
    return [input];
  }

  if (!Array.isArray(input) || input.length === 0) {
    return openAiError(
      400,
      "Field `input` must be a string or a non-empty array of strings.",
      "invalid_request_error",
      "input"
    );
  }

  if (!input.every((item) => typeof item === "string")) {
    return openAiError(
      400,
      "All `input` array items must be strings.",
      "invalid_request_error",
      "input"
    );
  }

  return input as string[];
}

function extractEmbeddings(result: unknown): number[][] | null {
  if (typeof result !== "object" || result === null) return null;

  const data = (result as EmbeddingResult).data;
  if (!Array.isArray(data)) return null;

  const vectors: number[][] = [];
  for (const row of data) {
    if (!Array.isArray(row)) return null;
    if (
      !row.every(
        (value) => typeof value === "number" && Number.isFinite(value)
      )
    ) {
      return null;
    }
    vectors.push(row as number[]);
  }

  return vectors;
}

function handleModels(env: Env): Response {
  const configuredModel =
    env.EMBEDDING_MODEL?.trim() || DEFAULT_WORKERS_EMBEDDING_MODEL;

  const models = new Set<string>([
    ...OPENAI_TO_WORKERS_MODEL.keys(),
    configuredModel,
    DEFAULT_WORKERS_EMBEDDING_MODEL,
  ]);

  const created = Math.floor(Date.now() / 1000);
  return json({
    object: "list",
    data: Array.from(models).map((id) => ({
      id,
      object: "model",
      created,
      owned_by: id.startsWith("@cf/") ? "cloudflare" : "openai-compatible",
    })),
  });
}

export async function handleOpenAI(
  request: Request,
  env: Env
): Promise<Response> {
  const pathname = normalizePath(new URL(request.url).pathname);
  const authError = requireAuth(request, env);
  if (authError) return authError;

  if (pathname === "/v1/models") {
    if (request.method !== "GET") {
      return openAiError(
        405,
        "Method not allowed. Use GET for /v1/models.",
        "invalid_request_error",
        "method"
      );
    }
    return handleModels(env);
  }

  if (pathname !== "/v1/embeddings") {
    return openAiError(
      404,
      `Unsupported OpenAI endpoint '${pathname}'.`,
      "invalid_request_error",
      "path",
      "not_found"
    );
  }

  if (request.method !== "POST") {
    return openAiError(
      405,
      "Method not allowed. Use POST for /v1/embeddings.",
      "invalid_request_error",
      "method"
    );
  }

  if (!env.AI || typeof env.AI.run !== "function") {
    return openAiError(
      500,
      "Workers AI binding is missing. Configure [ai] binding = \"AI\" in wrangler.toml.",
      "server_error",
      "AI",
      "workers_ai_binding_missing"
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch (error) {
    return openAiError(
      400,
      `Invalid JSON body: ${String(error)}`,
      "invalid_request_error"
    );
  }

  if (typeof body !== "object" || body === null) {
    return openAiError(400, "Request body must be a JSON object.");
  }

  const payload = body as Record<string, unknown>;
  const encodingFormat = payload.encoding_format;
  if (encodingFormat !== undefined && encodingFormat !== "float") {
    return openAiError(
      400,
      "Only encoding_format='float' is supported.",
      "invalid_request_error",
      "encoding_format"
    );
  }

  const normalizedInput = normalizeInput(payload.input);
  if (normalizedInput instanceof Response) return normalizedInput;

  const modelResult = resolveModel(payload.model, env);
  if (modelResult instanceof Response) return modelResult;

  const workersInput: string | string[] =
    normalizedInput.length === 1 ? normalizedInput[0] : normalizedInput;

  let rawResult: unknown;
  try {
    rawResult = await env.AI.run(modelResult.workersModel, {
      text: workersInput,
    });
  } catch (error) {
    return openAiError(
      502,
      `Workers AI request failed: ${String(error)}`,
      "server_error",
      "model",
      "workers_ai_error"
    );
  }

  const embeddings = extractEmbeddings(rawResult);
  if (!embeddings || embeddings.length === 0) {
    return openAiError(
      502,
      "Workers AI returned an unexpected embedding payload.",
      "server_error",
      "response",
      "invalid_workers_ai_response"
    );
  }

  return json({
    object: "list",
    data: embeddings.map((embedding, index) => ({
      object: "embedding",
      index,
      embedding,
    })),
    model: modelResult.responseModel,
    usage: {
      prompt_tokens: 0,
      total_tokens: 0,
    },
  });
}
