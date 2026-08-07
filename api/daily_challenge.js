'use strict';
const DAILY_CHALLENGES = [
  'The Water Cycle', 'How Black Holes Form', 'Pythagoras Theorem',
  'The Human Immune System', 'How Computers Work', 'Climate Change',
  'Evolution by Natural Selection', 'Nuclear Fission vs Fusion',
  'Machine Learning Basics', 'The French Revolution',
  'How Vaccines Work', 'Quantum Physics Introduction',
  'The Carbon Cycle', "India's Freedom Movement", 'DNA Replication',
];

module.exports = async (req, res) => {
  const dayIdx = Math.floor(Date.now() / 86400000) % DAILY_CHALLENGES.length;
  const topic = DAILY_CHALLENGES[dayIdx];
  res.json({ topic });
};
