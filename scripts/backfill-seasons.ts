import { PrismaClient } from '../src/generated/prisma'
import { PrismaLibSql } from '@prisma/adapter-libsql'

const databaseUrl = process.env.DATABASE_URL ?? 'file:./prisma/dev.db'

const adapter = new PrismaLibSql({
  url: databaseUrl,
  authToken: process.env.DATABASE_AUTH_TOKEN,
})

const prisma = new PrismaClient({ adapter })

async function backfill() {
  console.log('Starting backfill of seasons and leagues...')

  // Get all existing competitions
  const competitions = await prisma.competition.findMany({
    orderBy: { date: 'asc' }
  })
  console.log(`Found ${competitions.length} existing competitions`)

  if (competitions.length === 0) {
    console.log('No competitions to backfill. Creating default season and league...')

    // Create default season for current year
    const currentYear = new Date().getFullYear()
    const season = await prisma.season.create({
      data: { year: currentYear }
    })
    console.log(`Created season ${currentYear} (${season.id})`)

    // Create default league in that season
    const league = await prisma.league.create({
      data: {
        name: 'Main League',
        description: 'Default league',
        seasonId: season.id
      }
    })
    console.log(`Created league: ${league.name} (${league.id})`)

    console.log('✅ Setup completed successfully!')
    return
  }

  // Group competitions by year
  const competitionsByYear: Record<number, typeof competitions> = {}
  for (const comp of competitions) {
    const year = new Date(comp.date).getFullYear()
    if (!competitionsByYear[year]) {
      competitionsByYear[year] = []
    }
    competitionsByYear[year].push(comp)
  }

  console.log(`Found competitions in ${Object.keys(competitionsByYear).length} different years`)

  // Create seasons and leagues, then update competitions
  for (const [yearStr, comps] of Object.entries(competitionsByYear)) {
    const year = parseInt(yearStr)
    console.log(`\nProcessing year ${year} with ${comps.length} competitions...`)

    // Create season for this year
    const season = await prisma.season.create({
      data: { year }
    })
    console.log(`  Created season ${year} (${season.id})`)

    // Create a default league in this season
    const league = await prisma.league.create({
      data: {
        name: 'Main League',
        description: 'Legacy competitions migrated from single-league system',
        seasonId: season.id
      }
    })
    console.log(`  Created league: ${league.name} (${league.id})`)

    // Update all competitions in this year
    const compIds = comps.map(c => c.id)
    const result = await prisma.competition.updateMany({
      where: { id: { in: compIds } },
      data: {
        seasonId: season.id,
        leagueId: league.id
      }
    })
    console.log(`  Updated ${result.count} competitions`)
  }

  console.log('\n✅ Backfill completed successfully!')
  console.log(`\nSummary:`)
  console.log(`  - Created ${Object.keys(competitionsByYear).length} seasons`)
  console.log(`  - Created ${Object.keys(competitionsByYear).length} leagues`)
  console.log(`  - Updated ${competitions.length} competitions`)
}

backfill()
  .catch((e) => {
    console.error('❌ Error during backfill:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
