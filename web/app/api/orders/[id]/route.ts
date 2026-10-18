import { cookies } from "next/headers";
import type { Order } from "@/lib/types";
import { hashSecret, isSecret, receiptCookie, StoreError, UUID_PATTERN } from "@/lib/checkout";
import { getAdminSupabase } from "@/lib/supabase/admin";
import { checkDatabaseError, configurationRequired, errorResponse, getVerifiedUser, jsonResponse, ORDER_SELECT, requireServerSupabase } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id: rawId } = await context.params;
    if (!UUID_PATTERN.test(rawId)) throw new StoreError("Order not found or receipt access is unavailable.", 404, "ORDER_NOT_FOUND");
    const id = rawId.toLowerCase();
    // Receipt possession is independent of Auth, including expired sign-in cookies.
    const secret = (await cookies()).get(receiptCookie(id).name)?.value;
    if (isSecret(secret)) {
      const admin = getAdminSupabase();
      if (!admin) throw configurationRequired();
      // A narrowly scoped server read, never a guest SELECT policy or a secret in the URL.
      const { data, error } = await admin.from("orders").select(ORDER_SELECT)
        .eq("id", id).is("user_id", null).eq("guest_receipt_hash", hashSecret(secret)).maybeSingle();
      checkDatabaseError(error);
      if (data) return jsonResponse({ order: data as Order });
    }
    const client = await requireServerSupabase();
    const user = await getVerifiedUser(client);
    if (user) {
      const { data, error } = await client.from("orders").select(ORDER_SELECT).eq("id", id).eq("user_id", user.id).maybeSingle();
      checkDatabaseError(error);
      if (data) return jsonResponse({ order: data as Order });
    }
    throw new StoreError("Order not found or receipt access is unavailable.", 404, "ORDER_NOT_FOUND");
  } catch (error) { return errorResponse(error); }
}
