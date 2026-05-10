import React, { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import {
  Trophy,
  RotateCcw,
  CheckCircle2,
  XCircle,
  BookOpen,
  Shuffle,
  Users,
  Target,
  Sparkles,
  AlertTriangle
} from 'lucide-react';
import { QUESTION_PACKS, QUESTION_BANK } from './data/questions.js';
import './styles.css';

const QUIZ_SIZE = 30;
const QUESTION_TYPES = ['single', 'multiple', 'matching', 'truefalse', 'scenario'];

const MASCOT_LINES = {
  preQuiz: [
    'Are you ready for the torture? The edge cases are waiting.',
    'Prepare to be tortured by acceptance criteria, my slave.',
    'It is time for your suffering: 30 questions, no mercy, only QA.',
    'Welcome to the chamber of test cases. Click start when your soul is ready.',
    'Today we hunt ambiguity, missing requirements, and lazy assumptions.'
  ],
  idle: [
    'Hint: testability means you can clearly verify whether the requirement passed or failed.',
    'Tip: a good BRD explains the business need before jumping into the solution.',
    'Remember: acceptance criteria define when the story is done.',
    'QA wisdom: if it is not clear, it is not ready to test.',
    'Traceability connects requirements, test cases, and defects. Lose it and chaos wins.',
    'A user story without acceptance criteria is just a wish with better formatting.',
    'BRD scope tells you what is in, what is out, and what can ruin your sprint.',
    'Given-When-Then is a tiny story: context, action, expected system result.',
    'Static testing finds problems before execution. Your future self will thank you.',
    'QA joke: Why did the tester cross the road? To check the alternate flow.'
  ],
  correct: [
    'Correct! The bug monster retreats for now.',
    'Excellent. That answer passed inspection.',
    'Clean execution. No defect found in that brain.',
    'Well done. Your acceptance criteria survived the review.'
  ],
  partial: [
    'Partially correct. Not a failure, but definitely needs refinement.',
    'Close enough to earn some points, but the requirement still has gaps.',
    'Half credit unlocked. QA calls this: needs clarification.',
    'You found part of the path. Now trace the missing requirement.'
  ],
  wrong: [
    'Wrong. The pillar of shame has updated successfully.',
    'That answer failed regression. Try reading the explanation carefully.',
    'Defect detected. Expected result did not match actual result.',
    'No mercy from the QA dungeon. Review the correct answer.'
  ],
  resultGood: [
    'Strong result. You may leave the torture chamber with honor.',
    'Excellent work. The requirements fear you now.',
    'You survived the sprint review. For now.'
  ],
  resultMid: [
    'Not bad. A few requirements still need clarification.',
    'Decent score. Now retest the weak areas.',
    'You passed smoke testing, but regression is still waiting.'
  ],
  resultLow: [
    'The bug army is laughing. Train again.',
    'Critical defects found in knowledge coverage. Restart recommended.',
    'Back to the lecture dungeon. The requirements demand tribute.'
  ]
};

const MASCOT_IMAGE = {
  idle: '/mascot/idle.png',
  tease: '/mascot/tease.png',
  correct: '/mascot/correct.png',
  wrong: '/mascot/wrong.png',
  partial: '/mascot/partial.png',
  tip: '/mascot/tip.png'
};

const pickLine = (lines = []) => lines[Math.floor(Math.random() * lines.length)] || '';


const shuffle = (arr = []) => [...arr].sort(() => Math.random() - 0.5);

const prepareQuestion = (q) => ({
  ...q,
  options: q.options ? shuffle(q.options) : q.options,
  definitions: q.definitions ? shuffle(q.definitions) : q.definitions,
  pairs: q.pairs ? shuffle(q.pairs) : q.pairs,
  statements: q.statements ? shuffle(q.statements) : q.statements
});

const sampleQuestions = (filters) => {
  const selectedPack = QUESTION_PACKS.find((pack) => pack.id === filters.packId);
  const source = selectedPack?.questions || [];
  let pool = source.filter((q) => (!filters.topic || q.topic === filters.topic) && (!filters.type || q.type === filters.type));

  if (!pool.length) pool = source;

  if (filters.type) {
    return shuffle(pool).slice(0, QUIZ_SIZE).map(prepareQuestion);
  }

  const availableTypes = QUESTION_TYPES.filter((type) => pool.some((q) => q.type === type));
  const perType = Math.floor(QUIZ_SIZE / availableTypes.length);
  let remainder = QUIZ_SIZE % availableTypes.length;
  const selected = [];

  availableTypes.forEach((type) => {
    const typePool = shuffle(pool.filter((q) => q.type === type));
    const amount = perType + (remainder > 0 ? 1 : 0);
    remainder -= 1;
    selected.push(...typePool.slice(0, amount));
  });

  if (selected.length < QUIZ_SIZE) {
    const selectedIds = new Set(selected.map((q) => q.id));
    const filler = shuffle(pool.filter((q) => !selectedIds.has(q.id))).slice(0, QUIZ_SIZE - selected.length);
    selected.push(...filler);
  }

  return shuffle(selected).slice(0, QUIZ_SIZE).map(prepareQuestion);
};

const normalizeText = (value = '') =>
  String(value)
    .toLowerCase()
    .replace(/[’']/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const uniqueTokens = (value = '') => [...new Set(normalizeText(value).split(' ').filter(Boolean))];

const similarityRatio = (answer = '', expected = '') => {
  const answerTokens = uniqueTokens(answer);
  const expectedTokens = uniqueTokens(expected);
  if (!answerTokens.length || !expectedTokens.length) return 0;
  const hits = expectedTokens.filter((token) => answerTokens.includes(token)).length;
  return hits / expectedTokens.length;
};

const scoreScenarioAnswer = (q, answer) => {
  const normalizedAnswer = normalizeText(answer);
  if (!normalizedAnswer) return 0;

  const acceptedAnswers = [q.modelAnswer, ...(q.acceptedAnswers || [])]
    .filter(Boolean)
    .map(normalizeText);

  if (
    acceptedAnswers.some(
      (expected) =>
        normalizedAnswer === expected ||
        normalizedAnswer.includes(expected) ||
        expected.includes(normalizedAnswer) ||
        similarityRatio(normalizedAnswer, expected) >= 0.82
    )
  ) {
    return 1;
  }

  const keywordGroups = q.keywordGroups || [];
  if (keywordGroups.length) {
    const hits = keywordGroups.filter((group) =>
      group.some((keyword) => normalizedAnswer.includes(normalizeText(keyword)))
    ).length;
    const ratio = hits / keywordGroups.length;
    if (ratio >= 0.66) return 1;
    if (ratio >= 0.35) return 0.5;
  }

  const modelRatio = similarityRatio(normalizedAnswer, q.modelAnswer || '');
  if (modelRatio >= 0.7) return 1;
  if (modelRatio >= 0.38) return 0.5;

  return 0;
};

const isCorrectOption = (q, option) => {
  if (q.type === 'multiple') return (q.correct || []).includes(option);
  if (q.type === 'single') return option === q.correct;
  return false;
};

const getCorrectAnswerLines = (q) => {
  if (q.type === 'single') return [q.correct];
  if (q.type === 'multiple') return q.correct || [];
  if (q.type === 'matching') return (q.pairs || []).map((pair) => `${pair.term} → ${pair.answer}`);
  if (q.type === 'truefalse') return (q.statements || []).map((statement) => `${statement.text} → ${statement.correct ? 'True' : 'False'}`);
  if (q.type === 'scenario') return [q.modelAnswer || 'Any clearly similar correct answer'];
  return [];
};

const evaluateQuestion = (q, answer) => {
  let score = 0;

  if (q.type === 'scenario') score = scoreScenarioAnswer(q, answer);
  else if (q.type === 'matching') score = q.pairs.every((p) => answer?.[p.term] === p.answer) ? 1 : 0;
  else if (q.type === 'truefalse') {
    const statements = q.statements || [];
    const correctStatements = statements.filter((s) => answer?.[s.text] === s.correct).length;
    score = statements.length ? correctStatements / statements.length : 0;
  }
  else if (q.type === 'multiple') {
    const correctChoices = q.correct || [];
    const selectedCorrectChoices = (answer || []).filter((choice) => correctChoices.includes(choice)).length;
    score = correctChoices.length ? selectedCorrectChoices / correctChoices.length : 0;
  } else score = answer === q.correct ? 1 : 0;

  return {
    score,
    status: score === 1 ? 'correct' : score > 0 ? 'partial' : 'wrong'
  };
};

const formatScore = (value = 0) => Number(value.toFixed(2)).toString();

function App() {
  const [screen, setScreen] = useState('home');
  const [filters, setFilters] = useState({ packId: '', topic: '', type: '' });
  const [quiz, setQuiz] = useState([]);
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const [history, setHistory] = useState(() => JSON.parse(localStorage.getItem('qaQuizHistory') || '[]'));
  const [mascotMood, setMascotMood] = useState('tease');
  const [mascotMessage, setMascotMessage] = useState(() => pickLine(MASCOT_LINES.preQuiz));

  const selectedPack = QUESTION_PACKS.find((pack) => pack.id === filters.packId);
  const activeQuestions = selectedPack?.questions || [];
  const topics = [...new Set(activeQuestions.map((q) => q.topic))];
  const types = [...new Set(activeQuestions.map((q) => q.type))].sort(
    (a, b) => QUESTION_TYPES.indexOf(a) - QUESTION_TYPES.indexOf(b)
  );
  const current = quiz[index];
  const currentResult = current ? evaluateQuestion(current, answers[current.id]) : null;

  useEffect(() => {
    if (screen === 'home') {
      setMascotMood('tease');
      setMascotMessage(pickLine(MASCOT_LINES.preQuiz));
      return;
    }

    if (screen === 'result') {
      const ratio = quiz.length ? score / quiz.length : 0;
      if (ratio >= 0.8) {
        setMascotMood('correct');
        setMascotMessage(pickLine(MASCOT_LINES.resultGood));
      } else if (ratio >= 0.5) {
        setMascotMood('partial');
        setMascotMessage(pickLine(MASCOT_LINES.resultMid));
      } else {
        setMascotMood('wrong');
        setMascotMessage(pickLine(MASCOT_LINES.resultLow));
      }
      return;
    }

    if (screen === 'quiz' && current) {
      if (submitted && currentResult) {
        setMascotMood(currentResult.status);
        setMascotMessage(pickLine(MASCOT_LINES[currentResult.status]));
      } else {
        setMascotMood(Math.random() > 0.45 ? 'tip' : 'idle');
        setMascotMessage(pickLine(MASCOT_LINES.idle));
      }
    }
  }, [screen, index, submitted, current?.id]);

  useEffect(() => {
    if (screen !== 'quiz' || submitted) return undefined;

    const timer = window.setInterval(() => {
      setMascotMood((oldMood) => (oldMood === 'tip' ? 'idle' : 'tip'));
      setMascotMessage(pickLine(MASCOT_LINES.idle));
    }, 14000);

    return () => window.clearInterval(timer);
  }, [screen, submitted, index]);

  const nudgeMascot = () => {
    if (screen === 'home') {
      setMascotMood('tease');
      setMascotMessage(pickLine(MASCOT_LINES.preQuiz));
      return;
    }

    if (screen === 'quiz' && submitted && currentResult) {
      setMascotMood(currentResult.status);
      setMascotMessage(pickLine(MASCOT_LINES[currentResult.status]));
      return;
    }

    setMascotMood('tip');
    setMascotMessage(pickLine(MASCOT_LINES.idle));
  };

  const start = () => {
    if (!filters.packId) return;
    setQuiz(sampleQuestions(filters));
    setIndex(0);
    setAnswers({});
    setSubmitted(false);
    setScreen('quiz');
  };

  const reset = () => setScreen('home');
  const setAnswer = (id, value) => setAnswers((old) => ({ ...old, [id]: value }));

  const score = useMemo(
    () => quiz.reduce((total, q) => total + evaluateQuestion(q, answers[q.id]).score, 0),
    [quiz, answers]
  );

  const submit = () => setSubmitted(true);

  const next = () => {
    if (index < quiz.length - 1) {
      setIndex(index + 1);
      setSubmitted(false);
    } else {
      finish();
    }
  };

  const finish = () => {
    const result = {
      date: new Date().toLocaleString(),
      score,
      total: quiz.length,
      filters,
      packTitle: selectedPack?.title || ''
    };
    const nextHistory = [result, ...history].slice(0, 8);
    localStorage.setItem('qaQuizHistory', JSON.stringify(nextHistory));
    setHistory(nextHistory);
    setScreen('result');
  };

  return (
    <div className="app-shell">
      <div className="glow one"></div>
      <div className="glow two"></div>

      <header className="topbar">
        <div className="brand-wrap">
          <img
            className="app-logo"
            src="https://i.imgur.com/zuQoQJu.png"
            alt="QuizApp - Learn, Practice, Test, Improve"
          />
        </div>
        <div className="bank">
          <BookOpen />
          <b>{selectedPack ? selectedPack.questions.length : QUESTION_BANK.length}</b>
          <span>{selectedPack ? 'selected pack' : 'total questions'}</span>
        </div>
      </header>

      {screen === 'home' && (
        <Home packs={QUESTION_PACKS} selectedPack={selectedPack} topics={topics} types={types} filters={filters} setFilters={setFilters} start={start} history={history} />
      )}
      {screen === 'quiz' && current && (
        <Quiz
          current={current}
          index={index}
          total={quiz.length}
          answer={answers[current.id]}
          setAnswer={setAnswer}
          submitted={submitted}
          submit={submit}
          next={next}
        />
      )}
      {screen === 'result' && (
        <Result score={score} total={quiz.length} quiz={quiz} answers={answers} start={start} reset={reset} />
      )}

      <Mascot mood={mascotMood} message={mascotMessage} onClick={nudgeMascot} />
    </div>
  );
}

function Home({ packs, selectedPack, topics, types, filters, setFilters, start, history }) {
  return (
    <main className="grid">
      <section className="panel hero">
        <h2>Choose your academy test pack.</h2>
        <p>
          Your academy separates exams by units. Select Test 1, Test 2, or Test 3, then practice with a fresh 30-question quiz from that pack. Mixed mode gives an equal number of each question type.
        </p>

        <div className="cards">
          <div>
            <Target />
            <b>30</b>
            <span>questions per quiz</span>
          </div>
          <div>
            <Shuffle />
            <b>Shuffled</b>
            <span>fresh order every run</span>
          </div>
          <div>
            <Sparkles />
            <b>Smart</b>
            <span>typed-answer scoring</span>
          </div>
        </div>

        <div className="pack-list">
          {packs.map((pack) => (
            <button
              key={pack.id}
              type="button"
              className={filters.packId === pack.id ? 'pack-card active' : 'pack-card'}
              onClick={() => setFilters({ packId: pack.id, topic: '', type: '' })}
            >
              <b>{pack.title}</b>
              <span>{pack.description}</span>
              <em>{pack.questions.length} questions available</em>
            </button>
          ))}
        </div>

        <div className="controls">
          <label>
            Topic
            <select
              value={filters.topic}
              disabled={!selectedPack}
              onChange={(e) => setFilters({ ...filters, topic: e.target.value })}
            >
              <option value="">All topics in selected test</option>
              {topics.map((topic) => (
                <option key={topic}>{topic}</option>
              ))}
            </select>
          </label>

          <label>
            Question type
            <select
              value={filters.type}
              disabled={!selectedPack}
              onChange={(e) => setFilters({ ...filters, type: e.target.value })}
            >
              <option value="">Mixed types - equal balance</option>
              {types.map((type) => (
                <option key={type} value={type}>{typeLabel(type)}</option>
              ))}
            </select>
          </label>
        </div>

        <button className="primary" onClick={start} disabled={!selectedPack}>Start selected 30-question quiz</button>
      </section>

      <section className="panel">
        <h3>Recent scores</h3>
        {history.length === 0 ? (
          <p className="muted">No quiz attempts yet.</p>
        ) : (
          history.map((h, index) => (
            <div className="scoreline" key={`${h.date}-${index}`}>
              <span>{h.date}{h.packTitle ? ` · ${h.packTitle}` : ''}</span>
              <b>{formatScore(h.score)}/{h.total}</b>
            </div>
          ))
        )}

        <h3>Included learning areas</h3>
        <ul className="checklist">
          <li>Test 1: QA basics, testing concepts, Agile/Scrum, tools, and complete STLC</li>
          <li>Test 2: UI testing, Sandbox/Dragon UI, PAS, quote creation, policy lifecycle, rating, and transactions</li>
          <li>Test 3: BRD, requirement review, RTM, user stories, acceptance criteria, GWT, and prioritization</li>
          <li>Mixed mode gives an equal number of single, multiple, matching, true/false, and written questions</li>
          <li>Multiple-correct and true/false questions support partial scoring</li>
          <li>Short written answers accept similar wording and can award half points</li>
        </ul>
      </section>
    </main>
  );
}

function Quiz({ current, index, total, answer, setAnswer, submitted, submit, next }) {
  const result = evaluateQuestion(current, answer);

  return (
    <main className="panel quiz">
      <div className="progress">
        <span>Question {index + 1} of {total}</span>
        <div><i style={{ width: `${((index + 1) / total) * 100}%` }}></i></div>
      </div>

      <span className="badge">{current.topic} · {typeLabel(current.type)}</span>
      <h2>{current.prompt}</h2>

      {current.type === 'scenario' && (
        <p className="hint">Write the shortest clear answer possible. The app accepts similar wording and can award half a point.</p>
      )}

      <QuestionInput q={current} answer={answer} setAnswer={setAnswer} disabled={submitted} submitted={submitted} />

      {submitted && <Feedback q={current} result={result} />}

      <div className="actions">
        <button className="ghost" onClick={() => location.reload()}>
          <RotateCcw size={18} /> restart app
        </button>

        {!submitted ? (
          <button className="primary" onClick={submit} disabled={!hasAnswered(current, answer)}>Check answer</button>
        ) : (
          <button className="primary" onClick={next}>{index === total - 1 ? 'Finish quiz' : 'Next question'}</button>
        )}
      </div>
    </main>
  );
}

function typeLabel(type) {
  const labels = {
    single: 'single answer',
    multiple: 'multiple correct',
    matching: 'matching',
    truefalse: 'true / false selection',
    scenario: 'short written answer'
  };
  return labels[type] || type;
}

function hasAnswered(q, answer) {
  if (!answer) return false;
  if (q.type === 'multiple') return answer.length > 0;
  if (q.type === 'matching') return Object.keys(answer).length === q.pairs.length;
  if (q.type === 'truefalse') return Object.keys(answer).length === q.statements.length;
  if (q.type === 'scenario') return answer.trim().length > 0;
  return true;
}

function QuestionInput({ q, answer, setAnswer, disabled, submitted }) {
  if (q.type === 'single') {
    return (
      <div className="options">
        {q.options.map((option) => {
          const correct = isCorrectOption(q, option);
          const classes = [answer === option ? 'selected' : '', submitted ? (correct ? 'correct-choice' : 'wrong-choice') : '']
            .filter(Boolean)
            .join(' ');

          return (
            <button disabled={disabled} className={classes} key={option} onClick={() => setAnswer(q.id, option)}>
              {submitted && <span className={`choice-mark ${correct ? 'ok' : 'bad'}`}>{correct ? '✓' : '✕'}</span>}
              {option}
            </button>
          );
        })}
      </div>
    );
  }

  if (q.type === 'multiple') {
    return (
      <div className="options">
        {q.options.map((option) => {
          const selected = (answer || []).includes(option);
          const correct = isCorrectOption(q, option);
          const classes = [selected ? 'selected' : '', submitted ? (correct ? 'correct-choice' : 'wrong-choice') : '']
            .filter(Boolean)
            .join(' ');

          return (
            <button
              disabled={disabled}
              className={classes}
              key={option}
              onClick={() => {
                const old = answer || [];
                setAnswer(q.id, selected ? old.filter((x) => x !== option) : [...old, option]);
              }}
            >
              {submitted ? (
                <span className={`choice-mark ${correct ? 'ok' : 'bad'}`}>{correct ? '✓' : '✕'}</span>
              ) : (
                <span className="fakecheck">{selected ? '☑' : '☐'}</span>
              )}
              {option}
            </button>
          );
        })}
      </div>
    );
  }

  if (q.type === 'matching') {
    return (
      <div className="matching">
        {q.pairs.map((pair) => (
          <label key={pair.term}>
            <b>{pair.term}</b>
            <select
              disabled={disabled}
              value={answer?.[pair.term] || ''}
              onChange={(e) => setAnswer(q.id, { ...(answer || {}), [pair.term]: e.target.value })}
            >
              <option value="">Choose definition</option>
              {q.definitions.map((definition) => (
                <option key={definition} value={definition}>{definition}</option>
              ))}
            </select>
          </label>
        ))}
      </div>
    );
  }

  if (q.type === 'truefalse') {
    return (
      <div className="tf">
        {q.statements.map((statement) => {
          const userValue = answer?.[statement.text];
          const answeredCorrectly = submitted && userValue === statement.correct;
          const answeredWrongly = submitted && userValue !== statement.correct;
          const classes = [answeredCorrectly ? 'tf-correct' : '', answeredWrongly ? 'tf-wrong' : '']
            .filter(Boolean)
            .join(' ');

          return (
            <label key={statement.text} className={classes}>
              <span>
                {submitted && (
                  <strong className={`choice-mark ${answeredCorrectly ? 'ok' : 'bad'}`}>
                    {answeredCorrectly ? '✓' : '✕'}
                  </strong>
                )}
                {statement.text}
              </span>
              <select
                disabled={disabled}
                value={userValue ?? ''}
                onChange={(e) => setAnswer(q.id, { ...(answer || {}), [statement.text]: e.target.value === 'true' })}
              >
                <option value="">Choose</option>
                <option value="true">True</option>
                <option value="false">False</option>
              </select>
            </label>
          );
        })}
      </div>
    );
  }

  return (
    <textarea
      disabled={disabled}
      placeholder="Example: measurable response time"
      value={answer || ''}
      onChange={(e) => setAnswer(q.id, e.target.value)}
    />
  );
}

function Feedback({ q, result }) {
  const icon = result.status === 'correct' ? <CheckCircle2 /> : result.status === 'partial' ? <AlertTriangle /> : <XCircle />;
  const title = result.status === 'correct' ? 'Correct!' : result.status === 'partial' ? 'Partially correct.' : 'Not quite.';
  const correctLines = getCorrectAnswerLines(q);

  return (
    <div className={`feedback ${result.status}`}>
      {icon}
      <div>
        <h3>{title} <span>{formatScore(result.score)} point{result.score === 1 ? '' : 's'}</span></h3>

        <div className="correct-answer-box">
          <b>Full correct answer:</b>
          {correctLines.length > 1 ? (
            <ul>
              {correctLines.map((line) => <li key={line}>{line}</li>)}
            </ul>
          ) : (
            <p>{correctLines[0]}</p>
          )}
        </div>

        <p><b>Expanded explanation:</b> {q.explanation}</p>
      </div>
    </div>
  );
}

function Result({ score, total, quiz, answers, start, reset }) {
  return (
    <main className="panel result">
      <Trophy className="trophy" />
      <h2>Quiz completed</h2>
      <p className="bigscore">{formatScore(score)}/{total}</p>
      <p>
        {score >= 24
          ? 'Excellent. You are ready for harder requirement-analysis and scenario practice.'
          : score >= 18
            ? 'Good result. Review the explanations below and try another random set.'
            : 'Keep practicing. Focus on definitions, ambiguity, acceptance criteria, and requirement traceability.'}
      </p>

      <div className="actions">
        <button className="primary" onClick={start}>Generate another quiz from selected test</button>
        <button className="ghost" onClick={reset}>Back to home</button>
      </div>

      <h3>Review</h3>
      {quiz.map((q, i) => {
        const result = evaluateQuestion(q, answers[q.id]);
        return (
          <details key={q.id}>
            <summary>
              {i + 1}. {q.prompt} — {result.status === 'correct' ? 'Correct' : result.status === 'partial' ? 'Partial' : 'Review'} ({formatScore(result.score)} pts)
            </summary>
            <div className="review-answer">
              <b>Full correct answer:</b>
              <ul>
                {getCorrectAnswerLines(q).map((line) => <li key={line}>{line}</li>)}
              </ul>
            </div>
            <p><b>Expanded explanation:</b> {q.explanation}</p>
          </details>
        );
      })}
    </main>
  );
}


function Mascot({ mood, message, onClick }) {
  const sprite = MASCOT_IMAGE[mood] || MASCOT_IMAGE.idle;
  const label = mood === 'correct'
    ? 'Happy QA mascot'
    : mood === 'wrong'
      ? 'Angry QA mascot'
      : mood === 'partial'
        ? 'Shrugging QA mascot'
        : 'QA mascot';

  return (
    <aside className={`mascot mascot-${mood}`} aria-label="Animated QA mascot">
      <button className="mascot-bubble" onClick={onClick} title="Click for another QA tip">
        {message}
      </button>
      <button className="mascot-stage" onClick={onClick} title="Click for another QA tip">
        <span className="mascot-shadow"></span>
        <img src={sprite} alt={label} />
      </button>
    </aside>
  );
}

createRoot(document.getElementById('root')).render(<App />);
