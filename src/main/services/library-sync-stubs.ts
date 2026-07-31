import type { Game } from "@types";

/**
 * No-op stubs for server-side library sync.
 *
 * Previously these functions pushed game data to the remote API
 * (POST /profile/games, PUT /profile/games/:shop/:objectId). All server-side
 * auth has been removed, so they are now no-ops.
 */

export const createGame = async (_game: Game): Promise<void> => {
  // No-op: server-side library sync removed
};

export const trackGamePlaytime = async (
  _game: Game,
  _deltaInMillis: number,
  _lastTimePlayed: Date
): Promise<void> => {
  // No-op: server-side playtime sync removed
};

/**
 * No-op stub for merging the local library with the remote one.
 * Server-side library sync was removed, so nothing to merge.
 */
export const mergeWithRemoteGames = async (): Promise<void> => {
  // No-op: server-side library sync removed
};
