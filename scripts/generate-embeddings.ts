/**
 * Embedding Generator — generates Ollama nomic-embed-text embeddings (768 dims)
 * for all statutes where embedding IS NULL, then stores back to Supabase.
 *
 * Usage: npx tsx scripts/generate-embeddings.ts
 *
 * Prerequisites:
 *   - Ollama running locally: ollama serve
 *   - nomic-embed-text model: ollama pull nomic-embed-text
 *   - Supabase migration 003_ollama_embeddings.sql applied
 *   - Statutes ingested via ingest-ohio.ts
 *   - RLS disabled (002_disable_rls_dev.sql) or service_role key used
 */

import { createClient } from "@supabase/supabase-js";

const OLLAMA_BASE_URL = "http://localhost:11434";
const OLLAMA_MODEL = "nomic-embed-text";
const BATCH_SIZE = 10;
// Truncate to ~6000 chars to keep prompts reasonable
const MAX_TEXT_LENGTH = 6000;

const supabase = createClient(
  "https://nwfafhsbcwwhapbrwjys.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im53ZmFmaHNiY3d3aGFwYnJ3anlzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIzMzE1NjgsImV4cCI6MjA4NzkwNzU2OH0.J7vBylNTrFb1ycQtXoI8s4sLqtpd3MHbp3XQFlyvDu8"
);

async function checkOllama(): Promise<void> {
  let res: Response;
  try {
    res = await fetch(`${OLLAMA_BASE_URL}/api/tags`);
  } catch {
    console.error("ERROR: Cannot reach Ollama at http://localhost:11434");
    console.error("Start Ollama with: ollama serve");
    process.exit(1);
  }

  if (!res.ok) {
    console.error(`ERROR: Ollama returned HTTP ${res.status}`);
    process.exit(1);
  }

  const data = (await res.json()) as { models: { name: string }[] };
  const models = data.models || [];
  const hasModel = models.some(
    (m) => m.name === OLLAMA_MODEL || m.name.startsWith(`${OLLAMA_MODEL}:`)
  );

  if (!hasModel) {
    console.error(`ERROR: Model '${OLLAMA_MODEL}' not found in Ollama.`);
    console.error(`Run: ollama pull ${OLLAMA_MODEL}`);
    process.exit(1);
  }

  console.log(`Ollama OK — model '${OLLAMA_MODEL}' is available.`);
}

function truncateText(text: string): string {
  return text.length <= MAX_TEXT_LENGTH ? text : text.slice(0, MAX_TEXT_LENGTH);
}

function buildEmbeddingInput(statute: {
  section_num: string;
  section_title: string;
  section_text: string;
}): string {
  return `Section ${statute.section_num}: ${statute.section_title}\n\n${truncateText(statute.section_text)}`;
}

async function generateEmbedding(text: string): Promise<number[]> {
  const res = await fetch(`${OLLAMA_BASE_URL}/api/embeddings`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ model: OLLAMA_MODEL, prompt: text }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Ollama embedding error (${res.status}): ${err}`);
  }

  const data = (await res.json()) as { embedding: number[] };
  return data.embedding;
}

async function fetchBatch(offset: number, limit: number) {
  const { data, error } = await supabase
    .from("statutes")
    .select("id, section_num, section_title, section_text")
    .is("embedding", null)
    .range(offset, offset + limit - 1);

  if (error) throw error;
  return data || [];
}

async function countPending(): Promise<number> {
  const { count, error } = await supabase
    .from("statutes")
    .select("id", { count: "exact", head: true })
    .is("embedding", null);

  if (error) throw error;
  return count || 0;
}

async function updateEmbeddings(
  records: { id: string; embedding: number[] }[]
) {
  const updates = records.map(({ id, embedding }) =>
    supabase.from("statutes").update({ embedding }).eq("id", id)
  );
  const results = await Promise.all(updates);
  for (const { error } of results) {
    if (error) throw error;
  }
}

async function main() {
  console.log("=== StatuteIQ Embedding Generator (Ollama) ===");
  console.log(`Model: ${OLLAMA_MODEL} (768 dims)`);
  console.log(`Started: ${new Date().toISOString()}\n`);

  await checkOllama();

  let pending: number;
  try {
    pending = await countPending();
  } catch (err) {
    console.error("Failed to count pending statutes:", err);
    console.error(
      "\nIf you see a dimension mismatch or column error, apply the migration first:"
    );
    console.error(
      "https://supabase.com/dashboard/project/nwfafhsbcwwhapbrwjys/sql/new"
    );
    console.error("File: supabase/migrations/003_ollama_embeddings.sql");
    process.exit(1);
  }

  if (pending === 0) {
    console.log("No statutes pending embedding generation. All done!");
    process.exit(0);
  }

  console.log(`\nStatutes needing embeddings: ${pending}`);
  console.log(`Batch size: ${BATCH_SIZE}\n`);

  let processed = 0;
  let errors = 0;
  let offset = 0;

  while (true) {
    let batch: {
      id: string;
      section_num: string;
      section_title: string;
      section_text: string;
    }[];

    try {
      batch = await fetchBatch(offset, BATCH_SIZE);
    } catch (err) {
      console.error(`Error fetching batch at offset ${offset}:`, err);
      errors++;
      break;
    }

    if (batch.length === 0) break;

    const embeddings: number[][] = [];
    for (const statute of batch) {
      try {
        const input = buildEmbeddingInput(statute);
        const embedding = await generateEmbedding(input);
        embeddings.push(embedding);
      } catch (err) {
        console.error(`Error generating embedding for ${statute.section_num}:`, err);
        embeddings.push([]); // placeholder; filtered out below
        errors++;
      }
    }

    const updates = batch
      .map((statute, i) => ({ id: statute.id, embedding: embeddings[i] }))
      .filter((u) => u.embedding.length > 0);

    if (updates.length > 0) {
      try {
        await updateEmbeddings(updates);
        processed += updates.length;
        const pct = pending > 0 ? ((processed / pending) * 100).toFixed(1) : "0";
        console.log(
          `Progress: ${processed}/${pending} (${pct}%) — batch of ${updates.length}`
        );
      } catch (err) {
        console.error(`Error storing embeddings for batch at offset ${offset}:`, err);
        errors++;
      }
    }

    offset += BATCH_SIZE;
  }

  console.log(`\n=== Embedding Generation Complete ===`);
  console.log(`Total processed: ${processed}`);
  console.log(`Total errors: ${errors}`);
  console.log(`Finished: ${new Date().toISOString()}`);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
