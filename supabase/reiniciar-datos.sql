-- ============================================================
--  Reiniciar datos para arrancar el análisis desde cero.
--  Borra pedidos, clientes y eventos (métricas). MANTIENE
--  productos y admins. Correr en el SQL Editor cuando quieras
--  empezar a medir limpio (después de las pruebas).
-- ============================================================
delete from pedido_items;
delete from pedidos;
delete from clientes;
delete from eventos;
-- productos y admins NO se tocan.
