-- Migration 003: Switch embeddings from OpenAI (1536 dims) to Ollama nomic-embed-text (768 dims)
--
-- APPLY MANUALLY in Supabase SQL Editor:
-- https://supabase.com/dashboard/project/nwfafhsbcwwhapbrwjys/sql/new
--
-- Run this BEFORE running: npx tsx scripts/generate-embeddings.ts

-- Drop existing vector column and recreate at 768 dims for nomic-embed-text
ALTER TABLE statutes DROP COLUMN IF EXISTS embedding;
ALTER TABLE statutes ADD COLUMN embedding vector(768);

-- Drop old match_statutes function and recreate for 768 dims
DROP FUNCTION IF EXISTS match_statutes(vector(1536), int, text);
DROP FUNCTION IF EXISTS match_statutes(vector(768), int, text);

CREATE OR REPLACE FUNCTION match_statutes(
  query_embedding vector(768),
  match_count int DEFAULT 20,
  filter_state text DEFAULT 'OH'
)
RETURNS TABLE (
  id uuid,
  state_code varchar,
  title_number varchar,
  title_name text,
  chapter varchar,
  section_num varchar,
  section_title text,
  section_text text,
  similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    s.id,
    s.state_code,
    s.title_number,
    s.title_name,
    s.chapter,
    s.section_num,
    s.section_title,
    s.section_text,
    1 - (s.embedding <=> query_embedding) AS similarity
  FROM statutes s
  WHERE s.state_code = filter_state
    AND s.embedding IS NOT NULL
  ORDER BY s.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;
