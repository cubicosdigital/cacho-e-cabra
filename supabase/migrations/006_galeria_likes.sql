-- ═══════════════════════════════════════════════════════════════════
-- 006 · Likes en la galería
--
-- Cualquier visitante puede darle "me gusta" (❤️) a una foto o video sin
-- necesitar login. Como es un contador público que cualquiera puede
-- incrementar, no le abrimos UPDATE directo a la tabla: usamos una
-- función con permisos elevados que solo sabe sumar 1 al contador.
--
-- Correr en el SQL Editor de Supabase.
-- ═══════════════════════════════════════════════════════════════════

alter table galeria_items add column if not exists likes integer not null default 0;

create or replace function incrementar_like_galeria(item_id uuid)
returns integer as $$
declare
  nuevo_valor integer;
begin
  update galeria_items set likes = likes + 1
    where id = item_id and activo
    returning likes into nuevo_valor;
  return nuevo_valor;
end;
$$ language plpgsql security definer;

grant execute on function incrementar_like_galeria(uuid) to anon, authenticated;
