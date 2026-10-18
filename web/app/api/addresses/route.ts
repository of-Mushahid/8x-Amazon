import type { Address } from "@/lib/types";
import { parseAddress, readJson, strictObject } from "@/lib/checkout";
import { checkDatabaseError, errorResponse, jsonResponse, requireServerSupabase, requireUser } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function GET() {
  try {
    const client = await requireServerSupabase();
    const user = await requireUser(client);
    const { data, error } = await client.from("addresses").select("id,address")
      .eq("user_id", user.id).order("created_at", { ascending: false });
    checkDatabaseError(error);
    const addresses: (Address & { id: string })[] = (data ?? []).map((row) => ({ ...(row.address as Address), id: row.id }));
    return jsonResponse({ addresses });
  } catch (error) { return errorResponse(error); }
}

export async function POST(request: Request) {
  try {
    const client = await requireServerSupabase();
    const user = await requireUser(client);
    const body = strictObject(await readJson(request), ["address"], "Address request");
    const address = parseAddress(body.address);
    const { data, error } = await client.from("addresses").insert({ user_id: user.id, address }).select("id").single();
    checkDatabaseError(error);
    if (!data) throw new Error("Missing saved address");
    return jsonResponse({ address: { ...address, id: data.id } }, 201);
  } catch (error) { return errorResponse(error); }
}
