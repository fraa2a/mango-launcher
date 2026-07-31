import { BottomPanel, Header, Sidebar, Toast } from "@renderer/components";
import { VideoIcon } from "@primer/octicons-react";
import {
  DashIcon,
  ScreenFullIcon,
  ScreenNormalIcon,
  XIcon,
} from "@primer/octicons-react";
import {
  useAppDispatch,
  useAppSelector,
  useDownload,
  useLibrary,
  useToast,
} from "@renderer/hooks";
import { useDownloadOptionsListener } from "@renderer/hooks/use-download-options-listener";
import i18n from "i18next";
import { useCallback, useEffect, useRef, useState } from "react";

import {
  clearExtraction,
  closeToast,
  failClassicsScan,
  finishClassicsScan,
  hydrateClassicsScan,
  setExtractionProgress,
  setGameRunning,
  setUserPreferences,
  toggleDraggingDisabled,
  updateClassicsScanProgress,
} from "@renderer/features";
import { useTranslation } from "react-i18next";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { ArchiveDeletionModal } from "./pages/downloads/archive-deletion-error-modal";
import { ClassicsScanModal } from "./pages/settings/emulation/classics-scan-modal";

import type { UserPreferences } from "@types";
import "./app.scss";
import {
  getAchievementSoundUrl,
  getAchievementSoundVolume,
  injectCustomCss,
  removeCustomCss,
} from "./helpers";
import { levelDBService } from "./services/leveldb.service";

export interface AppProps {
  children: React.ReactNode;
}

export function App() {
  const contentRef = useRef<HTMLDivElement>(null);
  const { updateLibrary, library } = useLibrary();

  // Listen for new download options updates
  useDownloadOptionsListener();

  const { t } = useTranslation("app");

  const { clearDownload, setLastPacket, lastPacket } = useDownload();

  const dispatch = useAppDispatch();

  const navigate = useNavigate();
  const location = useLocation();

  const draggingDisabled = useAppSelector(
    (state) => state.window.draggingDisabled
  );

  const toast = useAppSelector((state) => state.toast);

  const { showErrorToast } = useToast();

  const [showArchiveDeletionModal, setShowArchiveDeletionModal] =
    useState(false);
  const [archivePaths, setArchivePaths] = useState<string[]>([]);

  useEffect(() => {
    Promise.all([
      levelDBService.get("userPreferences", null, "json"),
      updateLibrary(),
    ]).then(([preferences]) => {
      dispatch(setUserPreferences(preferences as UserPreferences | null));
    });
  }, [navigate, location.pathname, dispatch, updateLibrary]);

  useEffect(() => {
    const unsubscribe = window.electron.onUserPreferencesUpdated(
      (preferences) => {
        if (!preferences) {
          dispatch(setUserPreferences(null));
          return;
        }

        if (preferences.language && preferences.language !== i18n.language) {
          void i18n.changeLanguage(preferences.language);
        }

        dispatch(setUserPreferences(preferences));
      }
    );

    return () => {
      unsubscribe();
    };
  }, [dispatch]);

  useEffect(() => {
    const unsubscribe = window.electron.onDownloadProgress(
      (downloadProgress) => {
        if (
          downloadProgress?.progress === 1 &&
          !downloadProgress.isCheckingFiles &&
          !downloadProgress.isDownloadingMetadata
        ) {
          clearDownload();
          updateLibrary();
          return;
        }

        setLastPacket(downloadProgress);
      }
    );

    return () => {
      unsubscribe();
    };
  }, [clearDownload, setLastPacket, updateLibrary]);

  useEffect(() => {
    const unsubscribe = window.electron.onHardDelete(() => {
      updateLibrary();
    });

    return () => unsubscribe();
  }, [updateLibrary]);

  useEffect(() => {
    if (!lastPacket?.gameId) return;

    const activeGame = library.find((game) => game.id === lastPacket.gameId);

    if (!activeGame || activeGame.download?.status !== "active") {
      clearDownload();
    }
  }, [clearDownload, lastPacket?.gameId, library]);

  const setupExternalResources = useCallback(async () => {
    if (!document.getElementById("external-resources")) {
      const $script = document.createElement("script");
      $script.id = "external-resources";
      $script.src = `${import.meta.env.RENDERER_VITE_EXTERNAL_RESOURCES_URL}/bundle.js?t=${Date.now()}`;
      document.head.appendChild($script);
    }
  }, []);

  useEffect(() => {
    setupExternalResources();
  }, [setupExternalResources]);

  useEffect(() => {
    const unsubscribe = window.electron.onGamesRunning((gamesRunning) => {
      if (gamesRunning.length) {
        const lastGame = gamesRunning[gamesRunning.length - 1];
        const libraryGame = library.find(
          (library) => library.id === lastGame.id
        );

        if (libraryGame) {
          dispatch(
            setGameRunning({
              ...libraryGame,
              sessionDurationInMillis: lastGame.sessionDurationInMillis,
            })
          );
          return;
        }
      }
      dispatch(setGameRunning(null));
    });

    return () => {
      unsubscribe();
    };
  }, [dispatch, library]);

  useEffect(() => {
    window.electron.getActiveClassicsImport().then((snapshot) => {
      if (snapshot) dispatch(hydrateClassicsScan(snapshot));
    });

    const unsubscribe = window.electron.onClassicsImportProgress((payload) => {
      if (payload.type === "error") {
        dispatch(failClassicsScan(payload.message));
        return;
      }

      if (payload.type === "progress") {
        dispatch(updateClassicsScanProgress(payload));
        return;
      }

      dispatch(
        finishClassicsScan({
          cancelled: payload.type === "cancelled",
          system: payload.system,
          result: {
            fileCount: payload.fileCount,
            sizeBytes: payload.sizeBytes,
            matched: payload.matched,
            unmatched: payload.unmatched,
            unmatchedFiles: payload.unmatchedFiles,
          },
        })
      );
      updateLibrary();
    });

    return () => unsubscribe();
  }, [dispatch, updateLibrary]);

  useEffect(() => {
    const listeners = [
      window.electron.onLibraryBatchComplete(() => {
        updateLibrary();
      }),
      window.electron.onDownloadsUpdated(() => {
        updateLibrary();
      }),
      window.electron.onExtractionProgress((shop, objectId, progress) => {
        dispatch(setExtractionProgress({ shop, objectId, progress }));
      }),
      window.electron.onExtractionComplete(() => {
        dispatch(clearExtraction());
        updateLibrary();
      }),
      window.electron.onExtractionFailed(() => {
        dispatch(clearExtraction());
        updateLibrary();
        showErrorToast(
          t("extraction_failed_title", { ns: "downloads" }),
          t("extraction_failed_description", { ns: "downloads" })
        );
      }),
      window.electron.onArchiveDeletionPrompt((paths) => {
        setArchivePaths(paths);
        setShowArchiveDeletionModal(true);
      }),
    ];

    return () => {
      listeners.forEach((unsubscribe) => unsubscribe());
    };
  }, [updateLibrary, dispatch, showErrorToast, t]);

  useEffect(() => {
    if (contentRef.current) contentRef.current.scrollTop = 0;
  }, [location.pathname, location.search]);

  useEffect(() => {
    new MutationObserver(() => {
      const modal = document.body.querySelector("[data-mango-dialog]");

      dispatch(toggleDraggingDisabled(Boolean(modal)));
    }).observe(document.body, {
      attributes: false,
      childList: true,
    });
  }, [dispatch, draggingDisabled]);

  const loadAndApplyTheme = useCallback(async () => {
    const allThemes = (await levelDBService.values("themes")) as {
      isActive?: boolean;
      code?: string;
    }[];
    const activeTheme = allThemes.find((theme) => theme.isActive);
    if (activeTheme?.code) {
      injectCustomCss(activeTheme.code);
    } else {
      removeCustomCss();
    }
  }, []);

  useEffect(() => {
    loadAndApplyTheme();
  }, [loadAndApplyTheme]);

  useEffect(() => {
    const unsubscribe = window.electron.onCustomThemeUpdated(() => {
      loadAndApplyTheme();
    });

    return () => unsubscribe();
  }, [loadAndApplyTheme]);

  useEffect(() => {
    const unsubscribe = globalThis.electron.onNavigate((path) => {
      navigate(path);
    });

    return () => unsubscribe();
  }, [navigate]);

  const playAudio = useCallback(async () => {
    const soundUrl = await getAchievementSoundUrl();
    const volume = await getAchievementSoundVolume();
    const audio = new Audio(soundUrl);
    audio.volume = volume;
    audio.play();
  }, []);

  useEffect(() => {
    const unsubscribe = window.electron.onAchievementUnlocked(() => {
      playAudio();
    });

    return () => {
      unsubscribe();
    };
  }, [playAudio]);

  const handleToastClose = useCallback(() => {
    dispatch(closeToast());
  }, [dispatch]);

  const [isWindowMaximized, setIsWindowMaximized] = useState(false);

  useEffect(() => {
    if (window.electron.platform !== "linux") return;

    if (window.electron.isWayland) {
      document.body.classList.add("window-rounded");
    }

    let cancelled = false;

    const applyMaximizeState = (isMaximized: boolean) => {
      if (cancelled) return;
      setIsWindowMaximized(isMaximized);
      document.body.classList.toggle("window-maximized", isMaximized);
    };

    window.electron.isMainWindowMaximized().then(applyMaximizeState);
    const unsubscribe =
      window.electron.onWindowMaximizeChange(applyMaximizeState);

    return () => {
      cancelled = true;
      unsubscribe();
      document.body.classList.remove("window-rounded");
      document.body.classList.remove("window-maximized");
    };
  }, []);

  return (
    <>
      {(window.electron.platform === "win32" ||
        window.electron.platform === "linux") && (
        <div
          className={`title-bar${
            window.electron.platform === "win32" ? " title-bar--windows" : ""
          }`}
        >
          <h4>Mango</h4>

          <button
            type="button"
            className="title-bar__big-picture"
            onClick={() => globalThis.window.electron.openBigPictureWindow()}
          >
            <VideoIcon size={14} />
            {t("big_picture", { ns: "sidebar" })}
          </button>

          {window.electron.platform === "linux" && (
            <div className="title-bar__window-controls">
              <button
                type="button"
                className="title-bar__window-control"
                onClick={() => window.electron.minimizeMainWindow()}
                title={t("header:minimize")}
                aria-label={t("header:minimize")}
              >
                <DashIcon size={16} />
              </button>
              <button
                type="button"
                className="title-bar__window-control"
                onClick={() => window.electron.toggleMaximizeMainWindow()}
                title={
                  isWindowMaximized ? t("header:restore") : t("header:maximize")
                }
                aria-label={
                  isWindowMaximized ? t("header:restore") : t("header:maximize")
                }
              >
                {isWindowMaximized ? (
                  <ScreenNormalIcon size={16} />
                ) : (
                  <ScreenFullIcon size={16} />
                )}
              </button>
              <button
                type="button"
                className="title-bar__window-control title-bar__window-control--close"
                onClick={() => window.electron.closeMainWindow()}
                title={t("header:close")}
                aria-label={t("header:close")}
              >
                <XIcon size={16} />
              </button>
            </div>
          )}
        </div>
      )}

      <Toast
        visible={toast.visible}
        title={toast.title}
        message={toast.message}
        type={toast.type}
        onClose={handleToastClose}
        duration={toast.duration}
      />

      <ArchiveDeletionModal
        visible={showArchiveDeletionModal}
        archivePaths={archivePaths}
        onClose={() => setShowArchiveDeletionModal(false)}
      />

      <ClassicsScanModal />

      <main>
        <Sidebar />

        <article className="container">
          <Header />

          <section
            ref={contentRef}
            id="scrollableDiv"
            className="container__content"
          >
            <Outlet />
          </section>
        </article>
      </main>

      <BottomPanel />
    </>
  );
}
