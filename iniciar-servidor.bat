@echo off
echo.
echo  =========================================
echo   DONHERS — Servidor local
echo  =========================================
echo.
echo   Escritorio:  http://localhost:3000
echo   Celular:     http://172.20.10.4:3000
echo.
echo   (el celular debe estar en la misma red Wi-Fi)
echo   Ctrl+C para detener el servidor.
echo.
cd /d "%~dp0"
python -m http.server 3000 --bind 0.0.0.0
pause
