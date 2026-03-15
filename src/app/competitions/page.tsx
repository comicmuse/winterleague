import { prisma } from "@/lib/prisma";
import Navbar from "@/components/Navbar";
import Link from "next/link";
import { format } from "date-fns";

export const dynamic = "force-dynamic";

export default async function CompetitionsPage() {
  const competitions = await prisma.competition.findMany({
    orderBy: { date: "desc" },
    include: {
      results: {
        include: { player: true },
        orderBy: { place: "asc" },
      },
    },
  });

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <main className="max-w-6xl mx-auto px-4 py-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Competitions</h1>
            <p className="text-gray-500 mt-1">
              {competitions.length} competition
              {competitions.length !== 1 ? "s" : ""} this season
            </p>
          </div>
          <Link
            href="/competitions/new"
            className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors w-fit"
          >
            ✏️ Enter Results
          </Link>
        </div>

        {competitions.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-5xl mb-4">📋</div>
            <h2 className="text-xl font-semibold text-gray-700 mb-2">
              No competitions yet
            </h2>
            <p className="text-gray-500 mb-6">
              Enter your first competition to get started.
            </p>
            <Link
              href="/competitions/new"
              className="px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors"
            >
              Enter Results
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {competitions.map((comp) => {
              const winner = comp.results.find((r) => r.place === 1);
              return (
                <Link
                  key={comp.id}
                  href={`/competitions/${comp.id}`}
                  className="block bg-white rounded-xl shadow hover:shadow-md transition-shadow p-6"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <h2 className="text-xl font-semibold text-gray-900">
                        {comp.name}
                      </h2>
                      <p className="text-gray-500 text-sm mt-0.5">
                        📅 {format(new Date(comp.date), "EEEE d MMMM yyyy")}
                      </p>
                    </div>
                    <div className="flex gap-4 text-sm">
                      <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full">
                        {comp.results.length} entries
                      </span>
                      <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full">
                        Top {comp.topPlaces}
                      </span>
                    </div>
                  </div>
                  {winner && (
                    <div className="mt-3 text-sm text-gray-600">
                      🥇 Winner:{" "}
                      <span className="font-medium text-green-700">
                        {winner.player.name}
                      </span>{" "}
                      (score: {winner.score})
                    </div>
                  )}
                </Link>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
