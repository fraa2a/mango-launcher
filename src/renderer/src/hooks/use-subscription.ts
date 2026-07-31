import { useCallback } from "react";
import { MangoCloudFeature } from "@types";

export function useSubscription() {
  const isMangoCloudModalVisible = false;
  const mangoCloudFeature: MangoCloudFeature | null = null;

  const showMangoCloudModal = useCallback(
    (_feature: MangoCloudFeature) => {},
    []
  );

  const hideMangoCloudModal = useCallback(() => {}, []);

  return {
    isMangoCloudModalVisible,
    mangoCloudFeature,
    showMangoCloudModal,
    hideMangoCloudModal,
  };
}
