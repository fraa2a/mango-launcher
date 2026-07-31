import fs from "node:fs/promises";
import path from "node:path";
import type { DownloadSource } from "@types";
import { downloadSourcesSublevel } from "@main/level";
import { MangoApi } from "./mango-api";

export const MANGO_CUSTOM_DOWNLOAD_SOURCE_EXTENSION = ".mangocds";

export interface MangoCustomDownloadSourceFile {
  format: "mangocds";
  version: 1;
  name?: string;
  url: string;
  description?: string;
  author?: string;
}

const isValidSourceUrl = (value: unknown): value is string => {
  if (typeof value !== "string" || !value.trim()) return false;

  try {
    const parsed = new URL(value);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
};

export const addDownloadSourceFromUrl = async (
  sourceUrl: string
): Promise<DownloadSource> => {
  const url = sourceUrl.trim();
  if (!isValidSourceUrl(url)) throw new Error("Invalid download source URL");

  const existingSources = await downloadSourcesSublevel.values().all();
  const existingSource = existingSources.find((source) => source.url === url);
  if (existingSource) return existingSource;

  const downloadSource = await MangoApi.post<DownloadSource>(
    "/download-sources",
    { url },
    { needsAuth: false }
  );

  await downloadSourcesSublevel.put(downloadSource.id, {
    ...downloadSource,
    isRemote: true,
    createdAt: new Date().toISOString(),
  });

  return downloadSource;
};

export const readMangoCustomDownloadSource = async (
  filePath: string
): Promise<MangoCustomDownloadSourceFile> => {
  if (
    path.extname(filePath).toLowerCase() !==
    MANGO_CUSTOM_DOWNLOAD_SOURCE_EXTENSION
  ) {
    throw new Error("Unsupported Mango custom download source file");
  }

  const contents = await fs.readFile(filePath, "utf8");
  const parsed: unknown = JSON.parse(contents);

  if (
    typeof parsed !== "object" ||
    parsed === null ||
    (parsed as Partial<MangoCustomDownloadSourceFile>).format !== "mangocds" ||
    (parsed as Partial<MangoCustomDownloadSourceFile>).version !== 1 ||
    !isValidSourceUrl((parsed as Partial<MangoCustomDownloadSourceFile>).url)
  ) {
    throw new Error("Invalid Mango custom download source file");
  }

  return parsed as MangoCustomDownloadSourceFile;
};

export const importMangoCustomDownloadSource = async (filePath: string) => {
  const sourceFile = await readMangoCustomDownloadSource(filePath);
  return addDownloadSourceFromUrl(sourceFile.url);
};
