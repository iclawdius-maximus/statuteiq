// Supabase Edge Function: search-statutes
// Hybrid keyword + semantic search for Ohio Revised Code
//
// POST body: { query: string, state_code?: string, mode?: "keyword" | "semantic" | "auto" }
// Returns: top 20 matching statute sections

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface SearchRequest {
  query: string;
  state_code?: string;
  mode?: "keyword" | "semantic" | "auto";
}

interface StatuteResult {
  id: string;
  state_code: string;
  title_number: string;
  title_name: string;
  chapter_num: string;
  chapter_name: string;
  section_num: string;
  section_title: string;
  section_text: string;
  similarity?: number;
}

function isSectionPattern(query: string): boolean {
  // Matches patterns like "1.01", "3517.01", "45.62" (ORC section numbers)
  return /^\d+\.\d+/.test(query.trim());
}

async function keywordSearch(
  supabase: ReturnType<typeof createClient>,
  query: string,
  stateCode: string
): Promise<StatuteResult[]> {
  const { data, error } = await supabase
    .from("statutes")
    .select(
      "id, state_code, title_number, title_name, chapter_num, chapter_name, section_num, section_title, section_text"
    )
    .eq("state_code", stateCode)
    .textSearch("search_vector", query, {
      type: "websearch",
      config: "english",
    })
    .limit(20);

  if (error) throw error;
  return (data || []) as StatuteResult[];
}

async function sectionLookup(
  supabase: ReturnType<typeof createClient>,
  query: string,
  stateCode: string
): Promise<StatuteResult[]> {
  // Direct section number lookup
  const { data, error } = await supabase
    .from("statutes")
    .select(
      "id, state_code, title_number, title_name, chapter_num, chapter_name, section_num, section_title, section_text"
    )
    .eq("state_code", stateCode)
    .ilike("section_num", `${query.trim()}%`)
    .limit(20);

  if (error) throw error;
  return (data || []) as StatuteResult[];
}

// NOTE: Semantic/vector search requires a cloud-accessible embedding endpoint.
// Ollama runs locally and cannot be reached from Supabase Edge Functions.
// Until a cloud embedding endpoint (e.g. Ollama on a VPS, or another provider)
// is wired in, semantic mode falls back to FTS keyword search.
// Track: wire cloud embedding endpoint in a future update.

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: CORS_HEADERS });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  }

  try {
    const body: SearchRequest = await req.json();
    const { query, state_code = "OH", mode = "auto" } = body;

    if (!query || typeof query !== "string" || query.trim().length === 0) {
      return new Response(
        JSON.stringify({ error: "query is required and must be a non-empty string" }),
        {
          status: 400,
          headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
        }
      );
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    let results: StatuteResult[] = [];
    let searchMode = mode;

    if (mode === "auto") {
      searchMode = isSectionPattern(query) ? "keyword" : "semantic";
    }

    // Semantic/auto modes fall back to FTS — Ollama runs locally and is not
    // reachable from Supabase Edge Functions. Wire a cloud endpoint in a future update.
    let usedMode = searchMode;
    if (isSectionPattern(query)) {
      results = await sectionLookup(supabase, query, state_code);
      if (results.length === 0) {
        results = await keywordSearch(supabase, query, state_code);
      }
      usedMode = "keyword";
    } else {
      results = await keywordSearch(supabase, query, state_code);
      usedMode = "fts";
    }

    return new Response(
      JSON.stringify({
        results,
        count: results.length,
        mode: searchMode,
        search_mode: usedMode,
        query,
      }),
      {
        status: 200,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      }
    );
  } catch (err) {
    console.error("Search error:", err);
    return new Response(
      JSON.stringify({ error: "Internal server error", detail: String(err) }),
      {
        status: 500,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      }
    );
  }
});
