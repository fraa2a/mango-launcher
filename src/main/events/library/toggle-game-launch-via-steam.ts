import { gamesSublevel, levelKeys } from "@main/level";
import type { GameShop } from "@types";
import { registerEvent } from "../register-event";

const toggleGameLaunchViaSteam = async (
  _event: Electron.IpcMainInvokeEvent,
  shop: GameShop,
  objectId: string,
  launchViaSteam: boolean
) => {
  const gameKey = levelKeys.game(shop, objectId);
  const game = await gamesSublevel.get(gameKey);

  if (!game) return;

  await gamesSublevel.put(gameKey, {
    ...game,
    launchViaSteam,
  });
};

registerEvent("toggleGameLaunchViaSteam", toggleGameLaunchViaSteam);
