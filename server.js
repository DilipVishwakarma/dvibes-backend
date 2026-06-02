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

const STORAGE_BASE_URL = (process.env.STORAGE_BASE_URL || 'https://dilipaudistream.page.gd/App').replace(/\/$/, '');

function mapSongRowToCard(row) {
  const thumb = row.thumbnail_path || row.cover_image || '';
  const thumbnailUrl = toPublicAudioOrImageUrl(thumb) || 'assets/images/default-album.jpg';
  const audioUrl = toPublicAudioOrImageUrl(row.file_path || '');

  return {
    id: row.song_id || row.id,
    title: row.song_title || row.title,
    artists: row.artist_names || row.artists || row.artists_name || null,
    duration: row.duration != null ? Number(row.duration) : null,
    file_path: row.file_path || null,
    thumbnail_url: thumbnailUrl,
    audio_url: audioUrl,
  };
}

function toPublicAudioOrImageUrl(path) {
  if (!path) return '';
  const normalized = path.replace(/\\/g, '/').replace(/^\//, '');

  if (normalized.startsWith('http://') || normalized.startsWith('https://')) {
    return normalized;
  }

  let relativePath = normalized;
  if (normalized.startsWith('music/')) {
    relativePath = 'storage/music/' + normalized.substring('music/'.length);
  } else if (normalized.startsWith('storage/music/')) {
    relativePath = 'storage/music/' + normalized.substring('storage/music/'.length);
  } else if (normalized.startsWith('storage/thumbnails/')) {
    relativePath = 'storage/thumbnails/' + normalized.substring('storage/thumbnails/'.length);
  }

  return `${STORAGE_BASE_URL}/${relativePath}`;
}

async function querySongs(conn, sql, params = []) {
  const [rows] = await conn.query(sql, params);
  return rows.map(mapSongRowToCard);
}

// Random Songs
app.get('/api/random_songs', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 15;
    const offset = parseInt(req.query.offset) || 0;
    const seed = req.query.seed || null;

    const conn = await pool.getConnection();
    const [countResult] = await conn.query('SELECT COUNT(*) as total FROM songs');
    const total = countResult[0].total;

    const baseQuery = `
      SELECT
        s.id AS song_id,
        s.title AS song_title,
        s.duration,
        s.file_path,
        s.thumbnail_path,
        GROUP_CONCAT(DISTINCT ar.name ORDER BY ar.name SEPARATOR ', ') AS artist_names
      FROM songs s
      LEFT JOIN song_artists sa ON sa.song_id = s.id
      LEFT JOIN artists ar ON ar.id = sa.artist_id
      GROUP BY s.id
    `;

    const orderClause = seed
      ? ' ORDER BY MD5(CONCAT(?, CAST(s.id AS CHAR))), s.id'
      : ' ORDER BY RAND()';

    const finalQuery = `${baseQuery} ${orderClause} LIMIT ? OFFSET ?`;
    const params = seed ? [seed, limit, offset] : [limit, offset];
    const songs = await querySongs(conn, finalQuery, params);

    conn.release();

    res.json({
      songs,
      total,
      limit,
      offset,
      seed,
      hasMore: (offset + limit) < total,
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
    const sql = `
      SELECT
        s.id AS song_id,
        s.title AS song_title,
        s.duration,
        s.file_path,
        s.thumbnail_path,
        GROUP_CONCAT(DISTINCT ar.name ORDER BY ar.name SEPARATOR ', ') AS artist_names
      FROM songs s
      LEFT JOIN song_artists sa ON sa.song_id = s.id
      LEFT JOIN artists ar ON ar.id = sa.artist_id
      WHERE s.title LIKE ?
      GROUP BY s.id
      ORDER BY s.id DESC
      LIMIT 50
    `;
    const songs = await querySongs(conn, sql, [`%${query}%`]);
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
    const sql = `
      SELECT
        s.id AS song_id,
        s.title AS song_title,
        s.duration,
        s.file_path,
        s.thumbnail_path,
        GROUP_CONCAT(DISTINCT ar.name ORDER BY ar.name SEPARATOR ', ') AS artist_names
      FROM songs s
      INNER JOIN song_artists sa ON sa.song_id = s.id
      LEFT JOIN artists ar ON ar.id = sa.artist_id
      WHERE sa.artist_id = ?
      GROUP BY s.id
      LIMIT 100
    `;
    const songs = await querySongs(conn, sql, [artistId]);
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
    const sql = `
      SELECT
        s.id AS song_id,
        s.title AS song_title,
        s.duration,
        s.file_path,
        s.thumbnail_path,
        GROUP_CONCAT(DISTINCT ar.name ORDER BY ar.name SEPARATOR ', ') AS artist_names
      FROM songs s
      LEFT JOIN song_artists sa ON sa.song_id = s.id
      LEFT JOIN artists ar ON ar.id = sa.artist_id
      WHERE s.id = ?
      GROUP BY s.id
      LIMIT 1
    `;
    const songs = await querySongs(conn, sql, [songId]);
    conn.release();

    res.json(songs[0] || {});
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
