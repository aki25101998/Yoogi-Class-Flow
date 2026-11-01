import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";

/**
 * Fast-path check: Determines if the current request already has a valid, non-expired
 * Supabase auth session token, avoiding redundant remote HTTPS network hops to Supabase Auth.
 */
function isSessionFresh(request: NextRequest): boolean {
  try {
    const allCookies = request.cookies.getAll();
    const authCookies = allCookies.filter(
      (c) => c.name.startsWith("sb-") && c.name.includes("-auth-token")
    );
    if (authCookies.length === 0) return false;

    // Sort chunked cookies (.0, .1) to preserve order
    authCookies.sort((a, b) => a.name.localeCompare(b.name));
    let rawValue = authCookies.map((c) => c.value).join("");

    if (rawValue.startsWith("base64-")) {
      rawValue = Buffer.from(rawValue.slice(7), "base64").toString("utf-8");
    }

    let expiresAt: number | undefined;
    try {
      const parsed = JSON.parse(rawValue);
      expiresAt = parsed.expires_at;
      if (!expiresAt && parsed.access_token) {
        const payloadBase64 = parsed.access_token.split(".")[1];
        if (payloadBase64) {
          const payload = JSON.parse(
            Buffer.from(payloadBase64, "base64").toString("utf-8")
          );
          expiresAt = payload.exp;
        }
      }
    } catch {
      return false;
    }

    if (typeof expiresAt === "number") {
      const nowSec = Math.floor(Date.now() / 1000);
      // Valid for at least another 60 seconds
      return expiresAt > nowSec + 60;
    }
    return false;
  } catch {
    return false;
  }
}

export const updateSession = async (request: NextRequest) => {
  let supabaseResponse = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const isPrefetch =
    request.headers.get("next-router-prefetch") === "1" ||
    request.headers.get("purpose") === "prefetch";

  // Fast path: Next.js prefetch or fresh sessions do not need blocking token refresh
  if (isPrefetch || isSessionFresh(request)) {
    return supabaseResponse;
  }

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options: any }[]) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Refresh token when expired or near expiration (< 60s)
  await supabase.auth.getUser();

  return supabaseResponse;
};
