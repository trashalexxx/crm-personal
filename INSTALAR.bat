@echo off
setlocal enabledelayedexpansion
chcp 65001 >nul
cd /d "%~dp0"

echo.
echo ===============================================
echo   CRM Personal - Instalacion
echo ===============================================
echo.

REM --- 1. Comprobar que Node.js esta instalado ---
where node >nul 2>&1
if errorlevel 1 (
    echo [ERROR] No se encuentra Node.js en este equipo.
    echo.
    echo   Descargalo desde https://nodejs.org  ^(version LTS^)
    echo   Instalalo, cierra esta ventana y vuelve a ejecutar INSTALAR.bat
    echo.
    pause
    exit /b 1
)

for /f "tokens=1 delims=." %%v in ('node -p "process.versions.node"') do set NODEMAJOR=%%v
if !NODEMAJOR! LSS 18 (
    echo [ERROR] Node.js es demasiado antiguo ^(version !NODEMAJOR!^). Hace falta la 18 o superior.
    echo   Actualizalo desde https://nodejs.org
    echo.
    pause
    exit /b 1
)
echo [OK] Node.js detectado
node -v
echo.

REM --- 2. Dependencias del servidor ---
echo [1/5] Instalando dependencias del servidor ^(puede tardar unos minutos^)...
cd server
call npm install --no-audit --no-fund
if errorlevel 1 goto error

REM --- 3. Fichero .env con una clave de sesion nueva y aleatoria ---
if exist ".env" (
    echo [2/5] Ya existe un fichero .env, se conserva el actual
) else (
    echo [2/5] Generando configuracion con una clave de sesion unica...
    node -e "const fs=require('fs'),c=require('crypto');let e=fs.readFileSync('.env.example','utf8');e=e.replace('cambia-esto-por-una-cadena-larga-y-aleatoria',c.randomBytes(48).toString('hex'));fs.writeFileSync('.env',e);"
    if errorlevel 1 goto error
)

REM --- 4. Base de datos ---
echo [3/5] Preparando la base de datos...
call npm run db:push
if errorlevel 1 goto error

REM --- 5. Dependencias e interfaz web ---
cd ..\web
echo [4/5] Instalando dependencias de la interfaz...
call npm install --no-audit --no-fund
if errorlevel 1 goto error

echo [5/5] Compilando la interfaz...
call npm run build
if errorlevel 1 goto error

cd ..
echo.
echo ===============================================
echo   Instalacion terminada
echo ===============================================
echo.
echo   Ejecuta INICIAR.bat para arrancar el CRM.
echo   Se abrira en http://localhost:4000
echo.
echo   La primera vez tendras que crear una cuenta
echo   desde el boton "Crear cuenta".
echo.
pause
exit /b 0

:error
echo.
echo [ERROR] Algo ha fallado durante la instalacion.
echo Revisa el mensaje de arriba. Si el problema persiste,
echo comprueba tu conexion a internet ^(npm descarga paquetes^).
echo.
pause
exit /b 1
