-- ============================================================
--  Sistema de reseñas de clientes
--  Correr una vez en el SQL Editor de Supabase.
--
--  Flujo: el cliente envía su reseña desde la web (vía la
--  función crear_resena) → queda PENDIENTE (aprobada=false) →
--  Brandon la aprueba desde el panel → recién ahí se muestra
--  en la web. Si además el número de pedido + email coinciden
--  con un pedido real, queda marcada "compra verificada".
-- ============================================================

create table if not exists resenas (
  id           bigint generated always as identity primary key,
  producto_id  text,                       -- opcional: reseña de un modelo puntual
  pedido_id    text,                       -- opcional: para verificar compra real
  nombre       text not null,
  email        text,                       -- no se muestra público; solo verificación
  estrellas    int  not null check (estrellas between 1 and 5),
  texto        text,
  verificada   boolean not null default false,  -- pedido+email coinciden con compra real
  aprobada     boolean not null default false,  -- Brandon la aprobó desde el panel
  creado_en    timestamptz not null default now()
);

create index if not exists idx_resenas_aprobada on resenas (aprobada, creado_en desc);
create index if not exists idx_resenas_producto on resenas (producto_id);

alter table resenas enable row level security;

-- El público solo lee reseñas APROBADAS (el email no viaja: la web pide columnas puntuales).
drop policy if exists resenas_lectura_publica on resenas;
create policy resenas_lectura_publica on resenas
  for select to anon, authenticated using (aprobada = true);

-- Solo el admin ve todas / aprueba / borra.
drop policy if exists resenas_admin_total on resenas;
create policy resenas_admin_total on resenas
  for all to authenticated using (es_admin()) with check (es_admin());

-- El alta pública va SOLO por esta función (security definer):
-- así nadie puede insertarse una reseña ya aprobada o "verificada" a mano.
create or replace function crear_resena(
  p_producto_id text,
  p_pedido_id   text,
  p_nombre      text,
  p_email       text,
  p_estrellas   int,
  p_texto       text
) returns json
language plpgsql security definer
set search_path = public as $$
declare
  v_verificada boolean := false;
begin
  if coalesce(trim(p_nombre), '') = '' then
    return json_build_object('ok', false, 'error', 'nombre');
  end if;
  if p_estrellas is null or p_estrellas < 1 or p_estrellas > 5 then
    return json_build_object('ok', false, 'error', 'estrellas');
  end if;
  if char_length(coalesce(p_texto, '')) > 600 then
    return json_build_object('ok', false, 'error', 'texto_largo');
  end if;

  -- ¿El pedido + email coinciden con una compra real? → compra verificada
  if coalesce(trim(p_pedido_id), '') <> '' and coalesce(trim(p_email), '') <> '' then
    select exists (
      select 1 from pedidos p
      where p.id = trim(p_pedido_id)
        and lower(p.cliente_email) = lower(trim(p_email))
    ) into v_verificada;
  end if;

  insert into resenas (producto_id, pedido_id, nombre, email, estrellas, texto, verificada, aprobada)
  values (
    nullif(trim(coalesce(p_producto_id, '')), ''),
    nullif(trim(coalesce(p_pedido_id, '')), ''),
    trim(p_nombre),
    nullif(trim(coalesce(p_email, '')), ''),
    p_estrellas,
    nullif(trim(coalesce(p_texto, '')), ''),
    v_verificada,
    false
  );

  return json_build_object('ok', true, 'verificada', v_verificada);
end $$;

grant execute on function crear_resena(text, text, text, text, int, text) to anon, authenticated;
