import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { pointsForPlace, buildLeagueTable } from "@/lib/scoring";
import * as XLSX from "xlsx";
import { format } from "date-fns";

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Fetch all data
  const competitions = await prisma.competition.findMany({
    orderBy: { date: "asc" },
    include: {
      results: {
        include: { player: true },
        orderBy: { place: "asc" },
      },
    },
  });

  const workbook = XLSX.utils.book_new();

  // Sheet 1: All Results
  const resultsRows: (string | number)[][] = [
    ["Competition", "Date", "Player", "Score", "Place", "Points"],
  ];
  for (const comp of competitions) {
    for (const result of comp.results) {
      resultsRows.push([
        comp.name,
        format(new Date(comp.date), "dd/MM/yyyy"),
        result.player.name,
        result.score,
        result.place,
        pointsForPlace(result.place, comp.topPlaces),
      ]);
    }
  }
  const resultsSheet = XLSX.utils.aoa_to_sheet(resultsRows);
  XLSX.utils.book_append_sheet(workbook, resultsSheet, "All Results");

  // Sheet 2: League Table
  const leagueInput = competitions.flatMap((comp) =>
    comp.results.map((r) => ({
      playerId: r.playerId,
      playerName: r.player.name,
      place: r.place,
      competitionTopPlaces: comp.topPlaces,
    }))
  );
  const leagueTable = buildLeagueTable(leagueInput);

  const leagueRows: (string | number)[][] = [
    ["Position", "Player", "Total Points", "Competitions", "1st", "2nd", "3rd", "4th", "5th"],
  ];
  leagueTable.forEach((entry, i) => {
    leagueRows.push([
      i + 1,
      entry.playerName,
      entry.totalPoints,
      entry.competitionsEntered,
      entry.placements[1] ?? 0,
      entry.placements[2] ?? 0,
      entry.placements[3] ?? 0,
      entry.placements[4] ?? 0,
      entry.placements[5] ?? 0,
    ]);
  });
  const leagueSheet = XLSX.utils.aoa_to_sheet(leagueRows);
  XLSX.utils.book_append_sheet(workbook, leagueSheet, "League Table");

  // Sheet 3: Per competition summary
  const compSummaryRows: (string | number)[][] = [["Competition", "Date", "Top Places", "Entries"]];
  for (const comp of competitions) {
    compSummaryRows.push([
      comp.name,
      format(new Date(comp.date), "dd/MM/yyyy"),
      comp.topPlaces,
      comp.results.length,
    ]);
  }
  const compSheet = XLSX.utils.aoa_to_sheet(compSummaryRows);
  XLSX.utils.book_append_sheet(workbook, compSheet, "Competitions");

  // Generate buffer
  const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });

  const seasonYear = competitions.length > 0
    ? format(new Date(competitions[0].date), "yyyy")
    : new Date().getFullYear();

  return new NextResponse(buffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="winter-league-${seasonYear}.xlsx"`,
    },
  });
}
