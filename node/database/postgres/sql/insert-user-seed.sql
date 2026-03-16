INSERT INTO "User" ("name", "email")
SELECT 
    'DevUser' || i,
    'developer' || i || '@dev.com'
FROM generate_series(1,1000) AS i;