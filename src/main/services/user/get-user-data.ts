import type { UserDetails } from "@types";

/**
 * No-op stub for the signed-in user's details.
 *
 * Server-side auth was removed during the fork rebrand, so there is no
 * remote session to fetch. Returns null to signal "not signed in".
 */
export const getUserData = async (): Promise<UserDetails | null> => {
  return null;
};
