/**
 * ORC Scraper — Ohio Revised Code ingestion
 * Usage: npx tsx scripts/ingest-ohio.ts
 *
 * Site structure: https://codes.ohio.gov/ohio-revised-code
 *   Title index  → /ohio-revised-code
 *   Title page   → /ohio-revised-code/title-1
 *   Chapter page → /ohio-revised-code/chapter-101
 *   Section page → /ohio-revised-code/section-101.01
 *
 * NOTE ON RLS: If inserts fail with 403/permission errors, apply
 * supabase/migrations/002_disable_rls_dev.sql in the Supabase SQL Editor:
 * https://supabase.com/dashboard/project/nwfafhsbcwwhapbrwjys/sql/new
 */

import axios from "axios";
import * as cheerio from "cheerio";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  "https://nwfafhsbcwwhapbrwjys.supabase.co",
  process.env.SUPABASE_ANON_KEY ||
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im53ZmFmaHNiY3d3aGFwYnJ3anlzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIzMzE1NjgsImV4cCI6MjA4NzkwNzU2OH0.J7vBylNTrFb1ycQtXoI8s4sLqtpd3MHbp3XQFlyvDu8"
);

const BASE_URL = "https://codes.ohio.gov";
const ORC_INDEX = `${BASE_URL}/ohio-revised-code`;
const DELAY_MS = 1500;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

const ORC_BASE = `${BASE_URL}/ohio-revised-code/`;

/** Resolve a potentially-relative href.
 *  - Hrefs that start with "ohio-revised-code/" are relative to the site root.
 *  - Short slugs like "chapter-101" or "section-101.01" are relative to /ohio-revised-code/.
 */
function resolveUrl(href: string): string {
  if (href.startsWith("http")) return href;
  if (href.startsWith("/")) return `${BASE_URL}${href}`;
  if (href.startsWith("ohio-revised-code/")) return `${BASE_URL}/${href}`;
  // Short slug — resolve against /ohio-revised-code/
  return `${ORC_BASE}${href}`;
}

async function fetchHtml(url: string, retries = 5): Promise<string> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const response = await axios.get(url, {
        headers: {
          "User-Agent":
            "StatuteIQ/1.0 (legal research tool; contact iclawdius@heavenscapedevelopment.com)",
        },
        timeout: 20000,
        maxRedirects: 5,
      });
      return response.data as string;
    } catch (err: any) {
      const status = err?.response?.status;
      if (status === 429 || status === 503) {
        const wait = Math.min(DELAY_MS * Math.pow(3, attempt), 60000);
        console.log(`    Rate limited (${status}), waiting ${wait}ms before retry ${attempt + 1}/${retries}...`);
        await sleep(wait);
      } else {
        throw err;
      }
    }
  }
  throw new Error(`Failed to fetch ${url} after ${retries} retries`);
}

interface TitleInfo {
  titleNumber: string;
  titleName: string;
  url: string;
}

interface ChapterInfo {
  chapterNum: string;
  chapterName: string;
  url: string;
}

interface SectionInfo {
  sectionNum: string;
  sectionTitle: string;
  url: string;
}

async function getTitles(): Promise<TitleInfo[]> {
  console.log("Fetching title index...");
  const html = await fetchHtml(ORC_INDEX);
  const $ = cheerio.load(html);
  const titles: TitleInfo[] = [];

  $("a").each((_, el) => {
    const href = $(el).attr("href") || "";
    const text = $(el).text().trim();

    // Match /ohio-revised-code/title-1 or ohio-revised-code/title-1
    const titleMatch = href.match(/ohio-revised-code\/title-(\d+)/i);
    if (titleMatch) {
      const titleNumber = titleMatch[1];
      const titleName = text.replace(/^Title\s+\d+\s*/i, "").replace(/^\|\s*/, "").trim() || text;
      const url = resolveUrl(href);
      if (!titles.find((t) => t.titleNumber === titleNumber)) {
        titles.push({ titleNumber, titleName, url });
      }
    }
  });

  console.log(`Found ${titles.length} titles`);
  return titles;
}

async function getChapters(titleUrl: string): Promise<ChapterInfo[]> {
  // titleUrl used for the fetch; chapter hrefs resolve flat under /ohio-revised-code/
  await sleep(DELAY_MS);
  const html = await fetchHtml(titleUrl);
  const $ = cheerio.load(html);
  const chapters: ChapterInfo[] = [];

  $("a").each((_, el) => {
    const href = $(el).attr("href") || "";
    const text = $(el).text().trim();

    // Match chapter-101 pattern (relative or absolute)
    const chapterMatch = href.match(/chapter-(\d+[\w.-]*)/i);
    if (chapterMatch) {
      const chapterNum = chapterMatch[1];
      const chapterName =
        text.replace(/^Chapter\s+[\d.]+\s*/i, "").trim() || text;
      const url = resolveUrl(href);
      if (!chapters.find((c) => c.chapterNum === chapterNum)) {
        chapters.push({ chapterNum, chapterName, url });
      }
    }
  });

  return chapters;
}

async function getSections(chapterUrl: string): Promise<SectionInfo[]> {
  await sleep(DELAY_MS);
  const html = await fetchHtml(chapterUrl);
  const $ = cheerio.load(html);
  const sections: SectionInfo[] = [];

  $("a").each((_, el) => {
    const href = $(el).attr("href") || "";
    const text = $(el).text().trim();

    // Match section-101.01 pattern (relative or absolute)
    const sectionMatch = href.match(/section-([\d]+\.[\d]+[\w.-]*)/i);
    if (sectionMatch) {
      const sectionNum = sectionMatch[1];
      const sectionTitle = text.replace(/^[\d.]+\s*/i, "").trim() || "";
      const url = resolveUrl(href);
      if (!sections.find((s) => s.sectionNum === sectionNum)) {
        sections.push({ sectionNum, sectionTitle, url });
      }
    }
  });

  return sections;
}

async function getSectionText(
  sectionUrl: string
): Promise<{ text: string; title: string; lastUpdated: string | null }> {
  await sleep(DELAY_MS);
  const html = await fetchHtml(sectionUrl);
  const $ = cheerio.load(html);

  let text = "";
  let title = "";
  let lastUpdated: string | null = null;

  // Extract section title from h1 (format: "Section 101.01 | Title of section.")
  const h1Text = $("h1").first().text().trim();
  const titleMatch = h1Text.match(/\|\s*(.+)$/);
  if (titleMatch) {
    title = titleMatch[1].replace(/\.$/, "").trim();
  }

  // Extract statute text from .laws-body section
  const lawsBody = $("section.laws-body");
  if (lawsBody.length > 0) {
    // Remove no-print elements (navigation, notices)
    lawsBody.find(".no-print").remove();
    // Get paragraph texts
    const paragraphs: string[] = [];
    lawsBody.find("p").each((_, el) => {
      const pText = $(el).text().trim();
      if (pText && pText.length > 5) {
        paragraphs.push(pText);
      }
    });
    text = paragraphs.join("\n\n");
    // Fallback: full text of laws-body
    if (!text) {
      text = lawsBody.text().trim();
    }
  }

  // Fallback: try main content
  if (!text) {
    $("nav, header, footer, script, style, .no-print, .section-banner").remove();
    text = $("main").text().replace(/\s+/g, " ").trim();
  }

  // Extract last updated date
  const lastUpdatedMatch = $(".laws-notice p").text().match(/Last updated (.+) at/i);
  if (lastUpdatedMatch) {
    lastUpdated = lastUpdatedMatch[1].trim();
  }

  // Also try effective date
  if (!lastUpdated) {
    const effectiveEl = $(".laws-section-info-module").first();
    const dateText = effectiveEl.find(".value").text().trim();
    if (dateText) {
      lastUpdated = dateText;
    }
  }

  text = text.replace(/\s+/g, " ").trim();
  return { text, title, lastUpdated };
}

async function upsertSection(record: {
  stateCode: string;
  titleNumber: string;
  titleName: string;
  chapterNum: string;
  chapterName: string;
  sectionNum: string;
  sectionTitle: string;
  sectionText: string;
  lastUpdated: string | null;
}) {
  const { error } = await supabase.from("statutes").upsert(
    {
      state_code: record.stateCode,
      title_number: record.titleNumber,
      title_name: record.titleName,
      chapter_num: record.chapterNum,
      chapter_name: record.chapterName,
      section_num: record.sectionNum,
      section_title: record.sectionTitle,
      section_text: record.sectionText,
      last_updated: record.lastUpdated,
    },
    { onConflict: "state_code,section_num", ignoreDuplicates: false }
  );

  if (error) {
    if (error.code === "42501" || error.message?.includes("permission")) {
      console.error(
        "\n⚠️  RLS BLOCKING INSERTS — Apply this SQL in Supabase SQL Editor:"
      );
      console.error(
        "   https://supabase.com/dashboard/project/nwfafhsbcwwhapbrwjys/sql/new"
      );
      console.error(
        "   Contents: supabase/migrations/002_disable_rls_dev.sql\n"
      );
    }
    throw error;
  }
}

async function main() {
  console.log("=== StatuteIQ ORC Ingestion ===");
  console.log(`Started: ${new Date().toISOString()}\n`);

  let totalSections = 0;
  let totalErrors = 0;

  let titles: TitleInfo[];
  try {
    titles = await getTitles();
  } catch (err) {
    console.error("Failed to fetch title index:", err);
    process.exit(1);
  }

  if (titles.length === 0) {
    console.warn("No titles found. Falling back to known URL patterns...");
    // Ohio ORC has titles 1–58 (odd numbers only up to ~58)
    for (const n of [1,3,5,7,9,11,13,15,17,19,21,23,25,27,29,31,33,35,37,39,41,43,45,47,49,51,53,55,57]) {
      titles.push({
        titleNumber: String(n),
        titleName: `Title ${n}`,
        url: `${BASE_URL}/ohio-revised-code/title-${n}`,
      });
    }
  }

  for (const title of titles) {
    console.log(`\nProcessing Title ${title.titleNumber}: ${title.titleName}`);

    let chapters: ChapterInfo[] = [];
    try {
      chapters = await getChapters(title.url);
    } catch (err) {
      console.error(
        `  Error fetching chapters for Title ${title.titleNumber}:`,
        err
      );
      totalErrors++;
      continue;
    }

    if (chapters.length === 0) {
      console.warn(`  No chapters found for Title ${title.titleNumber}`);
      continue;
    }

    for (const chapter of chapters) {
      let sections: SectionInfo[] = [];
      try {
        sections = await getSections(chapter.url);
      } catch (err) {
        console.error(
          `  Error fetching sections for Chapter ${chapter.chapterNum}:`,
          err
        );
        totalErrors++;
        continue;
      }

      let chapterSections = 0;

      for (const section of sections) {
        let sectionData: { text: string; title: string; lastUpdated: string | null };
        try {
          sectionData = await getSectionText(section.url);
        } catch (err) {
          console.error(
            `    Error fetching section ${section.sectionNum}:`,
            err
          );
          totalErrors++;
          continue;
        }

        if (!sectionData.text || sectionData.text.length < 20) {
          console.warn(
            `    Skipping ${section.sectionNum} — text too short`
          );
          continue;
        }

        const sectionTitle =
          sectionData.title || section.sectionTitle || section.sectionNum;

        try {
          await upsertSection({
            stateCode: "OH",
            titleNumber: title.titleNumber,
            titleName: title.titleName,
            chapterNum: chapter.chapterNum,
            chapterName: chapter.chapterName,
            sectionNum: section.sectionNum,
            sectionTitle,
            sectionText: sectionData.text,
            lastUpdated: sectionData.lastUpdated,
          });
          chapterSections++;
          totalSections++;
        } catch (err) {
          console.error(
            `    Error upserting section ${section.sectionNum}:`,
            err
          );
          totalErrors++;

          // If it's an RLS error, stop trying
          if (
            String(err).includes("permission") ||
            String(err).includes("42501")
          ) {
            console.error(
              "\n⚠️  Stopping due to RLS error. Apply 002_disable_rls_dev.sql and re-run.\n"
            );
            process.exit(1);
          }
        }
      }

      if (chapterSections > 0) {
        console.log(
          `  Title ${title.titleNumber} — Chapter ${chapter.chapterNum}: ${chapterSections} sections ingested`
        );
      }
    }
  }

  console.log(`\n=== Ingestion Complete ===`);
  console.log(`Total sections ingested: ${totalSections}`);
  console.log(`Total errors: ${totalErrors}`);
  console.log(`Finished: ${new Date().toISOString()}`);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
