import { setHeaderTitle } from "@renderer/features";
import { useAppDispatch } from "@renderer/hooks";
import { useContext, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import {
  buildGameDetailsPath,
  formatDownloadProgress,
  isGameCompleted,
} from "@renderer/helpers";
import { Link, ProgressBar } from "@renderer/components";
import { gameDetailsContext } from "@renderer/context";
import { TrophyIcon } from "@primer/octicons-react";
import { AchievementList } from "./achievement-list";
import { AchievementPanel } from "./achievement-panel";
import { RetroAchievementsConnectBanner } from "@renderer/components/retro-achievements-connect-banner/retro-achievements-connect-banner";
import "./achievements-content.scss";

export function AchievementsContent() {
  const heroRef = useRef<HTMLDivElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const { gameTitle, objectId, shop, game, shopDetails, achievements } =
    useContext(gameDetailsContext);
  const dispatch = useAppDispatch();
  const { t } = useTranslation("achievement");

  useEffect(() => {
    dispatch(setHeaderTitle(gameTitle));
  }, [dispatch, gameTitle]);

  if (!objectId || !shop || !gameTitle || !achievements) return null;

  const heroImage =
    game?.customHeroImageUrl || shopDetails?.assets?.libraryHeroImageUrl || "";
  const unlockedCount = achievements.filter(
    (achievement) => achievement.unlocked
  ).length;
  const isCompleted = isGameCompleted(achievements.length, unlockedCount);

  return (
    <div className="achievements-content__achievements-list">
      <section
        ref={containerRef}
        className="achievements-content__achievements-list__section"
      >
        <div className="achievements-content__achievements-list__section__container">
          <div className="achievements-content__achievements-list__section__container__banner">
            {heroImage && (
              <img
                src={heroImage}
                className="achievements-content__achievements-list__section__container__banner-background"
                alt=""
                aria-hidden="true"
                loading="lazy"
              />
            )}
            <div
              ref={heroRef}
              className="achievements-content__achievements-list__section__container__hero"
            >
              <div className="achievements-content__achievements-list__section__container__hero__content">
                <Link
                  to={buildGameDetailsPath({
                    shop,
                    objectId,
                    title: gameTitle,
                  })}
                >
                  <img
                    src={shopDetails?.assets?.logoImageUrl ?? ""}
                    className="achievements-content__achievements-list__section__container__hero__content__game-logo"
                    alt={gameTitle}
                  />
                </Link>
              </div>
            </div>
            <div className="achievements-content__achievements-list__section__container__achievements-summary-wrapper">
              <div className="achievements-content__user-summary">
                <div className="achievements-content__user-summary__container">
                  <h1>{t("local_achievements")}</h1>
                  <div className="achievements-content__user-summary__container__stats">
                    {!isCompleted && <TrophyIcon size={13} />}
                    <span>
                      {unlockedCount} / {achievements.length}
                    </span>
                    <span>
                      {formatDownloadProgress(
                        achievements.length
                          ? unlockedCount / achievements.length
                          : 0
                      )}
                    </span>
                  </div>
                  <ProgressBar
                    now={unlockedCount}
                    max={achievements.length}
                    label={t("achievement_progress", {
                      unlockedCount,
                      totalCount: achievements.length,
                    })}
                    completed={isCompleted}
                    trackClassName="achievements-content__user-summary__container__stats__progress-track"
                    barClassName="achievements-content__user-summary__container__stats__progress-bar"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
        <RetroAchievementsConnectBanner />
        <AchievementPanel achievements={achievements} />
        <AchievementList achievements={achievements} />
      </section>
    </div>
  );
}
