// src/lib/levelProgression.js

export const XP_THRESHOLDS = [
  0, 300, 900, 2700, 6500, 14000, 23000, 34000, 48000, 64000,
  85000, 100000, 120000, 140000, 165000, 195000, 225000, 265000, 305000, 355000
];

export function getProficiencyBonus(level) {
  return Math.ceil(level / 4) + 1;
}

export function canLevelUp(currentXp, currentLevel) {
  if (currentLevel >= 20) return false;
  return currentXp >= XP_THRESHOLDS[currentLevel];
}

// Multiclass Stat Requirements based on PHB
export const MULTICLASS_REQUIREMENTS = {
  1: (stats) => stats.str >= 13, // barbarian
  2: (stats) => stats.cha >= 13, // bard
  3: (stats) => stats.wis >= 13, // cleric
  4: (stats) => stats.wis >= 13, // druid
  5: (stats) => stats.str >= 13 || stats.dex >= 13, // fighter
  6: (stats) => stats.dex >= 13 && stats.wis >= 13, // monk
  7: (stats) => stats.str >= 13 && stats.cha >= 13, // paladin
  8: (stats) => stats.dex >= 13 && stats.wis >= 13, // ranger
  9: (stats) => stats.dex >= 13, // rogue
  10: (stats) => stats.cha >= 13, // sorcerer
  11: (stats) => stats.cha >= 13, // warlock
  12: (stats) => stats.int >= 13, // wizard
  13: (stats) => stats.int >= 13, // artificer
};

export const CLASS_HIT_DICE = {
  1: 12, // barbarian
  2: 8,  // bard
  3: 8,  // cleric
  4: 8,  // druid
  5: 10, // fighter
  6: 8,  // monk
  7: 10, // paladin
  8: 10, // ranger
  9: 8,  // rogue
  10: 6, // sorcerer
  11: 8, // warlock
  12: 6, // wizard
  13: 8, // artificer
};
