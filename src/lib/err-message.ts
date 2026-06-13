/**
 * Coerces any thrown value into a human-readable string for toasts.
 *
 * Specifically handles the Supabase PostgrestError shape (a plain object of
 * `{ message, details, hint, code }`) which is NOT an Error instance —
 * `String(err)` on it returns the useless literal "[object Object]". This
 * helper checks for an `instanceof Error` first, then a plain object with a
 * string `message` field, before falling back to `String(err)` for truly
 * unknown shapes.
 *
 * Used by every catch block in the admin Spots routes so the toast surfaces
 * the real Postgres error message (e.g. "function notify_city_launch(uuid)
 * does not exist") instead of swallowing it.
 */
export function errMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (err && typeof err === "object" && "message" in err) {
    const msg = (err as { message?: unknown }).message;
    if (typeof msg === "string" && msg.length > 0) return msg;
  }
  return String(err);
}
