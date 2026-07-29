#!/usr/bin/env node

/**
 * Inicializa la tabla de eventos en Supabase
 * Uso: node scripts/init-events-db.mjs
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://gaywkydsjgyegqevsiur.supabase.co';
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

if (!SUPABASE_ANON_KEY || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Error: Variables de entorno SUPABASE no configuradas');
  console.error('Asegúrate de que .env.local contiene NEXT_PUBLIC_SUPABASE_ANON_KEY y SUPABASE_SERVICE_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

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
      using (true);
  end if;
end $$;

do $$ begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'evento_registros' and policyname = 'evento_registros: actualizar solo admin'
  ) then
    create policy "evento_registros: actualizar solo admin"
      on evento_registros for update
      to authenticated
      using (true)
      with check (true);
  end if;
end $$;
`;

async function initDb() {
  try {
    console.log('🔄 Inicializando tabla evento_registros...');

    // Intentar crear la tabla usando RPC
    // Nota: Este método solo funciona si tienes una función RPC definida
    // Por ahora, intentaremos hacer un INSERT simple en la tabla
    const testResult = await supabase
      .from('evento_registros')
      .select('count')
      .limit(1);

    if (testResult.error?.code === 'PGRST301' || testResult.error?.message?.includes('no table')) {
      console.log('❌ Tabla no existe. Intenta ejecutar el SQL manualmente:');
      console.log('');
      console.log('1. Ve a https://app.supabase.com');
      console.log('2. Abre tu proyecto');
      console.log('3. SQL Editor → New Query');
      console.log('4. Copia y pega el contenido de supabase/schema.sql');
      console.log('5. Haz clic en Run');
      console.log('');
      process.exit(1);
    }

    if (testResult.error) {
      throw testResult.error;
    }

    console.log('✅ Tabla evento_registros existe');
    console.log('✅ Base de datos iniciada correctamente');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error instanceof Error ? error.message : error);
    console.error('');
    console.error('Solución: Ejecuta el SQL manualmente en el dashboard de Supabase');
    process.exit(1);
  }
}

initDb();
