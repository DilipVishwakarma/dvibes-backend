require('dotenv').config();
const express = require('express');
const mysql = require('mysql2/promise');
const cors = require('cors');

const app = express();

app.use(cors());
app.use(express.json());

// Database connection pool
const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// Random Songs
app.get('/api/random_songs', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 15;
    const offset = parseInt(req.query.offset) || 0;
    const seed = req.query.seed || null;

    const conn = await pool.getConnection();
    
    // Get total count
    const [countResult] = await conn.query('SELECT COUNT(*) as total FROM songs');
    const total = countResult[0].total;

    // Get songs
    let query = 'SELECT id, title, artists, audio_url, thumbnail_url, duration FROM songs LIMIT ? OFFSET ?';
    const [songs] = await conn.query(query, [limit, offset]);
    
    conn.release();

    res.json({
      songs: songs,
      total: total,
      limit: limit,
      offset: offset,
      seed: seed,
      hasMore: (offset + limit) < total
    });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Artists
app.get('/api/artists', async (req, res) => {
  try {
    const conn = await pool.getConnection();
    const [artists] = await conn.query('SELECT id, name FROM artists ORDER BY name');
    conn.release();

    res.json(artists);
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Search
app.get('/api/search', async (req, res) => {
  try {
    const query = req.query.q || '';
    
    if (!query) {
      res.json([]);
      return;
    }

    const conn = await pool.getConnection();
    const [songs] = await conn.query(
      'SELECT id, title, artists, audio_url, thumbnail_url, duration FROM songs WHERE title LIKE ? LIMIT 50',
      [`%${query}%`]
    );
    conn.release();

    res.json(songs);
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Artist Songs
app.get('/api/artist_songs', async (req, res) => {
  try {
    const artistId = parseInt(req.query.artistId) || 0;

    if (artistId === 0) {
      res.json([]);
      return;
    }

    const conn = await pool.getConnection();
    const [songs] = await conn.query(
      'SELECT id, title, artists, audio_url, thumbnail_url, duration FROM songs WHERE artists LIKE ? LIMIT 100',
      [`%${artistId}%`]
    );
    conn.release();

    res.json(songs);
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Song Detail
app.get('/api/song', async (req, res) => {
  try {
    const songId = parseInt(req.query.id) || 0;

    if (songId === 0) {
      res.json({});
      return;
    }

    const conn = await pool.getConnection();
    const [songs] = await conn.query(
      'SELECT id, title, artists, audio_url, thumbnail_url, duration FROM songs WHERE id = ? LIMIT 1',
      [songId]
    );
    conn.release();

    if (songs.length > 0) {
      res.json(songs[0]);
    } else {
      res.json({});
    }
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`DVibes API running on port ${PORT}`);
});
