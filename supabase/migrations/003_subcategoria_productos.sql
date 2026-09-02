-- ═══════════════════════════════════════════════════════════════════
-- 003 · Subcategorías de productos (para agrupar la carta con banners)
--
-- Agrega `subcategoria` a productos, usada solo para agrupar visualmente
-- en /carta (ej. "Papas", "Pizzas"). No reemplaza `categoria`, que sigue
-- controlando las pestañas (Comida / Tragos / Cafetería).
--
-- Correr en el SQL Editor de Supabase.
-- ═══════════════════════════════════════════════════════════════════

alter table productos
  add column if not exists subcategoria text;
