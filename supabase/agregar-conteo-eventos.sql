-- El panel Estadísticas contaba eventos trayendo TODAS las filas al cliente
-- (sb.from('eventos').select('*').limit(5000)) y contando en JS. Supabase
-- aplica un tope "Max Rows" a nivel API (1000 por default) que ignora
-- ese .limit(5000) del cliente, así que el conteo quedaba recortado a las
-- primeras/últimas 1000 filas en vez del total real. Se reemplaza por
-- agregación del lado del servidor: cuenta en la base y devuelve solo
-- unas pocas filas (una por tipo/producto), sin importar cuántos eventos haya.
--
-- No son SECURITY DEFINER: corren con los permisos del que llama, así que
-- la policy eventos_admin_lectura (to authenticated using es_admin()) ya
-- filtra sola — un no-admin logueado recibe 0 filas, no un error.

create or replace function public.admin_conteo_eventos()
returns table(tipo text, cantidad bigint)
language sql
stable
as $$
  select tipo, count(*)::bigint as cantidad
  from eventos
  group by tipo;
$$;
grant execute on function public.admin_conteo_eventos() to authenticated;

create or replace function public.admin_top_productos(p_limit int default 6)
returns table(producto_id text, cantidad bigint)
language sql
stable
as $$
  select producto_id, count(*)::bigint as cantidad
  from eventos
  where producto_id is not null and tipo in ('ver_producto', 'add_carrito')
  group by producto_id
  order by cantidad desc
  limit p_limit;
$$;
grant execute on function public.admin_top_productos(int) to authenticated;
