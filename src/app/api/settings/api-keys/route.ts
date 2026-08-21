import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { generateApiKey } from "@/lib/api-key";

// Self-service key management for the logged-in human. Uses the regular
// cookie-scoped server client (not the admin client) — RLS's
// "api_keys_*_own" policies already restrict everything to auth.uid(), so
// there's no reason to bypass them here.

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "not signed in" }, { status: 401 });

  const { data, error } = await supabase
    .from("api_keys")
    .select("id, label, created_at, last_used_at")
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ keys: data });
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "not signed in" }, { status: 401 });

  const { label } = await request.json().catch(() => ({ label: undefined }));
  const { raw, hash } = generateApiKey();

  const { data, error } = await supabase
    .from("api_keys")
    .insert({ user_id: user.id, key_hash: hash, label: label || null })
    .select("id, label, created_at")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // `raw` is returned exactly once — only the hash is ever stored.
  return NextResponse.json({ key: data, raw }, { status: 201 });
}

export async function DELETE(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "not signed in" }, { status: 401 });

  const { id } = await request.json().catch(() => ({ id: undefined }));
  if (!id) return NextResponse.json({ error: "'id' required" }, { status: 400 });

  const { error } = await supabase.from("api_keys").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
