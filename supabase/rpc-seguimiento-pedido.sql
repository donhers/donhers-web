-- ============================================================
--  Seguimiento de pedido para el COMPRADOR (sin login)
--  Devuelve el estado de un pedido solo si coinciden número + email.
--  SECURITY DEFINER: salta RLS pero NO expone la tabla (filtra por id+email
--  que solo conoce el dueño del pedido). Correr una vez en el SQL Editor.
-- ============================================================
create or replace function seguimiento_pedido(p_id text, p_email text)
returns table (id text, estado text, total integer, creado_en timestamptz, actualizado_en timestamptz)
language sql
security definer
set search_path = public
as $$
  select p.id, p.estado, p.total, p.creado_en, p.actualizado_en
  from pedidos p
  where p.id = p_id
    and lower(p.cliente_email) = lower(p_email)
  limit 1;
$$;

grant execute on function seguimiento_pedido(text, text) to anon, authenticated;
