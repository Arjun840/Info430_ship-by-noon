-- Queries the app uses. Run them in VS Code (SQL Server extension) against asupra4_myapp.
-- In the app, @resortId, @skierId, etc. come from the page and are passed as parameters.
-- To run one here, set the DECLARE values first.
USE asupra4_myapp;

DECLARE @resortId INT = 1;   -- 1 = Stevens Pass, 2 = Crystal Mountain, 3 = Snoqualmie, 4 = Mt. Baker
DECLARE @skierId  INT = 1;   -- 1 = Arjun

-- 1. Main query (GET /api/routes): every route at a resort, with this skier's rating.
--    Routes the skier hasn't tried come first, so new ones are easy to find.
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
         r.RouteName;

-- 2. Dropdowns (GET /api/resorts and GET /api/skiers).
SELECT ResortID AS resortId, ResortName AS resortName, State AS state FROM dbo.Resort ORDER BY ResortName;
SELECT SkierID AS skierId, SkierName AS skierName FROM dbo.Skier ORDER BY SkierName;

-- 3. Save a rating (POST /api/ratings): update it if the skier already rated this route, else insert.
--    This one CHANGES data. Highlight and run only queries 1 and 2 when you just want to compare with the page.
DECLARE @routeId INT = 1, @stars TINYINT = 4, @comment NVARCHAR(500) = N'Test comment';
UPDATE dbo.RouteRating
SET Stars = @stars, Comment = @comment, SkiedOn = CAST(GETDATE() AS DATE)
WHERE SkierID = @skierId AND RouteID = @routeId;
IF @@ROWCOUNT = 0
  INSERT INTO dbo.RouteRating (SkierID, RouteID, Stars, Comment)
  VALUES (@skierId, @routeId, @stars, @comment);
