# Inicializar Base de Datos para Eventos

Para que la sección de eventos funcione, necesitas crear la tabla `evento_registros` en Supabase.

## Opción 1: Usando el Dashboard de Supabase (Recomendado)

1. Abre tu proyecto en [Supabase Dashboard](https://app.supabase.com)
2. Ve a **SQL Editor** → **New Query**
3. Copia y pega el SQL de abajo
4. Haz clic en **Run**

## Opción 2: Usando tu Terminal

Si tienes `psql` instalado:

```bash
psql "postgresql://postgres:[PASSWORD]@db.gaywkydsjgyegqevsiur.supabase.co:5432/postgres" < supabase/schema.sql
```

Reemplaza `[PASSWORD]` con tu contraseña de Supabase.

## SQL para ejecutar:

```sql
-- Crear tabla de registros a eventos
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

-- Habilitar RLS
alter table evento_registros enable row level security;

-- Política: permitir que cualquiera cree un registro
create policy "evento_registros: crear publico"
  on evento_registros for insert
  to anon, authenticated
  with check (true);

-- Política: solo admin puede leer
create policy "evento_registros: leer solo admin"
  on evento_registros for select
  to authenticated
  using (
    exists (
      select 1 from usuarios_admin
      where email = auth.jwt() ->> 'email' and rol = 'admin' and activo
    )
  );

-- Política: solo admin puede actualizar
create policy "evento_registros: actualizar solo admin"
  on evento_registros for update
  to authenticated
  using (
    exists (
      select 1 from usuarios_admin
      where email = auth.jwt() ->> 'email' and rol = 'admin' and activo
    )
  )
  with check (
    exists (
      select 1 from usuarios_admin
      where email = auth.jwt() ->> 'email' and rol = 'admin' and activo
    )
  );
```

## Verificar que funcionó

Una vez ejecutado el SQL, puedes verificar que la tabla existe:

```sql
select * from evento_registros limit 1;
```

Deberías ver una tabla vacía sin errores.

## Problema: "Table evento_registros does not exist"

Si ves este error al intentar registrarse en un evento, significa que el SQL aún no se ha ejecutado. Sigue los pasos de arriba.
