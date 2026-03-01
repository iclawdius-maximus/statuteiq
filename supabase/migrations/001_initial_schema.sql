-- Enable pgvector
CREATE EXTENSION IF NOT EXISTS vector;

-- Statutes table
CREATE TABLE IF NOT EXISTS statutes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  state_code VARCHAR(2) NOT NULL DEFAULT 'OH',
  title_number VARCHAR(10) NOT NULL,
  title_name TEXT NOT NULL,
  chapter_num VARCHAR(20) NOT NULL,
  chapter_name TEXT NOT NULL DEFAULT '',
  section_num VARCHAR(20) NOT NULL,
  section_title TEXT NOT NULL DEFAULT '',
  section_text TEXT NOT NULL,
  last_updated DATE,
  ingested_at TIMESTAMPTZ DEFAULT NOW(),
  embedding vector(1536),
  UNIQUE(state_code, section_num)
);

-- Bookmarks table
CREATE TABLE IF NOT EXISTS bookmarks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  device_id TEXT NOT NULL,
  statute_id UUID REFERENCES statutes(id) ON DELETE CASCADE,
  alert_enabled BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(device_id, statute_id)
);

-- Statute changelog table
CREATE TABLE IF NOT EXISTS statute_changelog (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  statute_id UUID REFERENCES statutes(id) ON DELETE CASCADE,
  detected_at TIMESTAMPTZ DEFAULT NOW(),
  previous_text TEXT,
  new_text TEXT,
  change_summary TEXT
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_statutes_state_code ON statutes(state_code);
CREATE INDEX IF NOT EXISTS idx_statutes_section_num ON statutes(section_num);
CREATE INDEX IF NOT EXISTS idx_statutes_title_number ON statutes(title_number);
CREATE INDEX IF NOT EXISTS idx_statutes_chapter_num ON statutes(chapter_num);
CREATE INDEX IF NOT EXISTS idx_bookmarks_device_id ON bookmarks(device_id);
CREATE INDEX IF NOT EXISTS idx_bookmarks_statute_id ON bookmarks(statute_id);

-- Full text search
ALTER TABLE statutes ADD COLUMN IF NOT EXISTS search_vector tsvector
  GENERATED ALWAYS AS (to_tsvector('english', coalesce(section_title, '') || ' ' || coalesce(section_text, ''))) STORED;
CREATE INDEX IF NOT EXISTS idx_statutes_search ON statutes USING GIN(search_vector);

-- pgvector similarity search function
CREATE OR REPLACE FUNCTION match_statutes(
  query_embedding vector(1536),
  match_count int DEFAULT 20,
  filter_state text DEFAULT 'OH'
)
RETURNS TABLE (
  id uuid,
  state_code varchar,
  title_number varchar,
  title_name text,
  chapter_num varchar,
  chapter_name text,
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
    s.chapter_num,
    s.chapter_name,
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
