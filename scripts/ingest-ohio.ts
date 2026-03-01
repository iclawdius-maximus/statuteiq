/**
 * ORC Scraper — Ohio Revised Code ingestion
 * Usage: npx tsx scripts/ingest-ohio.ts
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
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im53ZmFmaHNiY3d3aGFwYnJ3anlzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIzMzE1NjgsImV4cCI6MjA4NzkwNzU2OH0.J7vBylNTrFb1ycQtXoI8s4sLqtpd3MHbp3XQFlyvDu8"
);

const BASE_URL = "https://codes.ohio.gov";
const DELAY_MS = 150;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchHtml(url: string): Promise<string> {
  const response = await axios.get(url, {
    headers: {
      "User-Agent":
        "StatuteIQ/1.0 (legal research tool; contact iclawdius@heavenscapedevelopment.com)",
    },
    timeout: 15000,
  });
  return response.data as string;
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
  const html = await fetchHtml(`${BASE_URL}/ohio-revised-code`);
  const $ = cheerio.load(html);
  const titles: TitleInfo[] = [];

  // Ohio ORC site: title links in the main content
  $("a").each((_, el) => {
    const href = $(el).attr("href") || "";
    const text = $(el).text().trim();

    // Match patterns like /ohio-revised-code/title/1 or similar
    const titleMatch = href.match(/\/ohio-revised-code\/title\/(\d+)/i);
    if (titleMatch) {
      const titleNumber = titleMatch[1];
      const titleName = text.replace(/^Title\s+\d+\s*/i, "").trim() || text;
      const url = href.startsWith("http") ? href : `${BASE_URL}${href}`;
      if (!titles.find((t) => t.titleNumber === titleNumber)) {
        titles.push({ titleNumber, titleName, url });
      }
    }
  });

  // Fallback: look for numbered list items with title patterns
  if (titles.length === 0) {
    $("li a, td a, .title a").each((_, el) => {
      const href = $(el).attr("href") || "";
      const text = $(el).text().trim();
      const match = text.match(/^Title\s+(\d+)\s*[–\-—]?\s*(.*)/i) ||
                    href.match(/\/(\d+)$/);
      if (match && href.includes("title")) {
        const url = href.startsWith("http") ? href : `${BASE_URL}${href}`;
        titles.push({
          titleNumber: match[1],
          titleName: match[2] || text,
          url,
        });
      }
    });
  }

  console.log(`Found ${titles.length} titles`);
  return titles;
}

async function getChapters(
  titleUrl: string,
  titleNumber: string,
  titleName: string
): Promise<ChapterInfo[]> {
  await sleep(DELAY_MS);
  const html = await fetchHtml(titleUrl);
  const $ = cheerio.load(html);
  const chapters: ChapterInfo[] = [];

  $("a").each((_, el) => {
    const href = $(el).attr("href") || "";
    const text = $(el).text().trim();

    // Match chapter links: /ohio-revised-code/chapter/1 or /1/ patterns
    const chapterMatch =
      href.match(/\/ohio-revised-code\/chapter\/(\d+[\w.-]*)/i) ||
      href.match(/\/chapter\/(\d+[\w.-]*)/i);
    if (chapterMatch) {
      const chapterNum = chapterMatch[1];
      const chapterName =
        text.replace(/^Chapter\s+[\d.]+\s*/i, "").trim() || text;
      const url = href.startsWith("http") ? href : `${BASE_URL}${href}`;
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

    // Match section links: /ohio-revised-code/section/1.01 patterns
    const sectionMatch =
      href.match(/\/ohio-revised-code\/section\/([\d.]+[\w-]*)/i) ||
      href.match(/\/section\/([\d.]+[\w-]*)/i);
    if (sectionMatch) {
      const sectionNum = sectionMatch[1];
      const sectionTitle =
        text.replace(/^[\d.]+\s*/i, "").trim() || text;
      const url = href.startsWith("http") ? href : `${BASE_URL}${href}`;
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

  // Remove nav, header, footer, scripts
  $("nav, header, footer, script, style, .nav, .navigation, .breadcrumb").remove();

  // Try to find the main statute text container
  let text = "";
  let title = "";
  let lastUpdated: string | null = null;

  // Common selectors for ORC pages
  const contentSelectors = [
    ".statute-text",
    ".section-text",
    "#statute-content",
    ".content-body",
    "article",
    ".main-content",
    "#main-content",
    "main",
  ];

  for (const sel of contentSelectors) {
    if ($(sel).length > 0) {
      text = $(sel).text().trim();
      break;
    }
  }

  // Fallback: grab body text
  if (!text) {
    text = $("body").text().trim();
  }

  // Extract last updated date if present
  const dateMatch = text.match(/Effective:\s*([\d/]+)/i) ||
                    text.match(/Last amended:\s*([\w\s,]+\d{4})/i);
  if (dateMatch) {
    lastUpdated = dateMatch[1].trim();
  }

  // Try to get h1/h2 as title
  title = $("h1").first().text().trim() || $("h2").first().text().trim() || "";

  // Clean text: remove excessive whitespace
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
    console.warn("No titles found. The site structure may have changed.");
    console.warn("Attempting direct URL patterns...");

    // Fallback: try known Ohio ORC URL structure
    for (let i = 1; i <= 58; i++) {
      titles.push({
        titleNumber: String(i),
        titleName: `Title ${i}`,
        url: `${BASE_URL}/ohio-revised-code/title/${i}`,
      });
    }
  }

  for (const title of titles) {
    console.log(`\nProcessing Title ${title.titleNumber}: ${title.titleName}`);

    let chapters: ChapterInfo[] = [];
    try {
      chapters = await getChapters(title.url, title.titleNumber, title.titleName);
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
