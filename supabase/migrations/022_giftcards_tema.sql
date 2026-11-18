-- ═══════════════════════════════════════════════════════════════════
-- 022 · Gift cards con tema (clásica / navideña)
--
-- Agrega `tema` a cada gift card: 'clasico' (el diseño de siempre) o
-- 'navidad' (campaña de fin de año). Las que ya existen quedan como 'clasico'.
--
-- También se reemplaza la función crear_giftcards para que reciba el tema.
-- El parámetro nuevo es opcional, así que quien la llame sin él sigue creando
-- gift cards clásicas.
--
-- Correr en el SQL Editor de Supabase, DESPUÉS de 021_giftcards_lote_correlativo.sql.
-- ═══════════════════════════════════════════════════════════════════

alter table giftcards add column if not exists tema text not null default 'clasico';

alter table giftcards drop constraint if exists giftcards_tema_check;
alter table giftcards add constraint giftcards_tema_check check (tema in ('clasico', 'navidad'));

drop function if exists crear_giftcards(integer, text, integer, text, text, text, date, text);

create or replace function crear_giftcards(
  p_cantidad   integer,
  p_tipo       text,
  p_valor      integer,
  p_mensaje    text,
  p_para       text,
  p_telefono   text,
  p_vence      date,
  p_creada_por text,
  p_tema       text default 'clasico'
) returns setof giftcards
language plpgsql
as $$
declare
  v_lote uuid := case when p_cantidad > 1 then gen_random_uuid() else null end;
begin
  if p_cantidad < 1 or p_cantidad > 100 then
    raise exception 'La cantidad debe estar entre 1 y 100';
  end if;

  -- Una tanda a la vez: los números de un lote quedan siempre seguidos.
  perform pg_advisory_xact_lock(hashtext('giftcards_codigo'));

  return query
    with nuevas as (
      insert into giftcards (codigo, tipo, valor, mensaje, para, telefono, vence, creada_por, lote, tema)
      select lpad(nextval('giftcards_codigo_seq')::text, 6, '0'),
             p_tipo, p_valor, p_mensaje, p_para, p_telefono, p_vence, p_creada_por, v_lote, p_tema
      from generate_series(1, p_cantidad)
      returning *
    )
    select * from nuevas order by codigo;
end;
$$;

revoke all on function crear_giftcards(integer, text, integer, text, text, text, date, text, text) from public, anon, authenticated;
grant execute on function crear_giftcards(integer, text, integer, text, text, text, date, text, text) to service_role;
