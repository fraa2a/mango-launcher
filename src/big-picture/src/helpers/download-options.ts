import { parseBytes, TAXPHOBIA_DOWNLOAD_SOURCE_NAME } from "@shared";
import type { GameRepack } from "@types";

export type DownloadOptionsSortBy =
  "newest" | "oldest" | "largest" | "smallest";

function compareNullableNumbers(
  leftValue: number | null,
  rightValue: number | null,
  direction: "asc" | "desc"
) {
  if (leftValue == null && rightValue == null) return 0;
  if (leftValue == null) return 1;
  if (rightValue == null) return -1;

  return direction === "desc" ? rightValue - leftValue : leftValue - rightValue;
}

function getDownloadOptionTimestamp(option: GameRepack) {
  const value = option.uploadDate ?? option.createdAt;

  if (!value) return null;

  const timestamp = new Date(value).getTime();
  return Number.isNaN(timestamp) ? null : timestamp;
}

function getDownloadOptionSize(option: GameRepack) {
  return parseBytes(option.fileSize);
}

export function sortDownloadOptions(
  options: GameRepack[],
  sortBy: DownloadOptionsSortBy
) {
  const compareBySelectedSort = (
    leftOption: GameRepack,
    rightOption: GameRepack
  ) => {
    switch (sortBy) {
      case "newest":
        return compareNullableNumbers(
          getDownloadOptionTimestamp(leftOption),
          getDownloadOptionTimestamp(rightOption),
          "desc"
        );
      case "oldest":
        return compareNullableNumbers(
          getDownloadOptionTimestamp(leftOption),
          getDownloadOptionTimestamp(rightOption),
          "asc"
        );
      case "largest":
        return compareNullableNumbers(
          getDownloadOptionSize(leftOption),
          getDownloadOptionSize(rightOption),
          "desc"
        );
      case "smallest":
        return compareNullableNumbers(
          getDownloadOptionSize(leftOption),
          getDownloadOptionSize(rightOption),
          "asc"
        );
    }
  };

  return [...options].sort((leftOption, rightOption) => {
    const leftPriority =
      leftOption.downloadSourceName === TAXPHOBIA_DOWNLOAD_SOURCE_NAME ? 0 : 1;
    const rightPriority =
      rightOption.downloadSourceName === TAXPHOBIA_DOWNLOAD_SOURCE_NAME ? 0 : 1;

    return (
      leftPriority - rightPriority ||
      compareBySelectedSort(leftOption, rightOption)
    );
  });
}
