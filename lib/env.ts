import { z } from "zod";

/**
 * Environment validation. Split so a server-only secret can never be bundled
 * into client code: `serverEnv` is read only in route handlers / server
 * actions / server components; `publicEnv` holds the `NEXT_PUBLIC_*` values
 * that are safe in the browser.
 *
 * DEMO_MODE swaps the three upstream services for in-process fixtures (see
 * lib/demo/) so the app can be deployed standalone, with nothing to point at
 * keystone / pulseq / modelgate — that's the only reason the three URLs and
 * the presence WS URL are optional at all; a real deployment still needs them.
 */
const boolString = z
  .enum(["true", "false"])
  .default("false")
  .transform((v) => v === "true");

const serverSchema = z
  .object({
    DEMO_MODE: boolString,
    KEYSTONE_URL: z.string().url().optional(),
    PULSEQ_ADMIN_URL: z.string().url().optional(),
    MODELGATE_URL: z.string().url().optional(),
    SESSION_SECRET: z.string().min(32),
    SESSION_COOKIE: z.string().default("td_session"),
    SESSION_TTL_SECONDS: z.coerce.number().int().positive().default(86_400),
  })
  .superRefine((env, ctx) => {
    if (env.DEMO_MODE) return;
    for (const key of ["KEYSTONE_URL", "PULSEQ_ADMIN_URL", "MODELGATE_URL"] as const) {
      if (!env[key]) ctx.addIssue({ code: "custom", path: [key], message: "Required unless DEMO_MODE=true" });
    }
  });

const publicSchema = z
  .object({
    NEXT_PUBLIC_APP_URL: z.string().url(),
    NEXT_PUBLIC_DEMO_MODE: boolString,
    NEXT_PUBLIC_PRESENCE_WS_URL: z.string().url().optional(),
  })
  .superRefine((env, ctx) => {
    if (env.NEXT_PUBLIC_DEMO_MODE) return;
    if (!env.NEXT_PUBLIC_PRESENCE_WS_URL) {
      ctx.addIssue({
        code: "custom",
        path: ["NEXT_PUBLIC_PRESENCE_WS_URL"],
        message: "Required unless NEXT_PUBLIC_DEMO_MODE=true",
      });
    }
  });

function parse<T extends z.ZodTypeAny>(schema: T, source: Record<string, string | undefined>): z.infer<T> {
  const result = schema.safeParse(source);
  if (!result.success) {
    const issues = result.error.issues.map((i) => `  - ${i.path.join(".")}: ${i.message}`).join("\n");
    throw new Error(`Invalid environment:\n${issues}`);
  }
  return result.data;
}

type ServerEnv = z.infer<typeof serverSchema>;
/** Server env with the upstream URLs guaranteed present — the non-demo case. */
export type LiveServerEnv = ServerEnv &
  Required<Pick<ServerEnv, "KEYSTONE_URL" | "PULSEQ_ADMIN_URL" | "MODELGATE_URL">>;

let _server: ServerEnv | null = null;

export function serverEnv(): ServerEnv {
  if (typeof window !== "undefined") {
    throw new Error("serverEnv() must not be called in the browser");
  }
  _server ??= parse(serverSchema, process.env);
  return _server;
}

// NEXT_PUBLIC_* are inlined at build time, so this is a plain object.
export const publicEnv = parse(publicSchema, {
  NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
  NEXT_PUBLIC_DEMO_MODE: process.env.NEXT_PUBLIC_DEMO_MODE,
  NEXT_PUBLIC_PRESENCE_WS_URL: process.env.NEXT_PUBLIC_PRESENCE_WS_URL,
});
