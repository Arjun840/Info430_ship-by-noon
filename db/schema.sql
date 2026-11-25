-- Ski route tracker: tables in my own database (asupra4_myapp).
-- db/load.js runs this file, then inserts the made-up rows.
-- Drop in reverse order of the foreign keys, so the script can be re-run.
DROP TABLE IF EXISTS dbo.RouteRating;
DROP TABLE IF EXISTS dbo.SkiRoute;
DROP TABLE IF EXISTS dbo.Lift;
DROP TABLE IF EXISTS dbo.Resort;
DROP TABLE IF EXISTS dbo.Skier;

-- A ski resort (mountain).
CREATE TABLE dbo.Resort (
  ResortID   INT IDENTITY(1,1) PRIMARY KEY,
  ResortName NVARCHAR(100) NOT NULL UNIQUE,
  State      CHAR(2)       NOT NULL
);

-- A chairlift or gondola. Each lift belongs to one resort.
CREATE TABLE dbo.Lift (
  LiftID   INT IDENTITY(1,1) PRIMARY KEY,
  ResortID INT NOT NULL REFERENCES dbo.Resort(ResortID),
  LiftName NVARCHAR(100) NOT NULL,
  CONSTRAINT UQ_Lift_Name UNIQUE (ResortID, LiftName)
);

-- A run you can ski, reached from one lift.
CREATE TABLE dbo.SkiRoute (
  RouteID    INT IDENTITY(1,1) PRIMARY KEY,
  LiftID     INT NOT NULL REFERENCES dbo.Lift(LiftID),
  RouteName  NVARCHAR(100) NOT NULL,
  Difficulty NVARCHAR(20)  NOT NULL
    CONSTRAINT CK_SkiRoute_Difficulty CHECK (Difficulty IN ('Green', 'Blue', 'Black', 'Double Black')),
  CONSTRAINT UQ_SkiRoute_Name UNIQUE (LiftID, RouteName)
);

-- A person using the app.
CREATE TABLE dbo.Skier (
  SkierID   INT IDENTITY(1,1) PRIMARY KEY,
  SkierName NVARCHAR(100) NOT NULL UNIQUE
);

-- A skier's rating of a route they have skied. One rating per skier per route;
-- rating it again updates the same row.
CREATE TABLE dbo.RouteRating (
  RatingID INT IDENTITY(1,1) PRIMARY KEY,
  SkierID  INT NOT NULL REFERENCES dbo.Skier(SkierID),
  RouteID  INT NOT NULL REFERENCES dbo.SkiRoute(RouteID),
  Stars    TINYINT NOT NULL CONSTRAINT CK_RouteRating_Stars CHECK (Stars BETWEEN 1 AND 5),
  Comment  NVARCHAR(500) NULL,
  SkiedOn  DATE NOT NULL DEFAULT CAST(GETDATE() AS DATE),
  CONSTRAINT UQ_RouteRating UNIQUE (SkierID, RouteID)
);
