@echo off
chcp 65001 >nul
title 幻想城小说章节自动同步工具
echo ==============================================
echo   🌟 幻想城小说章节自动格式化与远程同步
echo ==============================================
echo.

cd /d "%~dp0"

if "%~1"=="" (
    node sync_chapter.js
) else (
    node sync_chapter.js "%~1"
)

echo.
pause
