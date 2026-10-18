import type { CartItem } from "@/lib/types";
import { parseCartItems, readJson, strictObject } from "@/lib/checkout";
import { getAdminSupabase } from "@/lib/supabase/admin";
import { checkDatabaseError, configurationRequired, errorResponse, jsonResponse, requireServerSupabase, requireUser } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function GET() {
  try {
    const client = await requireServerSupabase();
    const user = await requireUser(client);
    const { data, error } = await client.from("carts")
      .select("items:cart_items(product_id,variant_id,quantity)").eq("user_id", user.id).maybeSingle();
    checkDatabaseError(error);
    const items: CartItem[] = (data?.items ?? []).map((item) => ({ productId: item.product_id, variantId: item.variant_id, quantity: item.quantity }));
    return jsonResponse({ items });
  } catch (error) { return errorResponse(error); }
}

export async function PUT(request: Request) {
  try {
    const client = await requireServerSupabase();
    const admin = getAdminSupabase();
    if (!admin) throw configurationRequired();
    const user = await requireUser(client);
    const body = strictObject(await readJson(request), ["items"], "Cart");
    const items = parseCartItems(body.items, true);
    const { error } = await admin.rpc("replace_store_cart", { p_user_id: user.id, p_items: items });
    checkDatabaseError(error);
    return jsonResponse({ items });
  } catch (error) { return errorResponse(error); }
}
