/**
 * Embedding Generator — generates OpenAI text-embedding-3-small embeddings
 * for all statutes where embedding IS NULL, then stores back to Supabase.
 *
 * Usage: npx tsx scripts/generate-embeddings.ts
 *
 * Prerequisites:
 *   - Supabase schema applied (001_initial_schema.sql)
 *   - Statutes ingested via ingest-ohio.ts
 *   - RLS disabled (002_disable_rls_dev.sql) or service_role key used
 */

import OpenAI from "openai";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  "https://nwfafhsbcwwhapbrwjys.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im53ZmFmaHNiY3d3aGFwYnJ3anlzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIzMzE1NjgsImV4cCI6MjA4NzkwNzU2OH0.J7vBylNTrFb1ycQtXoI8s4sLqtpd3MHbp3XQFlyvDu8"
);

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const BATCH_SIZE = 50;
const EMBEDDING_MODEL = "text-embedding-3-small";
// Max tokens for embedding model; truncate section_text to ~6000 chars to stay safe
const MAX_TEXT_LENGTH = 6000;

function truncateText(text: string): string {
  if (text.length <= MAX_TEXT_LENGTH) return text;
  return text.slice(0, MAX_TEXT_LENGTH);
}

function buildEmbeddingInput(statute: {
  section_num: string;
  section_title: string;
  section_text: string;
}): string {
  return `Section ${statute.section_num}: ${statute.section_title}\n\n${truncateText(statute.section_text)}`;
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

async function generateEmbeddings(texts: string[]): Promise<number[][]> {
  const response = await openai.embeddings.create({
    model: EMBEDDING_MODEL,
    input: texts,
  });
  return response.data.map((item) => item.embedding);
}

async function updateEmbeddings(
  records: { id: string; embedding: number[] }[]
) {
  // Supabase doesn't support bulk update easily; do individual updates
  const updates = records.map(({ id, embedding }) =>
    supabase.from("statutes").update({ embedding }).eq("id", id)
  );
  const results = await Promise.all(updates);
  for (const { error } of results) {
    if (error) throw error;
  }
}

async function main() {
  console.log("=== StatuteIQ Embedding Generator ===");
  console.log(`Model: ${EMBEDDING_MODEL}`);
  console.log(`Started: ${new Date().toISOString()}\n`);

  let pending: number;
  try {
    pending = await countPending();
  } catch (err) {
    console.error("Failed to count pending statutes:", err);
    process.exit(1);
  }

  if (pending === 0) {
    console.log("No statutes pending embedding generation. All done!");
    process.exit(0);
  }

  console.log(`Statutes needing embeddings: ${pending}`);
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

    const inputs = batch.map(buildEmbeddingInput);

    let embeddings: number[][];
    try {
      embeddings = await generateEmbeddings(inputs);
    } catch (err) {
      console.error(
        `Error generating embeddings for batch at offset ${offset}:`,
        err
      );
      errors++;
      offset += BATCH_SIZE;
      continue;
    }

    const updates = batch.map((statute, i) => ({
      id: statute.id,
      embedding: embeddings[i],
    }));

    try {
      await updateEmbeddings(updates);
      processed += batch.length;
      const pct = pending > 0 ? ((processed / pending) * 100).toFixed(1) : "0";
      console.log(
        `Progress: ${processed}/${pending} (${pct}%) — batch of ${batch.length} at offset ${offset}`
      );
    } catch (err) {
      console.error(
        `Error storing embeddings for batch at offset ${offset}:`,
        err
      );
      errors++;
    }

    // Don't advance offset — we re-query NULL embeddings, so processed ones
    // won't show up again. But if there were errors storing, we'd loop forever.
    // Advance anyway to avoid infinite loop on persistent errors.
    offset += BATCH_SIZE;

    // Small delay to avoid rate limiting
    await new Promise((r) => setTimeout(r, 200));
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
