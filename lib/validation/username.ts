import { z } from "zod";

// Letters/digits/underscore/hyphen only — keeps it clean wherever it's
// displayed and rules out whitespace/homoglyph tricks that could be used to
// impersonate someone else's name.
export const usernameSchema = z
  .string()
  .trim()
  .min(3, "Username must be at least 3 characters")
  .max(20, "Username must be 20 characters or fewer")
  .regex(/^[a-zA-Z0-9_-]+$/, "Only letters, numbers, underscores, and hyphens are allowed");
