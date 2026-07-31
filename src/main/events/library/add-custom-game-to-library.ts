import { registerEvent } from "../register-event";
import {
  gamesSublevel,
  gamesShopAssetsSublevel,
  gamesShopCacheSublevel,
  levelKeys,
} from "@main/level";
import { randomUUID } from "node:crypto";
import type { GameShop, ShopAssets } from "@types";
import { detectSteamAppIdFromDirectory } from "@main/services/steam-artwork";
import { getSteamAppDetails, getSteamLanguage, logger } from "@main/services";
import { getGameAssets } from "../catalogue/get-game-assets";

const addCustomGameToLibrary = async (
  _event: Electron.IpcMainInvokeEvent,
  title: string,
  executablePath: string,
  iconUrl?: string,
  logoImageUrl?: string,
  libraryHeroImageUrl?: string,
  steamAppId?: string
) => {
  const existingGames = await gamesSublevel.iterator().all();
  const existingGame = existingGames.find(
    ([_key, game]) => game.executablePath === executablePath && !game.isDeleted
  );

  if (existingGame) {
    throw new Error(
      "A game with this executable path already exists in your library"
    );
  }

  // Auto-detect Steam AppID if not provided
  let resolvedAppId = steamAppId?.trim() || null;
  if (!resolvedAppId) {
    try {
      resolvedAppId = await detectSteamAppIdFromDirectory(executablePath);
    } catch (error) {
      logger.warn("Failed to auto-detect Steam AppID", { error });
    }
  }

  if (resolvedAppId) {
    // --- Create as Steam game linked to AppID ---
    const steamKey = levelKeys.game("steam", resolvedAppId);

    // Cache Steam app details for getGameShopDetails (description, screenshots, etc.)
    const cacheKey = levelKeys.gameShopCacheItem(
      "steam",
      resolvedAppId,
      getSteamLanguage("en")
    );
    let steamDetails = await gamesShopCacheSublevel
      .get(cacheKey)
      .catch(() => null);
    if (!steamDetails) {
      try {
        steamDetails = await getSteamAppDetails(resolvedAppId, "en");
        if (steamDetails) {
          await gamesShopCacheSublevel
            .put(cacheKey, steamDetails)
            .catch(() => {});
        }
      } catch {
        // Steam API unavailable
      }
    }

    // Cache game assets in gamesShopAssetsSublevel for shopDetails.assets (artwork URLs)
    let shopAssets = await gamesShopAssetsSublevel.get(steamKey);
    if (!shopAssets) {
      let freshAssets: ShopAssets | null = null;
      try {
        freshAssets = await getGameAssets(resolvedAppId, "steam", {
          forceFresh: true,
        });
      } catch {
        // MangoApi unavailable
      }
      if (freshAssets) {
        shopAssets = { ...freshAssets, updatedAt: Date.now() };
      } else {
        const cdnBase =
          "https://shared.akamai.steamstatic.com/store_item_assets/steam/apps";
        shopAssets = {
          updatedAt: Date.now(),
          objectId: resolvedAppId,
          shop: "steam" as GameShop,
          title: steamDetails?.name ?? title,
          iconUrl: null,
          libraryHeroImageUrl: `${cdnBase}/${resolvedAppId}/library_hero.jpg`,
          libraryImageUrl: `${cdnBase}/${resolvedAppId}/header.jpg`,
          logoImageUrl: `${cdnBase}/${resolvedAppId}/logo.png`,
          logoPosition: null,
          coverImageUrl: `${cdnBase}/${resolvedAppId}/library_600x900.jpg`,
          downloadSources: [],
        };
      }
      await gamesShopAssetsSublevel.put(steamKey, shopAssets).catch(() => {});
    }

    const game = {
      title: steamDetails?.name ?? title,
      iconUrl: shopAssets?.iconUrl ?? null,
      libraryHeroImageUrl: shopAssets?.libraryHeroImageUrl ?? null,
      logoImageUrl: shopAssets?.logoImageUrl ?? null,
      objectId: resolvedAppId,
      shop: "steam" as GameShop,
      remoteId: null,
      isDeleted: false,
      playTimeInMilliseconds: 0,
      lastTimePlayed: null,
      addedToLibraryAt: new Date(),
      executablePath,
      executablePathUpdatedAt: new Date(),
      launchOptions: null,
      favorite: false,
      automaticCloudSync: false,
      hasManuallyUpdatedPlaytime: false,
      launchViaSteam: true,
    };

    await gamesSublevel.put(steamKey, game);

    return game;
  }

  // --- Create as custom game (no AppID) ---
  const objectId = randomUUID();
  const customGameKey = levelKeys.game("custom", objectId);

  const assets = {
    updatedAt: Date.now(),
    objectId,
    shop: "custom" as GameShop,
    title,
    iconUrl: iconUrl || null,
    libraryHeroImageUrl: libraryHeroImageUrl || "",
    libraryImageUrl: iconUrl || "",
    logoImageUrl: logoImageUrl || "",
    logoPosition: null,
    coverImageUrl: iconUrl || "",
    downloadSources: [],
  };
  await gamesShopAssetsSublevel.put(customGameKey, assets);

  const game = {
    title,
    iconUrl: iconUrl || null,
    logoImageUrl: logoImageUrl || null,
    libraryHeroImageUrl: libraryHeroImageUrl || null,
    objectId,
    shop: "custom" as GameShop,
    remoteId: null,
    isDeleted: false,
    playTimeInMilliseconds: 0,
    lastTimePlayed: null,
    addedToLibraryAt: new Date(),
    executablePath,
    executablePathUpdatedAt: new Date(),
    launchOptions: null,
    favorite: false,
    automaticCloudSync: false,
    hasManuallyUpdatedPlaytime: false,
  };

  await gamesSublevel.put(customGameKey, game);

  return game;
};

registerEvent("addCustomGameToLibrary", addCustomGameToLibrary);
