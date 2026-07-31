import updater, { UpdateInfo } from "electron-updater";
import { logger, WindowManager } from "@main/services";
import { AppUpdaterEvent } from "@types";
import { app } from "electron";
import { publishNotificationUpdateReadyToInstall } from "@main/services/notifications";

const { autoUpdater } = updater;
const sendEventsForDebug = false;
const GITHUB_REPO = "fraa2a/mango-launcher";

export class UpdateManager {
  private static hasNotified = false;
  private static newVersion = "";

  private static mockValuesForDebug() {
    if (process.platform === "linux") {
      this.sendEvent({ type: "update-available", info: { version: "3.3.1" }, aur: true });
    } else {
      this.sendEvent({ type: "update-available", info: { version: "3.3.1" } });
      this.sendEvent({ type: "update-downloaded" });
    }
  }

  private static sendEvent(event: AppUpdaterEvent) {
    WindowManager.mainWindow?.webContents.send("autoUpdaterEvent", event);
  }

  public static async checkForUpdates() {
    if (process.platform === "linux") {
      return this.checkForUpdatesAur();
    }

    autoUpdater
      .removeAllListeners()
      .on("update-available", (info: UpdateInfo) => {
        this.sendEvent({ type: "update-available", info });
        this.newVersion = info.version;
      })
      .on("update-downloaded", () => {
        this.sendEvent({ type: "update-downloaded" });

        if (!this.hasNotified) {
          this.hasNotified = true;
          publishNotificationUpdateReadyToInstall(this.newVersion);
        }
      });

    const isAutoInstallAvailable =
      process.platform !== "darwin" &&
      (process.platform !== "win32" || process.env.PORTABLE_EXECUTABLE_FILE == null);

    if (app.isPackaged) {
      autoUpdater.autoDownload = isAutoInstallAvailable;
      autoUpdater.checkForUpdates().then((result) => {
        logger.log(`Check for updates result: ${result}`);
      });
    } else if (sendEventsForDebug) {
      this.mockValuesForDebug();
    }

    return isAutoInstallAvailable;
  }

  private static async checkForUpdatesAur() {
    try {
      const response = await fetch(
        `https://api.github.com/repos/${GITHUB_REPO}/releases/latest`
      );
      if (!response.ok) return false;

      const data = await response.json();
      const latestTag: string = data.tag_name || "";
      const latestVersion = latestTag.replace(/^v/, "");

      if (latestVersion && latestVersion !== app.getVersion()) {
        this.sendEvent({
          type: "update-available",
          info: { version: latestVersion },
          aur: true,
        });
      }
    } catch (error) {
      logger.error("Failed to check for AUR updates", error);
    }
    return false;
  }
}
