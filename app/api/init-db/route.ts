import { NextResponse } from 'next/server';

const SQL = `
create table if not exists evento_registros (
  id               uuid primary key default gen_random_uuid(),
  nombre           text not null,
  email            text not null,
  telefono         text not null,
  personas         integer not null default 1,
  evento_id        text not null,
  fecha_registro   timestamptz not null default now(),
  confirmado       boolean not null default false,
  created_at       timestamptz not null default now()
);

alter table evento_registros enable row level security;

do $$ begin
  if not exists (select 1 from information_schema.constraint_column_usage where table_name='evento_registros' and constraint_name='evento_registros_pkey') then
    alter table evento_registros drop constraint if exists evento_registros_pkey cascade;
    alter table evento_registros add primary key (id);
  end if;
end $$;

do $$ begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'evento_registros' and policyname = 'evento_registros: crear publico'
  ) then
    create policy "evento_registros: crear publico"
      on evento_registros for insert
      to anon, authenticated
      with check (true);
  end if;
end $$;

do $$ begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'evento_registros' and policyname = 'evento_registros: leer solo admin'
  ) then
    create policy "evento_registros: leer solo admin"
      on evento_registros for select
      to authenticated
      using (
        exists (
          select 1 from usuarios_admin
          where email = auth.jwt() ->> 'email' and rol = 'admin' and activo
        )
      );
  end if;
end $$;
`;

export async function GET(request: Request) {
  const url = new URL(request.url);
  const adminKey = url.searchParams.get('key');

  // Safety check: only allow with correct admin key
  if (adminKey !== process.env.SUPABASE_SERVICE_KEY?.slice(-10)) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  try {
    // Use node-postgres to execute raw SQL
    const pg = require('pg');
    const { Client } = pg;

    const connectionString = `postgresql://postgres:[password]@db.gaywkydsjgyegqevsiur.supabase.co:5432/postgres`;

    // Note: This approach won't work without credentials
    // Better approach: use Supabase Admin API or direct database connection

    return NextResponse.json({
      error: 'Use Supabase dashboard to run the SQL manually',
      sql: SQL
    }, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
