'use strict';

const { test, describe, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

describe('SlateMind Frontend Modules Unit Test Suite', () => {
  let context;

  beforeEach(() => {
    // Setup clean browser-like global sandbox
    const storage = new Map();
    const mockLocalStorage = {
      getItem: (k) => storage.has(k) ? storage.get(k) : null,
      setItem: (k, v) => storage.set(k, String(v)),
      removeItem: (k) => storage.delete(k),
      clear: () => storage.clear()
    };

    const mockElements = new Map();
    const getMockElement = (id) => {
      if (!mockElements.has(id)) {
        mockElements.set(id, {
          id,
          style: {},
          classList: {
            classes: new Set(),
            add(c) { this.classes.add(c); },
            remove(c) { this.classes.delete(c); },
            toggle(c, force) {
              if (force === undefined) {
                if (this.classes.has(c)) this.classes.delete(c);
                else this.classes.add(c);
              } else if (force) {
                this.classes.add(c);
              } else {
                this.classes.delete(c);
              }
            },
            contains(c) { return this.classes.has(c); }
          },
          textContent: '',
          innerHTML: '',
          children: [], appendChild(c) { this.children = this.children || []; this.children.push(c); },
          prepend() {},
          addEventListener() {},
          remove() {}
        });
      }
      return mockElements.get(id);
    };

    const mockDocument = {
      getElementById: (id) => getMockElement(id),
      createElement: (tag) => getMockElement(`mock-${tag}-${Math.random()}`),
      querySelectorAll: () => [],
      querySelector: () => null,
      documentElement: {
        style: {
          setProperty() {}
        }
      },
      body: {
        appendChild() {}
      }
    };

    const mockWindow = {
      localStorage: mockLocalStorage,
      document: mockDocument,
      addEventListener: () => {},
      dispatchEvent: () => {},
      innerWidth: 1920,
      innerHeight: 1080
    };
    mockWindow.window = mockWindow;

    context = vm.createContext({
      window: mockWindow,
      document: mockDocument,
      localStorage: mockLocalStorage,
      assert,
      console,
      setTimeout,
      clearTimeout,
      Date,
      Math,
      String,
      JSON,
      Array,
      Set,
      Map
    });

    // Load state.js into context
    const stateCode = fs.readFileSync(path.join(__dirname, '../public/state.js'), 'utf8');
    vm.runInContext(stateCode, context);

    // Load gamification.js into context
    const gamificationCode = fs.readFileSync(path.join(__dirname, '../public/gamification.js'), 'utf8');
    vm.runInContext(gamificationCode, context);

    // Load quiz.js into context
    const quizCode = fs.readFileSync(path.join(__dirname, '../public/quiz.js'), 'utf8');
    vm.runInContext(quizCode, context);

    // Load learning.js (answer tracking used by quiz.js)
    const learningCode = fs.readFileSync(path.join(__dirname, '../public/learning.js'), 'utf8');
    vm.runInContext(learningCode, context);
  });

  describe('1. State & Persistence (state.js)', () => {
    test('Initializes with default state values', () => {
      vm.runInContext('load();', context);
      const state = vm.runInContext('STATE;', context);
      assert.equal(state.playerName, 'Student');
      assert.equal(state.level, 1);
      assert.equal(state.totalXP, 0);
      assert.equal(state.lessonsCompleted, 0);
      assert.equal(state.soundOn, true);
      assert.equal(state.teachStyle, 'mentor');
      assert.equal(state.autoScroll, true);
    });

    test('save() and load() persist custom properties to localStorage', () => {
      vm.runInContext(`
        load();
        STATE.playerName = 'Marie Curie';
        STATE.totalXP = 450;
        save();
        STATE = {};
        load();
      `, context);
      const state = vm.runInContext('STATE;', context);
      assert.equal(state.playerName, 'Marie Curie');
      assert.equal(state.totalXP, 450);
    });

    test('esc() sanitizes HTML tags correctly', () => {
      const escaped = vm.runInContext('esc("<script>alert(\'test\')</script>&");', context);
      assert.equal(escaped, '&lt;script&gt;alert(&#39;test&#39;)&lt;/script&gt;&amp;');
    });
  });

  describe('2. Gamification & Progression (gamification.js)', () => {
    test('getLvl(xp) calculates correct levels and titles across all thresholds', () => {
      const tests = [
        { xp: 0, level: 1, title: 'Rookie' },
        { xp: 149, level: 1, title: 'Rookie' },
        { xp: 150, level: 2, title: 'Curious Learner' },
        { xp: 350, level: 3, title: 'Knowledge Seeker' },
        { xp: 600, level: 4, title: 'Smart Cookie' },
        { xp: 950, level: 5, title: 'Brain Explorer' },
        { xp: 1400, level: 6, title: 'Concept Master' },
        { xp: 2000, level: 7, title: 'Tech Wizard' },
        { xp: 2800, level: 8, title: 'Scholar' },
        { xp: 3800, level: 9, title: 'Grand Scholar' },
        { xp: 5000, level: 10, title: 'Professor Byte' },
        { xp: 10000, level: 10, title: 'Professor Byte' },
      ];

      for (const t of tests) {
        const res = vm.runInContext(`getLvl(${t.xp});`, context);
        assert.equal(res.cur.level, t.level, `XP ${t.xp} should be level ${t.level}`);
        assert.equal(res.cur.title, t.title, `XP ${t.xp} title should be ${t.title}`);
      }
    });

    test('awardXP() updates player level and triggers level-up', () => {
      vm.runInContext(`
        load();
        assert.equal(STATE.level, 1);
        awardXP(160, 'test');
      `, context);
      const state = vm.runInContext('STATE;', context);
      assert.equal(state.totalXP, 160);
      assert.equal(state.level, 2);
    });

    test('checkBadges() accurately unlocks badges upon meeting criteria', () => {
      vm.runInContext(`
        load();
        STATE.lessonsCompleted = 1;
        checkBadges();
      `, context);
      let badges = vm.runInContext('STATE.earnedBadges;', context);
      assert.ok(badges.includes('first_lesson'), 'Should unlock first_lesson badge');

      vm.runInContext(`
        STATE.perfectQuizzes = 1;
        checkBadges();
      `, context);
      badges = vm.runInContext('STATE.earnedBadges;', context);
      assert.ok(badges.includes('quiz_perfect'), 'Should unlock quiz_perfect badge');
    });

    test('updateStreak() increments streak on consecutive days', () => {
      const yest = new Date(Date.now() - 86400000).toDateString();
      vm.runInContext(`
        load();
        STATE.lastStudyDate = "${yest}";
        STATE.currentStreak = 2;
        STATE.maxStreak = 2;
        updateStreak();
      `, context);
      const state = vm.runInContext('STATE;', context);
      assert.equal(state.currentStreak, 3);
      assert.equal(state.maxStreak, 3);
    });
  });

  describe('3. Quiz Assessment (quiz.js)', () => {
    test('setupQuizPanel() initializes quiz state', () => {
      const mockQuiz = [
        { question: 'Q1', options: ['A', 'B'], correct: 0, explanation: 'Exp 1' },
        { question: 'Q2', options: ['C', 'D'], correct: 1, explanation: 'Exp 2' },
        { question: 'Q3', options: ['E', 'F'], correct: 0, explanation: 'Exp 3' }
      ];
      vm.runInContext(`
        setupQuizPanel(${JSON.stringify(mockQuiz)});
      `, context);
      const currentQuiz = vm.runInContext('window.currentQuiz;', context);
      const index = vm.runInContext('window.quizIndex;', context);
      const score = vm.runInContext('window.quizScore;', context);

      assert.equal(currentQuiz.length, 3);
      assert.equal(index, 0);
      assert.equal(score, 0);
    });

    test('answerQ() accurately scores correct and incorrect choices and tracks combos', () => {
      const q = { question: 'Q1', options: ['A', 'B'], correct: 0, explanation: 'Exp 1' };
      vm.runInContext(`
        load();
        setupQuizPanel([${JSON.stringify(q)}]);
        answerQ(0, ${JSON.stringify(q)});
      `, context);

      const score = vm.runInContext('window.quizScore;', context);
      let combo = vm.runInContext('window.quizCombo;', context);
      assert.equal(score, 1);
      assert.equal(combo, 1);

      // Wrong answer should reset combo
      const q2 = { question: 'Q2', options: ['A', 'B'], correct: 0, explanation: 'Exp 2' };
      vm.runInContext(`
        answerQ(1, ${JSON.stringify(q2)});
      `, context);
      combo = vm.runInContext('window.quizCombo;', context);
      assert.equal(combo, 0);
    });

    test('renders dynamically any number of options (>4) with correct letter indexing', () => {
      const q = {
        question: 'Which of the following are prime numbers?',
        options: ['2', '4', '6', '8', '11'],
        correct: 4,
        explanation: '11 is prime'
      };
      vm.runInContext(`
        setupQuizPanel([${JSON.stringify(q)}]);
      `, context);
      const opts = vm.runInContext("document.getElementById('quizOptions');", context);
      assert.equal(opts.children.length, 5);
      assert.match(opts.children[4].innerHTML, /<span class="opt-letter">E<\/span>11/);
    });
  });
});
