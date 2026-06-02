import process from "node:process";
import pg from "pg";

const { Client } = pg;

async function run() {
  const connectionString = process.env.TM_POSTGRES_URL;
  if (!connectionString) {
    throw new Error("TM_POSTGRES_URL is required.");
  }

  const apply = process.argv.includes("--apply");
  const client = new Client({
    connectionString,
    ssl: connectionString.includes("localhost") ? false : { rejectUnauthorized: false },
  });

  await client.connect();

  try {
    const duplicateGroups = await client.query(`
      with ranked as (
        select
          winery_id,
          name,
          active,
          row_number() over (
            partition by lower(name)
            order by updated_at desc nulls last, created_at desc nulls last, winery_id desc
          ) as rank_in_name
        from winery
      )
      select
        name,
        count(*)::int as duplicate_count,
        max(case when rank_in_name = 1 then winery_id::text end) as canonical_winery_id
      from ranked
      group by lower(name), name
      having count(*) > 1
      order by lower(name)
    `);

    if (duplicateGroups.rowCount === 0) {
      process.stdout.write("No duplicate winery-name groups found.\n");
      return;
    }

    process.stdout.write(`Duplicate winery-name groups found: ${duplicateGroups.rowCount}\n`);
    for (const row of duplicateGroups.rows) {
      process.stdout.write(
        `- ${row.name}: ${row.duplicate_count} rows (canonical ${row.canonical_winery_id})\n`,
      );
    }

    const safeCandidates = await client.query(`
      with ranked as (
        select
          winery_id,
          name,
          row_number() over (
            partition by lower(name)
            order by updated_at desc nulls last, created_at desc nulls last, winery_id desc
          ) as rank_in_name
        from winery
      ),
      alias_rows as (
        select winery_id, name
        from ranked
        where rank_in_name > 1
      )
      select
        alias_rows.winery_id::text as winery_id,
        alias_rows.name
      from alias_rows
      left join winery_availability a on a.winery_id = alias_rows.winery_id
      left join winery_contact c on c.winery_id = alias_rows.winery_id
      left join winery_booking_request r on r.winery_id = alias_rows.winery_id
      left join winery_media_asset m on m.winery_id = alias_rows.winery_id
      left join user_account u on u.winery_id = alias_rows.winery_id
      left join booking b on alias_rows.winery_id = any(coalesce(b.preferred_wineries, '{}'::uuid[]))
      where a.winery_id is null
        and c.winery_id is null
        and r.winery_id is null
        and m.winery_id is null
        and u.winery_id is null
        and b.booking_id is null
      order by lower(alias_rows.name), alias_rows.winery_id
    `);

    process.stdout.write(`Safe-to-deactivate duplicate rows: ${safeCandidates.rowCount}\n`);
    for (const row of safeCandidates.rows) {
      process.stdout.write(`  - ${row.name} (${row.winery_id})\n`);
    }

    if (!apply) {
      process.stdout.write("Dry run only. Re-run with --apply to deactivate safe duplicate rows.\n");
      return;
    }

    await client.query("begin");
    const ids = safeCandidates.rows.map((row) => row.winery_id);
    if (ids.length > 0) {
      await client.query(
        `
          update winery
          set active = false, updated_at = now()
          where winery_id = any($1::uuid[])
        `,
        [ids],
      );
    }
    await client.query("commit");
    process.stdout.write(`Deactivated ${ids.length} safe duplicate winery row(s).\n`);
  } catch (error) {
    await client.query("rollback").catch(() => undefined);
    throw error;
  } finally {
    await client.end();
  }
}

run().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = 1;
});
