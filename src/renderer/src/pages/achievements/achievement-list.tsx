import { useDate } from "@renderer/hooks";
import type { UserAchievement } from "@types";
import { useTranslation } from "react-i18next";
import "./achievements.scss";
import { EyeClosedIcon } from "@primer/octicons-react";
import mangoIcon from "@renderer/assets/icons/mango.png";

interface AchievementListProps {
  achievements: UserAchievement[];
}

export function AchievementList({
  achievements,
}: Readonly<AchievementListProps>) {
  const { t } = useTranslation("achievement");
  const { formatDateTime } = useDate();

  return (
    <ul className="achievements__list">
      {achievements.map((achievement) => (
        <li key={achievement.name} className="achievements__item">
          <img
            className={`achievements__item-image ${!achievement.unlocked ? "achievements__item-image--locked" : ""}`}
            src={achievement.icon}
            alt={achievement.displayName}
            loading="lazy"
          />

          <div className="achievements__item-content">
            <h4 className="achievements__item-title">
              {achievement.hidden && (
                <span
                  className="achievements__item-hidden-icon"
                  title={t("hidden_achievement_tooltip")}
                >
                  <EyeClosedIcon size={12} />
                </span>
              )}
              {achievement.displayName}
              {achievement.hardcoreUnlockTime != null && (
                <span
                  className="achievements__item-hardcore-badge"
                  title={t("hardcore_unlocked_at", {
                    date: formatDateTime(achievement.hardcoreUnlockTime),
                  })}
                >
                  {t("hardcore")}
                </span>
              )}
            </h4>
            <p>{achievement.description}</p>
          </div>

          <div className="achievements__item-meta">
            {achievement.points != undefined ? (
              <div
                className="achievements__item-points"
                title={t("achievement_earn_points", {
                  points: achievement.points,
                })}
              >
                <img
                  src={mangoIcon}
                  alt=""
                  className="achievements__item-points-icon"
                />
                <p className="achievements__item-points-value">
                  {achievement.points}
                </p>
              </div>
            ) : (
              <span
                className="achievements__item-points achievements__item-points--locked"
                title={t("achievement_earn_points", { points: "???" })}
              >
                <img
                  src={mangoIcon}
                  alt=""
                  className="achievements__item-points-icon"
                />
                <p className="achievements__item-points-value">???</p>
              </span>
            )}
            {achievement.unlockTime != null && (
              <div
                className="achievements__item-unlock-time"
                title={t("unlocked_at", {
                  date: formatDateTime(achievement.unlockTime),
                })}
              >
                <small>{formatDateTime(achievement.unlockTime)}</small>
              </div>
            )}
          </div>
        </li>
      ))}
    </ul>
  );
}
