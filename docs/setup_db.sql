-- =============================================================================
--  setup_db.sql  —  imports the CSV and normalizes it into 3 related tables:
--                   players, matches, performances.
--
--  HOW TO RUN (from the docs/ folder that holds this file + the CSV):
--    createdb worldcup                                   # in your shell, once
--    psql -h localhost -U postgres -d worldcup           # connect to it
--    \cd /full/path/to/wd-203-midterm-player-stats/docs  # so \copy finds the CSV
--    \i setup_db.sql                                     # run this script
--
--  Re-runnable: it drops the tables first, so you can rebuild anytime.
--  Read it top to bottom — you'll explain this design in your reflection.
-- =============================================================================

-- 0) clean slate (child table first because of the foreign keys)
DROP TABLE IF EXISTS performances;
DROP TABLE IF EXISTS players;
DROP TABLE IF EXISTS matches;
DROP TABLE IF EXISTS raw_staging;

-- 1) staging table: one column per CSV column, in CSV order
CREATE TABLE raw_staging (
  player_id TEXT, player_name TEXT, age INT, nationality TEXT, team TEXT,
  jersey_number INT, position TEXT, height_cm INT, weight_kg INT,
  preferred_foot TEXT, club_name TEXT, market_value_eur BIGINT,
  match_id TEXT, match_date DATE, stadium TEXT, city TEXT, opponent_team TEXT,
  tournament_stage TEXT, match_result CHAR(1), goals_team INT, goals_opponent INT,
  minutes_played INT, goals INT, assists INT, shots INT, shots_on_target INT,
  expected_goals_xg NUMERIC, expected_assists_xa NUMERIC, key_passes INT,
  successful_passes INT, total_passes INT, pass_accuracy NUMERIC,
  dribbles_attempted INT, successful_dribbles INT, crosses INT, successful_crosses INT,
  tackles INT, interceptions INT, clearances INT, blocks INT,
  aerial_duels_won INT, aerial_duels_lost INT, recoveries INT, defensive_actions INT,
  fouls_committed INT, fouls_suffered INT, yellow_cards INT, red_cards INT, offsides INT,
  saves INT, save_percentage NUMERIC, punches INT, clean_sheet SMALLINT,
  goals_conceded INT, penalty_saves INT,
  distance_covered_km NUMERIC, sprint_distance_km NUMERIC, top_speed_kmh NUMERIC,
  accelerations INT, decelerations INT, stamina_score NUMERIC,
  player_rating NUMERIC, performance_score NUMERIC, offensive_contribution NUMERIC,
  defensive_contribution NUMERIC, possession_impact NUMERIC, pressure_resistance NUMERIC,
  creativity_score NUMERIC, consistency_score NUMERIC, clutch_performance_score NUMERIC,
  total_goals_tournament INT, total_assists_tournament INT, total_minutes_tournament INT,
  player_of_match_awards INT, tournament_rating NUMERIC
);

-- 2) bulk-load the CSV into staging (run from inside the docs/ folder)
\copy raw_staging FROM 'fifa_world_cup_2026_player_performance.csv' WITH (FORMAT csv, HEADER true);

-- 3) the 3 normalized tables (dimensions first, fact last — FKs need the parents)
CREATE TABLE players (
  player_id   TEXT PRIMARY KEY,
  player_name TEXT NOT NULL,
  age INT, nationality TEXT, team TEXT, jersey_number INT, position TEXT,
  height_cm INT, weight_kg INT, preferred_foot TEXT, club_name TEXT, market_value_eur BIGINT,
  total_goals_tournament INT, total_assists_tournament INT,
  total_minutes_tournament INT, player_of_match_awards INT, tournament_rating NUMERIC
);

CREATE TABLE matches (
  match_id   TEXT PRIMARY KEY,
  match_date DATE, stadium TEXT, city TEXT, tournament_stage TEXT
);

CREATE TABLE performances (
  id SERIAL PRIMARY KEY,
  player_id TEXT NOT NULL REFERENCES players(player_id),
  match_id  TEXT NOT NULL REFERENCES matches(match_id),
  UNIQUE (player_id, match_id),
  opponent_team TEXT, match_result CHAR(1), goals_team INT, goals_opponent INT,
  minutes_played INT, goals INT, assists INT, shots INT, shots_on_target INT,
  expected_goals_xg NUMERIC, expected_assists_xa NUMERIC, key_passes INT,
  successful_passes INT, total_passes INT, pass_accuracy NUMERIC,
  dribbles_attempted INT, successful_dribbles INT, crosses INT, successful_crosses INT,
  tackles INT, interceptions INT, clearances INT, blocks INT,
  aerial_duels_won INT, aerial_duels_lost INT, recoveries INT, defensive_actions INT,
  fouls_committed INT, fouls_suffered INT, yellow_cards INT, red_cards INT, offsides INT,
  saves INT, save_percentage NUMERIC, punches INT, clean_sheet SMALLINT,
  goals_conceded INT, penalty_saves INT,
  distance_covered_km NUMERIC, sprint_distance_km NUMERIC, top_speed_kmh NUMERIC,
  accelerations INT, decelerations INT, stamina_score NUMERIC,
  player_rating NUMERIC, performance_score NUMERIC, offensive_contribution NUMERIC,
  defensive_contribution NUMERIC, possession_impact NUMERIC, pressure_resistance NUMERIC,
  creativity_score NUMERIC, consistency_score NUMERIC, clutch_performance_score NUMERIC
);

-- 4) populate from staging. DISTINCT ON collapses repeated rows to one per entity.
INSERT INTO players
SELECT DISTINCT ON (player_id)
  player_id, player_name, age, nationality, team, jersey_number, position,
  height_cm, weight_kg, preferred_foot, club_name, market_value_eur,
  total_goals_tournament, total_assists_tournament, total_minutes_tournament,
  player_of_match_awards, tournament_rating
FROM raw_staging ORDER BY player_id;

INSERT INTO matches
SELECT DISTINCT ON (match_id)
  match_id, match_date, stadium, city, tournament_stage
FROM raw_staging ORDER BY match_id;

INSERT INTO performances (
  player_id, match_id, opponent_team, match_result, goals_team, goals_opponent,
  minutes_played, goals, assists, shots, shots_on_target, expected_goals_xg,
  expected_assists_xa, key_passes, successful_passes, total_passes, pass_accuracy,
  dribbles_attempted, successful_dribbles, crosses, successful_crosses, tackles,
  interceptions, clearances, blocks, aerial_duels_won, aerial_duels_lost, recoveries,
  defensive_actions, fouls_committed, fouls_suffered, yellow_cards, red_cards, offsides,
  saves, save_percentage, punches, clean_sheet, goals_conceded, penalty_saves,
  distance_covered_km, sprint_distance_km, top_speed_kmh, accelerations, decelerations,
  stamina_score, player_rating, performance_score, offensive_contribution,
  defensive_contribution, possession_impact, pressure_resistance, creativity_score,
  consistency_score, clutch_performance_score)
SELECT
  player_id, match_id, opponent_team, match_result, goals_team, goals_opponent,
  minutes_played, goals, assists, shots, shots_on_target, expected_goals_xg,
  expected_assists_xa, key_passes, successful_passes, total_passes, pass_accuracy,
  dribbles_attempted, successful_dribbles, crosses, successful_crosses, tackles,
  interceptions, clearances, blocks, aerial_duels_won, aerial_duels_lost, recoveries,
  defensive_actions, fouls_committed, fouls_suffered, yellow_cards, red_cards, offsides,
  saves, save_percentage, punches, clean_sheet, goals_conceded, penalty_saves,
  distance_covered_km, sprint_distance_km, top_speed_kmh, accelerations, decelerations,
  stamina_score, player_rating, performance_score, offensive_contribution,
  defensive_contribution, possession_impact, pressure_resistance, creativity_score,
  consistency_score, clutch_performance_score
FROM raw_staging;

-- 5) verify (performances should == raw), then drop staging
SELECT
  (SELECT COUNT(*) FROM raw_staging)  AS raw,
  (SELECT COUNT(*) FROM players)      AS players,
  (SELECT COUNT(*) FROM matches)      AS matches,
  (SELECT COUNT(*) FROM performances) AS performances;

-- DROP TABLE raw_staging;
