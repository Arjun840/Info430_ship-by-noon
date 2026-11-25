// Creates the tables (db/schema.sql) in my database and fills them with made-up rows.
// Run with: node db/load.js   (safe to re-run: it drops and recreates the tables)
// Resort names are real; lift and route names and all ratings are made up.
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const sql = require('mssql');

const config = {
  server: process.env.DB_SERVER,
  port: Number(process.env.DB_PORT || 1433),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  options: { encrypt: true, trustServerCertificate: true }
};

const resorts = [
  ['Stevens Pass', 'WA'],
  ['Crystal Mountain', 'WA'],
  ['The Summit at Snoqualmie', 'WA'],
  ['Mt. Baker', 'WA']
];

// [resort name, lift name]
const lifts = [
  ['Stevens Pass', 'Skyline Express'], ['Stevens Pass', 'Hogsback Express'],
  ['Stevens Pass', 'Tye Mill'],        ['Stevens Pass', 'Jupiter Express'],
  ['Crystal Mountain', 'Mt. Rainier Gondola'], ['Crystal Mountain', 'Chinook Express'],
  ['Crystal Mountain', 'Forest Queen'],        ['Crystal Mountain', 'High Campbell'],
  ['The Summit at Snoqualmie', 'Central Express'], ['The Summit at Snoqualmie', 'Wildside'],
  ['The Summit at Snoqualmie', 'Holiday'],         ['The Summit at Snoqualmie', 'Thunderbird'],
  ['Mt. Baker', 'Chair 1'], ['Mt. Baker', 'Chair 5'],
  ['Mt. Baker', 'Chair 7'], ['Mt. Baker', 'Chair 8']
];

// [resort, lift, route name, difficulty]
const routes = [
  ['Stevens Pass', 'Skyline Express', 'Easy Street', 'Green'],
  ['Stevens Pass', 'Skyline Express', 'Skyline Groomer', 'Blue'],
  ['Stevens Pass', 'Hogsback Express', 'Hog Heaven', 'Blue'],
  ['Stevens Pass', 'Hogsback Express', 'Rolling Thunder', 'Blue'],
  ['Stevens Pass', 'Tye Mill', 'Cowboy Bowl', 'Black'],
  ['Stevens Pass', 'Tye Mill', 'Tye Chute', 'Double Black'],
  ['Stevens Pass', 'Jupiter Express', 'Jupiter Bowl', 'Black'],
  ['Stevens Pass', 'Jupiter Express', 'Orion Glades', 'Black'],
  ['Stevens Pass', 'Jupiter Express', 'Milky Way', 'Green'],
  ['Stevens Pass', 'Hogsback Express', 'Pegasus Glade', 'Black'],

  ['Crystal Mountain', 'Mt. Rainier Gondola', 'Summit Cruiser', 'Blue'],
  ['Crystal Mountain', 'Mt. Rainier Gondola', 'Rainier View', 'Blue'],
  ['Crystal Mountain', 'Chinook Express', 'Lucky Shot', 'Blue'],
  ['Crystal Mountain', 'Chinook Express', 'Salmon Run', 'Green'],
  ['Crystal Mountain', 'Forest Queen', 'Queens Run', 'Green'],
  ['Crystal Mountain', 'Forest Queen', 'Fir Tree Glades', 'Black'],
  ['Crystal Mountain', 'High Campbell', 'Campbell Basin', 'Black'],
  ['Crystal Mountain', 'High Campbell', 'Powder Bowl Chutes', 'Double Black'],
  ['Crystal Mountain', 'Chinook Express', 'Ptarmigan Ridge', 'Black'],
  ['Crystal Mountain', 'Mt. Rainier Gondola', 'Snorting Elk Trail', 'Green'],

  ['The Summit at Snoqualmie', 'Central Express', 'Central Park', 'Green'],
  ['The Summit at Snoqualmie', 'Central Express', 'Wildcat', 'Blue'],
  ['The Summit at Snoqualmie', 'Wildside', 'Wild Thing', 'Black'],
  ['The Summit at Snoqualmie', 'Wildside', 'Side Door', 'Blue'],
  ['The Summit at Snoqualmie', 'Holiday', 'Holiday Lane', 'Green'],
  ['The Summit at Snoqualmie', 'Holiday', 'Snowflake', 'Green'],
  ['The Summit at Snoqualmie', 'Thunderbird', 'Thunder Ridge', 'Black'],
  ['The Summit at Snoqualmie', 'Thunderbird', 'Firebird', 'Blue'],
  ['The Summit at Snoqualmie', 'Central Express', 'Night Owl', 'Blue'],
  ['The Summit at Snoqualmie', 'Thunderbird', 'Eagle Drop', 'Double Black'],

  ['Mt. Baker', 'Chair 1', 'Bunny Hop', 'Green'],
  ['Mt. Baker', 'Chair 1', 'Shuksan Arm Traverse', 'Blue'],
  ['Mt. Baker', 'Chair 5', 'Pan Face', 'Black'],
  ['Mt. Baker', 'Chair 5', 'Canyon Run', 'Blue'],
  ['Mt. Baker', 'Chair 7', 'Cascade Glades', 'Black'],
  ['Mt. Baker', 'Chair 7', 'Gunners Bowl', 'Double Black'],
  ['Mt. Baker', 'Chair 8', 'Austin Way', 'Blue'],
  ['Mt. Baker', 'Chair 8', 'Easy Rider', 'Green'],
  ['Mt. Baker', 'Chair 8', 'Hemispheres', 'Black'],
  ['Mt. Baker', 'Chair 5', 'Powder Keg', 'Black']
];

const skiers = ['Arjun', 'Maya', 'Leo', 'Priya'];

// [skier, resort, route, stars, comment, skied on]
const ratings = [
  ['Arjun', 'Stevens Pass', 'Easy Street', 3, 'Good warm-up, gets crowded.', '2026-01-04'],
  ['Arjun', 'Stevens Pass', 'Skyline Groomer', 4, 'Perfect corduroy first thing in the morning.', '2026-01-04'],
  ['Arjun', 'Stevens Pass', 'Hog Heaven', 5, 'Best views on the mountain.', '2026-01-18'],
  ['Arjun', 'Stevens Pass', 'Cowboy Bowl', 4, 'Steep entry, then wide open.', '2026-02-01'],
  ['Arjun', 'Crystal Mountain', 'Summit Cruiser', 5, 'Rainier right in front of you the whole way down.', '2026-02-14'],
  ['Arjun', 'Crystal Mountain', 'Salmon Run', 2, 'Flat at the bottom, had to skate.', '2026-02-14'],
  ['Arjun', 'Crystal Mountain', 'Lucky Shot', 4, null, '2026-02-15'],
  ['Arjun', 'The Summit at Snoqualmie', 'Central Park', 3, 'Fine for night skiing.', '2025-12-20'],
  ['Arjun', 'The Summit at Snoqualmie', 'Wildcat', 4, 'Fun rollers.', '2025-12-20'],
  ['Arjun', 'Mt. Baker', 'Canyon Run', 5, 'Deep powder after the storm.', '2026-03-07'],
  ['Maya', 'Stevens Pass', 'Tye Chute', 5, 'Scary but worth it.', '2026-01-11'],
  ['Maya', 'Stevens Pass', 'Jupiter Bowl', 4, 'Wind-loaded snow, great turns.', '2026-01-11'],
  ['Maya', 'Stevens Pass', 'Orion Glades', 3, 'Tight trees.', '2026-01-25'],
  ['Maya', 'Crystal Mountain', 'Powder Bowl Chutes', 5, 'Best run in the PNW.', '2026-02-07'],
  ['Maya', 'Crystal Mountain', 'Campbell Basin', 4, null, '2026-02-07'],
  ['Maya', 'Mt. Baker', 'Gunners Bowl', 5, 'Hike is short, payoff is huge.', '2026-03-01'],
  ['Leo', 'The Summit at Snoqualmie', 'Holiday Lane', 4, 'Great for learning.', '2025-12-28'],
  ['Leo', 'The Summit at Snoqualmie', 'Snowflake', 5, 'My favorite beginner run.', '2025-12-28'],
  ['Leo', 'The Summit at Snoqualmie', 'Central Park', 3, null, '2026-01-02'],
  ['Leo', 'Stevens Pass', 'Easy Street', 4, 'Long and mellow.', '2026-01-17'],
  ['Leo', 'Crystal Mountain', 'Queens Run', 3, 'Icy in the afternoon.', '2026-02-21'],
  ['Priya', 'Mt. Baker', 'Pan Face', 4, 'Moguls by noon.', '2026-02-22'],
  ['Priya', 'Mt. Baker', 'Austin Way', 3, null, '2026-02-22'],
  ['Priya', 'Crystal Mountain', 'Rainier View', 5, 'Sunset run is unreal.', '2026-03-14'],
  ['Priya', 'Stevens Pass', 'Rolling Thunder', 4, 'Fast groomer.', '2026-03-21']
];

(async () => {
  let pool;
  try {
    pool = await sql.connect(config);

    // 1. Create the tables from schema.sql (it drops them first, so this is re-runnable).
    const schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
    await pool.request().batch(schema);
    console.log('Created tables: Resort, Lift, SkiRoute, Skier, RouteRating');

    // 2. Insert rows. Every value goes in as a parameter, never pasted into the SQL text.
    const resortIds = {};
    for (const [name, state] of resorts) {
      const r = await pool.request()
        .input('name', sql.NVarChar(100), name)
        .input('state', sql.Char(2), state)
        .query('INSERT INTO dbo.Resort (ResortName, State) OUTPUT INSERTED.ResortID VALUES (@name, @state)');
      resortIds[name] = r.recordset[0].ResortID;
    }

    const liftIds = {};
    for (const [resort, lift] of lifts) {
      const r = await pool.request()
        .input('resortId', sql.Int, resortIds[resort])
        .input('name', sql.NVarChar(100), lift)
        .query('INSERT INTO dbo.Lift (ResortID, LiftName) OUTPUT INSERTED.LiftID VALUES (@resortId, @name)');
      liftIds[resort + '|' + lift] = r.recordset[0].LiftID;
    }

    const routeIds = {};
    for (const [resort, lift, route, difficulty] of routes) {
      const r = await pool.request()
        .input('liftId', sql.Int, liftIds[resort + '|' + lift])
        .input('name', sql.NVarChar(100), route)
        .input('difficulty', sql.NVarChar(20), difficulty)
        .query('INSERT INTO dbo.SkiRoute (LiftID, RouteName, Difficulty) OUTPUT INSERTED.RouteID VALUES (@liftId, @name, @difficulty)');
      routeIds[resort + '|' + route] = r.recordset[0].RouteID;
    }

    const skierIds = {};
    for (const name of skiers) {
      const r = await pool.request()
        .input('name', sql.NVarChar(100), name)
        .query('INSERT INTO dbo.Skier (SkierName) OUTPUT INSERTED.SkierID VALUES (@name)');
      skierIds[name] = r.recordset[0].SkierID;
    }

    for (const [skier, resort, route, stars, comment, skiedOn] of ratings) {
      await pool.request()
        .input('skierId', sql.Int, skierIds[skier])
        .input('routeId', sql.Int, routeIds[resort + '|' + route])
        .input('stars', sql.TinyInt, stars)
        .input('comment', sql.NVarChar(500), comment)
        .input('skiedOn', sql.Date, new Date(skiedOn))
        .query('INSERT INTO dbo.RouteRating (SkierID, RouteID, Stars, Comment, SkiedOn) VALUES (@skierId, @routeId, @stars, @comment, @skiedOn)');
    }

    console.log(`Inserted ${resorts.length} resorts, ${lifts.length} lifts, ${routes.length} routes, ${skiers.length} skiers, ${ratings.length} ratings.`);
  } catch (err) {
    console.log('LOAD FAILED: ' + err.message);
    process.exitCode = 1;
  } finally {
    if (pool) await pool.close();
  }
})();
