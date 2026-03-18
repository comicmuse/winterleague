import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { pointsForPlace, buildLeagueTable } from "@/lib/scoring";
import ExcelJS from "exceljs";
import { format } from "date-fns";

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const seasonId = searchParams.get("seasonId");

  // Get season info for filename
  let seasonYear = new Date().getFullYear();
  if (seasonId) {
    const season = await prisma.season.findUnique({
      where: { id: seasonId },
    });
    if (season) {
      seasonYear = season.year;
    }
  }

  // Build where clause
  const where = seasonId ? { seasonId } : {};

  // Fetch all data
  const competitions = await prisma.competition.findMany({
    where,
    orderBy: { date: "asc" },
    include: {
      results: {
        include: { player: true },
        orderBy: { place: "asc" },
      },
      season: true,
      league: {
        include: { season: true },
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
    { header: "League",      key: "league",      width: 20 },
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
        competition: comp.name || format(new Date(comp.date), "dd/MM/yyyy"),
        date: format(new Date(comp.date), "dd/MM/yyyy"),
        league: comp.league.name,
        player: result.player.name,
        score: result.score,
        place: result.place,
        points: pointsForPlace(result.place, comp.topPlaces),
      });
    }
  }

  // ── Group competitions by league ──────────────────────────────
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

  // ── Create one league table sheet per league ──────────────────
  for (const [leagueId, { leagueName, competitions: leagueComps }] of Object.entries(
    competitionsByLeague
  )) {
    const leagueInput = leagueComps.flatMap((comp) =>
      comp.results.map((r) => ({
        playerId: r.playerId,
        playerName: r.player.name,
        place: r.place,
        competitionTopPlaces: comp.topPlaces,
      }))
    );
    const leagueTable = buildLeagueTable(leagueInput);

    // Determine max top places for this league
    const maxTopPlaces = Math.max(
      ...leagueComps.map((c) => c.topPlaces),
      5
    );

    const leagueSheet = workbook.addWorksheet(`${leagueName} Table`);
    const columns: Partial<ExcelJS.Column>[] = [
      { header: "Position",     key: "position",    width: 10 },
      { header: "Player",       key: "player",      width: 22 },
      { header: "Total Points", key: "points",      width: 14 },
      { header: "Competitions", key: "played",      width: 14 },
    ];

    // Add placement columns dynamically
    for (let i = 1; i <= maxTopPlaces; i++) {
      columns.push({
        header: `${i}${i === 1 ? "st" : i === 2 ? "nd" : i === 3 ? "rd" : "th"}`,
        key: `p${i}`,
        width: 8,
      });
    }

    leagueSheet.columns = columns;
    leagueSheet.getRow(1).font = { bold: true };

    leagueTable.forEach((entry, i) => {
      const row: any = {
        position: i + 1,
        player:   entry.playerName,
        points:   entry.totalPoints,
        played:   entry.competitionsEntered,
      };

      // Add placements
      for (let p = 1; p <= maxTopPlaces; p++) {
        row[`p${p}`] = entry.placements[p] ?? 0;
      }

      leagueSheet.addRow(row);
    });
  }

  // ── Sheet N: Competitions summary ─────────────────────────────
  const compSheet = workbook.addWorksheet("Competitions");
  compSheet.columns = [
    { header: "Competition", key: "competition", width: 30 },
    { header: "Date",        key: "date",        width: 14 },
    { header: "League",      key: "league",      width: 20 },
    { header: "Top Places",  key: "topPlaces",   width: 12 },
    { header: "Entries",     key: "entries",     width: 10 },
  ];
  compSheet.getRow(1).font = { bold: true };

  for (const comp of competitions) {
    compSheet.addRow({
      competition: comp.name || format(new Date(comp.date), "dd/MM/yyyy"),
      date: format(new Date(comp.date), "dd/MM/yyyy"),
      league: comp.league.name,
      topPlaces: comp.topPlaces,
      entries: comp.results.length,
    });
  }

  // ── Serialise to buffer ───────────────────────────────────────
  const buffer = await workbook.xlsx.writeBuffer();

  return new NextResponse(buffer, {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="winter-league-${seasonYear}.xlsx"`,
    },
  });
}

