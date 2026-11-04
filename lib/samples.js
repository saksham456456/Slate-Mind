'use strict';

const SAMPLES = {
  photosynthesis: {
    title: 'Photosynthesis',
    xpReward: 90,
    difficulty: 'Beginner',
    keyTerms: ['Chloroplast', 'Glucose', 'Sunlight'],
    quiz: [
      {
        question: 'Which gas do plants absorb from the air for photosynthesis?',
        options: ['Oxygen', 'Carbon Dioxide', 'Nitrogen', 'Methane'],
        correct: 1,
        explanation: 'Plants absorb carbon dioxide (CO2) from the atmosphere through tiny pores called stomata.'
      },
      {
        question: 'Where inside the plant cell does photosynthesis occur?',
        options: ['Mitochondria', 'Chloroplast', 'Nucleus', 'Ribosome'],
        correct: 1,
        explanation: 'Chloroplasts contain chlorophyll, which captures sunlight to drive the reaction.'
      },
      {
        question: 'What is the primary sugar produced during photosynthesis?',
        options: ['Fructose', 'Sucrose', 'Glucose', 'Lactose'],
        correct: 2,
        explanation: 'Plants synthesize glucose (C6H12O6) to store biochemical energy.'
      }
    ],
    funFact: 'About 70% of Earth’s oxygen actually comes from ocean phytoplankton, not land plants!',
    blocks: [
      { type: 'heading', text: 'Photosynthesis' },
      { type: 'text', text: 'Photosynthesis converts sunlight, water, and CO2 into clean oxygen and glucose energy.' },
      { type: 'bullet', items: ['Solar energy capture', 'Splitting water molecules', 'Synthesizing vital sugars'] },
      { type: 'equation', text: '6CO2 + 6H2O + Light -> C6H12O6 + 6O2' },
      { type: 'emphasize', text: 'Solar-Powered Life', style: 'circle' }
    ]
  },
  "newton's laws of motion": {
    title: "Newton's Laws",
    xpReward: 85,
    difficulty: 'Intermediate',
    keyTerms: ['Inertia', 'Force', 'Action-Reaction'],
    quiz: [
      {
        question: 'Which law is commonly known as the Law of Inertia?',
        options: ['First Law', 'Second Law', 'Third Law', 'Law of Gravitation'],
        correct: 0,
        explanation: 'Newton’s First Law states an object stays in its state of motion unless acted upon by a net force.'
      },
      {
        question: 'In F = ma, what does "a" represent?',
        options: ['Amplitude', 'Altitude', 'Acceleration', 'Atmosphere'],
        correct: 2,
        explanation: 'Acceleration is directly proportional to net force and inversely proportional to mass.'
      },
      {
        question: 'What occurs according to the Third Law when you push a wall?',
        options: ['The wall absorbs the push', 'The wall pushes back equally', 'No force is applied', 'Energy disappears'],
        correct: 1,
        explanation: 'Every action force has an equal and opposite reaction force.'
      }
    ],
    funFact: 'Sir Isaac Newton formulated these foundation laws while Cambridge was closed during the Great Plague!',
    blocks: [
      { type: 'heading', text: "Newton's Laws" },
      { type: 'text', text: 'Three fundamental principles describe how forces govern the motion of all physical matter.' },
      { type: 'bullet', items: ['1st: Inertia keeps state', '2nd: Force = mass x acc.', '3rd: Action equals reaction'] },
      { type: 'equation', text: 'F = m * a' },
      { type: 'emphasize', text: 'Forces Always Act in Pairs', style: 'underline' }
    ]
  }
};

function getSampleLesson(topic) {
  if (!topic) return null;
  const clean = topic.trim().toLowerCase();
  for (const [key, val] of Object.entries(SAMPLES)) {
    if (clean.includes(key) || key.includes(clean)) {
      return JSON.parse(JSON.stringify(val));
    }
  }
  return null;
}

function getFallbackLesson(topic) {
  return {
    title: topic.slice(0, 30),
    xpReward: 75,
    difficulty: 'Beginner',
    keyTerms: ['Concept', 'Application', 'Foundation'],
    quiz: [
      {
        question: `What is the core focus when learning about ${topic.slice(0, 25)}?`,
        options: ['Core principles', 'Random guessing', 'Memorizing numbers', 'Ignoring context'],
        correct: 0,
        explanation: 'Understanding foundational mechanics is the key to deep learning.'
      },
      {
        question: 'How do concepts best connect to practical use?',
        options: ['Isolating theory', 'Applying real-world examples', 'Avoiding practice', 'Rote learning'],
        correct: 1,
        explanation: 'Real-world application cements intuitive conceptual retention.'
      },
      {
        question: 'What should be the next step after mastering the basics?',
        options: ['Stopping immediately', 'Exploring deeper connections', 'Forgetting fundamentals', 'Changing subject completely'],
        correct: 1,
        explanation: 'Iterative expansion builds true mastery over any subject.'
      }
    ],
    funFact: 'Connecting a new concept to an everyday object increases memory retention by over 40%!',
    blocks: [
      { type: 'heading', text: topic.slice(0, 30) },
      { type: 'text', text: `${topic} is an intriguing subject that builds on foundational principles.` },
      { type: 'bullet', items: ['Identify primary mechanisms', 'Trace cause and outcome', 'Bridge into practical use'] },
      { type: 'emphasize', text: 'Core Concept Active', style: 'box' }
    ]
  };
}

module.exports = {
  getSampleLesson,
  getFallbackLesson
};
