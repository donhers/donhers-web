-- ============================================================
--  FIX CRÍTICO: compradores logueados no podían crear pedidos
-- ============================================================
--  Diagnóstico (04/07/2026): al agregar el login real de
--  compradores, las políticas de INSERT en pedidos/pedido_items/
--  clientes/eventos quedaron limitadas al rol "anon" (invitado).
--  Un comprador logueado pasa a ser rol "authenticated" y no
--  tenía ninguna política que le permitiera escribir → Supabase
--  rechazaba el insert por Row Level Security, en silencio (la
--  web seguía mostrando "¡Pedido registrado!" porque el pedido
--  quedaba guardado solo en el navegador del cliente, nunca en
--  la base). Por eso no aparecían pedidos, comisión ni datos de
--  compradores logueados en el panel.
--
--  Fix: las mismas 4 políticas ahora habilitan también el rol
--  "authenticated", además de "anon". Correr una vez en el
--  SQL Editor de Supabase.
-- ============================================================

drop policy if exists "pedidos_insert_publico" on pedidos;
create policy "pedidos_insert_publico" on pedidos
  for insert to anon, authenticated with check (true);

drop policy if exists "items_insert_publico" on pedido_items;
create policy "items_insert_publico" on pedido_items
  for insert to anon, authenticated with check (true);

drop policy if exists "clientes_insert_publico" on clientes;
create policy "clientes_insert_publico" on clientes
  for insert to anon, authenticated with check (true);

drop policy if exists "eventos_insert_publico" on eventos;
create policy "eventos_insert_publico" on eventos
  for insert to anon, authenticated with check (true);

-- ---------- LIMPIEZA DE PRUEBAS DE DIAGNÓSTICO ----------
-- Filas de prueba que inserté yo mismo (Claude) para reproducir el bug.
-- Podés borrar este bloque si preferís revisarlas antes.
delete from pedidos where id like 'TEST-DIAG-%';

-- Además: borrá manualmente el usuario de prueba que creé para el diagnóstico
-- (Authentication → Users → buscar "diag-rls-test@donhers-diag.com" → Delete user).
-- No lo borro yo por acá: borrar usuarios de Auth requiere la clave service_role,
-- que nunca ponemos en este repo por seguridad.
