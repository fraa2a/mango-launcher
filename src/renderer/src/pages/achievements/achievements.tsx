import { setHeaderTitle } from "@renderer/features";
import { useAppDispatch } from "@renderer/hooks";
import type { GameShop } from "@types";
import { useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import {
  GameDetailsContextConsumer,
  GameDetailsContextProvider,
} from "@renderer/context";
import { SkeletonTheme } from "react-loading-skeleton";
import { AchievementsSkeleton } from "./achievements-skeleton";
import { AchievementsContent } from "./achievements-content";

export default function Achievements() {
  const [searchParams] = useSearchParams();
  const objectId = searchParams.get("objectId");
  const shop = searchParams.get("shop");
  const title = searchParams.get("title");

  const dispatch = useAppDispatch();

  useEffect(() => {
    if (title) {
      dispatch(setHeaderTitle(title));
    }
  }, [dispatch, title]);

  return (
    <GameDetailsContextProvider
      gameTitle={title!}
      shop={shop as GameShop}
      objectId={objectId!}
    >
      <GameDetailsContextConsumer>
        {({ isLoading, achievements }) => {
          const showSkeleton = isLoading || achievements === null;

          return (
            <SkeletonTheme baseColor="#1c1c1c" highlightColor="#444">
              {showSkeleton ? (
                <AchievementsSkeleton />
              ) : (
                <AchievementsContent />
              )}
            </SkeletonTheme>
          );
        }}
      </GameDetailsContextConsumer>
    </GameDetailsContextProvider>
  );
}
