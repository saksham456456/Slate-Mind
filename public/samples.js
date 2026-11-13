'use strict';

/* ═══════════════════════════════════════════════════════════════
   SlateMind — Pre-Created Master Lessons for Try Topics
   Studio-grade blackboard pedagogy with rich visual diagrams,
   formulas, quizzes, and rabbit holes.
   Shared across serverless backend and client PWA.
   ═══════════════════════════════════════════════════════════════ */

const SAMPLE_LESSONS = {
  photosynthesis: {
    aliases: ['photosynthesis', 'photo synthesis', 'chloroplast', 'plant biology', 'how plants make food'],
    title: 'Photosynthesis',
    xpReward: 95,
    difficulty: 'Beginner',
    keyTerms: ['Chloroplast', 'Thylakoid', 'Stomata', 'Calvin Cycle'],
    rabbitHoles: [
      'Why are plant leaves green instead of black if black absorbs more light?',
      'If plants produce oxygen, why do they also consume oxygen at night?',
      'Can artificial bionic leaves generate clean hydrogen fuel more efficiently than plants?'
    ],
    quiz: [
      {
        question: 'Which atmospheric gas do plants capture through their stomata for photosynthesis?',
        options: ['Oxygen (O2)', 'Carbon Dioxide (CO2)', 'Nitrogen (N2)', 'Methane (CH4)'],
        correct: 1,
        explanation: 'Plants take in carbon dioxide (CO2) from the atmosphere through microscopic pores called stomata.'
      },
      {
        question: 'Where inside the plant cell do the light-dependent reactions take place?',
        options: ['Mitochondria', 'Thylakoid membranes in Chloroplasts', 'Nucleus', 'Endoplasmic Reticulum'],
        correct: 1,
        explanation: 'Thylakoids contain embedded chlorophyll pigments that capture photon energy to split water.'
      },
      {
        question: 'What high-energy sugar molecule is synthesized to store chemical energy?',
        options: ['Glucose (C6H12O6)', 'Lactose', 'Fructose', 'Sucrose'],
        correct: 0,
        explanation: 'Plants fix carbon into glucose during the Calvin cycle, storing chemical energy for growth.'
      }
    ],
    funFact: 'Over 70% of Earth’s oxygen is produced not by land rainforests, but by microscopic oceanic phytoplankton!',
    blocks: [
      { type: 'heading', text: 'Photosynthesis: Solar-Powered Life' },
      { type: 'text', text: 'Photosynthesis is the biochemical engine of Earth, transforming solar photons, water, and atmospheric CO2 into oxygen and glucose energy.' },
      { type: 'equation', text: '6CO2 + 6H2O + Sunlight  -->  C6H12O6 + 6O2' },
      {
        type: 'diagram',
        shapes: [
          { kind: 'box', x: 50, y: 15, w: 140, h: 48, label: 'Light + H2O' },
          { kind: 'arrow', from: [195, 39], to: [235, 39], label: '' },
          { kind: 'box', x: 240, y: 15, w: 160, h: 48, label: 'Thylakoids (Light Rxn)' },
          { kind: 'arrow', from: [405, 39], to: [445, 39], label: 'ATP' },
          { kind: 'box', x: 450, y: 15, w: 160, h: 48, label: 'Calvin Cycle (Glucose)' }
        ]
      },
      {
        type: 'bullet',
        items: [
          'Light Phase: Chlorophyll splits H2O into oxygen gas, protons, and ATP energy',
          'Dark Phase (Calvin Cycle): Enzymes synthesize high-energy glucose from CO2',
          'Chlorophyll pigments absorb blue and red light while reflecting green'
        ]
      },
      {
        type: 'checkpoint',
        question: 'What would happen to the Calvin cycle if a plant was placed in total darkness for a week?',
        hint: 'Consider where the dark reactions obtain their necessary ATP and NADPH chemical fuel.'
      },
      { type: 'emphasize', text: 'Primary Energy Dynamo of Earth', style: 'circle' }
    ]
  },

  newtons_laws: {
    aliases: ["newton's laws", "newton's laws of motion", 'newtons laws', 'laws of motion', 'law of inertia', 'newtonian mechanics', 'f=ma'],
    title: "Newton's Laws of Motion",
    xpReward: 100,
    difficulty: 'Intermediate',
    keyTerms: ['Inertia', 'Net Force', 'Acceleration', 'Action-Reaction'],
    rabbitHoles: [
      'If every action has an equal and opposite reaction, how can anything ever accelerate forward?',
      'Why do astronauts float in orbit if Earth gravity is still 90% as strong at that altitude?',
      'At what speeds do Newton laws break down and require Einstein Special Relativity?'
    ],
    quiz: [
      {
        question: 'Which law explains why passengers lurch forward when a car suddenly slams on the brakes?',
        options: ['First Law (Law of Inertia)', 'Second Law (F=ma)', 'Third Law (Action-Reaction)', 'Law of Universal Gravitation'],
        correct: 0,
        explanation: 'Newton’s First Law states an object preserves its state of motion unless acted upon by an external net force.'
      },
      {
        question: 'In the equation F = ma, what happens to acceleration if mass is doubled under the same force?',
        options: ['Acceleration doubles', 'Acceleration is cut in half', 'Acceleration quadruples', 'Acceleration remains unchanged'],
        correct: 1,
        explanation: 'Acceleration is inversely proportional to mass; heavier objects resist changes in velocity more.'
      },
      {
        question: 'When a rocket fires in space, what is the reaction force that propels it forward?',
        options: ['Pushing against outer space air', 'The downward expelled exhaust gas', 'Gravitational pull of the moon', 'Solar radiation'],
        correct: 1,
        explanation: 'Newton’s Third Law: The rocket exerts force backward on the hot gas, and the gas exerts an equal force forward on the rocket.'
      }
    ],
    funFact: 'Sir Isaac Newton formulated his universal laws of motion and gravity while Cambridge was closed during the Great Plague of 1665!',
    blocks: [
      { type: 'heading', text: "Newtonian Mechanics: 3 Core Laws" },
      { type: 'text', text: 'Three universal laws define how matter interacts, moves, and responds to applied forces across our physical universe.' },
      {
        type: 'bullet',
        items: [
          '1st Law (Inertia): Bodies preserve resting or uniform motion unless compelled by net force',
          '2nd Law (Dynamics): Acceleration is directly proportional to force and inverse to mass',
          '3rd Law (Pairs): All forces occur in simultaneous, equal, opposite interactions'
        ]
      },
      { type: 'equation', text: 'F_net = m * a   [ Force = Mass x Acceleration ]' },
      {
        type: 'diagram',
        shapes: [
          { kind: 'box', x: 50, y: 15, w: 140, h: 48, label: 'Applied Force (F)' },
          { kind: 'arrow', from: [195, 39], to: [245, 39], label: '' },
          { kind: 'circle', x: 250, y: 10, w: 60, h: 60, label: 'Mass (m)' },
          { kind: 'arrow', from: [315, 39], to: [365, 39], label: '' },
          { kind: 'box', x: 370, y: 15, w: 180, h: 48, label: 'Acceleration (a = F/m)' }
        ]
      },
      {
        type: 'checkpoint',
        question: 'If you push a floating boulder in deep space with zero gravity, does it push back on your hand?',
        hint: 'Inertia depends on mass, not on gravitational weight.'
      },
      { type: 'emphasize', text: 'Forces Never Exist in Isolation', style: 'underline' }
    ]
  },

  french_revolution: {
    aliases: ['the french revolution', 'french revolution', 'bastille', 'reign of terror', 'louis xvi', 'robespierre'],
    title: 'The French Revolution',
    xpReward: 90,
    difficulty: 'Intermediate',
    keyTerms: ['Three Estates', 'Bastille', 'Reign of Terror', 'Jacobins'],
    rabbitHoles: [
      'How did an unseasonable hailstorm and volcanic eruption trigger the bread shortage that sparked revolution?',
      'Why did revolutionaries reinvent time itself with a 10-day metric week and new calendar?',
      'Did the execution of Louis XVI achieve democratic freedom or pave the way for Napoleonic dictatorship?'
    ],
    quiz: [
      {
        question: 'Which social group bore the overwhelming tax burden under France’s Ancien Régime?',
        options: ['The First Estate (Clergy)', 'The Second Estate (Nobility)', 'The Third Estate (Commoners & Peasants)', 'The Crown'],
        correct: 2,
        explanation: 'The Third Estate comprised ~98% of the population yet paid almost all taxes while possessing minimal political voice.'
      },
      {
        question: 'What historical event on July 14, 1789 became the enduring symbol of the uprising against despotism?',
        options: ['Storming of the Bastille', 'Execution of Louis XVI', 'Tennis Court Oath', 'Battle of Waterloo'],
        correct: 0,
        explanation: 'Storming the royal prison fortress of the Bastille armed the revolutionaries and signaled the collapse of absolute monarchy.'
      },
      {
        question: 'Which radical leader spearheaded the Reign of Terror before being executed by guillotine himself?',
        options: ['Napoleon Bonaparte', 'Maximilien Robespierre', 'Jean-Paul Marat', 'Georges Danton'],
        correct: 1,
        explanation: 'Robespierre led the Committee of Public Safety during the terror before being overthrown during the Thermidorian Reaction.'
      }
    ],
    funFact: 'During the radical phase of the revolution, playing cards were redesigned to replace kings and queens with philosophers and civic virtues!',
    blocks: [
      { type: 'heading', text: 'The French Revolution (1789-1799)' },
      { type: 'text', text: 'In 1789, crushing crown debts, acute bread famines, and Enlightenment ideals propelled France from absolute monarchy to radical republican transformation.' },
      {
        type: 'bullet',
        items: [
          'Social Inequity: The privileged 1st & 2nd estates paid zero taxes while the 3rd Estate starved',
          'July 14, 1789: Storming of the Bastille marked the popular insurrection',
          'Rights of Man: Proclaimed universal civil liberty, equality, and sovereignty'
        ]
      },
      {
        type: 'diagram',
        shapes: [
          { kind: 'box', x: 40, y: 15, w: 125, h: 48, label: 'Monarchy & Debt' },
          { kind: 'arrow', from: [170, 39], to: [205, 39], label: '' },
          { kind: 'box', x: 210, y: 15, w: 125, h: 48, label: 'Bastille (1789)' },
          { kind: 'arrow', from: [340, 39], to: [375, 39], label: '' },
          { kind: 'box', x: 380, y: 15, w: 125, h: 48, label: 'Terror (1793)' },
          { kind: 'arrow', from: [510, 39], to: [545, 39], label: '' },
          { kind: 'box', x: 550, y: 15, w: 110, h: 48, label: 'Napoleon' }
        ]
      },
      {
        type: 'checkpoint',
        question: 'Why did the revolutionaries feel compelled to execute King Louis XVI rather than merely exile him?',
        hint: 'Consider the threat of foreign monarchies rallying around a living claimant to the French throne.'
      },
      { type: 'emphasize', text: 'Liberté, Égalité, Fraternité', style: 'box' }
    ]
  },

  dna_genetics: {
    aliases: ['dna and genetics', 'dna & genetics', 'dna', 'genetics', 'double helix', 'dna replication', 'genetic code'],
    title: 'DNA and Genetics',
    xpReward: 105,
    difficulty: 'Intermediate',
    keyTerms: ['Nucleotide', 'Double Helix', 'Transcription', 'Codon'],
    rabbitHoles: [
      'How does 2 meters of DNA pack neatly inside the microscopic nucleus of every human cell?',
      'What percentage of human DNA is actually viral remnants from ancient prehistoric infections?',
      'Can CRISPR gene editing eradicate hereditary diseases permanently across future generations?'
    ],
    quiz: [
      {
        question: 'In DNA base pairing, which nucleotide base always pairs with Adenine (A)?',
        options: ['Guanine (G)', 'Cytosine (C)', 'Thymine (T)', 'Uracil (U)'],
        correct: 2,
        explanation: 'Adenine binds specifically to Thymine via two hydrogen bonds in the DNA double helix.'
      },
      {
        question: 'What is the role of messenger RNA (mRNA) in protein synthesis?',
        options: ['Transcribes genetic code and carries it to ribosomes', 'Stores energy in ATP', 'Replicates cellular organelles', 'Breaks down toxic waste'],
        correct: 0,
        explanation: 'mRNA carries the transcribed genetic instructions from the cell nucleus out to the ribosomes for translation.'
      },
      {
        question: 'How many nucleotide bases compose a single codon that specifies an amino acid?',
        options: ['2', '3', '4', '6'],
        correct: 1,
        explanation: 'Codons are triplets of nucleotides; 64 possible 3-letter combinations code for the 20 biological amino acids.'
      }
    ],
    funFact: 'If you unraveled and connected end-to-end all the DNA strands in your body, they would stretch to Pluto and back twice!',
    blocks: [
      { type: 'heading', text: 'DNA & Genetics: The Digital Code of Life' },
      { type: 'text', text: 'Deoxyribonucleic acid (DNA) stores genetic instructions inside an elegant double-helix polymer composed of four nitrogenous bases.' },
      { type: 'equation', text: 'A = T   |   C = G   (Watson-Crick Complementary Base Pairing)' },
      {
        type: 'bullet',
        items: [
          'Nucleotide Structure: Phosphate group, deoxyribose sugar, and a nitrogenous base',
          'Central Dogma: DNA is transcribed into mRNA, which is translated by ribosomes into proteins',
          'Gene Expression: Regulates which traits and enzymes are activated in specialized tissues'
        ]
      },
      {
        type: 'diagram',
        shapes: [
          { kind: 'box', x: 50, y: 15, w: 130, h: 48, label: 'DNA (Nucleus)' },
          { kind: 'arrow', from: [185, 39], to: [235, 39], label: 'Transcription' },
          { kind: 'box', x: 240, y: 15, w: 140, h: 48, label: 'mRNA Transcripts' },
          { kind: 'arrow', from: [385, 39], to: [435, 39], label: 'Translation' },
          { kind: 'box', x: 440, y: 15, w: 150, h: 48, label: 'Functional Proteins' }
        ]
      },
      {
        type: 'checkpoint',
        question: 'If a single nucleotide base is accidentally deleted during replication, why does it ruin the entire protein?',
        hint: 'Think about how reading frames shift when reading 3-letter codons.'
      },
      { type: 'emphasize', text: 'Universal Operating System of Biology', style: 'circle' }
    ]
  },

  python_basics: {
    aliases: ['python programming basics', 'python basics', 'python programming', 'python', 'learn python', 'python code'],
    title: 'Python Programming Basics',
    xpReward: 85,
    difficulty: 'Beginner',
    keyTerms: ['Variable', 'Data Type', 'Control Flow', 'Function'],
    rabbitHoles: [
      'Why was Python designed with mandatory whitespace indentation instead of curly braces {}?',
      'How does Python dynamically type variables without explicit memory declarations?',
      'Why did Python become the undisputed lingua franca for machine learning and artificial intelligence?'
    ],
    quiz: [
      {
        question: 'Which keyword is used to declare a reusable function in Python?',
        options: ['function', 'def', 'fn', 'func'],
        correct: 1,
        explanation: 'In Python, functions are defined using the "def" keyword followed by the function name and parameters.'
      },
      {
        question: 'Which built-in Python data structure stores ordered, mutable elements in square brackets?',
        options: ['Tuple', 'Set', 'List', 'Dictionary'],
        correct: 2,
        explanation: 'Lists are written with square brackets [1, 2, 3] and are mutable, allowing additions and modifications.'
      },
      {
        question: 'What is the index of the first item in a Python sequence?',
        options: ['0', '1', '-1', 'null'],
        correct: 0,
        explanation: 'Python uses zero-based indexing; my_list[0] accesses the very first item.'
      }
    ],
    funFact: 'Python was named not after the constrictor reptile, but after creator Guido van Rossum’s favorite BBC comedy troupe: Monty Python!',
    blocks: [
      { type: 'heading', text: 'Python: Elegance, Readability & Logic' },
      { type: 'text', text: 'Python is a high-level, interpreted programming language engineered for clean syntax, human readability, and rapid problem-solving.' },
      {
        type: 'bullet',
        items: [
          'Dynamic Typing: Variables are created simply by assignment (e.g. score = 100, name = "Ada")',
          'Meaningful Indentation: Whitespace strictly defines code blocks, replacing brackets',
          'Rich Built-ins: High-level primitives like lists [], tuples (), and dictionaries {}'
        ]
      },
      { type: 'equation', text: 'def calculate_mastery(xp): return xp >= 100' },
      {
        type: 'diagram',
        shapes: [
          { kind: 'box', x: 50, y: 15, w: 140, h: 48, label: 'Source (.py)' },
          { kind: 'arrow', from: [195, 39], to: [245, 39], label: 'Compile' },
          { kind: 'box', x: 250, y: 15, w: 150, h: 48, label: 'Bytecode (.pyc)' },
          { kind: 'arrow', from: [405, 39], to: [455, 39], label: 'Run' },
          { kind: 'box', x: 460, y: 15, w: 150, h: 48, label: 'Python VM (PVM)' }
        ]
      },
      {
        type: 'checkpoint',
        question: 'What is the crucial difference between the operators "=" and "==" in Python?',
        hint: 'One assigns a value to a variable name; the other performs an equality evaluation.'
      },
      { type: 'emphasize', text: 'Readability Counts (The Zen of Python)', style: 'box' }
    ]
  },

  quadratic_equations: {
    aliases: ['algebra quadratic equations', 'quadratic equations', 'quadratics', 'quadratic formula', 'quadratic', 'algebra quadratics'],
    title: 'Algebra: Quadratic Equations',
    xpReward: 95,
    difficulty: 'Intermediate',
    keyTerms: ['Parabola', 'Discriminant', 'Vertex', 'Roots'],
    rabbitHoles: [
      'Why does every thrown basketball and ballistic trajectory trace an exact quadratic parabola?',
      'What happens when the discriminant (b^2 - 4ac) is negative? Where do the roots physically exist?',
      'How did ancient Babylonian mathematicians solve quadratic problems 4,000 years ago without algebraic symbols?'
    ],
    quiz: [
      {
        question: 'What is the standard algebraic form of a single-variable quadratic equation?',
        options: ['ax + b = 0', 'ax^2 + bx + c = 0', 'ax^3 + bx^2 + c = 0', 'y = mx + b'],
        correct: 1,
        explanation: 'Standard quadratic form is ax^2 + bx + c = 0, where a, b, and c are constants with a ≠ 0.'
      },
      {
        question: 'What does a positive discriminant (b^2 - 4ac > 0) reveal about the roots?',
        options: ['Zero roots exist', 'One single repeated root', 'Two distinct real roots', 'Two imaginary roots'],
        correct: 2,
        explanation: 'When D > 0, the square root produces positive and negative real solutions, yielding two real x-intercepts.'
      },
      {
        question: 'What geometric shape is formed when graphing a quadratic function on a Cartesian plane?',
        options: ['Hyperbola', 'Parabola', 'Ellipse', 'Linear Vector'],
        correct: 1,
        explanation: 'Quadratic functions produce a symmetric, U-shaped curve called a parabola opening upwards or downwards.'
      }
    ],
    funFact: 'The quadratic formula was discovered geometrically by completing the square using actual physical clay area models!',
    blocks: [
      { type: 'heading', text: 'Algebra: Quadratic Equations & Parabolas' },
      { type: 'text', text: 'A quadratic equation is a polynomial equation of degree two. Its geometric graph forms a symmetric parabola governing projectile motion.' },
      { type: 'equation', text: 'ax^2 + bx + c = 0    [where a != 0]' },
      { type: 'equation', text: 'x = [ -b +/- sqrt(b^2 - 4ac) ] / (2a)' },
      {
        type: 'bullet',
        items: [
          'Discriminant D = b^2 - 4ac dictates root behavior and x-axis intersections',
          'D > 0: Two real roots | D = 0: One repeated root | D < 0: Complex conjugate roots',
          'Axis of symmetry and vertex occur at x = -b / (2a)'
        ]
      },
      {
        type: 'diagram',
        shapes: [
          { kind: 'box', x: 50, y: 15, w: 150, h: 48, label: 'ax^2 + bx + c = 0' },
          { kind: 'arrow', from: [205, 39], to: [255, 39], label: '' },
          { kind: 'box', x: 260, y: 15, w: 160, h: 48, label: 'D = b^2 - 4ac' },
          { kind: 'arrow', from: [425, 39], to: [475, 39], label: '' },
          { kind: 'box', x: 480, y: 15, w: 140, h: 48, label: 'Solve for x1, x2' }
        ]
      },
      {
        type: 'checkpoint',
        question: 'If the leading coefficient "a" is negative, does the parabola open upwards or downwards?',
        hint: 'Consider what happens to y when x becomes an extremely large positive or negative number.'
      },
      { type: 'emphasize', text: 'The Signature Curve of Gravity & Physics', style: 'underline' }
    ]
  },

  internet_works: {
    aliases: ['how the internet works', 'the internet', 'internet', 'how internet works', 'tcp/ip', 'dns', 'packet switching'],
    title: 'How the Internet Works',
    xpReward: 90,
    difficulty: 'Beginner',
    keyTerms: ['Packet Switching', 'IP Address', 'DNS', 'TCP/IP'],
    rabbitHoles: [
      'How do deep-sea fiber optic cables cross the Pacific Ocean without snapping under immense tectonic pressure?',
      'Why can a single email packet travel through 15 different countries before reaching your screen?',
      'What happens to the global routing system if a major ISP makes a BGP routing error?'
    ],
    quiz: [
      {
        question: 'What global directory translates human domain names (like google.com) into numeric IP addresses?',
        options: ['HTML', 'DNS (Domain Name System)', 'FTP', 'DHCP'],
        correct: 1,
        explanation: 'DNS acts as the Internet’s phonebook, mapping readable URLs to machine-routable IP addresses.'
      },
      {
        question: 'How is data physically transmitted across the Internet network?',
        options: ['As continuous analogue streams', 'As segmented packets that travel independently', 'Directly through telephone lines', 'Via satellite radio only'],
        correct: 1,
        explanation: 'Packet switching chops large data payloads into small numbered packets routed along diverse paths.'
      },
      {
        question: 'Which networking protocol guarantees reliable, in-order packet delivery using acknowledgments?',
        options: ['UDP', 'TCP (Transmission Control Protocol)', 'IP', 'HTTP'],
        correct: 1,
        explanation: 'TCP establishes reliable connections, resending lost packets and reordering them correctly.'
      }
    ],
    funFact: 'Over 99% of all international intercontinental data traffic travels through submarine cables on the ocean floor, not satellites!',
    blocks: [
      { type: 'heading', text: 'How the Internet Works: The Global Mesh' },
      { type: 'text', text: 'The Internet is a decentralized network of networks, allowing billions of devices to exchange packets using universal TCP/IP protocols.' },
      {
        type: 'bullet',
        items: [
          'DNS Lookup: Maps human-friendly hostnames to binary or hexadecimal IP addresses',
          'Packet Switching: Divides data streams into small, independently routed packets',
          'Routers: Intermediary hardware directing traffic across optimal optical pathways'
        ]
      },
      {
        type: 'diagram',
        shapes: [
          { kind: 'box', x: 40, y: 15, w: 120, h: 48, label: 'Browser Client' },
          { kind: 'arrow', from: [165, 39], to: [205, 39], label: 'DNS' },
          { kind: 'box', x: 210, y: 15, w: 130, h: 48, label: 'DNS Resolution' },
          { kind: 'arrow', from: [345, 39], to: [385, 39], label: 'TCP/IP' },
          { kind: 'box', x: 390, y: 15, w: 130, h: 48, label: 'Mesh Routers' },
          { kind: 'arrow', from: [525, 39], to: [565, 39], label: 'HTTP' },
          { kind: 'box', x: 570, y: 15, w: 110, h: 48, label: 'Web Server' }
        ]
      },
      { type: 'equation', text: 'URL Request  -->  DNS IP  -->  TCP Handshake  -->  Packets  -->  Render' },
      {
        type: 'checkpoint',
        question: 'Why is packet switching much more resilient to infrastructure damage than traditional phone circuits?',
        hint: 'If a single undersea cable is severed, where do the remaining packets automatically route?'
      },
      { type: 'emphasize', text: 'Decentralized, Resilient Architecture', style: 'box' }
    ]
  },

  climate_change: {
    aliases: ['climate change', 'global warming', 'greenhouse effect', 'carbon cycle', 'climate'],
    title: 'Climate Change & The Greenhouse Effect',
    xpReward: 85,
    difficulty: 'Beginner',
    keyTerms: ['Greenhouse Effect', 'Carbon Sink', 'Albedo Effect', 'Feedback Loop'],
    rabbitHoles: [
      'Why is carbon dioxide so potent at trapping infrared radiation while nitrogen and oxygen let it pass?',
      'What is the runaway albedo feedback loop caused by melting Arctic polar ice?',
      'How do scientists reconstruct Earth atmospheric temperature from 800,000-year-old Antarctic ice cores?'
    ],
    quiz: [
      {
        question: 'What is the primary driver of increased atmospheric CO2 since the Industrial Revolution?',
        options: ['Volcanic eruptions', 'Combustion of fossil fuels for energy and industry', 'Natural ocean degasification', 'Solar flares'],
        correct: 1,
        explanation: 'Fossil fuel combustion has raised atmospheric CO2 from ~280 ppm pre-industrial to over 420 ppm today.'
      },
      {
        question: 'How do greenhouse gases warm the planet’s surface?',
        options: ['By reflecting incoming solar light', 'By absorbing outgoing infrared heat and re-radiating it', 'By blocking solar ultraviolet radiation', 'By producing internal nuclear heat'],
        correct: 1,
        explanation: 'Greenhouse gases allow visible light to pass but absorb and re-emit longwave infrared radiation back toward Earth.'
      },
      {
        question: 'Which natural reservoirs serve as Earth’s primary carbon sinks?',
        options: ['Deserts and glaciers', 'Oceans, forests, and peatlands', 'Urban concrete', 'Atmospheric ozone'],
        correct: 1,
        explanation: 'Oceans and terrestrial biomes absorb roughly half of all human-generated carbon emissions.'
      }
    ],
    funFact: 'Without the natural greenhouse effect, Earth’s average surface temperature would be a frozen -18°C (0°F) instead of a habitable +15°C!',
    blocks: [
      { type: 'heading', text: 'Climate Change: The Thermal Blanket' },
      { type: 'text', text: 'Industrial emissions of greenhouse gases alter Earth’s radiative balance by absorbing outgoing thermal infrared radiation within the troposphere.' },
      {
        type: 'bullet',
        items: [
          'Solar Influx: High-energy shortwave solar radiation warms terrestrial and ocean surfaces',
          'Thermal Outflow: Earth radiates lower-frequency infrared energy back toward space',
          'Greenhouse Trapping: Molecules like CO2 and CH4 vibrate, trapping heat in the atmosphere'
        ]
      },
      {
        type: 'diagram',
        shapes: [
          { kind: 'box', x: 50, y: 15, w: 150, h: 48, label: 'Solar Input (Light)' },
          { kind: 'arrow', from: [205, 39], to: [255, 39], label: 'Warms' },
          { kind: 'circle', x: 260, y: 10, w: 60, h: 60, label: 'Earth' },
          { kind: 'arrow', from: [325, 39], to: [375, 39], label: 'Infrared' },
          { kind: 'box', x: 380, y: 15, w: 180, h: 48, label: 'CO2 / CH4 Heat Trap' }
        ]
      },
      { type: 'equation', text: 'Solar Energy In = Infrared Energy Out  (Planetary Equilibrium)' },
      {
        type: 'checkpoint',
        question: 'Why does melting sea ice accelerate global warming faster than melting snow on land?',
        hint: 'Compare the reflectivity (albedo) of bright white ice against deep dark ocean water.'
      },
      { type: 'emphasize', text: 'Preserving the Planetary Thermostat', style: 'underline' }
    ]
  },

  ohms_law: {
    aliases: ["ohm's law", 'ohms law', 'v=ir', 'electrical resistance', 'circuits', 'voltage current resistance'],
    title: "Ohm's Law & Circuit Fundamentals",
    xpReward: 80,
    difficulty: 'Beginner',
    keyTerms: ['Voltage', 'Current', 'Resistance', 'Ohm (Ω)'],
    rabbitHoles: [
      'Why does high-voltage electricity travel over long-distance power grids instead of high current?',
      'What happens to electrical resistance in superconductors when cooled close to absolute zero?',
      'How does a silicon transistor use Ohm law principles to switch digital logic bits billions of times per second?'
    ],
    quiz: [
      {
        question: 'In Ohm’s Law (V = I * R), what physical quantity does "I" represent?',
        options: ['Inductance', 'Current (flow of electric charge)', 'Insulation', 'Intensity of light'],
        correct: 1,
        explanation: 'Current (I) measures the rate of charge flow through a conductor, quantified in Amperes (A).'
      },
      {
        question: 'If resistance remains constant while voltage is tripled, what happens to current?',
        options: ['Current drops by one-third', 'Current triples', 'Current remains identical', 'Current drops to zero'],
        correct: 1,
        explanation: 'Current is directly proportional to voltage; increasing the electrical push triples the charge flow.'
      },
      {
        question: 'What is the standard SI unit of electrical resistance?',
        options: ['Watt', 'Volt', 'Ohm (Ω)', 'Ampere'],
        correct: 2,
        explanation: 'Resistance is measured in Ohms (Ω), named in honor of physicist Georg Simon Ohm.'
      }
    ],
    funFact: 'When Georg Ohm published his law in 1827, the German Minister of Education dismissed it as "a web of naked fancies" before it became the bedrock of modern electronics!',
    blocks: [
      { type: 'heading', text: "Ohm's Law: The Water Pipe Analogy" },
      { type: 'text', text: 'Ohm’s Law governs electrical circuits by defining the exact mathematical relationship between Voltage (push), Current (flow), and Resistance (friction).' },
      { type: 'equation', text: 'V = I * R    [ Voltage (V) = Current (A) x Resistance (Ω) ]' },
      {
        type: 'bullet',
        items: [
          'Voltage (V): The electrical potential difference pushing electrons (like water pressure in a pipe)',
          'Current (I): The volume rate of electron charge passing a cross-section per second',
          'Resistance (R): The material friction that impedes electron flow (like a narrowing of the pipe)'
        ]
      },
      {
        type: 'diagram',
        shapes: [
          { kind: 'box', x: 50, y: 15, w: 140, h: 48, label: 'Voltage (V) [Push]' },
          { kind: 'arrow', from: [195, 39], to: [245, 39], label: '' },
          { kind: 'box', x: 250, y: 15, w: 150, h: 48, label: 'Current (I) [Flow]' },
          { kind: 'arrow', from: [405, 39], to: [455, 39], label: 'Opposed by' },
          { kind: 'box', x: 460, y: 15, w: 160, h: 48, label: 'Resistance (R) [Ohm]' }
        ]
      },
      {
        type: 'checkpoint',
        question: 'If you touch a 9V battery with wet fingers instead of dry skin, why is the tingle stronger?',
        hint: 'Moisture drastically reduces skin resistance R; consider what V = I * R implies for current I.'
      },
      { type: 'emphasize', text: 'The Cornerstone of Modern Electronics', style: 'circle' }
    ]
  },

  water_cycle: {
    aliases: ['the water cycle', 'water cycle', 'hydrologic cycle', 'evaporation condensation precipitation', 'water'],
    title: 'The Water Cycle (Hydrologic Cycle)',
    xpReward: 80,
    difficulty: 'Beginner',
    keyTerms: ['Evaporation', 'Condensation', 'Precipitation', 'Transpiration'],
    rabbitHoles: [
      'How many times has the exact glass of water you drank today passed through a dinosaur?',
      'How can massive atmospheric storm clouds weighing over 500,000 kilograms float effortlessly in the sky?',
      'What tiny percentage of Earth total water is actually accessible liquid freshwater for human civilizations?'
    ],
    quiz: [
      {
        question: 'Which phase of the water cycle converts invisible water vapor into liquid cloud droplets?',
        options: ['Evaporation', 'Condensation', 'Infiltration', 'Transpiration'],
        correct: 1,
        explanation: 'Condensation occurs as warm moisture rises, cools, and forms tiny suspended liquid droplets on microscopic aerosols.'
      },
      {
        question: 'What is the process where vegetation releases moisture into the atmosphere through leaf pores?',
        options: ['Transpiration', 'Photosynthesis', 'Percolation', 'Sublimation'],
        correct: 0,
        explanation: 'Transpiration pulls water from soil through plant stems and evaporates out via microscopic leaf stomata.'
      },
      {
        question: 'What is the primary cosmic engine that powers the global water cycle?',
        options: ['The Moon tidal pull', 'Earth geothermal core', 'Solar thermal radiation', 'Wind currents'],
        correct: 2,
        explanation: 'The Sun provides the thermal heat that evaporates millions of tons of surface water daily.'
      }
    ],
    funFact: 'Water molecules circulating through your bloodstream right now are roughly 4.5 billion years old — older than our solar system itself!',
    blocks: [
      { type: 'heading', text: 'The Water Cycle: Earth’s Closed Loop' },
      { type: 'text', text: 'The hydrologic cycle is the continuous, solar-powered circulation of water as it shifts between solid, liquid, and gaseous phases across the biosphere.' },
      {
        type: 'bullet',
        items: [
          'Evaporation: Solar heat converts liquid water into buoyant atmospheric vapor',
          'Transpiration: Millions of forest trees pump moisture into tropospheric air currents',
          'Condensation & Precipitation: Clouds coalesce and discharge rain, hail, or snow',
          'Infiltration & Runoff: Gravity directs water into aquifers, rivers, and oceans'
        ]
      },
      {
        type: 'diagram',
        shapes: [
          { kind: 'box', x: 40, y: 15, w: 130, h: 48, label: 'Oceans / Evaporation' },
          { kind: 'arrow', from: [175, 39], to: [215, 39], label: 'Rises' },
          { kind: 'box', x: 220, y: 15, w: 140, h: 48, label: 'Clouds (Condensation)' },
          { kind: 'arrow', from: [365, 39], to: [405, 39], label: 'Falls' },
          { kind: 'box', x: 410, y: 15, w: 140, h: 48, label: 'Rain (Precipitation)' },
          { kind: 'arrow', from: [555, 39], to: [595, 39], label: 'Flows' },
          { kind: 'box', x: 600, y: 15, w: 110, h: 48, label: 'Rivers' }
        ]
      },
      {
        type: 'checkpoint',
        question: 'Does Earth ever gain new water from outer space or lose significant water permanently to the cosmos?',
        hint: 'Earth operates as a virtually closed thermodynamic system for matter.'
      },
      { type: 'emphasize', text: 'Every Drop Has Circulated for Billions of Years', style: 'box' }
    ]
  }
};

/* ── Smart Keyword Normalizer & Matcher ─────────────────────── */
function normalizeQuery(str) {
  return (str || '')
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function getSampleLesson(topic) {
  if (!topic) return null;
  const clean = normalizeQuery(topic);
  if (!clean) return null;

  for (const [key, lesson] of Object.entries(SAMPLE_LESSONS)) {
    const keyClean = normalizeQuery(key);
    const matched = (clean === keyClean || clean.includes(keyClean) || keyClean.includes(clean)) ||
      lesson.aliases.some(alias => {
        const normAlias = normalizeQuery(alias);
        return clean === normAlias || clean.includes(normAlias) || normAlias.includes(clean);
      });

    if (matched) {
      const { aliases, ...rest } = lesson;
      return JSON.parse(JSON.stringify(rest));
    }
  }

  return null;
}

function getFallbackLesson(topic) {
  return {
    title: topic.slice(0, 30),
    xpReward: 75,
    difficulty: 'Beginner',
    keyTerms: ['Core Principle', 'Real-World Mechanism', 'Application'],
    rabbitHoles: [
      `What is the most counter-intuitive paradox in ${topic.slice(0, 24)}?`,
      `How does ${topic.slice(0, 24)} directly shape modern technology today?`,
      `What is the next cutting-edge frontier of discovery in ${topic.slice(0, 24)}?`
    ],
    quiz: [
      {
        question: `What is the most critical starting point when studying ${topic.slice(0, 24)}?`,
        options: ['Understand first principles', 'Memorize without context', 'Ignore core mechanics', 'Guess randomly'],
        correct: 0,
        explanation: 'Building on foundational principles establishes durable intuition.'
      },
      {
        question: 'How do abstract concepts best translate into lasting knowledge?',
        options: ['Isolate theory completely', 'Connect concepts to everyday physical analogies', 'Avoid practical exercises', 'Rote repetition'],
        correct: 1,
        explanation: 'Relatable physical analogies anchor abstract theory in memory.'
      },
      {
        question: 'What is the best way to verify conceptual mastery?',
        options: ['Explain it simply to someone else', 'Avoid questioning assumptions', 'Skip practice problems', 'Never revisit the topic'],
        correct: 0,
        explanation: 'The Feynman technique proves true mastery through clear, jargon-free explanation.'
      }
    ],
    funFact: 'Connecting any new concept to an everyday object increases memory retention by over 40%!',
    blocks: [
      { type: 'heading', text: topic.slice(0, 30) },
      { type: 'text', text: `${topic} is a fascinating domain built upon interconnected physical and conceptual foundations.` },
      { type: 'bullet', items: ['Identify primary mechanisms', 'Trace cause-and-effect relationships', 'Bridge theory into practical real-world use'] },
      { type: 'emphasize', text: 'Foundational Mastery In Progress', style: 'box' }
    ]
  };
}

if (typeof window !== 'undefined') {
  window.SAMPLE_LESSONS = SAMPLE_LESSONS;
  window.getSampleLesson = getSampleLesson;
  window.getFallbackLesson = getFallbackLesson;
}

/* ── Teaching extras for the curated lessons ─────────────────────
   reteach: the same idea through a different analogy, shown when a student misses a question.
   careers: where the topic is used in real jobs. Kept separate from the lesson text so the
   hand-written lessons above stay untouched. */
const SAMPLE_EXTRAS = {
  photosynthesis: {
    careers: ['Agricultural scientist: raises crop yield by tuning light and water', 'Botanist: studies how plants capture energy', 'Energy researcher: copies leaf chemistry to make solar fuels'],
    reteach: ['Think of a leaf as a tiny kitchen: its stomata are the doors that let in carbon dioxide, the air ingredient for making sugar.', 'Chloroplasts are factories, and the thylakoid membranes are the solar-panel stacks inside where light is first caught.', 'Plants store captured sunlight as glucose, like charging a battery: sugar is the energy saved for later.'],
  },
  newtons_laws: {
    careers: ['Mechanical engineer: designs machines using force and motion', 'Aerospace engineer: plans rocket thrust and orbits', 'Car safety engineer: designs crash protection around inertia'],
    reteach: ['Your body wants to keep moving at the car’s old speed, like a rolling ball that keeps going until something stops it.', 'Pushing an empty cart is easy. Double the load and the same push speeds it up only half as much.', 'A balloon you let go flies forward because air rushes backward. A rocket pushes gas back, and the gas pushes the rocket forward.'],
  },
  french_revolution: {
    careers: ['Historian: explains how revolutions change societies', 'Lawyer or policy maker: studies the origins of citizens’ rights', 'Journalist: analyses power, protest and public opinion'],
    reteach: ['Imagine a school where only the poorest students pay all the fees while richer ones pay nothing. That was the Third Estate’s burden.', 'The Bastille was a prison and a symbol of royal power, so storming it meant the crowd taking the king’s locked front gate.', 'Robespierre led the Committee of Public Safety during the Terror, and in the end the fear he helped create turned on him.'],
  },
  dna_genetics: {
    careers: ['Genetic counsellor: explains inherited traits to families', 'Biotechnologist: edits genes to build medicines', 'Forensic scientist: matches DNA evidence in investigations'],
    reteach: ['DNA bases fit like puzzle pieces: A only locks with T, and C only locks with G.', 'mRNA is a photocopy of one recipe page from the DNA cookbook, carried out to the ribosome kitchen.', 'Codons are three-letter words: each group of three bases spells out one amino acid in the protein chain.'],
  },
  python_basics: {
    careers: ['Software developer: builds apps and websites', 'Data analyst: cleans and studies data with code', 'AI engineer: trains and deploys machine-learning models'],
    reteach: ['A function is a recipe card with a name: define it once with def, then cook that dish again just by calling its name.', 'A list is a numbered shopping list in square brackets: ordered, and you can add, remove or change items.', 'Python counts from zero like a ruler: the first mark is 0, so the first item sits at position 0.'],
  },
  quadratic_equations: {
    careers: ['Civil engineer: models arches and bridge curves', 'Game developer: simulates the paths of thrown objects', 'Economist: finds maximum profit using curves'],
    reteach: ['Standard form lines up every part: an x-squared term, an x term and a plain number, all set equal to zero.', 'The discriminant tells you how many times the parabola crosses the x-axis. Positive means it cuts through at two separate points.', 'Throw a ball and trace its path. That smooth U-shaped arc is what a quadratic graph looks like.'],
  },
  internet_works: {
    careers: ['Network engineer: keeps data moving between systems', 'Cybersecurity analyst: protects traffic and servers', 'Web developer: builds services that run over the internet'],
    reteach: ['DNS is the internet’s phone book: look up a name like google.com and it gives back the number to call.', 'Data is a long letter torn into numbered postcards. Each may take a different route and all are reassembled at the end.', 'TCP is registered post: every packet is numbered, receipts confirm arrival and missing ones are sent again.'],
  },
  climate_change: {
    careers: ['Climate scientist: models warming and future scenarios', 'Renewable-energy engineer: designs low-carbon power', 'Environmental policy analyst: shapes emission rules'],
    reteach: ['Burning coal, oil and gas releases carbon that was locked underground for millions of years, like opening a long-sealed storeroom into the air.', 'Greenhouse gases act like a blanket: sunlight passes in, but outgoing heat is absorbed and sent back, keeping Earth warmer.', 'Carbon sinks are Earth’s sponges: oceans, forests and peatlands soak up carbon dioxide so less stays in the air.'],
  },
  ohms_law: {
    careers: ['Electrician: sizes wires and fuses safely', 'Electronics engineer: designs circuits and chips', 'Solar installer: plans panels, voltage and current'],
    reteach: ['Think of water in a pipe: current is how much water flows past each second, just as I is how much charge flows.', 'More voltage is more water pressure. With the same pipe, triple the push gives triple the flow.', 'Resistance is how narrow the pipe is, and we measure that narrowness in ohms, written with the Greek letter omega.'],
  },
  water_cycle: {
    careers: ['Hydrologist: tracks rivers, rain and groundwater', 'Meteorologist: forecasts weather from evaporation and clouds', 'Water-resource engineer: plans supply and flood control'],
    reteach: ['When warm invisible vapour rises and cools, it clumps into tiny droplets, like mist forming on a cold glass of water.', 'Plants sweat through tiny leaf pores, releasing water vapour into the air, a bit like breathing out moisture.', 'The sun is the cycle’s engine: its heat evaporates water and drives the winds that carry clouds around.'],
  },
};
Object.entries(SAMPLE_EXTRAS).forEach(([key, extra]) => {
  const lesson = SAMPLE_LESSONS[key];
  if (!lesson) return;
  lesson.careers = extra.careers;
  lesson.quiz.forEach((q, n) => { if (extra.reteach[n]) q.reteach = extra.reteach[n]; });
});

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    SAMPLE_LESSONS,
    getSampleLesson,
    getFallbackLesson
  };
}
