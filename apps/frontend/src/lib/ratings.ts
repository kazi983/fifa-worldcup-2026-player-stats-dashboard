/** Stats the ratings are computed from. Keys are the form input names (DB columns). */
export const RATING_INPUT_KEYS = [
  "minutes_played",
  "goals",
  "assists",
  "shots",
  "shots_on_target",
  "key_passes",
  "successful_dribbles",
  "successful_crosses",
  "tackles",
  "interceptions",
  "blocks",
  "clearances",
  "aerial_duels_won",
  "aerial_duels_lost",
  "fouls_committed",
  "fouls_suffered",
  "distance_covered_km",
  "sprint_distance_km",
  "top_speed_kmh",
  "accelerations",
  "decelerations",
  "stamina_score",
  "saves",
  "save_percentage",
  "punches",
  "penalty_saves",
  "clean_sheet",
  "goals_conceded",
] as const;

export type RatingInput = Record<(typeof RATING_INPUT_KEYS)[number], number>;

export type Ratings = {
  match: number;
  attacking: number;
  defensive: number;
  physical: number;
  discipline: number;
  goalkeeping: number;
};

type Weights = Omit<Ratings, "match">;

// How much each area counts toward the match rating, per position (sum 1)
const POSITION_WEIGHTS: Record<string, Weights> = {
  Forward: {
    attacking: 0.5,
    defensive: 0.1,
    physical: 0.2,
    discipline: 0.2,
    goalkeeping: 0,
  },
  Midfielder: {
    attacking: 0.35,
    defensive: 0.3,
    physical: 0.2,
    discipline: 0.15,
    goalkeeping: 0,
  },
  Defender: {
    attacking: 0.15,
    defensive: 0.55,
    physical: 0.15,
    discipline: 0.15,
    goalkeeping: 0,
  },
  Goalkeeper: {
    attacking: 0.05,
    defensive: 0.15,
    physical: 0.1,
    discipline: 0.1,
    goalkeeping: 0.6,
  },
};
const DEFAULT_WEIGHTS: Weights = {
  attacking: 0.25,
  defensive: 0.25,
  physical: 0.25,
  discipline: 0.25,
  goalkeeping: 0,
};

// Dataset averages (players with 45+ minutes). Stats added as "difference
// from average" do not change the rating of an average player.
const AVG_TOP_SPEED_KMH = 32;
const AVG_ACC_DEC_PER_90 = 47;
const AVG_STAMINA = 87;
const AVG_SAVE_PERCENTAGE = 0.68;

/**
 * Keeps a rating on the 1-10 scale and rounds it to one decimal.
 * @param value - Raw rating.
 * @returns Rating between 1 and 10.
 */
function toScale(value: number) {
  const clamped = Math.min(10, Math.max(1, value));
  return Math.round(clamped * 10) / 10;
}

/**
 * Computes the 1-10 ratings from the match stats.
 *
 * Each area starts from a base and adds or subtracts points per action.
 * The coefficients are tuned so that an average player of the dataset scores
 * about 6. Good actions only add points and bad actions (lost duels, cards,
 * goals conceded) only subtract, so raising a good stat never lowers a rating.
 * Physical volume stats are normalized to 90 minutes.
 * Goalkeeping only counts toward the match rating of goalkeepers.
 * @param input - Match stats.
 * @param position - Player position, e.g. `Forward`. Unknown values weigh the
 *   outfield areas equally.
 * @returns The ratings, or `null` when the player did not play.
 * @example
 * calcRatings({ ...stats, minutes_played: 90, goals: 1 }, "Forward");
 */
export function calcRatings(
  input: RatingInput,
  position: string,
): Ratings | null {
  if (input.minutes_played <= 0) {
    return null;
  }
  const per90 = 90 / input.minutes_played;

  const attacking = toScale(
    4.9 +
      input.goals * 1.5 +
      input.assists * 1 +
      input.shots * 0.1 +
      input.shots_on_target * 0.4 +
      input.key_passes * 0.3 +
      input.successful_dribbles * 0.3 +
      input.successful_crosses * 0.3 +
      input.fouls_suffered * 0.2,
  );
  const defensive = toScale(
    5 +
      input.tackles * 0.25 +
      input.interceptions * 0.25 +
      input.blocks * 0.25 +
      input.clearances * 0.1 +
      input.aerial_duels_won * 0.15 -
      input.aerial_duels_lost * 0.15,
  );
  const physical = toScale(
    0.5 +
      input.distance_covered_km * per90 * 0.5 +
      input.sprint_distance_km * per90 * 0.5 +
      (input.top_speed_kmh - AVG_TOP_SPEED_KMH) * 0.1 +
      ((input.accelerations + input.decelerations) * per90 -
        AVG_ACC_DEC_PER_90) *
        0.03 +
      (input.stamina_score - AVG_STAMINA) * 0.05,
  );
  const discipline = toScale(8 - input.fouls_committed);
  // save_percentage is a ratio (0-1)
  const goalkeeping = toScale(
    5 +
      input.saves * 0.3 +
      (input.save_percentage - AVG_SAVE_PERCENTAGE) * 3 +
      input.punches * 0.2 +
      input.penalty_saves * 1.5 +
      input.clean_sheet * 1.5 -
      input.goals_conceded * 0.4,
  );

  const weights = POSITION_WEIGHTS[position] ?? DEFAULT_WEIGHTS;
  const match = toScale(
    attacking * weights.attacking +
      defensive * weights.defensive +
      physical * weights.physical +
      discipline * weights.discipline +
      goalkeeping * weights.goalkeeping,
  );

  return {
    match,
    attacking,
    defensive,
    physical,
    discipline,
    goalkeeping,
  };
}

/**
 * Picks the badge colors for a 1-10 rating (>= 7 good, >= 6 mid, else bad).
 * @param value - Rating, or `null` when there is none.
 * @returns Tailwind classes for background, border and text.
 */
export function ratingClass(value: number | null) {
  if (value === null) {
    return "bg-slate-50 border-slate-200 text-slate-400";
  }
  if (value >= 7) {
    return "bg-rating-good-bg border-rating-good/30 text-rating-good";
  }
  if (value >= 6) {
    return "bg-rating-mid-bg border-rating-mid/30 text-rating-mid";
  }
  return "bg-rating-bad-bg border-rating-bad/30 text-rating-bad";
}
