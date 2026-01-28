@echo off
echo Deploying Voice to Text AI to Vercel...
echo.

echo Checking if Vercel CLI is installed...
where vercel >nul 2>nul
if %errorlevel% neq 0 (
    echo Vercel CLI not found. Installing...
    npm install -g vercel
)

echo.
echo Deploying to Vercel...
vercel --prod

echo.
echo Deployment completed!
echo Don't forget to set your GROQ_API_KEY environment variable in Vercel dashboard.
echo.
pause