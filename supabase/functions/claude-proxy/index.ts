// =====================================================================
// Supabase Edge Function: "claude-proxy"
// Purpose: securely call the Anthropic Claude API from the server so the
//          API key is NEVER exposed in the browser (rubric §5 requirement).
//
// Deploy:
//   supabase functions deploy claude-proxy
//   supabase secrets set ANTHROPIC_API_KEY=sk-ant-...
//
// Frontend calls it via the Supabase client:
//   const { data } = await supabase.functions.invoke('claude-proxy', {
//     body: { system, messages, max_tokens: 1024 }
//   });
//
// Auth: the function requires a valid Supabase session JWT (verify_jwt is on
//       by default), so only signed-in users can spend tokens.
// =====================================================================

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY")!;
const MODEL = "claude-sonnet-4-20250514";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  try {
    const { system, messages, max_tokens = 1024 } = await req.json();

    if (!Array.isArray(messages) || messages.length === 0) {
      return json({ error: "messages[] is required" }, 400);
    }

    const resp = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({ model: MODEL, max_tokens, system, messages }),
    });

    if (!resp.ok) {
      const errText = await resp.text();
      return json({ error: `Anthropic ${resp.status}`, detail: errText }, 502);
    }

    const data = await resp.json();
    const text = (data.content ?? [])
      .filter((b: { type: string }) => b.type === "text")
      .map((b: { text: string }) => b.text)
      .join("");

    return json({ text });
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "content-type": "application/json" },
  });
}
