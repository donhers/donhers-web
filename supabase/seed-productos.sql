-- ============================================================
--  Seed de productos de Donher's — 15 modelos de la web live.
--  Extraído del DOM real (16/06/2026). Correr DESPUÉS de schema.sql.
-- ============================================================
--  ⚠️ REVISAR antes de ir a producción (ver notas al pie):
--   - DON0004 / DON0003: categoría "caballeros" pero imagen y texto dicen "damas".
--   - DON0009 Clásico Cronometrado: precio es un RANGO ($850–$1.650); acá va el "desde" 850.
--   - Códigos DON mapeados por orden de la galería (el HTML tenía DON0004 repetido).
-- ============================================================

insert into productos (id, nombre, precio, categoria, img_url, wa_link, orden, activo) values
('DON0001','Brasalete Plateado',900,'damas','images/damas-brasalete-plateado.png','https://wa.me/59892337486?text=Hola!%20Vi%20el%20Brasalete%20Plateado%20en%20donhers.app%20y%20quiero%20consultarlo.',10,true),
('DON0008','Brasalete Dorado',950,'damas','images/damas-brasalete-dorado.png','https://wa.me/59892337486?text=Hola!%20Vi%20el%20Brasalete%20Dorado%20en%20donhers.app%20y%20quiero%20consultarlo.',20,true),
('DON0005','Clásico Plateado',850,'damas','images/damas-clasico-plateado.png','https://wa.me/59892337486?text=Hola!%20Vi%20el%20Cl%C3%A1sico%20Plateado%20en%20donhers.app%20y%20quiero%20consultarlo.',30,true),
('DON0004','Deportivo',850,'caballeros','images/damas-deportivo-2.png','https://wa.me/59892337486?text=Hola!%20Vi%20el%20Deportivo%20Damas%20en%20donhers.app%20y%20quiero%20consultarlo.',40,true),
('DON0003','Deportivo Clásico',850,'caballeros','images/damas-deportivo-clasico.png','https://wa.me/59892337486?text=Hola!%20Vi%20el%20Deportivo%20Cl%C3%A1sico%20en%20donhers.app%20y%20quiero%20consultarlo.',50,true),
('DON0009','Clásico Cronometrado',850,'caballeros','images/damas-clasico-cronometrado-2.png','https://wa.me/59892337486?text=Hola!%20Vi%20el%20Cl%C3%A1sico%20Cronometrado%20en%20donhers.app%20y%20quiero%20consultarlo.',60,true),
('DON0010','Clásico Negro',650,'caballeros','images/cab-clasico-negro.png','https://wa.me/59892337486?text=Hola!%20Vi%20el%20Cl%C3%A1sico%20Negro%20en%20donhers.app%20y%20quiero%20consultarlo.',70,true),
('DON0011','Clásico Original',650,'caballeros','images/cab-clasico-original.png','https://wa.me/59892337486?text=Hola!%20Vi%20el%20Cl%C3%A1sico%20Original%20en%20donhers.app%20y%20quiero%20consultarlo.',80,true),
('DON0012','Clásico Negro/Plateado',700,'caballeros','images/cab-clasico-negro-plateado.png','https://wa.me/59892337486?text=Hola!%20Vi%20el%20Cl%C3%A1sico%20Negro%20Plateado%20en%20donhers.app%20y%20quiero%20consultarlo.',90,true),
('DON0013','Clásico Deportivo',750,'caballeros','images/cab-clasico-deportivo.png','https://wa.me/59892337486?text=Hola!%20Vi%20el%20Cl%C3%A1sico%20Deportivo%20en%20donhers.app%20y%20quiero%20consultarlo.',100,true),
('DON0015','Esfera Lisa Negro',1500,'caballeros','images/cab-esfera-lisa-negro.png','https://wa.me/59892337486?text=Hola!%20Vi%20el%20Esfera%20Lisa%20Negro%20en%20donhers.app%20y%20quiero%20consultarlo.',110,true),
('DON0014','Esfera Lisa Plateado',1500,'caballeros','images/cab-esfera-lisa-plateado.png','https://wa.me/59892337486?text=Hola!%20Vi%20el%20Esfera%20Lisa%20Plateado%20en%20donhers.app%20y%20quiero%20consultarlo.',120,true),
('DON0016','Rectangular Azul',1950,'caballeros','images/DON0016.png','https://wa.me/59892337486?text=Hola!%20Vi%20el%20Rectangular%20Azul%20en%20donhers.app%20y%20quiero%20consultarlo.',130,true),
('DON0017','Circular Blanco',1700,'caballeros','images/DON0017.png','https://wa.me/59892337486?text=Hola!%20Vi%20el%20Circular%20Blanco%20en%20donhers.app%20y%20quiero%20consultarlo.',140,true),
('DON0018','Cronógrafo Plateado',1800,'caballeros','images/DON0018.png','https://wa.me/59892337486?text=Hola!%20Vi%20el%20Cron%C3%B3grafo%20Plateado%20en%20donhers.app%20y%20quiero%20consultarlo.',150,true)
on conflict (id) do update set
  nombre=excluded.nombre, precio=excluded.precio, categoria=excluded.categoria,
  img_url=excluded.img_url, wa_link=excluded.wa_link, orden=excluded.orden;
