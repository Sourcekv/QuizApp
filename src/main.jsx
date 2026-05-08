import React, { useMemo, useState } from 'react';
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
import { QUESTION_BANK } from './data/questions.js';
import './styles.css';

const QUIZ_SIZE = 30;

const shuffle = (arr = []) => [...arr].sort(() => Math.random() - 0.5);

const sampleQuestions = (filters) => {
  let pool = QUESTION_BANK.filter(
    (q) => (!filters.topic || q.topic === filters.topic) && (!filters.type || q.type === filters.type)
  );

  if (pool.length < QUIZ_SIZE) pool = QUESTION_BANK;

  return shuffle(pool)
    .slice(0, QUIZ_SIZE)
    .map((q) => ({
      ...q,
      options: q.options ? shuffle(q.options) : q.options,
      definitions: q.definitions ? shuffle(q.definitions) : q.definitions,
      pairs: q.pairs ? shuffle(q.pairs) : q.pairs,
      statements: q.statements ? shuffle(q.statements) : q.statements
    }));
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

const isArrayEqual = (a = [], b = []) => a.length === b.length && a.every((x) => b.includes(x));

const evaluateQuestion = (q, answer) => {
  let score = 0;

  if (q.type === 'scenario') score = scoreScenarioAnswer(q, answer);
  else if (q.type === 'matching') score = q.pairs.every((p) => answer?.[p.term] === p.answer) ? 1 : 0;
  else if (q.type === 'truefalse') score = q.statements.every((s) => answer?.[s.text] === s.correct) ? 1 : 0;
  else if (q.type === 'multiple') score = isArrayEqual(answer || [], q.correct) ? 1 : 0;
  else score = answer === q.correct ? 1 : 0;

  return {
    score,
    status: score === 1 ? 'correct' : score === 0.5 ? 'partial' : 'wrong'
  };
};

const formatScore = (value) => Number(value.toFixed(1)).toString();

function App() {
  const [screen, setScreen] = useState('home');
  const [filters, setFilters] = useState({ topic: '', type: '' });
  const [quiz, setQuiz] = useState([]);
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const [history, setHistory] = useState(() => JSON.parse(localStorage.getItem('qaQuizHistory') || '[]'));

  const topics = [...new Set(QUESTION_BANK.map((q) => q.topic))];
  const types = [...new Set(QUESTION_BANK.map((q) => q.type))];
  const current = quiz[index];

  const start = () => {
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
      filters
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
        <div>
          <span className="badge">QA Academy Practice</span>
          <h1>Requirement & Agile QA Quiz App</h1>
          <p>
            Random 30-question practice quizzes focused on BRDs, requirement review, RTM, user stories,
            acceptance criteria, Agile prioritization, and practical QA scenarios.
          </p>
        </div>
        <div className="bank">
          <BookOpen />
          <b>{QUESTION_BANK.length}</b>
          <span>question bank</span>
        </div>
      </header>

      {screen === 'home' && (
        <Home topics={topics} types={types} filters={filters} setFilters={setFilters} start={start} history={history} />
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
    </div>
  );
}

function Home({ topics, types, filters, setFilters, start, history }) {
  return (
    <main className="grid">
      <section className="panel hero">
        <h2>Practice like a real QA exam.</h2>
        <p>
          Each run generates a fresh mixed quiz. Options, matching definitions, and statements are shuffled every time,
          so memorizing order will not help.
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

        <div className="controls">
          <label>
            Topic
            <select value={filters.topic} onChange={(e) => setFilters({ ...filters, topic: e.target.value })}>
              <option value="">All topics</option>
              {topics.map((topic) => (
                <option key={topic}>{topic}</option>
              ))}
            </select>
          </label>

          <label>
            Question type
            <select value={filters.type} onChange={(e) => setFilters({ ...filters, type: e.target.value })}>
              <option value="">Mixed types</option>
              {types.map((type) => (
                <option key={type}>{type}</option>
              ))}
            </select>
          </label>
        </div>

        <button className="primary" onClick={start}>Start random 30-question quiz</button>
      </section>

      <section className="panel">
        <h3>Recent scores</h3>
        {history.length === 0 ? (
          <p className="muted">No quiz attempts yet.</p>
        ) : (
          history.map((h, index) => (
            <div className="scoreline" key={`${h.date}-${index}`}>
              <span>{h.date}</span>
              <b>{formatScore(h.score)}/{h.total}</b>
            </div>
          ))
        )}

        <h3>Included learning areas</h3>
        <ul className="checklist">
          <li>BRD purpose, scope, KPIs, lifecycle, and version control</li>
          <li>QA requirement review: clarity, completeness, consistency, testability</li>
          <li>Static vs dynamic testing and RTM traceability</li>
          <li>User stories, acceptance criteria, and Given-When-Then</li>
          <li>Story points, velocity, planning poker, impact vs effort</li>
          <li>Short written answers with full, partial, or wrong scoring</li>
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

      <QuestionInput q={current} answer={answer} setAnswer={setAnswer} disabled={submitted} />

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

function QuestionInput({ q, answer, setAnswer, disabled }) {
  if (q.type === 'single') {
    return (
      <div className="options">
        {q.options.map((option) => (
          <button disabled={disabled} className={answer === option ? 'selected' : ''} key={option} onClick={() => setAnswer(q.id, option)}>
            {option}
          </button>
        ))}
      </div>
    );
  }

  if (q.type === 'multiple') {
    return (
      <div className="options">
        {q.options.map((option) => {
          const selected = (answer || []).includes(option);
          return (
            <button
              disabled={disabled}
              className={selected ? 'selected' : ''}
              key={option}
              onClick={() => {
                const old = answer || [];
                setAnswer(q.id, selected ? old.filter((x) => x !== option) : [...old, option]);
              }}
            >
              <span className="fakecheck">{selected ? '☑' : '☐'}</span> {option}
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
        {q.statements.map((statement) => (
          <label key={statement.text}>
            <span>{statement.text}</span>
            <select
              disabled={disabled}
              value={answer?.[statement.text] ?? ''}
              onChange={(e) => setAnswer(q.id, { ...(answer || {}), [statement.text]: e.target.value === 'true' })}
            >
              <option value="">Choose</option>
              <option value="true">True</option>
              <option value="false">False</option>
            </select>
          </label>
        ))}
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

  return (
    <div className={`feedback ${result.status}`}>
      {icon}
      <div>
        <h3>{title} <span>{formatScore(result.score)} point{result.score === 1 ? '' : 's'}</span></h3>
        <p>{q.explanation}</p>
        {q.modelAnswer && <p><b>Shortest model answer:</b> {q.modelAnswer}</p>}
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
        <button className="primary" onClick={start}>Generate another 30-question quiz</button>
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
            <p>{q.explanation}</p>
            {q.modelAnswer && <p><b>Shortest model answer:</b> {q.modelAnswer}</p>}
          </details>
        );
      })}
    </main>
  );
}

createRoot(document.getElementById('root')).render(<App />);
