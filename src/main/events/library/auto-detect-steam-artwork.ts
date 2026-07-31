import { registerEvent } from "../register-event";
import {
  detectSteamAppIdFromDirectory,
  fetchSteamHeaderImage,
} from "@main/services/steam-artwork";

const autoDetectSteamArtwork = async (
  _event: Electron.IpcMainInvokeEvent,
  executablePath: string,
  gameObjectId: string
) => {
  const appId = await detectSteamAppIdFromDirectory(executablePath);

  if (!appId) {
    return { appId: null, headerPath: null };
  }

  const headerPath = await fetchSteamHeaderImage(appId, gameObjectId);

  return { appId, headerPath };
};

registerEvent("autoDetectSteamArtwork", autoDetectSteamArtwork);
