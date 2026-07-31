import { useMemo } from "react";
import type { FriendRequest, UserDetails } from "@types";

interface UseUserDetailsReturn {
  userDetails: UserDetails | null;
  profileBackground: string | null;
  friendRequests: FriendRequest[];
  friendRequestCount: number;
  hasActiveSubscription: boolean;
  fetchUserDetails: () => Promise<UserDetails | null>;
  clearUserDetails: () => Promise<void>;
  updateUserDetails: (userDetails: UserDetails) => Promise<void>;
  patchUser: (values: unknown) => Promise<void>;
  sendFriendRequest: (userId: string) => Promise<void>;
  fetchFriendRequests: () => Promise<FriendRequest[] | null>;
  updateFriendRequestState: (userId: string, action: unknown) => Promise<void>;
  blockUser: (userId: string) => Promise<void>;
  unblockUser: (userId: string) => Promise<void>;
  undoFriendship: (userId: string) => Promise<void>;
}

export function useUserDetails(): UseUserDetailsReturn {
  const userDetails: UserDetails | null = null;
  const profileBackground: string | null = null;
  const friendRequests: FriendRequest[] = [];
  const friendRequestCount = 0;

  const hasActiveSubscription = useMemo(() => false, []);

  return {
    userDetails,
    profileBackground,
    friendRequests,
    friendRequestCount,
    hasActiveSubscription,
    fetchUserDetails: async () => null,
    clearUserDetails: async () => {},
    updateUserDetails: async (_userDetails: UserDetails) => {},
    patchUser: async (_values: unknown) => {},
    sendFriendRequest: async (_userId: string) => {},
    fetchFriendRequests: async () => null,
    updateFriendRequestState: async (_userId: string, _action: unknown) => {},
    blockUser: (_userId: string) => Promise.resolve(),
    unblockUser: (_userId: string) => Promise.resolve(),
    undoFriendship: (_userId: string) => Promise.resolve(),
  };
}
