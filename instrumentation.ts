// Next.js's onRequestError hook runs before an error gets turned into the
// opaque digest shown to the client — logging the full details here is the
// only way to see what a production error actually was, since Vercel's
// runtime logs otherwise just show "[object Object]" / "[object ErrorEvent]"
// for anything that isn't a plain Error with a .message.
export async function onRequestError(error: unknown, request: { path: string; method: string }) {
  const details =
    error instanceof Error
      ? { name: error.name, message: error.message, stack: error.stack }
      : (() => {
          try {
            return {
              nonErrorValue: JSON.stringify(error, Object.getOwnPropertyNames(error ?? {})),
            };
          } catch {
            return { nonErrorValue: String(error) };
          }
        })();

  console.error("[onRequestError]", request.method, request.path, details);
}
