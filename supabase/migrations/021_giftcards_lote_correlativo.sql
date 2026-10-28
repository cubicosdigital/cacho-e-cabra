-- ═══════════════════════════════════════════════════════════════════
-- 021 · Gift cards por lote, con código numérico correlativo
--
-- Ahora el código de cada gift card es un número correlativo de 6 dígitos
-- (000001, 000002, …) y se pueden crear varias de una vez. Las de una misma
-- tanda comparten `lote` y salen con números seguidos.
--
-- Los números los asigna la base, dentro de una función con candado: así dos
-- personas generando a la vez no se mezclan los números de una tanda.
--
-- Correr en el SQL Editor de Supabase, DESPUÉS de 020_giftcards.sql.
-- ═══════════════════════════════════════════════════════════════════

alter table giftcards add column if not exists lote uuid;
create index if not exists giftcards_lote_idx on giftcards (lote) where lote is not null;

create sequence if not exists giftcards_codigo_seq;

create or replace function crear_giftcards(
  p_cantidad   integer,
  p_tipo       text,
  p_valor      integer,
  p_mensaje    text,
  p_para       text,
  p_telefono   text,
  p_vence      date,
  p_creada_por text
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
      insert into giftcards (codigo, tipo, valor, mensaje, para, telefono, vence, creada_por, lote)
      select lpad(nextval('giftcards_codigo_seq')::text, 6, '0'),
             p_tipo, p_valor, p_mensaje, p_para, p_telefono, p_vence, p_creada_por, v_lote
      from generate_series(1, p_cantidad)
      returning *
    )
    select * from nuevas order by codigo;
end;
$$;

-- Solo el servidor (service_role) puede crear gift cards: nadie desde el navegador,
-- aunque tenga la llave pública.
revoke all on function crear_giftcards(integer, text, integer, text, text, text, date, text) from public, anon, authenticated;
grant execute on function crear_giftcards(integer, text, integer, text, text, text, date, text) to service_role;
