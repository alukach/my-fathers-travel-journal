import fs from "fs";
import path from "path";
import matter from "gray-matter";
import { JournalMetadata } from "./types";

const entriesDirectory = path.join(process.cwd(), "entries");

export function getAllEntryDates(): string[] {
  if (!fs.existsSync(entriesDirectory)) {
    return [];
  }

  const fileNames = fs.readdirSync(entriesDirectory);
  const dates = fileNames
    .filter((fileName) => fileName.endsWith(".mdx"))
    .map((fileName) => fileName.replace(/\.mdx$/, ""))
    .sort(); // Chronological order (YYYY-MM-DD sorts correctly)

  return dates;
}

export function getEntryData(date: string): {
  date: string;
  metadata: JournalMetadata;
  content: string;
} | null {
  try {
    const fullPath = path.join(entriesDirectory, `${date}.mdx`);
    const fileContents = fs.readFileSync(fullPath, "utf8");
    const { data, content } = matter(fileContents);

    return {
      date,
      metadata: data as JournalMetadata,
      content,
    };
  } catch {
    return null;
  }
}

