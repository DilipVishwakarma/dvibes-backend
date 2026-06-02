# DVibes API Backend

A simple Node.js Express API backend for the DVibes Flutter app.

## Local Setup

1. Install Node.js (v14+)
2. Install dependencies:
   ```bash
   npm install
   ```
3. Create `.env` file:
   ```
   DB_HOST=your-infinityfree-db-host
   DB_USER=your-db-user
   DB_PASSWORD=your-db-password
   DB_NAME=your-db-name
   PORT=3000
   ```
4. Start the server:
   ```bash
   npm start
   ```

## Deploy to Render (Free)

### Step 1: Push to GitHub
1. Create a GitHub account (if you don't have one)
2. Create a new repository called `dvibes-backend`
3. Push the `backend` folder to GitHub:
   ```bash
   cd backend
   git init
   git add .
   git commit -m "Initial commit"
   git branch -M main
   git remote add origin https://github.com/YOUR-USERNAME/dvibes-backend.git
   git push -u origin main
   ```

### Step 2: Deploy on Render
1. Go to https://render.com
2. Sign up with GitHub account
3. Click "New +" → "Web Service"
4. Select your `dvibes-backend` repository
5. Fill in:
   - **Name:** `dvibes-api` (or any name)
   - **Runtime:** Node
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
6. Click "Advanced" and add environment variables:
   - `DB_HOST`: Your InfinityFree database host
   - `DB_USER`: Your database user
   - `DB_PASSWORD`: Your database password
   - `DB_NAME`: Your database name
7. Click "Create Web Service"
8. Wait for deployment (2-3 minutes)
9. Get your API URL (example: `https://dvibes-api.onrender.com`)

### Step 3: Update Flutter Config
In `lib/config.dart`:
```dart
const String apiBaseUrl = 'https://dvibes-api.onrender.com/api';
```

## Endpoints

- `GET /api/random_songs?limit=15&offset=0` - Get random songs
- `GET /api/artists` - Get all artists
- `GET /api/search?q=query` - Search songs
- `GET /api/artist_songs?artistId=123` - Get artist songs
- `GET /api/song?id=123` - Get song details
- `GET /health` - Health check

## Notes

- Render free tier has a 15-minute timeout for inactive apps (they auto-wake on requests)
- The API queries your InfinityFree database directly
- No JavaScript challenge - returns pure JSON
- CORS is enabled for Flutter Web/Desktop
