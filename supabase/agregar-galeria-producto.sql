-- ============================================================
--  Galería de producto + descripción (Donher's)
--  Agrega soporte de VARIAS imágenes por producto y usa la
--  descripción (la columna 'descripcion' ya existía).
--  Aditivo: NO rompe nada. img_url sigue siendo la portada.
--  Correr una vez en el SQL Editor de Supabase.
-- ============================================================

-- Array de URLs de las fotos del modelo (galería). [] = sin galería → cae a img_url.
alter table productos add column if not exists imagenes jsonb not null default '[]'::jsonb;

-- 'descripcion' ya existe en el schema; nada que crear.
-- (Opcional) sembrar imagenes con la portada actual para los que ya tienen foto:
update productos set imagenes = jsonb_build_array(img_url)
where (imagenes is null or imagenes = '[]'::jsonb) and img_url is not null and img_url <> '';
