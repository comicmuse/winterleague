import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

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

  if (!competition) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json(competition);
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  await prisma.competition.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
