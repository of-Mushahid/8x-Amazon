import { cookies } from "next/headers";
import { getAdminSupabase } from "@/lib/supabase/admin";
import { checkDatabaseError, configurationRequired, errorResponse, getVerifiedUser, jsonResponse, requireServerSupabase } from "@/lib/supabase/server";
import { COOKIE_MAX_AGE, GUEST_SESSION_COOKIE, assertSameOrigin, checkoutFingerprint, checkoutScope, guestReceiptSecret, hashSecret, isSecret, newSecret, parseCheckoutInput, readJson, receiptCookie, StoreError, UUID_PATTERN } from "@/lib/checkout";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    assertSameOrigin(request);
    await requireServerSupabase();
    if (!getAdminSupabase()) throw configurationRequired();
    const cookieStore = await cookies();
    const existing = cookieStore.get(GUEST_SESSION_COOKIE)?.value;
    cookieStore.set(GUEST_SESSION_COOKIE, isSecret(existing) ? existing : newSecret(), {
      httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production",
      path: "/api/checkout", maxAge: COOKIE_MAX_AGE,
    });
    return jsonResponse({ ready: true });
  } catch (error) { return errorResponse(error); }
}

export async function POST(request: Request) {
  try {
    const client = await requireServerSupabase();
    const admin = getAdminSupabase();
    if (!admin) throw configurationRequired();
    const input = parseCheckoutInput(await readJson(request));
    const user = await getVerifiedUser(client);
    const cookieStore = await cookies();
    let guestSecret: string | null = null;
    if (!user) {
      const existing = cookieStore.get(GUEST_SESSION_COOKIE)?.value;
      if (!isSecret(existing)) throw new StoreError("Initialize your checkout session before placing an order. Please retry.", 409, "CHECKOUT_SESSION_REQUIRED");
      guestSecret = existing;
    }
    const receipt = guestSecret ? guestReceiptSecret(guestSecret, input.idempotencyKey) : null;
    // No client price, totals, inventory, user ID, status, or card data enters this RPC.
    // It locks authoritative catalog rows, checks stock, prices, and inserts atomically.
    const { data: orderId, error } = await admin.rpc("checkout_store", {
      p_user_id: user?.id ?? null,
      p_guest_session_hash: guestSecret ? hashSecret(guestSecret) : null,
      p_scope_hash: checkoutScope(user?.id ?? null, guestSecret),
      p_idempotency_key_hash: hashSecret(input.idempotencyKey),
      p_request_hash: checkoutFingerprint(input),
      p_guest_receipt_hash: receipt ? hashSecret(receipt) : null,
      p_email: input.email, p_shipping: input.shipping, p_items: input.items, p_payment_method: input.paymentMethod,
    });
    checkDatabaseError(error);
    if (typeof orderId !== "string" || !UUID_PATTERN.test(orderId)) throw new Error("Invalid checkout response");
    if (receipt) {
      const cookie = receiptCookie(orderId);
      cookieStore.set(cookie.name, receipt, {
        httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production",
        path: cookie.path, maxAge: COOKIE_MAX_AGE,
      });
    }
    return jsonResponse({ orderId });
  } catch (error) { return errorResponse(error); }
}
