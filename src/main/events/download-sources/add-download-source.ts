import { registerEvent } from "../register-event";
import { addDownloadSourceFromUrl } from "@main/services";
import { logger } from "@main/services";

const addDownloadSource = async (
  _event: Electron.IpcMainInvokeEvent,
  url: string
) => {
  try {
    return await addDownloadSourceFromUrl(url);
  } catch (error) {
    logger.error("Failed to add download source:", error);
    throw error;
  }
};

registerEvent("addDownloadSource", addDownloadSource);
