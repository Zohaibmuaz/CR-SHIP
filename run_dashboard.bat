@echo off
title CR Nexus - CS 7th Command Center
color 0B
cls
echo ========================================================
echo        CR NEXUS - CS 7TH SEMESTER COMMAND CENTER        
echo           Automated Private Management Suite            
echo ========================================================
echo.
echo [*] Checking local environment...

if not exist prisma\cr_nexus.db (
    echo [*] Initializing local SQLite database...
    call npx prisma db push --skip-generate
)

echo [*] Launching CR Nexus Dashboard at http://localhost:3000 ...
timeout /t 2 >nul
start http://localhost:3000

echo [*] Starting Next.js server...
call npm run dev
pause
