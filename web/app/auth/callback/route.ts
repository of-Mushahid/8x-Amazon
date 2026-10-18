import { NextResponse } from "next/server";
import { safeRedirectPath, StoreError } from "@/lib/checkout";
import { errorResponse, requireServerSupabase, requireUser } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const client = await requireServerSupabase();
    const url = new URL(request.url);
    const code = url.searchParams.get("code");
    if (!code || url.searchParams.has("error")) throw new StoreError("Sign-in could not be completed. Please request a new sign-in link.");
    const { error } = await client.auth.exchangeCodeForSession(code);
    if (error) throw new StoreError("Sign-in could not be completed. Please request a new sign-in link.");
    await requireUser(client);
    const response = NextResponse.redirect(new URL(safeRedirectPath(url.searchParams.get("next")), url.origin));
    response.headers.set("Cache-Control", "private, no-store");
    response.headers.set("Referrer-Policy", "no-referrer");
    return response;
  } catch (error) { return errorResponse(error); }
}
