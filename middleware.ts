import { NextRequest, NextResponse } from "next/server";

// Next.js's App Router injects its own inline scripts for RSC hydration —
// a static CSP with no 'unsafe-inline' blocks those (confirmed by running
// the app: see console errors like "Executing inline script violates...").
// The documented fix is a per-request nonce: generate it here, forward it to
// Server Components via the request header, and Next automatically stamps
// its own inline scripts with the same nonce.
// https://nextjs.org/docs/app/guides/content-security-policy
export function middleware(request: NextRequest) {
  const nonce = Buffer.from(crypto.randomUUID()).toString("base64");

  // Dev-mode React/Turbopack HMR needs eval() for debugging; React never
  // uses it in production, so this is scoped out of the prod CSP entirely.
  const devScriptSrc = process.env.NODE_ENV === "development" ? " 'unsafe-eval'" : "";

  const cspHeader = `
    default-src 'self';
    script-src 'self' 'nonce-${nonce}' https://challenges.cloudflare.com${devScriptSrc};
    style-src 'self' 'unsafe-inline';
    img-src 'self' https: data:;
    font-src 'self' data:;
    connect-src 'self' https://challenges.cloudflare.com;
    frame-src https://challenges.cloudflare.com https://accounts.google.com;
    form-action 'self' https://accounts.google.com;
    frame-ancestors 'none';
    base-uri 'self';
    object-src 'none';
  `;
  const contentSecurityPolicyHeaderValue = cspHeader.replace(/\s{2,}/g, " ").trim();

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("Content-Security-Policy", contentSecurityPolicyHeaderValue);

  const response = NextResponse.next({
    request: { headers: requestHeaders },
  });
  response.headers.set("Content-Security-Policy", contentSecurityPolicyHeaderValue);

  return response;
}

export const config = {
  matcher: [
    // Skip static assets and Next's internal image optimizer route.
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
