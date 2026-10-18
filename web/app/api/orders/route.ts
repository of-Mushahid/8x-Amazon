import type { Order } from "@/lib/types";
import { checkDatabaseError, errorResponse, jsonResponse, ORDER_SELECT, requireServerSupabase, requireUser } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function GET() {
  try {
    const client = await requireServerSupabase();
    const user = await requireUser(client);
    const { data, error } = await client.from("orders").select(ORDER_SELECT)
      .eq("user_id", user.id).order("created_at", { ascending: false });
    checkDatabaseError(error);
    return jsonResponse({ orders: (data ?? []) as Order[] });
  } catch (error) { return errorResponse(error); }
}
