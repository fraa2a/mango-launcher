import { useTranslation } from "react-i18next";

import {
  Button,
  CheckboxField,
  Link,
  ProtonPathPicker,
  TextField,
} from "@renderer/components";
import type { LibraryGame, ProtonVersion } from "@types";
import { FileDirectoryIcon, LinkExternalIcon } from "@primer/octicons-react";
import { Tooltip } from "react-tooltip";

interface CompatibilitySettingsSectionProps {
  game: LibraryGame;
  displayedWinePrefixPath: string | null;
  protonVersions: ProtonVersion[];
  selectedProtonPath: string;
  autoRunGamemode: boolean;
  autoRunMangohud: boolean;
  launchViaSteam: boolean;
  useWined3d: boolean;
  useNativeWayland: boolean;
  globalAutoRunGamemode: boolean;
  globalAutoRunMangohud: boolean;
  gamemodeAvailable: boolean;
  mangohudAvailable: boolean;
  winetricksAvailable: boolean;
  mangohudSiteUrl: string;
  gamemodeSiteUrl: string;
  onChangeWinePrefixPath: () => Promise<void>;
  onClearWinePrefixPath: () => Promise<void>;
  onOpenWinetricks: () => Promise<void>;
  onChangeGamemodeState: (value: boolean) => Promise<void>;
  onChangeMangohudState: (value: boolean) => Promise<void>;
  onChangeLaunchViaSteam: (value: boolean) => Promise<void>;
  onChangeWined3dState: (value: boolean) => Promise<void>;
  onChangeNativeWaylandState: (value: boolean) => Promise<void>;
  onChangeProtonVersion: (value: string) => void;
}

export function CompatibilitySettingsSection({
  game,
  displayedWinePrefixPath,
  protonVersions,
  selectedProtonPath,
  autoRunGamemode,
  autoRunMangohud,
  launchViaSteam,
  useWined3d,
  useNativeWayland,
  globalAutoRunGamemode,
  globalAutoRunMangohud,
  gamemodeAvailable,
  mangohudAvailable,
  winetricksAvailable,
  mangohudSiteUrl,
  gamemodeSiteUrl,
  onChangeWinePrefixPath,
  onClearWinePrefixPath,
  onOpenWinetricks,
  onChangeGamemodeState,
  onChangeMangohudState,
  onChangeLaunchViaSteam,
  onChangeWined3dState,
  onChangeNativeWaylandState,
  onChangeProtonVersion,
}: Readonly<CompatibilitySettingsSectionProps>) {
  const { t } = useTranslation("game_details");

  const showWinetricksUnavailableTooltip = !winetricksAvailable;
  const gamemodeToggleDisabled = !gamemodeAvailable || globalAutoRunGamemode;
  const mangohudToggleDisabled = !mangohudAvailable || globalAutoRunMangohud;

  const gamemodeTooltipId = !gamemodeAvailable
    ? "gamemode-unavailable-tooltip"
    : globalAutoRunGamemode
      ? "gamemode-global-enabled-tooltip"
      : undefined;

  const mangohudTooltipId = !mangohudAvailable
    ? "mangohud-unavailable-tooltip"
    : globalAutoRunMangohud
      ? "mangohud-global-enabled-tooltip"
      : undefined;

  const protonVersionAutoLabel = t("proton_version_auto", {
    ns: ["game_details", "settings"],
    defaultValue: "Auto (global default or umu default)",
  });

  const protonSourceUmuDefault = t("proton_source_umu_default", {
    ns: ["game_details", "settings"],
    defaultValue: "umu default selection",
  });

  const protonSourceSteam = t("proton_source_steam", {
    ns: ["game_details", "settings"],
    defaultValue: "Installed by Steam",
  });

  const protonSourceCompatibilityTools = t(
    "proton_source_compatibility_tools",
    {
      ns: ["game_details", "settings"],
      defaultValue: "Installed in Steam compatibilitytools.d",
    }
  );

  return (
    <>
      <div className="game-options-modal__wine-prefix">
        <div className="game-options-modal__header">
          <h2>{t("wine_prefix")}</h2>
          <h4 className="game-options-modal__header-description">
            {launchViaSteam
              ? t("wine_prefix_steam_proton_description", {
                  defaultValue:
                    "Steam Proton manages its own prefix inside the steam-compat folder. The wine prefix picker below is ignored when Launch via Steam is on.",
                })
              : t("wine_prefix_description")}
          </h4>
        </div>

        {launchViaSteam ? (
          <TextField
            value={`Steam Proton → ~/.config/mango-launcher/steam-compat/${game.objectId}/`}
            readOnly
            theme="dark"
            disabled
          />
        ) : (
          <TextField
            value={displayedWinePrefixPath || ""}
            readOnly
            theme="dark"
            disabled
            placeholder={t("no_directory_selected")}
            rightContent={
              <>
                <Button
                  type="button"
                  theme="outline"
                  onClick={onChangeWinePrefixPath}
                >
                  <FileDirectoryIcon />
                  {t("select_executable")}
                </Button>
                {game.winePrefixPath && (
                  <Button onClick={onClearWinePrefixPath} theme="outline">
                    {t("clear")}
                  </Button>
                )}
              </>
            }
          />
        )}

        <div className="game-options-modal__row">
          <span
            className="game-options-modal__tool-button-wrapper"
            data-tooltip-id="winetricks-unavailable-tooltip"
            data-tooltip-content={
              showWinetricksUnavailableTooltip
                ? t("winetricks_not_available_tooltip")
                : undefined
            }
          >
            <Button
              type="button"
              theme="outline"
              onClick={onOpenWinetricks}
              disabled={!winetricksAvailable || launchViaSteam}
            >
              {t("open_winetricks")}
            </Button>
          </span>

          {showWinetricksUnavailableTooltip && (
            <Tooltip id="winetricks-unavailable-tooltip" />
          )}
        </div>
      </div>

      <div className="game-options-modal__section">
        <div className="game-options-modal__header">
          <h2>{t("additional_options")}</h2>
        </div>

        <div className="game-options-modal__gamemode-toggle">
          <CheckboxField
            label={
              <span
                className={`game-options-modal__gamemode-label ${
                  gamemodeToggleDisabled
                    ? "game-options-modal__gamemode-label--disabled"
                    : ""
                }`}
                data-tooltip-id={gamemodeTooltipId}
                data-tooltip-content={
                  !gamemodeAvailable
                    ? t("gamemode_not_available_tooltip", {
                        defaultValue: "GameMode is not available in your PATH",
                      })
                    : globalAutoRunGamemode
                      ? t("gamemode_disabled_due_to_global_setting_tooltip", {
                          defaultValue:
                            "This option is disabled because GameMode is enabled globally",
                        })
                      : undefined
                }
              >
                <span>
                  {t("run_with_gamemode_prefix", {
                    defaultValue: "Automatically run with",
                  })}
                </span>
                <Link
                  to={gamemodeSiteUrl}
                  className="game-options-modal__gamemode-link"
                >
                  GameMode
                  <LinkExternalIcon />
                </Link>
              </span>
            }
            checked={autoRunGamemode || globalAutoRunGamemode}
            disabled={gamemodeToggleDisabled}
            onChange={(event) => onChangeGamemodeState(event.target.checked)}
          />

          {gamemodeToggleDisabled && gamemodeTooltipId && (
            <Tooltip id={gamemodeTooltipId} />
          )}
        </div>

        <div className="game-options-modal__mangohud-toggle">
          <CheckboxField
            label={
              <span
                className={`game-options-modal__mangohud-label ${
                  mangohudToggleDisabled
                    ? "game-options-modal__mangohud-label--disabled"
                    : ""
                }`}
                data-tooltip-id={mangohudTooltipId}
                data-tooltip-content={
                  !mangohudAvailable
                    ? t("mangohud_not_available_tooltip", {
                        defaultValue: "MangoHud is not available in your PATH",
                      })
                    : globalAutoRunMangohud
                      ? t("mangohud_disabled_due_to_global_setting_tooltip", {
                          defaultValue:
                            "This option is disabled because MangoHud is enabled globally",
                        })
                      : undefined
                }
              >
                <span>
                  {t("run_with_mangohud_prefix", {
                    defaultValue: "Automatically run with",
                  })}
                </span>
                <Link
                  to={mangohudSiteUrl}
                  className="game-options-modal__mangohud-link"
                >
                  MangoHud
                  <LinkExternalIcon />
                </Link>
              </span>
            }
            checked={autoRunMangohud || globalAutoRunMangohud}
            disabled={mangohudToggleDisabled}
            onChange={(event) => onChangeMangohudState(event.target.checked)}
          />

          {mangohudToggleDisabled && mangohudTooltipId && (
            <Tooltip id={mangohudTooltipId} />
          )}
        </div>

        {window.electron.platform === "linux" && (
          <div className="game-options-modal__launch-via-steam-toggle">
            <CheckboxField
              label={
                <span>
                  <span>
                    {t("launch_via_steam", {
                      defaultValue: "Launch via Steam (Proton + Overlay)",
                    })}
                  </span>
                </span>
              }
              checked={launchViaSteam}
              onChange={(event) => onChangeLaunchViaSteam(event.target.checked)}
            />
          </div>
        )}

        {window.electron.platform === "linux" && (
          <div className="game-options-modal__wined3d-toggle">
            <CheckboxField
              label={
                <span>
                  <span>
                    {t("use_wined3d", {
                      defaultValue:
                        "DirectX via WineD3D (instead of DXVK/VKD3D)",
                    })}
                  </span>
                </span>
              }
              checked={useWined3d}
              onChange={(event) => onChangeWined3dState(event.target.checked)}
            />
          </div>
        )}

        {window.electron.platform === "linux" && (
          <div className="game-options-modal__native-wayland-toggle">
            <CheckboxField
              label={
                <span>
                  <span>
                    {t("use_native_wayland", {
                      defaultValue: "Native Wayland (instead of X11)",
                    })}
                  </span>
                </span>
              }
              checked={useNativeWayland}
              onChange={(event) =>
                onChangeNativeWaylandState(event.target.checked)
              }
            />
          </div>
        )}
      </div>

      <div className="game-options-modal__section">
        <div className="game-options-modal__header">
          <h2>{t("proton_version")}</h2>
          <h4 className="game-options-modal__header-description">
            {t("proton_version_description")}
          </h4>
        </div>

        <ProtonPathPicker
          versions={protonVersions}
          selectedPath={selectedProtonPath}
          onChange={onChangeProtonVersion}
          radioName={`proton-version-${game.objectId}`}
          autoLabel={protonVersionAutoLabel}
          autoSourceDescription={protonSourceUmuDefault}
          steamSourceDescription={protonSourceSteam}
          compatibilityToolsSourceDescription={protonSourceCompatibilityTools}
        />
      </div>
    </>
  );
}
