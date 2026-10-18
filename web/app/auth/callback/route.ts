import { NextResponse } from "next/server";
import { safeRedirectPath } from "@/lib/checkout";
import { requireServerSupabase, requireUser } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const next = safeRedirectPath(url.searchParams.get("next"));
  // Never render raw JSON at this browser-facing endpoint; always return the shopper to a usable page.
  const fail = (message: string) => {
    const redirect = new URL("/sign-in", url.origin);
    redirect.searchParams.set("next", next);
    redirect.searchParams.set("error", message);
    const response = NextResponse.redirect(redirect);
    response.headers.set("Cache-Control", "private, no-store");
    return response;
  };
  const code = url.searchParams.get("code");
  if (!code || url.searchParams.has("error")) {
    return fail("That sign-in link is invalid or has already been used. Please sign in with your email and password.");
  }
  try {
    const client = await requireServerSupabase();
    const { error } = await client.auth.exchangeCodeForSession(code);
    if (error) return fail("We couldn't verify that link. Please sign in with your email and password.");
    await requireUser(client);
    const response = NextResponse.redirect(new URL(next, url.origin));
    response.headers.set("Cache-Control", "private, no-store");
    response.headers.set("Referrer-Policy", "no-referrer");
    return response;
  } catch {
    return fail("Sign-in could not be completed. Please try again.");
  }
}
