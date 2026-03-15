import { prisma } from "@/lib/prisma";
import Navbar from "@/components/Navbar";
import Link from "next/link";
import { pointsForPlace } from "@/lib/scoring";

export const dynamic = "force-dynamic";

export default async function PlayersPage() {
  const players = await prisma.player.findMany({
    orderBy: { name: "asc" },
    include: {
      results: {
        include: { competition: true },
      },
    },
  });

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <main className="max-w-6xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Players</h1>
          <p className="text-gray-500 mt-1">
            {players.length} player{players.length !== 1 ? "s" : ""} registered
          </p>
        </div>

        {players.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-5xl mb-4">👩</div>
            <h2 className="text-xl font-semibold text-gray-700 mb-2">
              No players yet
            </h2>
            <p className="text-gray-500 mb-6">
              Players are added automatically when you enter competition results.
            </p>
            <Link
              href="/competitions/new"
              className="px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors"
            >
              Enter Results
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {players.map((player) => {
              const totalPoints = player.results.reduce(
                (sum, r) => sum + pointsForPlace(r.place, r.competition.topPlaces),
                0
              );
              const topPlacements = player.results.filter((r) => r.place <= r.competition.topPlaces);
              const wins = player.results.filter((r) => r.place === 1).length;

              return (
                <Link
                  key={player.id}
                  href={`/players/${player.id}`}
                  className="block bg-white rounded-xl shadow hover:shadow-md transition-shadow p-6"
                >
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center text-green-700 font-bold text-lg">
                      {player.name[0].toUpperCase()}
                    </div>
                    <div>
                      <h2 className="font-semibold text-gray-900">
                        {player.name}
                      </h2>
                      <p className="text-xs text-gray-500">
                        {player.results.length} competition
                        {player.results.length !== 1 ? "s" : ""}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div>
                      <div className="text-xl font-bold text-green-700">
                        {totalPoints}
                      </div>
                      <div className="text-xs text-gray-500">Points</div>
                    </div>
                    <div>
                      <div className="text-xl font-bold text-yellow-600">
                        {wins}
                      </div>
                      <div className="text-xs text-gray-500">Wins</div>
                    </div>
                    <div>
                      <div className="text-xl font-bold text-blue-600">
                        {topPlacements.length}
                      </div>
                      <div className="text-xs text-gray-500">Top places</div>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
