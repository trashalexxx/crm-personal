@echo off
chcp 65001 >nul
cd /d "%~dp0"

if not exist "server\node_modules" (
    echo.
    echo [ERROR] El CRM no esta instalado en este equipo.
    echo         Ejecuta primero INSTALAR.bat
    echo.
    pause
    exit /b 1
)

if not exist "web\dist\index.html" (
    echo.
    echo [AVISO] Falta la interfaz compilada. Compilandola ahora...
    cd web
    call npm run build
    cd ..
)

echo.
echo ===============================================
echo   CRM Personal
echo ===============================================
echo.
echo   Abriendo en el navegador...
echo   Para detenerlo: cierra esta ventana o pulsa Ctrl+C
echo.

REM Da tiempo al servidor a levantarse antes de abrir el navegador.
start "" /b cmd /c "timeout /t 4 >nul & start http://localhost:4000"

cd server
call npm run dev
pause
