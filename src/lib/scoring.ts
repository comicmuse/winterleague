/**
 * Calculate points for a given place in a competition.
 * topPlaces is the number of places that score points.
 * 1st = topPlaces points, 2nd = topPlaces-1, ...
 * Places beyond topPlaces score 0.
 */
export function pointsForPlace(place: number, topPlaces: number): number {
  if (place > topPlaces) return 0;
  return topPlaces - place + 1;
}

/**
 * Assign places to a sorted array of scores (ascending - lower golf score is better).
 * Players sharing a score share the same place.
 * Returns array of { playerId, score, place } objects.
 */
export function assignPlaces(
  entries: { playerId: string; score: number }[]
): { playerId: string; score: number; place: number }[] {
  if (entries.length === 0) return [];

  const sorted = [...entries].sort((a, b) => a.score - b.score);
  const result: { playerId: string; score: number; place: number }[] = [];

  let place = 1;
  for (let i = 0; i < sorted.length; i++) {
    if (i > 0 && sorted[i].score === sorted[i - 1].score) {
      // Tied with previous player – same place
      result.push({ ...sorted[i], place: result[i - 1].place });
    } else {
      result.push({ ...sorted[i], place });
    }
    place = i + 2; // next place is always position + 1 (so after two 2nds, next is 4th)
  }

  return result;
}

export interface LeagueEntry {
  playerId: string;
  playerName: string;
  totalPoints: number;
  placements: Record<number, number>; // place -> count
  competitionsEntered: number;
}

export function buildLeagueTable(
  results: {
    playerId: string;
    playerName: string;
    place: number;
    competitionTopPlaces: number;
  }[]
): LeagueEntry[] {
  const map = new Map<string, LeagueEntry>();

  for (const r of results) {
    if (!map.has(r.playerId)) {
      map.set(r.playerId, {
        playerId: r.playerId,
        playerName: r.playerName,
        totalPoints: 0,
        placements: {},
        competitionsEntered: 0,
      });
    }
    const entry = map.get(r.playerId)!;
    const pts = pointsForPlace(r.place, r.competitionTopPlaces);
    entry.totalPoints += pts;
    entry.placements[r.place] = (entry.placements[r.place] ?? 0) + 1;
    entry.competitionsEntered += 1;
  }

  return Array.from(map.values()).sort((a, b) => {
    if (b.totalPoints !== a.totalPoints) return b.totalPoints - a.totalPoints;
    // Tiebreak: more 1sts, then 2nds, etc.
    for (let p = 1; p <= 10; p++) {
      const diff = (b.placements[p] ?? 0) - (a.placements[p] ?? 0);
      if (diff !== 0) return diff;
    }
    return a.playerName.localeCompare(b.playerName);
  });
}
