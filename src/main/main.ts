import { downloadsSublevel } from "./level/sublevels/downloads";
import { orderBy } from "lodash-es";
import { Downloader } from "@shared";
import { levelKeys, db } from "./level";
import { type Download, type UserPreferences } from "../types";
import path from "node:path";
import fs from "node:fs";
import {
  SystemPath,
  CommonRedistManager,
  TorBoxClient,
  RealDebridClient,
  PremiumizeClient,
  AllDebridClient,
  DownloadManager,
  MangoApi,
  startMainLoop,
  Ludusavi,
  Lock,
  DeckyPlugin,
  DownloadSourcesChecker,
  DownloadOrchestrator,
  Wine,
  WindowManager,
  logger,
} from "@main/services";
import { migrateDownloadSources } from "./helpers/migrate-download-sources";
import { getDirSize } from "./services/download/helpers";
import { GofileApi } from "./services/hosters";

const hasMissingSeedFiles = async (download: Download): Promise<boolean> => {
  if (!download.folderName) return false;

  const downloadTargetPath = path.join(
    download.downloadPath,
    download.folderName
  );

  if (!fs.existsSync(downloadTargetPath)) {
    return true;
  }

  const expectedSize = download.selectedFilesSize ?? download.fileSize ?? 0;

  if (expectedSize <= 0) {
    return false;
  }

  const currentSize = await getDirSize(downloadTargetPath);
  return currentSize < expectedSize;
};

export const loadCriticalState = async () => {
  await Lock.acquireLock();

  const userPreferences = await db.get<string, UserPreferences | null>(
    levelKeys.userPreferences,
    {
      valueEncoding: "json",
    }
  );

  Wine.syncUserPreferences(userPreferences);

  await import("./events");

  if (userPreferences?.realDebridApiToken) {
    RealDebridClient.authorize(userPreferences.realDebridApiToken);
  }

  if (userPreferences?.premiumizeApiToken) {
    PremiumizeClient.authorize(userPreferences.premiumizeApiToken);
  }

  if (userPreferences?.allDebridApiToken) {
    AllDebridClient.authorize(userPreferences.allDebridApiToken);
  }

  if (userPreferences?.torBoxApiToken) {
    TorBoxClient.authorize(userPreferences.torBoxApiToken);
  }

  // API must be ready before the window opens so renderer API calls succeed.
  await MangoApi.setupApi();
};

// Deferred startup: non-essential work that runs after the window is up.
// Nothing here should block the window from appearing.
export const runDeferredStartup = async () => {
  GofileApi.initialize();

  Ludusavi.copyConfigFileToUserData();
  Ludusavi.copyBinaryToUserData();

  if (process.platform === "linux") {
    DeckyPlugin.checkAndUpdateIfOutdated();
  }

  void migrateDownloadSources();

  const { syncDownloadSourcesFromApi } = await import("./services/user");
  void syncDownloadSourcesFromApi();

  // Check for new download options on startup (if enabled)
  void DownloadSourcesChecker.checkForChanges();

  const downloadToResume =
    await DownloadOrchestrator.bootstrapDownloadsOnStartup();
  const normalizedDownloads = await downloadsSublevel
    .values()
    .all()
    .then((games) => orderBy(games, "timestamp", "desc"));

  const downloadsToSeed: Download[] = [];

  // Parallelize the seed-file check: each game does independent I/O
  // (getDirSize walks the folder), so running them concurrently is safe
  // and much faster than the original serial loop.
  const seedChecks = await Promise.all(
    normalizedDownloads.map(async (game) => {
      if (
        !game.shouldSeed ||
        game.downloader !== Downloader.Torrent ||
        game.progress !== 1 ||
        game.status !== "seeding" ||
        game.uri === null
      ) {
        return null;
      }

      if (!(await hasMissingSeedFiles(game))) {
        return game;
      }

      return "missing" as const;
    })
  );

  await Promise.all(
    seedChecks.map(async (result, index) => {
      if (result === null || result === undefined) return;

      const game = normalizedDownloads[index];

      if (result === "missing") {
        const gameKey = levelKeys.game(game.shop, game.objectId);
        const expectedSize = game.selectedFilesSize ?? game.fileSize ?? 0;
        let progress = game.progress;

        if (game.folderName) {
          const downloadTargetPath = path.join(
            game.downloadPath,
            game.folderName
          );
          const currentSize = fs.existsSync(downloadTargetPath)
            ? await getDirSize(downloadTargetPath)
            : 0;
          progress =
            expectedSize > 0
              ? Math.min(currentSize / expectedSize, 1)
              : game.progress;
        }

        await downloadsSublevel.put(gameKey, {
          ...game,
          status: "paused",
          shouldSeed: false,
          queued: false,
          pinnedToHero: false,
          progress,
        });

        logger.warn(
          `[Startup] Seed files missing for ${levelKeys.game(
            game.shop,
            game.objectId
          )}; seeding was disabled`
        );
        return;
      }

      downloadsToSeed.push(game);
    })
  );

  // For torrents use Python RPC; HTTP downloads use JS downloader.
  // startRPC spawns the Python process and waits for its "ready" event -
  // do not block the rest of startup on it. Fire it off and let the
  // download resume once the RPC is up.
  const isTorrent = downloadToResume?.downloader === Downloader.Torrent;
  if (downloadToResume && !isTorrent) {
    // Start Python RPC for seeding only, then resume HTTP download with JS
    void DownloadManager.startRPC(undefined, downloadsToSeed);
    await DownloadManager.startDownload(downloadToResume).catch((err) => {
      // If resume fails, just log it - user can manually retry
      logger.error("Failed to auto-resume download:", err);
    });
  } else {
    // Use Python RPC for everything (torrent or fallback)
    void DownloadManager.startRPC(
      downloadToResume ?? undefined,
      downloadsToSeed
    );
  }

  WindowManager.sendDownloadsUpdated();

  startMainLoop();

  CommonRedistManager.downloadCommonRedist();

  SystemPath.checkIfPathsAreAvailable();
};
