-- ============================================================
--  Donher's — Esquema de base de datos (Supabase / PostgreSQL)
--  Panel interno + backend de la tienda.
--  Correr UNA VEZ en el SQL Editor de Supabase (proyecto nuevo).
-- ============================================================
--  Seguridad (RLS): el público (clave anónima) solo puede:
--    - LEER productos activos
--    - CREAR su propio pedido / cliente / evento
--  Solo un usuario logueado (admin, vía Supabase Auth) puede
--  ver y gestionar pedidos, clientes, métricas y catálogo.
-- ============================================================

-- ---------- PRODUCTOS ----------
create table if not exists productos (
  id          text primary key,              -- código del modelo, ej: DON0001
  nombre      text not null,
  precio      integer not null default 0,    -- en UYU, entero
  categoria   text,                          -- caballeros | damas
  descripcion text,
  img_url     text,                          -- ruta/URL de la foto
  wa_link     text,                          -- link directo de WhatsApp del modelo
  stock       integer,                       -- null = sin control de stock
  activo      boolean not null default true, -- false = oculto en la web
  orden       integer not null default 0,    -- para ordenar la galería
  creado_en   timestamptz not null default now()
);

-- ---------- CLIENTES ----------
-- Compradores que se registran en la web (no son usuarios de Supabase Auth).
create table if not exists clientes (
  id         uuid primary key default gen_random_uuid(),
  email      text not null,
  nombre     text,
  telefono   text,
  creado_en  timestamptz not null default now()
);
create index if not exists idx_clientes_email on clientes (email);

-- ---------- PEDIDOS ----------
create table if not exists pedidos (
  id            text primary key,            -- genOrderId de la web
  cliente_email text,
  cliente_nombre text,
  total         integer not null default 0,
  estado        text not null default 'pendiente_pago',
                -- pendiente_pago | confirmado | en_preparacion | enviado | entregado | cancelado
  metodo_pago   text,                        -- mercadopago | transferencia
  datos_envio   jsonb,                       -- nombre, telefono, direccion, metodo de envio...
  creado_en     timestamptz not null default now(),
  actualizado_en timestamptz not null default now()
);
create index if not exists idx_pedidos_estado on pedidos (estado);
create index if not exists idx_pedidos_creado on pedidos (creado_en desc);

-- ---------- ITEMS DE PEDIDO ----------
-- Una fila por producto dentro de un pedido (permite métricas de "más vendidos").
create table if not exists pedido_items (
  id          bigint generated always as identity primary key,
  pedido_id   text not null references pedidos(id) on delete cascade,
  producto_id text,
  nombre      text not null,
  precio      integer not null default 0,
  qty         integer not null default 1
);
create index if not exists idx_pedido_items_pedido on pedido_items (pedido_id);

-- ---------- EVENTOS (instrumentación / métricas) ----------
create table if not exists eventos (
  id          bigint generated always as identity primary key,
  tipo        text not null,                 -- visita | ver_producto | add_carrito | checkout | click_whatsapp
  producto_id text,
  session_id  text,                          -- id anónimo del visitante (localStorage)
  path        text,
  meta        jsonb,
  creado_en   timestamptz not null default now()
);
create index if not exists idx_eventos_tipo on eventos (tipo);
create index if not exists idx_eventos_creado on eventos (creado_en desc);

-- ============================================================
--  ROW LEVEL SECURITY
-- ============================================================
alter table productos     enable row level security;
alter table clientes      enable row level security;
alter table pedidos       enable row level security;
alter table pedido_items  enable row level security;
alter table eventos       enable row level security;

-- PRODUCTOS: cualquiera lee los activos; solo admin (logueado) gestiona.
create policy "productos_lectura_publica" on productos
  for select using (activo = true);
create policy "productos_admin_total" on productos
  for all to authenticated using (true) with check (true);

-- CLIENTES: el público puede registrarse (insert); solo admin lee.
create policy "clientes_insert_publico" on clientes
  for insert to anon with check (true);
create policy "clientes_admin_lectura" on clientes
  for select to authenticated using (true);

-- PEDIDOS: el público puede crear su pedido; solo admin lee/actualiza.
create policy "pedidos_insert_publico" on pedidos
  for insert to anon with check (true);
create policy "pedidos_admin_lectura" on pedidos
  for select to authenticated using (true);
create policy "pedidos_admin_update" on pedidos
  for update to authenticated using (true) with check (true);

-- ITEMS: el público los inserta junto con su pedido; solo admin lee.
create policy "items_insert_publico" on pedido_items
  for insert to anon with check (true);
create policy "items_admin_lectura" on pedido_items
  for select to authenticated using (true);

-- EVENTOS: el público registra eventos (insert); solo admin lee.
create policy "eventos_insert_publico" on eventos
  for insert to anon with check (true);
create policy "eventos_admin_lectura" on eventos
  for select to authenticated using (true);
