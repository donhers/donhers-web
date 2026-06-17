-- ============================================================
--  Almacenamiento de fotos de productos (Supabase Storage)
--  Crea el bucket público "productos" y sus permisos:
--  cualquiera ve las fotos; solo admins suben/editan/borran.
--  Correr una vez en el SQL Editor (después de seguridad-admin.sql).
-- ============================================================
insert into storage.buckets (id, name, public)
values ('productos', 'productos', true)
on conflict (id) do nothing;

drop policy if exists "prod_storage_lectura" on storage.objects;
create policy "prod_storage_lectura" on storage.objects
  for select using (bucket_id = 'productos');

drop policy if exists "prod_storage_admin_insert" on storage.objects;
create policy "prod_storage_admin_insert" on storage.objects
  for insert to authenticated with check (bucket_id = 'productos' and es_admin());

drop policy if exists "prod_storage_admin_update" on storage.objects;
create policy "prod_storage_admin_update" on storage.objects
  for update to authenticated using (bucket_id = 'productos' and es_admin());

drop policy if exists "prod_storage_admin_delete" on storage.objects;
create policy "prod_storage_admin_delete" on storage.objects
  for delete to authenticated using (bucket_id = 'productos' and es_admin());
