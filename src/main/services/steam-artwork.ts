import fs from "node:fs";
import path from "node:path";
import axios from "axios";
import { logger } from "./logger";
import { ASSETS_PATH } from "@main/constants";

const STEAM_CDN_BASE = "https://cdn.akamai.steamstatic.com/steam/apps";

/**
 * Scansiona la directory del gioco per trovare un Steam AppID.
 * Cerca nei file di configurazione tipici dei crack/fix Steam.
 */
export const detectSteamAppIdFromDirectory = async (
  executablePath: string
): Promise<string | null> => {
  const gameDir = path.dirname(executablePath);

  try {
    const entries = await fs.promises.readdir(gameDir, {
      withFileTypes: true,
    });

    for (const entry of entries) {
      if (!entry.isFile()) continue;

      const lowerName = entry.name.toLowerCase();

      // steam_appid.txt → prima riga contiene l'AppID
      if (lowerName === "steam_appid.txt") {
        const content = await fs.promises.readFile(
          path.join(gameDir, entry.name),
          "utf-8"
        );
        const match = content.trim().match(/^(\d{1,10})/);
        if (match) {
          logger.info("Detected Steam AppID from steam_appid.txt", {
            appId: match[1],
          });
          return match[1];
        }
      }

      // steamfix.ini / onlinefix.ini → RealAppId
      if (lowerName === "steamfix.ini" || lowerName === "onlinefix.ini") {
        const content = await fs.promises.readFile(
          path.join(gameDir, entry.name),
          "utf-8"
        );

        // Cerca sezione [OnlineFix Linux] o [Main]
        const sectionRegex =
          /\[(?:OnlineFix Linux|Main)\]\s*\n((?:.*\n)*?)(?=\[|\s*$)/gi;
        let sectionMatch;

        while ((sectionMatch = sectionRegex.exec(content)) !== null) {
          const section = sectionMatch[1];
          const appIdMatch = section.match(/RealAppId\s*=\s*(\d{1,10})/i);
          if (appIdMatch) {
            logger.info("Detected Steam AppID from INI file", {
              file: entry.name,
              appId: appIdMatch[1],
            });
            return appIdMatch[1];
          }
        }

        // Fallback: cerca RealAppId ovunque nel file
        const fallbackMatch = content.match(/RealAppId\s*=\s*(\d{1,10})/i);
        if (fallbackMatch) {
          logger.info("Detected Steam AppID from INI file (fallback)", {
            file: entry.name,
            appId: fallbackMatch[1],
          });
          return fallbackMatch[1];
        }
      }
    }

    // Cerca ricorsivamente 1 livello deeper per file di fix
    for (const entry of entries) {
      if (!entry.isDirectory()) continue;

      const subDir = path.join(gameDir, entry.name);
      try {
        const subEntries = await fs.promises.readdir(subDir);
        for (const subEntry of subEntries) {
          const lowerName = subEntry.toLowerCase();
          if (
            lowerName === "steam_appid.txt" ||
            lowerName === "steamfix.ini" ||
            lowerName === "onlinefix.ini"
          ) {
            const filePath = path.join(subDir, subEntry);
            const content = await fs.promises.readFile(filePath, "utf-8");

            if (lowerName === "steam_appid.txt") {
              const match = content.trim().match(/^(\d{1,10})/);
              if (match) return match[1];
            } else {
              const match = content.match(/RealAppId\s*=\s*(\d{1,10})/i);
              if (match) return match[1];
            }
          }
        }
      } catch {
        // ignora errori di lettura
      }
    }
  } catch (error) {
    logger.warn("Failed to scan game directory for Steam AppID", {
      error,
    });
  }

  return null;
};

/**
 * Scarica l'header image (460x215) da Steam CDN.
 */
export const fetchSteamHeaderImage = async (
  appId: string,
  gameObjectId: string
): Promise<string | null> => {
  const destDir = path.join(ASSETS_PATH, `steam-artwork-${gameObjectId}`);
  const destPath = path.join(destDir, `${appId}-header.jpg`);

  try {
    await fs.promises.mkdir(destDir, { recursive: true });

    const url = `${STEAM_CDN_BASE}/${appId}/header.jpg`;
    const response = await axios.get<ArrayBuffer>(url, {
      responseType: "arraybuffer",
      timeout: 15000,
      validateStatus: (status) => status === 200,
    });

    await fs.promises.writeFile(destPath, Buffer.from(response.data));

    logger.info("Downloaded Steam header image", { appId, destPath });
    return destPath;
  } catch (error) {
    logger.warn("Failed to download Steam header image", { appId, error });
    return null;
  }
};

/**
 * Scarica le immagini artwork da Steam CDN per un dato AppID.
 */
export const fetchSteamArtwork = async (
  appId: string,
  gameObjectId: string
): Promise<{
  headerPath: string | null;
  heroPath: string | null;
  logoPath: string | null;
}> => {
  const destDir = path.join(ASSETS_PATH, `steam-artwork-${gameObjectId}`);
  await fs.promises.mkdir(destDir, { recursive: true });

  const download = async (
    fileName: string,
    url: string
  ): Promise<string | null> => {
    const destPath = path.join(destDir, fileName);
    try {
      const response = await axios.get<ArrayBuffer>(url, {
        responseType: "arraybuffer",
        timeout: 15000,
        validateStatus: (status) => status === 200,
      });
      await fs.promises.writeFile(destPath, Buffer.from(response.data));
      return destPath;
    } catch {
      return null;
    }
  };

  const [headerPath, heroPath, logoPath] = await Promise.all([
    download(`${appId}-header.jpg`, `${STEAM_CDN_BASE}/${appId}/header.jpg`),
    download(
      `${appId}-hero.jpg`,
      `${STEAM_CDN_BASE}/${appId}/library_hero.jpg`
    ),
    download(`${appId}-logo.png`, `${STEAM_CDN_BASE}/${appId}/logo.png`),
  ]);

  return { headerPath, heroPath, logoPath };
};
