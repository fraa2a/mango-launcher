import { gamesSublevel, levelKeys } from "@main/level";
import type { GameShop } from "@types";
import { registerEvent } from "../register-event";

const toggleGameNativeWayland = async (
  _event: Electron.IpcMainInvokeEvent,
  shop: GameShop,
  objectId: string,
  useNativeWayland: boolean
) => {
  const gameKey = levelKeys.game(shop, objectId);
  const game = await gamesSublevel.get(gameKey);

  if (!game) return;

  await gamesSublevel.put(gameKey, {
    ...game,
    useNativeWayland,
  });
};

registerEvent("toggleGameNativeWayland", toggleGameNativeWayland);
