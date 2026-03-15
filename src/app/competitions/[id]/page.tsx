import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Navbar from "@/components/Navbar";
import Link from "next/link";
import { format } from "date-fns";
import { pointsForPlace } from "@/lib/scoring";
import DeleteCompetitionButton from "./DeleteCompetitionButton";

function ordinal(n: number): string {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

export default async function CompetitionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const competition = await prisma.competition.findUnique({
    where: { id },
    include: {
      results: {
        include: { player: true },
        orderBy: { place: "asc" },
      },
    },
  });

  if (!competition) notFound();

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <main className="max-w-4xl mx-auto px-4 py-8">
        <div className="mb-6">
          <Link
            href="/competitions"
            className="text-green-700 hover:underline text-sm"
          >
            ← Back to competitions
          </Link>
        </div>

        <div className="bg-white rounded-xl shadow p-6 mb-6">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                {competition.name}
              </h1>
              <p className="text-gray-500 mt-1">
                📅 {format(new Date(competition.date), "EEEE d MMMM yyyy")}
              </p>
              <div className="flex gap-3 mt-2">
                <span className="text-sm bg-green-100 text-green-800 px-3 py-1 rounded-full">
                  {competition.results.length} entries
                </span>
                <span className="text-sm bg-blue-100 text-blue-800 px-3 py-1 rounded-full">
                  Top {competition.topPlaces} score points
                </span>
              </div>
            </div>
            <DeleteCompetitionButton id={competition.id} />
          </div>
        </div>

        {/* Results table */}
        <div className="bg-white rounded-xl shadow overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="text-lg font-semibold text-gray-800">Results</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 text-sm text-gray-600 border-b border-gray-100">
                  <th className="px-6 py-3 text-left font-semibold">Place</th>
                  <th className="px-6 py-3 text-left font-semibold">Player</th>
                  <th className="px-6 py-3 text-center font-semibold">Score</th>
                  <th className="px-6 py-3 text-center font-semibold">
                    Points Earned
                  </th>
                </tr>
              </thead>
              <tbody>
                {competition.results.map((result) => {
                  const pts = pointsForPlace(
                    result.place,
                    competition.topPlaces
                  );
                  return (
                    <tr
                      key={result.id}
                      className="border-t border-gray-100 hover:bg-gray-50"
                    >
                      <td className="px-6 py-3">
                        <span
                          className={`font-semibold ${
                            result.place === 1
                              ? "text-yellow-600"
                              : result.place === 2
                              ? "text-gray-500"
                              : result.place === 3
                              ? "text-orange-600"
                              : "text-gray-700"
                          }`}
                        >
                          {result.place === 1
                            ? "🥇"
                            : result.place === 2
                            ? "🥈"
                            : result.place === 3
                            ? "🥉"
                            : ""}{" "}
                          {ordinal(result.place)}
                        </span>
                      </td>
                      <td className="px-6 py-3">
                        <Link
                          href={`/players/${result.playerId}`}
                          className="text-green-700 hover:text-green-900 hover:underline font-medium"
                        >
                          {result.player.name}
                        </Link>
                      </td>
                      <td className="px-6 py-3 text-center text-gray-700">
                        {result.score}
                      </td>
                      <td className="px-6 py-3 text-center">
                        {pts > 0 ? (
                          <span className="bg-green-100 text-green-800 font-bold px-3 py-1 rounded-full text-sm">
                            {pts} pt{pts !== 1 ? "s" : ""}
                          </span>
                        ) : (
                          <span className="text-gray-400 text-sm">–</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}
