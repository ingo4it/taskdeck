import { z } from "zod";

/**
 * Environment validation. Split so a server-only secret can never be bundled
 * into client code: `serverEnv` is read only in route handlers / server
 * actions / server components; `publicEnv` holds the `NEXT_PUBLIC_*` values
 * that are safe in the browser.
 */
const serverSchema = z.object({
  KEYSTONE_URL: z.string().url(),
  PULSEQ_ADMIN_URL: z.string().url(),
  MODELGATE_URL: z.string().url(),
  SESSION_SECRET: z.string().min(32),
  SESSION_COOKIE: z.string().default("td_session"),
  SESSION_TTL_SECONDS: z.coerce.number().int().positive().default(86_400),
});

const publicSchema = z.object({
  NEXT_PUBLIC_APP_URL: z.string().url(),
  NEXT_PUBLIC_PRESENCE_WS_URL: z.string().url(),
});

function parse<T extends z.ZodTypeAny>(schema: T, source: Record<string, string | undefined>): z.infer<T> {
  const result = schema.safeParse(source);
  if (!result.success) {
    const issues = result.error.issues.map((i) => `  - ${i.path.join(".")}: ${i.message}`).join("\n");
    throw new Error(`Invalid environment:\n${issues}`);
  }
  return result.data;
}

let _server: z.infer<typeof serverSchema> | null = null;

export function serverEnv(): z.infer<typeof serverSchema> {
  if (typeof window !== "undefined") {
    throw new Error("serverEnv() must not be called in the browser");
  }
  _server ??= parse(serverSchema, process.env);
  return _server;
}

// NEXT_PUBLIC_* are inlined at build time, so this is a plain object.
export const publicEnv = parse(publicSchema, {
  NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
  NEXT_PUBLIC_PRESENCE_WS_URL: process.env.NEXT_PUBLIC_PRESENCE_WS_URL,
});
