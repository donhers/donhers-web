-- ============================================================
--  Seguridad: separar ADMIN de COMPRADOR
--  Con el login real, los compradores también son "authenticated".
--  Estas policies hacen que SOLO los emails de la tabla `admins`
--  accedan al panel (pedidos, clientes, productos, eventos).
--  Correr una vez en el SQL Editor.
-- ============================================================

-- Lista de administradores (agregá acá los mails que pueden entrar al panel)
create table if not exists admins (email text primary key);
alter table admins enable row level security;  -- nadie la lee desde el cliente
insert into admins(email) values ('donhers.imp@gmail.com') on conflict do nothing;

-- ¿El usuario logueado es admin? (usa el email del token)
create or replace function es_admin() returns boolean
language sql security definer stable set search_path = public as $$
  select exists (
    select 1 from admins a
    where lower(a.email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  );
$$;
grant execute on function es_admin() to anon, authenticated;

-- Recrear las policies de admin para que exijan es_admin() (antes: cualquier authenticated)
drop policy if exists productos_admin_total on productos;
create policy productos_admin_total on productos for all to authenticated
  using (es_admin()) with check (es_admin());

drop policy if exists pedidos_admin_lectura on pedidos;
create policy pedidos_admin_lectura on pedidos for select to authenticated using (es_admin());
drop policy if exists pedidos_admin_update on pedidos;
create policy pedidos_admin_update on pedidos for update to authenticated
  using (es_admin()) with check (es_admin());

drop policy if exists items_admin_lectura on pedido_items;
create policy items_admin_lectura on pedido_items for select to authenticated using (es_admin());

drop policy if exists clientes_admin_lectura on clientes;
create policy clientes_admin_lectura on clientes for select to authenticated using (es_admin());

drop policy if exists eventos_admin_lectura on eventos;
create policy eventos_admin_lectura on eventos for select to authenticated using (es_admin());
