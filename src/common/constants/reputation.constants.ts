export const REPUTATION_RULES = {
  // Actions
  CREATE_POST: 5,
  CREATE_COMMENT: 2,
  RECEIVE_LIKE: 1,
  MARK_SOLVED: 10,

  // Solved / Reward Limits
  MIN_REWARD_POINTS: 10,
  MAX_REWARD_POINTS: 50,
  DEFAULT_REWARD_POINTS: 20,
};

export const REPUTATION_LEVELS = [
  { name: 'Novice', minPoints: 0 },
  { name: 'Apprentice', minPoints: 50 },
  { name: 'Intermediate', minPoints: 150 },
  { name: 'Expert', minPoints: 500 },
  { name: 'Master', minPoints: 1000 },
  { name: 'Grandmaster', minPoints: 5000 },
];

export function getReputationLevel(points: number): string {
  for (let i = REPUTATION_LEVELS.length - 1; i >= 0; i--) {
    if (points >= REPUTATION_LEVELS[i].minPoints) {
      return REPUTATION_LEVELS[i].name;
    }
  }
  return 'Novice';
}

export function getReputationProgress(points: number) {
  for (let i = 0; i < REPUTATION_LEVELS.length; i++) {
    if (points < REPUTATION_LEVELS[i].minPoints) {
      return {
        nextLevel: REPUTATION_LEVELS[i].name,
        nextLevelPoints: REPUTATION_LEVELS[i].minPoints,
        currentLevelPoints: i > 0 ? REPUTATION_LEVELS[i - 1].minPoints : 0,
      };
    }
  }
  // Max level reached
  const maxLevel = REPUTATION_LEVELS[REPUTATION_LEVELS.length - 1];
  return {
    nextLevel: null,
    nextLevelPoints: maxLevel.minPoints,
    currentLevelPoints: maxLevel.minPoints,
  };
}
