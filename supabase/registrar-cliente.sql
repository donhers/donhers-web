-- ============================================================
--  Registrar al COMPRADOR en la tabla clientes
-- ============================================================
--  Diagnóstico (13/08/2026): el checkout se compra como invitado
--  (no hace falta cuenta), pero `clientes` solo se llenaba desde
--  el registro de usuario. Resultado: quien compraba sin crear
--  cuenta no aparecía nunca en la solapa "Clientes" del panel —
--  sus datos quedaban únicamente dentro del JSON datos_envio del
--  pedido. Brandon no tenía lista de compradores para recontactar.
--
--  Además el insert directo permitía repetidos: el mismo mail
--  entraba una fila por cada vez.
--
--  Fix: una función (security definer) que da de alta al cliente
--  y, si el mail ya existe, completa los datos que falten en vez
--  de duplicar la fila. El alta pública pasa SOLO por acá.
--  Correr una vez en el SQL Editor de Supabase.
-- ============================================================

-- 1) Limpiar lo que ya está repetido: nos quedamos con la fila más vieja
--    de cada mail y le pasamos los datos que tenga la más nueva.
with ranking as (
  select id, lower(trim(email)) as mail,
         row_number() over (partition by lower(trim(email)) order by creado_en) as pos
  from clientes
),
datos as (
  select r.mail,
         max(c.nombre)   filter (where c.nombre   is not null and c.nombre   <> '') as nombre,
         max(c.telefono) filter (where c.telefono is not null and c.telefono <> '') as telefono
  from ranking r join clientes c on c.id = r.id
  group by r.mail
)
update clientes c set
  nombre   = coalesce(nullif(c.nombre, ''),   d.nombre),
  telefono = coalesce(nullif(c.telefono, ''), d.telefono)
from ranking r join datos d on d.mail = r.mail
where c.id = r.id and r.pos = 1;

delete from clientes c
using (
  select id, row_number() over (partition by lower(trim(email)) order by creado_en) as pos
  from clientes
) r
where c.id = r.id and r.pos > 1;

-- 2) Un mail = un cliente, de acá en adelante.
create unique index if not exists idx_clientes_email_unico on clientes (lower(trim(email)));

-- 3) Alta/actualización del comprador.
--    Nunca pisa un dato bueno con uno vacío: solo completa lo que falta.
create or replace function registrar_cliente(
  p_email    text,
  p_nombre   text,
  p_telefono text
) returns json
language plpgsql security definer
set search_path = public as $$
declare
  v_mail text := lower(trim(coalesce(p_email, '')));
begin
  -- Sin mail no hay cliente que registrar (el checkout lo exige igual).
  if v_mail = '' or position('@' in v_mail) = 0 then
    return json_build_object('ok', false, 'error', 'email');
  end if;

  insert into clientes (email, nombre, telefono)
  values (v_mail,
          nullif(trim(coalesce(p_nombre, '')), ''),
          nullif(trim(coalesce(p_telefono, '')), ''))
  on conflict (lower(trim(email))) do update set
    nombre   = coalesce(nullif(clientes.nombre, ''),   excluded.nombre),
    telefono = coalesce(nullif(clientes.telefono, ''), excluded.telefono);

  return json_build_object('ok', true);
end $$;

grant execute on function registrar_cliente(text, text, text) to anon, authenticated;
