import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { app } from "electron";
import type { Game } from "@types";
import { logger } from "@main/services/logger";
import { resolveLaunchCommand } from "./resolve-launch-command";
import {
  findSteamRuntime,
  isSteamInstalled,
  isSteamRunning,
  startSteam,
  getSteamOverlayLdPreload,
} from "@main/services/steam-runtime";

const resolveProtonExecutable = (protonPath: string): string | null => {
  const protonBinary = path.join(protonPath, "proton");
  return fs.existsSync(protonBinary) ? protonBinary : null;
};

const findGameRoot = (executablePath: string): string => {
  let dir = path.dirname(executablePath);
  const markers = [
    "onlinefix.json",
    "OnlineFix.ini",
    "SteamFix.ini",
    "OnlineFix64.dll",
    "SteamFix64.dll",
  ];

  for (let level = 0; level < 10; level++) {
    for (const marker of markers) {
      if (fs.existsSync(path.join(dir, marker))) return dir;
    }
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }

  return path.dirname(executablePath);
};

const findFileRecursive = (
  root: string,
  pattern: RegExp,
  maxDepth = 5
): string | null => {
  const queue: { dir: string; depth: number }[] = [{ dir: root, depth: 0 }];
  while (queue.length > 0) {
    const { dir, depth } = queue.shift()!;
    if (depth > maxDepth) continue;
    try {
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isFile() && pattern.test(entry.name)) return fullPath;
        if (entry.isDirectory() && depth < maxDepth)
          queue.push({ dir: fullPath, depth: depth + 1 });
      }
    } catch {}
  }
  return null;
};

const detectOnlineFixSettings = async (gameDirectory: string) => {
  const dllOverrides = new Map<string, string>();
  let fakeAppId: string | null = null;
  let realAppId: string | null = null;

  const visit = async (dirPath: string): Promise<void> => {
    let entries: fs.Dirent[];
    try {
      entries = await fs.promises.readdir(dirPath, { withFileTypes: true });
    } catch {
      return;
    }

    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry.name);
      if (entry.isDirectory()) {
        await visit(fullPath);
        continue;
      }
      if (!entry.isFile()) continue;

      const lower = entry.name.toLowerCase();

      if (lower === "winmm.txt" || lower === "dlllist.txt") {
        const content = await fs.promises.readFile(fullPath, "utf8");
        for (const line of content.split(/\r?\n/)) {
          const dll = path.win32.basename(line.trim()).toLowerCase();
          if (dll.endsWith(".dll")) {
            dllOverrides.set(path.parse(dll).name, "n");
          }
        }
        continue;
      }

      if (lower === "steamfix.ini" || lower === "onlinefix.ini") {
        const content = await fs.promises.readFile(fullPath, "utf8");
        const mainMatch = content.match(/\[Main\]\s*([^[]*)/i);
        if (mainMatch) {
          fakeAppId ??=
            mainMatch[1].match(/FakeAppId\s*=\s*(\d{1,10})/i)?.[1] ?? null;
          realAppId ??=
            mainMatch[1].match(/RealAppId\s*=\s*(\d{1,10})/i)?.[1] ?? null;
        }
        const oflMatch = content.match(/\[OnlineFix Linux\]\s*([^[]*)/i);
        if (oflMatch) {
          realAppId ??=
            oflMatch[1].match(/RealAppId\s*=\s*(\d{1,10})/i)?.[1] ?? null;
        }
        continue;
      }

      if (!lower.endsWith(".dll")) continue;
      if (
        !/^(?:emp|custom)\.dll$|^win.*\.dll$|^(?:online|steam).*\.dll$|^eos.*\.dll$|^epicfix.*\.dll$/.test(
          lower
        )
      )
        continue;

      dllOverrides.set(
        path.parse(lower).name,
        lower.startsWith("win") ? "n,b" : "n"
      );
    }
  };

  await visit(gameDirectory);

  return {
    dllOverrides: Array.from(dllOverrides, ([k, v]) => `${k}=${v}`).join(";"),
    fakeAppId,
    realAppId,
  };
};

const patchSteamFixIni = async (
  gameDirectory: string,
  realAppId: string | null,
  fakeAppId: string | null
): Promise<void> => {
  const iniPath = findFileRecursive(gameDirectory, /^steamfix\.ini$/i);
  if (!iniPath) return;

  try {
    let content = await fs.promises.readFile(iniPath, "utf8");

    if (realAppId && fakeAppId && !/\[OnlineFix Linux\]/i.test(content)) {
      content = content.replace(
        /RealAppId\s*=\s*\d+/i,
        `RealAppId=${fakeAppId}`
      );
      content += `\n[OnlineFix Linux]\nRealAppId=${realAppId}\n`;
      await fs.promises.writeFile(iniPath, content, "utf8");
      logger.info("SteamFix.ini FreeTP patch applied", { iniPath });
    }

    if (/ExtraProtection\s*=\s*true/i.test(content)) {
      content = await fs.promises.readFile(iniPath, "utf8");
      content = content.replace(
        /ExtraProtection\s*=\s*true/i,
        "ExtraProtection=false"
      );
      await fs.promises.writeFile(iniPath, content, "utf8");
      logger.info("SteamFix.ini ExtraProtection disabled", { iniPath });
    }
  } catch (error) {
    logger.warn("Failed to patch SteamFix.ini", { error });
  }
};

export const launchViaSteam = async (
  game: Game,
  executablePath: string,
  protonPath: string,
  options?: {
    useMangohud?: boolean;
    useGamemode?: boolean;
    launchOptions?: string | null;
  }
): Promise<boolean> => {
  if (process.platform !== "linux") {
    logger.warn("launchViaSteam skipped: not Linux");
    return false;
  }

  if (!isSteamInstalled()) {
    logger.error("Steam not installed");
    return false;
  }

  if (!(await isSteamRunning())) {
    logger.info("Steam not running, attempting to start...");
    if (!(await startSteam())) {
      logger.error("Failed to start Steam");
      return false;
    }
  }

  if (!fs.existsSync(protonPath)) {
    logger.error("Invalid Proton path", { protonPath });
    return false;
  }

  const protonExecutable = resolveProtonExecutable(protonPath);
  if (!protonExecutable) {
    logger.error("Proton executable not found at", {
      protonPath,
      expected: path.join(protonPath, "proton"),
    });
    return false;
  }

  const gameRoot = findGameRoot(executablePath);
  logger.info("Game root for fix scanning", { gameRoot });

  let fixSettings: {
    dllOverrides: string;
    fakeAppId: string | null;
    realAppId: string | null;
  };
  try {
    fixSettings = await detectOnlineFixSettings(gameRoot);
    await patchSteamFixIni(
      gameRoot,
      fixSettings.realAppId,
      fixSettings.fakeAppId
    );
  } catch (error) {
    logger.warn("OnlineFix scanning failed, continuing with empty overrides", {
      error,
    });
    fixSettings = { dllOverrides: "", fakeAppId: null, realAppId: null };
  }

  let baseCommand = protonExecutable;
  let baseArgs = ["run", executablePath];
  const steamRuntimePath = await findSteamRuntime(protonPath);
  if (steamRuntimePath) {
    logger.info("Using Steam Linux Runtime", { steamRuntimePath });
    baseCommand = steamRuntimePath;
    baseArgs = ["--", protonExecutable, "run", executablePath];
  }

  const resolvedLaunchCommand = resolveLaunchCommand({
    baseCommand,
    baseArgs,
    launchOptions: options?.launchOptions,
    wrapperCommands: options?.useGamemode ? ["gamemoderun"] : [],
  });

  const steamCompatDataPath = path.join(
    app.getPath("userData"),
    "steam-compat",
    game.objectId
  );
  await fs.promises.mkdir(steamCompatDataPath, { recursive: true });
  logger.info("Steam compat data path created", { steamCompatDataPath });

  const dxOverrides =
    "d3d11=n;d3d10=n;d3d10core=n;dxgi=n;openvr_api_dxvk=n;d3d12=n;d3d12core=n;d3d9=n;d3d8=n;";
  const useWined3d = game.useWined3d === true;

  const winedlloverrides = useWined3d
    ? fixSettings.dllOverrides
    : `${dxOverrides}${fixSettings.dllOverrides}`.replace(/;$/, "");

  const homeDir = process.env.HOME || "";

  const launchEnv: Record<string, string> = {
    WINEDLLOVERRIDES: winedlloverrides,
    WINEDEBUG: "-all",
    STEAM_COMPAT_DATA_PATH: steamCompatDataPath,
    STEAM_COMPAT_CLIENT_INSTALL_PATH: path.join(homeDir, ".steam", "steam"),
    PROTON_USE_WINED3D: useWined3d ? "1" : "0",
    PROTON_ENABLE_WAYLAND: game.useNativeWayland === true ? "1" : "0",
    ...resolvedLaunchCommand.env,
  };

  const overlayPreload = getSteamOverlayLdPreload();
  if (overlayPreload) {
    launchEnv.LD_PRELOAD = overlayPreload;
    launchEnv.ENABLE_VK_LAYER_VALVE_steam_overlay_1 = "1";
    launchEnv.SteamOverlayGameId = String(fixSettings.fakeAppId ?? 480);
  }

  if (options?.useMangohud) {
    launchEnv.MANGOHUD = "1";
  }

  const workingDirectory = path.dirname(executablePath);

  logger.info("Launching via Steam Proton", {
    command: [
      resolvedLaunchCommand.command,
      ...resolvedLaunchCommand.args,
    ].join(" "),
    cwd: workingDirectory,
    env: launchEnv,
  });

  return new Promise<boolean>((resolve) => {
    let settled = false;

    const child = spawn(
      resolvedLaunchCommand.command,
      resolvedLaunchCommand.args,
      {
        detached: true,
        stdio: "ignore",
        cwd: workingDirectory,
        env: { ...process.env, ...launchEnv },
      }
    );

    const finalize = (success: boolean) => {
      if (settled) return;
      settled = true;
      clearTimeout(earlyExitTimer);
      if (success) {
        child.unref();
        resolve(true);
      } else {
        child.kill();
        resolve(false);
      }
    };

    const earlyExitTimer = setTimeout(() => {
      finalize(true);
    }, 3000);

    child.once("exit", (code, signal) => {
      if (settled) return;
      logger.warn("Proton exited during launch window", {
        exitCode: code,
        signal,
      });
      finalize(false);
    });

    child.once("error", (error) => {
      logger.error("Failed to spawn Proton process", { error });
      finalize(false);
    });
  });
};
