// Supabase Edge Function: search-statutes
// Hybrid keyword + semantic search for Ohio Revised Code
//
// POST body: { query: string, state_code?: string, mode?: "keyword" | "semantic" | "auto" }
// Returns: top 20 matching statute sections

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY")!;

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

async function semanticSearch(
  supabase: ReturnType<typeof createClient>,
  query: string,
  stateCode: string
): Promise<StatuteResult[]> {
  // Generate embedding via OpenAI
  const embeddingResponse = await fetch(
    "https://api.openai.com/v1/embeddings",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "text-embedding-3-small",
        input: query,
      }),
    }
  );

  if (!embeddingResponse.ok) {
    const err = await embeddingResponse.text();
    throw new Error(`OpenAI embedding error: ${err}`);
  }

  const embeddingData = await embeddingResponse.json();
  const embedding = embeddingData.data[0].embedding;

  // Call the match_statutes RPC function
  const { data, error } = await supabase.rpc("match_statutes", {
    query_embedding: embedding,
    match_count: 20,
    filter_state: stateCode,
  });

  if (error) throw error;
  return (data || []) as StatuteResult[];
}

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

    if (searchMode === "keyword" || isSectionPattern(query)) {
      // Try section number direct lookup first
      if (isSectionPattern(query)) {
        results = await sectionLookup(supabase, query, state_code);
      }
      // Fall back to full-text search
      if (results.length === 0) {
        results = await keywordSearch(supabase, query, state_code);
      }
    } else {
      // Semantic search; fall back to keyword if OpenAI key not set or fails
      try {
        if (OPENAI_API_KEY) {
          results = await semanticSearch(supabase, query, state_code);
        } else {
          results = await keywordSearch(supabase, query, state_code);
        }
      } catch (err) {
        console.error("Semantic search failed, falling back to keyword:", err);
        results = await keywordSearch(supabase, query, state_code);
      }
    }

    return new Response(
      JSON.stringify({
        results,
        count: results.length,
        mode: searchMode,
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
