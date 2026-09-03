-- ═══════════════════════════════════════════════════════════════════
-- 004 · Trigger para mantener eventos.registrados sincronizado
--
-- El contador `eventos.registrados` nunca se actualizaba al crear un
-- registro en `evento_registros` (el admin siempre mostraba 0 inscritos,
-- y la disponibilidad de cupos en el sitio público tampoco bajaba).
-- Este trigger lo mantiene al día automáticamente, sin depender de que
-- cada endpoint se acuerde de actualizarlo a mano.
--
-- Correr en el SQL Editor de Supabase.
-- ═══════════════════════════════════════════════════════════════════

create or replace function actualizar_registrados_evento()
returns trigger as $$
begin
  if (TG_OP = 'INSERT') then
    update eventos set registrados = registrados + NEW.personas where id = NEW.evento_id;
    return NEW;
  elsif (TG_OP = 'DELETE') then
    update eventos set registrados = greatest(0, registrados - OLD.personas) where id = OLD.evento_id;
    return OLD;
  elsif (TG_OP = 'UPDATE') then
    if (NEW.evento_id = OLD.evento_id) then
      update eventos set registrados = greatest(0, registrados - OLD.personas + NEW.personas) where id = NEW.evento_id;
    else
      update eventos set registrados = greatest(0, registrados - OLD.personas) where id = OLD.evento_id;
      update eventos set registrados = registrados + NEW.personas where id = NEW.evento_id;
    end if;
    return NEW;
  end if;
  return null;
end;
$$ language plpgsql security definer;

drop trigger if exists trg_actualizar_registrados on evento_registros;
create trigger trg_actualizar_registrados
  after insert or update or delete on evento_registros
  for each row execute function actualizar_registrados_evento();

-- Recalcula el contador actual de todos los eventos en base a los registros que ya existen,
-- por si quedó desincronizado (como el caso que motivó este fix).
update eventos e
  set registrados = coalesce((
    select sum(r.personas) from evento_registros r where r.evento_id = e.id
  ), 0);
