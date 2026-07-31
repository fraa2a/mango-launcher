import fs from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";
import { SystemPath } from "./system-path";
import { logger } from "./logger";

/**
 * Find the Steam Linux Runtime "run" script by parsing libraryfolders.vdf.
 * Matches the runtime to the Proton version (sniper for 8-10, soldier for <8, SteamLinuxRuntime_4 for >=11).
 */
export const findSteamRuntime = async (
  protonPath: string
): Promise<string | null> => {
  const homePath = SystemPath.getPath("home");
  const steamConfigPath = path.join(
    homePath,
    ".steam",
    "steam",
    "steamapps",
    "libraryfolders.vdf"
  );

  if (!fs.existsSync(steamConfigPath)) return null;

  try {
    const content = fs.readFileSync(steamConfigPath, "utf-8");

    // Parse proton version from its version file
    const versionFile = path.join(protonPath, "version");
    let protonMajorVersion = 11;
    if (fs.existsSync(versionFile)) {
      const versionText = fs.readFileSync(versionFile, "utf-8");
      const versionMatch = versionText.match(/GE-Proton(\d+)-/);
      if (versionMatch) {
        protonMajorVersion = Number(versionMatch[1]);
      }
    }

    let runtimeAppId: number;
    let runtimeDirName: string;

    if (protonMajorVersion >= 11) {
      runtimeAppId = 4183110;
      runtimeDirName = "SteamLinuxRuntime_4";
    } else if (protonMajorVersion >= 8) {
      runtimeAppId = 1628350;
      runtimeDirName = "SteamLinuxRuntime_sniper";
    } else {
      runtimeAppId = 1391110;
      runtimeDirName = "SteamLinuxRuntime_soldier";
    }

    const defaultLibraryPath = path.join(homePath, ".steam", "steam");
    const libraryPaths = [
      defaultLibraryPath,
      ...Array.from(content.matchAll(/"path"\s+"([^"]+)"/g), (match) =>
        match[1].replaceAll("\\\\", "\\")
      ),
    ];

    for (const libraryPath of new Set(libraryPaths)) {
      const runtimePath = path.join(
        libraryPath,
        "steamapps",
        "common",
        runtimeDirName,
        "run"
      );

      if (fs.existsSync(runtimePath)) {
        logger.info("Found Steam Linux Runtime", {
          runtimeAppId,
          runtimePath,
        });
        return runtimePath;
      }
    }
  } catch (error) {
    logger.warn("Failed to find Steam Runtime", { error });
  }

  return null;
};

/**
 * Check if Steam is installed on the system.
 */
export const isSteamInstalled = (): boolean => {
  const homePath = SystemPath.getPath("home");
  const possiblePaths = [
    path.join(homePath, ".steam", "steam", "steam.sh"),
    path.join(homePath, ".local", "share", "Steam", "steam.sh"),
    "/usr/bin/steam",
    "/usr/share/steam/steam.sh",
  ];

  return possiblePaths.some((p) => fs.existsSync(p));
};

/**
 * Check if Steam is currently running.
 */
export const isSteamRunning = (): Promise<boolean> => {
  return new Promise((resolve) => {
    const proc = spawn("pidof", ["steam"], { stdio: "ignore" });
    proc.on("close", (code) => resolve(code === 0));
    proc.on("error", () => resolve(false));
  });
};

/**
 * Try to start Steam silently. Returns true if Steam started successfully.
 * Polls loginusers.vdf mtime change (same as OnlineFix: up to 420 attempts / 7 min).
 */
export const startSteam = async (): Promise<boolean> => {
  const homePath = SystemPath.getPath("home");
  const loginUsersPath = path.join(
    homePath,
    ".steam",
    "steam",
    "config",
    "loginusers.vdf"
  );

  return new Promise((resolve) => {
    const proc = spawn("steam", ["-silent"], {
      stdio: "ignore",
      detached: true,
    });

    proc.once("error", () => resolve(false));
    proc.once("spawn", async () => {
      proc.unref();

      let lastMod = 0;
      try {
        const stat = await fs.promises.stat(loginUsersPath);
        lastMod = stat.mtimeMs;
      } catch {
        // File doesn't exist yet — Steam hasn't created it
      }

      for (let attempt = 0; attempt < 420; attempt += 1) {
        if (proc.exitCode !== null) {
          resolve(false);
          return;
        }

        try {
          const stat = await fs.promises.stat(loginUsersPath);
          if (stat.mtimeMs > lastMod) {
            resolve(true);
            return;
          }
        } catch {
          // File still doesn't exist
        }

        await new Promise((wait) => setTimeout(wait, 1_000));
      }

      resolve(false);
    });
  });
};

/**
 * Build the LD_PRELOAD string for Steam Overlay.
 */
export const getSteamOverlayLdPreload = (): string | null => {
  const homePath = SystemPath.getPath("home");
  const steamDir = path.join(homePath, ".steam", "steam");

  const overlays = [
    path.join(steamDir, "ubuntu12_32", "gameoverlayrenderer.so"),
    path.join(steamDir, "ubuntu12_64", "gameoverlayrenderer.so"),
  ];

  const existingOverlays = overlays.filter((o) => fs.existsSync(o));
  if (existingOverlays.length === 0) return null;

  return `:${existingOverlays.join(":")}`;
};
