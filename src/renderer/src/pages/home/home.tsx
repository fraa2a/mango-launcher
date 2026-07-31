import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";

import { Button } from "@renderer/components";
import { PlayIcon } from "@primer/octicons-react";

import { buildGameDetailsPath } from "@renderer/helpers";
import { useLibrary } from "@renderer/hooks/use-library";
import { useFormat } from "@renderer/hooks/use-format";
import { MAX_MINUTES_TO_SHOW_IN_PLAYTIME } from "@renderer/constants";

import "./home.scss";

export default function Home() {
  const { t } = useTranslation("home");
  const navigate = useNavigate();
  const { library } = useLibrary();
  const { numberFormatter } = useFormat();

  const hasGames = library.some((g) => !g.isDeleted);

  const lastPlayedGame = library
    .filter((game) => !game.isDeleted && game.lastTimePlayed)
    .sort(
      (first, second) =>
        new Date(second.lastTimePlayed ?? 0).getTime() -
        new Date(first.lastTimePlayed ?? 0).getTime()
    )[0];

  const playTimeInMinutes =
    (lastPlayedGame?.playTimeInMilliseconds ?? 0) / 60000;
  const formattedPlayTime =
    playTimeInMinutes < MAX_MINUTES_TO_SHOW_IN_PLAYTIME
      ? t("amount_minutes", { amount: Math.round(playTimeInMinutes) })
      : t("amount_hours", {
          amount: numberFormatter.format(playTimeInMinutes / 60),
        });

  const handleContinuePlaying = async () => {
    if (!lastPlayedGame) return;

    if (lastPlayedGame.shop === "launchbox") {
      await window.electron.openClassicsGame(
        lastPlayedGame.shop,
        lastPlayedGame.objectId
      );
      return;
    }

    if (!lastPlayedGame.executablePath) return;

    await window.electron.openGame(
      lastPlayedGame.shop,
      lastPlayedGame.objectId,
      lastPlayedGame.executablePath,
      lastPlayedGame.launchOptions
    );
  };

  const topThree = library
    .filter((game) => !game.isDeleted && (game.playTimeInMilliseconds ?? 0) > 0)
    .sort(
      (a, b) =>
        (b.playTimeInMilliseconds ?? 0) - (a.playTimeInMilliseconds ?? 0)
    )
    .slice(0, 3);

  const recentlyPlayed = library
    .filter(
      (game) =>
        !game.isDeleted &&
        game.lastTimePlayed &&
        game.libraryHeroImageUrl &&
        game.id !== lastPlayedGame?.id
    )
    .sort(
      (a, b) =>
        new Date(b.lastTimePlayed ?? 0).getTime() -
        new Date(a.lastTimePlayed ?? 0).getTime()
    )
    .slice(0, 20);

  const formatPlaytime = (milliseconds: number) => {
    const minutes = milliseconds / 60000;
    return minutes < MAX_MINUTES_TO_SHOW_IN_PLAYTIME
      ? t("amount_minutes", { amount: Math.round(minutes) })
      : t("amount_hours", {
          amount: numberFormatter.format(minutes / 60),
        });
  };

  const heroImage = (game: typeof lastPlayedGame) =>
    game.libraryHeroImageUrl ?? game.iconUrl ?? "";

  if (!hasGames) {
    return (
      <section className="home__content">
        <div className="home__empty">
          <h2 className="home__empty-title">{t("welcome_title")}</h2>
          <p className="home__empty-text">{t("welcome_text")}</p>
        </div>
      </section>
    );
  }

  return (
    <section className="home__content">
      {lastPlayedGame && (
        <section className="home__continue">
          <div
            className="home__continue-art"
            style={{
              backgroundImage: `linear-gradient(90deg, rgba(14, 16, 21, 0.96), rgba(14, 16, 21, 0.35)), url(${heroImage(lastPlayedGame)})`,
            }}
          >
            <div>
              <span className="home__eyebrow">{t("continue_eyebrow")}</span>
              <h2>{lastPlayedGame.title}</h2>
              <p>{t("total_play_time", { amount: formattedPlayTime })}</p>
            </div>
            <Button
              type="button"
              onClick={handleContinuePlaying}
              disabled={
                lastPlayedGame.shop !== "launchbox" &&
                !lastPlayedGame.executablePath
              }
            >
              <PlayIcon />
              {t("continue_playing")}
            </Button>
          </div>
        </section>
      )}

      <div className="home__split">
        {recentlyPlayed.length > 0 && (
          <section className="home__recent">
            <h2 className="home__recent-title">{t("recently_played")}</h2>

            <div className="home__recent-scroll">
              {recentlyPlayed.map((game) => (
                <button
                  key={game.id ?? game.objectId}
                  type="button"
                  className="home__recent-card"
                  onClick={() => navigate(buildGameDetailsPath(game))}
                >
                  <div
                    className="home__recent-art"
                    style={{
                      backgroundImage: `url(${game.libraryHeroImageUrl})`,
                    }}
                  >
                    <div className="home__recent-art-overlay">
                      <span className="home__recent-card-title">
                        {game.title}
                      </span>
                      <span className="home__recent-card-playtime">
                        {formatPlaytime(game.playTimeInMilliseconds ?? 0)}
                      </span>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </section>
        )}

        {topThree.length > 0 && (
          <section className="home__leaderboard">
            <h2 className="home__leaderboard-title">
              {t("leaderboard_title")}
            </h2>

            <ol className="home__leaderboard-list">
              {topThree.map((game, index) => (
                <li key={game.id ?? game.objectId}>
                  <button
                    type="button"
                    className="home__leaderboard-item"
                    onClick={() => navigate(buildGameDetailsPath(game))}
                  >
                    <span className="home__leaderboard-rank">{index + 1}</span>

                    <div
                      className="home__leaderboard-cover"
                      style={{
                        backgroundImage: `url(${game.iconUrl ?? ""})`,
                      }}
                    />

                    <div className="home__leaderboard-info">
                      <span className="home__leaderboard-title">
                        {game.title}
                      </span>
                      <span className="home__leaderboard-playtime">
                        {formatPlaytime(game.playTimeInMilliseconds ?? 0)}
                      </span>
                    </div>
                  </button>
                </li>
              ))}
            </ol>
          </section>
        )}
      </div>
    </section>
  );
}
