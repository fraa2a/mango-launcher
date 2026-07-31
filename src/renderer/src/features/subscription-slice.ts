import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type { MangoCloudFeature } from "@types";

export interface SubscriptionState {
  isMangoCloudModalVisible: boolean;
  feature: MangoCloudFeature | "";
}

const initialState: SubscriptionState = {
  isMangoCloudModalVisible: false,
  feature: "",
};

export const subscriptionSlice = createSlice({
  name: "subscription",
  initialState,
  reducers: {
    setMangoCloudModalVisible: (
      state,
      action: PayloadAction<MangoCloudFeature>
    ) => {
      state.isMangoCloudModalVisible = true;
      state.feature = action.payload;
    },
    setMangoCloudModalHidden: (state) => {
      state.isMangoCloudModalVisible = false;
    },
  },
});

export const { setMangoCloudModalVisible, setMangoCloudModalHidden } =
  subscriptionSlice.actions;
