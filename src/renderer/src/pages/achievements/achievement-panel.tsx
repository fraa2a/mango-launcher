import { useTranslation } from "react-i18next";
import type { UserAchievement } from "@types";
import "./achievement-panel.scss";

export interface AchievementPanelProps {
  achievements: UserAchievement[];
}

export function AchievementPanel({ achievements }: AchievementPanelProps) {
  const { t } = useTranslation("achievement");
  const total = achievements.reduce(
    (sum, achievement) => sum + (achievement.points ?? 0),
    0
  );
  const earned = achievements.reduce(
    (sum, achievement) =>
      sum + (achievement.unlocked ? (achievement.points ?? 0) : 0),
    0
  );

  return (
    <div className="achievement-panel">
      <div className="achievement-panel__content">
        {t("earned_points")} {earned} / {total}
      </div>
    </div>
  );
}
