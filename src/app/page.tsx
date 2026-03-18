import { prisma } from "@/lib/prisma";
import { buildLeagueTable, pointsForPlace } from "@/lib/scoring";
import Navbar from "@/components/Navbar";
import Link from "next/link";

export const dynamic = "force-dynamic";

function ordinal(n: number): string {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

interface PageProps {
  searchParams: Promise<{ season?: string }>;
}

export default async function LeagueTablePage({ searchParams }: PageProps) {
  const params = await searchParams;
  const seasonId = params.season;

  // Get current season if not specified
  let targetSeasonId = seasonId;
  if (!targetSeasonId) {
    const currentYear = new Date().getFullYear();
    const currentSeason = await prisma.season.findFirst({
      where: { year: currentYear },
      orderBy: { year: "desc" },
    });
    if (currentSeason) {
      targetSeasonId = currentSeason.id;
    } else {
      // Fallback to most recent season
      const latestSeason = await prisma.season.findFirst({
        orderBy: { year: "desc" },
      });
      if (latestSeason) {
        targetSeasonId = latestSeason.id;
      }
    }
  }

  const where = targetSeasonId ? { seasonId: targetSeasonId } : {};

  const competitions = await prisma.competition.findMany({
    where,
    orderBy: { date: "asc" },
    include: {
      results: { include: { player: true } },
      season: true,
      league: {
        include: { season: true },
      },
    },
  });

  // Group competitions by league
  const competitionsByLeague = competitions.reduce((acc, comp) => {
    const leagueId = comp.leagueId;
    const leagueName = comp.league.name;
    if (!acc[leagueId]) {
      acc[leagueId] = {
        leagueName,
        competitions: [],
      };
    }
    acc[leagueId].competitions.push(comp);
    return acc;
  }, {} as Record<string, { leagueName: string; competitions: typeof competitions }>);

  // Build league table for each league
  const leagueTables = Object.entries(competitionsByLeague).map(
    ([leagueId, { leagueName, competitions: leagueComps }]) => {
      const leagueInput = leagueComps.flatMap((comp) =>
        comp.results.map((r) => ({
          playerId: r.playerId,
          playerName: r.player.name,
          place: r.place,
          competitionTopPlaces: comp.topPlaces,
        }))
      );

      const leagueTable = buildLeagueTable(leagueInput);
      const maxTopPlaces = Math.max(
        ...leagueComps.map((c) => c.topPlaces),
        5
      );

      return {
        leagueId,
        leagueName,
        leagueTable,
        maxTopPlaces,
        competitionCount: leagueComps.length,
      };
    }
  );

  const totalCompetitions = competitions.length;
  const hasData = totalCompetitions > 0;

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <main className="max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">League Table</h1>
            <p className="text-gray-500 mt-1">
              {totalCompetitions} competition
              {totalCompetitions !== 1 ? "s" : ""} played
            </p>
          </div>
          <div className="flex gap-3">
            <Link
              href="/competitions/new"
              className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors"
            >
              ✏️ Enter Results
            </Link>
            <a
              href={`/api/export${targetSeasonId ? `?seasonId=${targetSeasonId}` : ""}`}
              className="px-4 py-2 bg-yellow-500 hover:bg-yellow-400 text-green-900 rounded-lg font-medium transition-colors"
            >
              📥 Export Excel
            </a>
          </div>
        </div>

        {/* No data state */}
        {!hasData ? (
          <div className="text-center py-16">
            <div className="text-5xl mb-4">⛳</div>
            <h2 className="text-xl font-semibold text-gray-700 mb-2">
              No results yet
            </h2>
            <p className="text-gray-500 mb-6">
              Enter the first competition results to get started.
            </p>
            <Link
              href="/competitions/new"
              className="px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors"
            >
              Enter Results
            </Link>
          </div>
        ) : (
          <div className="space-y-8">
            {/* Render a league table for each league */}
            {leagueTables.map(
              ({
                leagueId,
                leagueName,
                leagueTable,
                maxTopPlaces,
                competitionCount,
              }) => (
                <div key={leagueId}>
                  {/* League header */}
                  <div className="mb-4">
                    <h2 className="text-2xl font-bold text-gray-800">
                      {leagueName}
                    </h2>
                    <p className="text-gray-500 text-sm">
                      {competitionCount} competition
                      {competitionCount !== 1 ? "s" : ""}
                    </p>
                  </div>

                  {/* Scoring guide */}
                  <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-4">
                    <h3 className="text-sm font-semibold text-green-800 mb-2">
                      Scoring System
                    </h3>
                    <div className="flex flex-wrap gap-3">
                      {Array.from(
                        { length: maxTopPlaces },
                        (_, i) => i + 1
                      ).map((place) => (
                        <span
                          key={place}
                          className="text-sm text-green-700 bg-green-100 px-3 py-1 rounded-full"
                        >
                          {ordinal(place)} = {pointsForPlace(place, maxTopPlaces)}{" "}
                          pts
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* League table */}
                  <div className="bg-white rounded-xl shadow overflow-hidden mb-8">
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="bg-green-700 text-white text-sm">
                            <th className="px-4 py-3 text-left font-semibold">
                              Pos
                            </th>
                            <th className="px-4 py-3 text-left font-semibold">
                              Player
                            </th>
                            <th className="px-4 py-3 text-center font-semibold">
                              Points
                            </th>
                            <th className="px-4 py-3 text-center font-semibold">
                              Played
                            </th>
                            {Array.from(
                              { length: maxTopPlaces },
                              (_, i) => i + 1
                            ).map((p) => (
                              <th
                                key={p}
                                className="px-3 py-3 text-center font-semibold text-green-200"
                              >
                                {ordinal(p)}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {leagueTable.map((entry, idx) => (
                            <tr
                              key={entry.playerId}
                              className={`border-t border-gray-100 hover:bg-gray-50 transition-colors ${
                                idx < 3 ? "font-medium" : ""
                              }`}
                            >
                              <td className="px-4 py-3 text-gray-600">
                                {idx === 0 ? (
                                  <span className="text-xl">🥇</span>
                                ) : idx === 1 ? (
                                  <span className="text-xl">🥈</span>
                                ) : idx === 2 ? (
                                  <span className="text-xl">🥉</span>
                                ) : (
                                  <span className="text-gray-500">{idx + 1}</span>
                                )}
                              </td>
                              <td className="px-4 py-3">
                                <Link
                                  href={`/players/${entry.playerId}`}
                                  className="text-green-700 hover:text-green-900 hover:underline font-medium"
                                >
                                  {entry.playerName}
                                </Link>
                              </td>
                              <td className="px-4 py-3 text-center">
                                <span className="bg-green-100 text-green-800 font-bold px-3 py-1 rounded-full text-sm">
                                  {entry.totalPoints}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-center text-gray-600">
                                {entry.competitionsEntered}
                              </td>
                              {Array.from(
                                { length: maxTopPlaces },
                                (_, i) => i + 1
                              ).map((p) => (
                                <td
                                  key={p}
                                  className="px-3 py-3 text-center text-gray-500 text-sm"
                                >
                                  {entry.placements[p] ?? "–"}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )
            )}
          </div>
        )}
      </main>
    </div>
  );
}

