import { registerEvent } from "../register-event";
import { gamesSublevel, levelKeys } from "@main/level";
import { MangoApi } from "@main/services";
import type { GameShop } from "@types";

const addGameToFavorites = async (
  _event: Electron.IpcMainInvokeEvent,
  shop: GameShop,
  objectId: string
) => {
  const gameKey = levelKeys.game(shop, objectId);

  const game = await gamesSublevel.get(gameKey);
  if (!game) return;

  if (shop !== "custom") {
    MangoApi.put(`/profile/games/${shop}/${objectId}/favorite`).catch(() => {});
  }

  try {
    await gamesSublevel.put(gameKey, {
      ...game,
      favorite: true,
    });
  } catch (error) {
    throw new Error(`Failed to update game favorite status: ${error}`);
  }
};

registerEvent("addGameToFavorites", addGameToFavorites);
