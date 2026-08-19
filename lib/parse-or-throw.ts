import { z } from "zod";

export function parseOrThrow<T>(schema: z.ZodType<T>, data: unknown): T {
  const result = schema.safeParse(data);
  if (!result.success) {
    throw new Error(result.error.issues[0]?.message ?? "Invalid input");
  }
  return result.data;
}
