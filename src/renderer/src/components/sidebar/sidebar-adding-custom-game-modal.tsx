import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { FileDirectoryIcon } from "@primer/octicons-react";

import { Modal, TextField, Button } from "@renderer/components";
import { useLibrary, useToast } from "@renderer/hooks";
import {
  buildGameDetailsPath,
  generateRandomGradient,
} from "@renderer/helpers";
import { LINUX_GAME_EXECUTABLE_EXTENSIONS } from "@shared";

import "./sidebar-adding-custom-game-modal.scss";

export interface SidebarAddingCustomGameModalProps {
  visible: boolean;
  onClose: () => void;
}

export function SidebarAddingCustomGameModal({
  visible,
  onClose,
}: Readonly<SidebarAddingCustomGameModalProps>) {
  const { t } = useTranslation("sidebar");
  const { updateLibrary } = useLibrary();
  const { showSuccessToast, showErrorToast } = useToast();
  const navigate = useNavigate();

  const [gameName, setGameName] = useState("");
  const [executablePath, setExecutablePath] = useState("");
  const [steamAppId, setSteamAppId] = useState("");
  const [detectedAppId, setDetectedAppId] = useState<string | null>(null);
  const [bannerPreview, setBannerPreview] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [isDetecting, setIsDetecting] = useState(false);

  const handleSelectExecutable = async () => {
    const filters =
      window.electron.platform === "linux"
        ? [
            {
              name: t("custom_game_modal_executable"),
              extensions: LINUX_GAME_EXECUTABLE_EXTENSIONS,
            },
            { name: t("all_files", { ns: "game_details" }), extensions: ["*"] },
          ]
        : [
            {
              name: t("custom_game_modal_executable"),
              extensions: [
                "exe",
                "msi",
                "bat",
                "cmd",
                "app",
                "deb",
                "rpm",
                "dmg",
              ],
            },
          ];

    const { filePaths } = await window.electron.showOpenDialog({
      properties: ["openFile"],
      filters,
    });

    if (filePaths && filePaths.length > 0) {
      const selectedPath = filePaths[0];
      setExecutablePath(selectedPath);

      if (!gameName.trim()) {
        const fileName = selectedPath.split(/[\\/]/).pop() || "";
        const gameNameFromFile = fileName.replace(/\.[^/.]+$/, "");
        setGameName(gameNameFromFile);
      }

      // Auto-detect Steam AppID from game directory
      setIsDetecting(true);
      try {
        const tempId = crypto.randomUUID();
        const result = await window.electron.autoDetectSteamArtwork(
          selectedPath,
          tempId
        );

        if (result.appId) {
          setDetectedAppId(result.appId);
          setSteamAppId(result.appId);
          if (result.headerPath) {
            setBannerPreview(result.headerPath);
          }
        } else {
          setDetectedAppId(null);
          setBannerPreview(null);
        }
      } catch {
        setDetectedAppId(null);
        setBannerPreview(null);
      } finally {
        setIsDetecting(false);
      }
    }
  };

  const handleGameNameChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setGameName(event.target.value);
  };

  const handleSteamAppIdChange = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    setSteamAppId(event.target.value);
    setBannerPreview(null);
    setDetectedAppId(null);
  };

  const handleAddGame = async () => {
    if (!gameName.trim() || !executablePath.trim()) {
      showErrorToast(t("custom_game_modal_fill_required"));
      return;
    }

    setIsAdding(true);

    try {
      const gameNameForSeed = gameName.trim();
      const iconUrl = "";
      const logoImageUrl = "";
      const libraryHeroImageUrl = generateRandomGradient();

      const newGame = await window.electron.addCustomGameToLibrary(
        gameNameForSeed,
        executablePath,
        iconUrl,
        logoImageUrl,
        libraryHeroImageUrl,
        steamAppId.trim() || undefined
      );

      showSuccessToast(t("custom_game_modal_success"));
      updateLibrary();

      const gameDetailsPath = buildGameDetailsPath({
        shop: newGame.shop,
        objectId: newGame.objectId,
        title: newGame.title,
      });

      navigate(gameDetailsPath);

      setGameName("");
      setExecutablePath("");
      setSteamAppId("");
      setDetectedAppId(null);
      setBannerPreview(null);
      onClose();
    } catch (error) {
      console.error("Failed to add custom game:", error);
      showErrorToast(
        error instanceof Error ? error.message : t("custom_game_modal_failed")
      );
    } finally {
      setIsAdding(false);
    }
  };

  const handleClose = () => {
    if (!isAdding) {
      setGameName("");
      setExecutablePath("");
      setSteamAppId("");
      setDetectedAppId(null);
      setBannerPreview(null);
      onClose();
    }
  };

  const isFormValid = gameName.trim() && executablePath.trim();

  return (
    <Modal
      visible={visible}
      title={t("custom_game_modal")}
      description={t("custom_game_modal_description")}
      onClose={handleClose}
    >
      <div className="sidebar-adding-custom-game-modal__container">
        <div className="sidebar-adding-custom-game-modal__form">
          <TextField
            label={t("custom_game_modal_executable_path")}
            placeholder={t("custom_game_modal_select_executable")}
            value={executablePath}
            readOnly
            theme="dark"
            rightContent={
              <Button
                type="button"
                theme="outline"
                onClick={handleSelectExecutable}
                disabled={isAdding}
              >
                <FileDirectoryIcon />
                {t("custom_game_modal_browse")}
              </Button>
            }
          />

          <TextField
            label={t("custom_game_modal_title")}
            placeholder={t("custom_game_modal_enter_title")}
            value={gameName}
            onChange={handleGameNameChange}
            theme="dark"
            disabled={isAdding}
          />

          <TextField
            label={t("custom_game_modal_steam_appid")}
            placeholder={t("custom_game_modal_steam_appid_placeholder")}
            value={steamAppId}
            onChange={handleSteamAppIdChange}
            theme="dark"
            disabled={isAdding || isDetecting}
            hint={
              isDetecting
                ? t("custom_game_modal_detecting")
                : detectedAppId
                  ? t("custom_game_modal_detected", { appId: detectedAppId })
                  : undefined
            }
          />

          {(bannerPreview || isDetecting) && (
            <div className="sidebar-adding-custom-game-modal__banner-preview">
              {isDetecting ? (
                <div className="sidebar-adding-custom-game-modal__banner-loading">
                  {t("custom_game_modal_loading_banner")}
                </div>
              ) : bannerPreview ? (
                <img
                  src={bannerPreview}
                  alt="Steam banner preview"
                  className="sidebar-adding-custom-game-modal__banner-image"
                />
              ) : null}
            </div>
          )}
        </div>

        <div className="sidebar-adding-custom-game-modal__actions">
          <Button
            type="button"
            theme="outline"
            onClick={handleClose}
            disabled={isAdding}
          >
            {t("custom_game_modal_cancel")}
          </Button>
          <Button
            type="button"
            theme="primary"
            onClick={handleAddGame}
            disabled={!isFormValid || isAdding}
          >
            {isAdding
              ? t("custom_game_modal_adding")
              : t("custom_game_modal_add")}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
