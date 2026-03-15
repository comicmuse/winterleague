import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { pointsForPlace, buildLeagueTable } from "@/lib/scoring";
import ExcelJS from "exceljs";
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

  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Winter League";
  workbook.created = new Date();

  // ── Sheet 1: All Results ──────────────────────────────────────
  const resultsSheet = workbook.addWorksheet("All Results");
  resultsSheet.columns = [
    { header: "Competition", key: "competition", width: 30 },
    { header: "Date",        key: "date",        width: 14 },
    { header: "Player",      key: "player",      width: 22 },
    { header: "Score",       key: "score",       width: 10 },
    { header: "Place",       key: "place",       width: 10 },
    { header: "Points",      key: "points",      width: 10 },
  ];
  // Bold header row
  resultsSheet.getRow(1).font = { bold: true };

  for (const comp of competitions) {
    for (const result of comp.results) {
      resultsSheet.addRow({
        competition: comp.name,
        date: format(new Date(comp.date), "dd/MM/yyyy"),
        player: result.player.name,
        score: result.score,
        place: result.place,
        points: pointsForPlace(result.place, comp.topPlaces),
      });
    }
  }

  // ── Sheet 2: League Table ─────────────────────────────────────
  const leagueInput = competitions.flatMap((comp) =>
    comp.results.map((r) => ({
      playerId: r.playerId,
      playerName: r.player.name,
      place: r.place,
      competitionTopPlaces: comp.topPlaces,
    }))
  );
  const leagueTable = buildLeagueTable(leagueInput);

  const leagueSheet = workbook.addWorksheet("League Table");
  leagueSheet.columns = [
    { header: "Position",     key: "position",    width: 10 },
    { header: "Player",       key: "player",      width: 22 },
    { header: "Total Points", key: "points",      width: 14 },
    { header: "Competitions", key: "played",      width: 14 },
    { header: "1st",          key: "p1",          width: 8  },
    { header: "2nd",          key: "p2",          width: 8  },
    { header: "3rd",          key: "p3",          width: 8  },
    { header: "4th",          key: "p4",          width: 8  },
    { header: "5th",          key: "p5",          width: 8  },
  ];
  leagueSheet.getRow(1).font = { bold: true };

  leagueTable.forEach((entry, i) => {
    leagueSheet.addRow({
      position: i + 1,
      player:   entry.playerName,
      points:   entry.totalPoints,
      played:   entry.competitionsEntered,
      p1: entry.placements[1] ?? 0,
      p2: entry.placements[2] ?? 0,
      p3: entry.placements[3] ?? 0,
      p4: entry.placements[4] ?? 0,
      p5: entry.placements[5] ?? 0,
    });
  });

  // ── Sheet 3: Competitions summary ─────────────────────────────
  const compSheet = workbook.addWorksheet("Competitions");
  compSheet.columns = [
    { header: "Competition", key: "competition", width: 30 },
    { header: "Date",        key: "date",        width: 14 },
    { header: "Top Places",  key: "topPlaces",   width: 12 },
    { header: "Entries",     key: "entries",     width: 10 },
  ];
  compSheet.getRow(1).font = { bold: true };

  for (const comp of competitions) {
    compSheet.addRow({
      competition: comp.name,
      date: format(new Date(comp.date), "dd/MM/yyyy"),
      topPlaces: comp.topPlaces,
      entries: comp.results.length,
    });
  }

  // ── Serialise to buffer ───────────────────────────────────────
  const buffer = await workbook.xlsx.writeBuffer();

  const seasonYear =
    competitions.length > 0
      ? format(new Date(competitions[0].date), "yyyy")
      : new Date().getFullYear();

  return new NextResponse(buffer, {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="winter-league-${seasonYear}.xlsx"`,
    },
  });
}

