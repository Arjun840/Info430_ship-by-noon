// Express server for the ski route tracker.
// Serves the page in web/ and has /api routes that run SQL and return JSON.
// Every value from the page goes into SQL as a parameter (@name), never pasted into the SQL text.
require('dotenv').config();
const path = require('path');
const express = require('express');
const sql = require('mssql');

const config = {
  server: process.env.DB_SERVER,
  port: Number(process.env.DB_PORT || 1433),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  options: { encrypt: true, trustServerCertificate: true }
};

// One shared connection pool, opened the first time a route needs it.
let poolPromise;
function getPool() {
  if (!poolPromise) {
    poolPromise = sql.connect(config).catch(err => {
      poolPromise = null; // let the next request try again
      throw err;
    });
  }
  return poolPromise;
}

// Turn a value from the page into a positive whole number, or null if it isn't one.
function toId(value) {
  const n = Number(value);
  return Number.isInteger(n) && n > 0 ? n : null;
}

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, '..', 'web')));

// GET /api/resorts -> list for the resort dropdown
app.get('/api/resorts', async (req, res) => {
  try {
    const pool = await getPool();
    const r = await pool.request().query(
      'SELECT ResortID AS resortId, ResortName AS resortName, State AS state FROM dbo.Resort ORDER BY ResortName');
    res.json(r.recordset);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not load resorts.' });
  }
});

// GET /api/skiers -> list for the "I am" dropdown
app.get('/api/skiers', async (req, res) => {
  try {
    const pool = await getPool();
    const r = await pool.request().query(
      'SELECT SkierID AS skierId, SkierName AS skierName FROM dbo.Skier ORDER BY SkierName');
    res.json(r.recordset);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not load skiers.' });
  }
});

// GET /api/routes?resortId=1&skierId=1 -> every route at the resort with this skier's rating,
// routes not tried yet first. (Same query as #1 in db/queries.sql.)
app.get('/api/routes', async (req, res) => {
  const resortId = toId(req.query.resortId);
  const skierId = toId(req.query.skierId);
  if (!resortId || !skierId) {
    return res.status(400).json({ error: 'resortId and skierId must be whole numbers.' });
  }
  try {
    const pool = await getPool();
    const r = await pool.request()
      .input('resortId', sql.Int, resortId)
      .input('skierId', sql.Int, skierId)
      .query(`
        SELECT r.RouteID   AS routeId,
               r.RouteName AS routeName,
               l.LiftName  AS liftName,
               r.Difficulty AS difficulty,
               rr.Stars    AS rating,
               rr.Comment  AS comment,
               rr.SkiedOn  AS skiedOn
        FROM dbo.SkiRoute r
        JOIN dbo.Lift l             ON l.LiftID = r.LiftID
        LEFT JOIN dbo.RouteRating rr ON rr.RouteID = r.RouteID AND rr.SkierID = @skierId
        WHERE l.ResortID = @resortId
        ORDER BY CASE WHEN rr.RatingID IS NULL THEN 0 ELSE 1 END,
                 CASE r.Difficulty WHEN 'Green' THEN 1 WHEN 'Blue' THEN 2 WHEN 'Black' THEN 3 ELSE 4 END,
                 r.RouteName`);
    res.json(r.recordset);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not load routes.' });
  }
});

// POST /api/ratings  body: { skierId, routeId, stars, comment }
// Saves a rating: updates it if this skier already rated the route, otherwise inserts it.
app.post('/api/ratings', async (req, res) => {
  const skierId = toId(req.body.skierId);
  const routeId = toId(req.body.routeId);
  const stars = Number(req.body.stars);
  let comment = typeof req.body.comment === 'string' ? req.body.comment.trim() : '';
  if (!skierId || !routeId || !Number.isInteger(stars) || stars < 1 || stars > 5) {
    return res.status(400).json({ error: 'Pick a skier, a route, and a rating from 1 to 5.' });
  }
  if (comment.length > 500) {
    return res.status(400).json({ error: 'Comment must be 500 characters or fewer.' });
  }
  try {
    const pool = await getPool();
    await pool.request()
      .input('skierId', sql.Int, skierId)
      .input('routeId', sql.Int, routeId)
      .input('stars', sql.TinyInt, stars)
      .input('comment', sql.NVarChar(500), comment || null)
      .query(`
        UPDATE dbo.RouteRating
        SET Stars = @stars, Comment = @comment, SkiedOn = CAST(GETDATE() AS DATE)
        WHERE SkierID = @skierId AND RouteID = @routeId;
        IF @@ROWCOUNT = 0
          INSERT INTO dbo.RouteRating (SkierID, RouteID, Stars, Comment)
          VALUES (@skierId, @routeId, @stars, @comment);`);
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    // 547 = foreign key error: that skier or route doesn't exist.
    if (err.number === 547) return res.status(400).json({ error: 'That skier or route does not exist.' });
    res.status(500).json({ error: 'Could not save the rating.' });
  }
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Ski route tracker running at http://localhost:${port}`);
});
