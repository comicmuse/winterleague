import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Navbar from "@/components/Navbar";
import Link from "next/link";
import { format } from "date-fns";
import { pointsForPlace } from "@/lib/scoring";

function ordinal(n: number): string {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

function PlaceBadge({ place }: { place: number }) {
  const medal =
    place === 1 ? "🥇" : place === 2 ? "🥈" : place === 3 ? "🥉" : null;
  const colors =
    place === 1
      ? "bg-yellow-100 text-yellow-800 border-yellow-200"
      : place === 2
      ? "bg-gray-100 text-gray-700 border-gray-200"
      : place === 3
      ? "bg-orange-100 text-orange-700 border-orange-200"
      : "bg-green-50 text-green-700 border-green-100";

  return (
    <span
      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-sm font-semibold border ${colors}`}
    >
      {medal && <span>{medal}</span>}
      {ordinal(place)}
    </span>
  );
}

export default async function PlayerProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const player = await prisma.player.findUnique({
    where: { id },
    include: {
      results: {
        include: { competition: true },
        orderBy: { competition: { date: "desc" } },
      },
    },
  });

  if (!player) notFound();

  const totalPoints = player.results.reduce(
    (sum, r) => sum + pointsForPlace(r.place, r.competition.topPlaces),
    0
  );

  const placementCounts: Record<number, number> = {};
  for (const r of player.results) {
    placementCounts[r.place] = (placementCounts[r.place] ?? 0) + 1;
  }

  const topPlacements = player.results.filter(
    (r) => r.place <= r.competition.topPlaces
  );
  const bestScore = player.results.length > 0
    ? Math.min(...player.results.map((r) => r.score))
    : null;

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <main className="max-w-4xl mx-auto px-4 py-8">
        <div className="mb-6">
          <Link href="/players" className="text-green-700 hover:underline text-sm">
            ← Back to players
          </Link>
        </div>

        {/* Profile header */}
        <div className="bg-white rounded-xl shadow p-6 mb-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center text-green-700 font-bold text-3xl">
              {player.name[0].toUpperCase()}
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">{player.name}</h1>
              <p className="text-gray-500 mt-0.5">
                {player.results.length} competition
                {player.results.length !== 1 ? "s" : ""} entered
              </p>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6">
            <div className="bg-green-50 rounded-lg p-4 text-center">
              <div className="text-3xl font-bold text-green-700">
                {totalPoints}
              </div>
              <div className="text-sm text-green-600 mt-1">Total Points</div>
            </div>
            <div className="bg-yellow-50 rounded-lg p-4 text-center">
              <div className="text-3xl font-bold text-yellow-600">
                {placementCounts[1] ?? 0}
              </div>
              <div className="text-sm text-yellow-600 mt-1">Wins (1st)</div>
            </div>
            <div className="bg-blue-50 rounded-lg p-4 text-center">
              <div className="text-3xl font-bold text-blue-600">
                {topPlacements.length}
              </div>
              <div className="text-sm text-blue-600 mt-1">Top Places</div>
            </div>
            <div className="bg-purple-50 rounded-lg p-4 text-center">
              <div className="text-3xl font-bold text-purple-600">
                {bestScore ?? "–"}
              </div>
              <div className="text-sm text-purple-600 mt-1">Best Score</div>
            </div>
          </div>
        </div>

        {/* Placement breakdown */}
        {Object.keys(placementCounts).length > 0 && (
          <div className="bg-white rounded-xl shadow p-6 mb-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">
              Placement Summary
            </h2>
            <div className="flex flex-wrap gap-3">
              {Object.entries(placementCounts)
                .sort(([a], [b]) => parseInt(a) - parseInt(b))
                .map(([place, count]) => (
                  <div
                    key={place}
                    className="flex items-center gap-2 bg-gray-50 rounded-lg px-4 py-2"
                  >
                    <PlaceBadge place={parseInt(place)} />
                    <span className="text-gray-600 text-sm">
                      × {count}
                    </span>
                  </div>
                ))}
            </div>
          </div>
        )}

        {/* Competition history */}
        <div className="bg-white rounded-xl shadow overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="text-lg font-semibold text-gray-800">
              Competition History
            </h2>
          </div>

          {player.results.length === 0 ? (
            <div className="px-6 py-8 text-center text-gray-500">
              No competition results yet.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50 text-sm text-gray-600 border-b border-gray-100">
                    <th className="px-6 py-3 text-left font-semibold">Competition</th>
                    <th className="px-6 py-3 text-left font-semibold">Date</th>
                    <th className="px-6 py-3 text-center font-semibold">Score</th>
                    <th className="px-6 py-3 text-center font-semibold">Place</th>
                    <th className="px-6 py-3 text-center font-semibold">Points</th>
                  </tr>
                </thead>
                <tbody>
                  {player.results.map((result) => {
                    const pts = pointsForPlace(
                      result.place,
                      result.competition.topPlaces
                    );
                    return (
                      <tr
                        key={result.id}
                        className="border-t border-gray-100 hover:bg-gray-50"
                      >
                        <td className="px-6 py-3">
                          <Link
                            href={`/competitions/${result.competitionId}`}
                            className="text-green-700 hover:text-green-900 hover:underline font-medium"
                          >
                            {result.competition.name}
                          </Link>
                        </td>
                        <td className="px-6 py-3 text-gray-500 text-sm">
                          {format(
                            new Date(result.competition.date),
                            "d MMM yyyy"
                          )}
                        </td>
                        <td className="px-6 py-3 text-center text-gray-700">
                          {result.score}
                        </td>
                        <td className="px-6 py-3 text-center">
                          <PlaceBadge place={result.place} />
                        </td>
                        <td className="px-6 py-3 text-center">
                          {pts > 0 ? (
                            <span className="bg-green-100 text-green-800 font-bold px-3 py-1 rounded-full text-sm">
                              {pts}
                            </span>
                          ) : (
                            <span className="text-gray-400 text-sm">–</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-gray-200 bg-green-50">
                    <td
                      colSpan={4}
                      className="px-6 py-3 text-sm font-semibold text-gray-700"
                    >
                      Total
                    </td>
                    <td className="px-6 py-3 text-center">
                      <span className="bg-green-600 text-white font-bold px-3 py-1 rounded-full text-sm">
                        {totalPoints}
                      </span>
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
