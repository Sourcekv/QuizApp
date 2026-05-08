import React, { useMemo, useState, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { Trophy, RotateCcw, CheckCircle2, XCircle, BookOpen, Shuffle, Users, Target } from 'lucide-react';
import { QUESTION_BANK } from './data/questions.js';
import './styles.css';

const QUIZ_SIZE = 30;
const shuffle = (arr) => [...arr].sort(() => Math.random() - 0.5);
const sampleQuestions = (filters) => {
  let pool = QUESTION_BANK.filter(q => (!filters.topic || q.topic === filters.topic) && (!filters.type || q.type === filters.type));
  if (pool.length < QUIZ_SIZE) pool = QUESTION_BANK;
  return shuffle(pool).slice(0, QUIZ_SIZE).map(q => ({...q, options: q.options ? shuffle(q.options) : q.options}));
};
const isArrayEqual = (a,b)=> a.length===b.length && a.every(x=>b.includes(x));

function App(){
  const [screen,setScreen]=useState('home');
  const [filters,setFilters]=useState({topic:'',type:''});
  const [quiz,setQuiz]=useState([]);
  const [index,setIndex]=useState(0);
  const [answers,setAnswers]=useState({});
  const [submitted,setSubmitted]=useState(false);
  const [history,setHistory]=useState(()=>JSON.parse(localStorage.getItem('qaQuizHistory')||'[]'));
  const topics=[...new Set(QUESTION_BANK.map(q=>q.topic))];
  const types=[...new Set(QUESTION_BANK.map(q=>q.type))];
  const current=quiz[index];
  const start=()=>{setQuiz(sampleQuestions(filters));setIndex(0);setAnswers({});setSubmitted(false);setScreen('quiz')};
  const reset=()=>setScreen('home');
  const setAnswer=(id,val)=>setAnswers(a=>({...a,[id]:val}));
  const evaluate=(q, ans)=>{
    if(q.type==='scenario') return ans && ans.trim().length>20 ? 'self' : false;
    if(q.type==='matching') return q.pairs.every(p=>ans?.[p.term]===p.answer);
    if(q.type==='truefalse') return q.statements.every(s=>ans?.[s.text]===s.correct);
    if(q.type==='multiple') return isArrayEqual(ans||[], q.correct);
    return ans===q.correct;
  };
  const score = useMemo(()=>quiz.reduce((n,q)=> evaluate(q,answers[q.id])===true ? n+1:n,0),[quiz,answers]);
  const submit=()=>setSubmitted(true);
  const next=()=>{ if(index<quiz.length-1){setIndex(index+1);setSubmitted(false)} else finish(); };
  const finish=()=>{const result={date:new Date().toLocaleString(),score,total:quiz.length,filters}; const nextHist=[result,...history].slice(0,8); localStorage.setItem('qaQuizHistory',JSON.stringify(nextHist)); setHistory(nextHist); setScreen('result');};
  return <div className="app-shell">
    <div className="glow one"></div><div className="glow two"></div>
    <header className="topbar"><div><span className="badge">QA Academy Practice</span><h1>Requirement & Agile QA Quiz App</h1><p>Random 30-question practice quizzes based on your mock exams, BRD lecture, and User Stories / Use Cases lecture.</p></div><div className="bank"><BookOpen/> <b>{QUESTION_BANK.length}</b><span>question bank</span></div></header>
    {screen==='home' && <Home topics={topics} types={types} filters={filters} setFilters={setFilters} start={start} history={history}/>} 
    {screen==='quiz' && current && <Quiz current={current} index={index} total={quiz.length} answer={answers[current.id]} setAnswer={setAnswer} submitted={submitted} submit={submit} next={next} evaluate={evaluate}/>} 
    {screen==='result' && <Result score={score} total={quiz.length} quiz={quiz} answers={answers} evaluate={evaluate} start={start} reset={reset}/>} 
  </div>
}
function Home({topics,types,filters,setFilters,start,history}){return <main className="grid"><section className="panel hero"><h2>Practice like a real QA exam.</h2><p>Each run generates a fresh 30-question quiz with single-choice, multiple-correct, matching, true/false selection, and real-life QA scenarios.</p><div className="cards"><div><Target/><b>30</b><span>questions per quiz</span></div><div><Shuffle/><b>Random</b><span>new order every time</span></div><div><Users/><b>Team-ready</b><span>share as a web app</span></div></div><div className="controls"><label>Topic<select value={filters.topic} onChange={e=>setFilters({...filters,topic:e.target.value})}><option value="">All topics</option>{topics.map(t=><option key={t}>{t}</option>)}</select></label><label>Question type<select value={filters.type} onChange={e=>setFilters({...filters,type:e.target.value})}><option value="">Mixed types</option>{types.map(t=><option key={t}>{t}</option>)}</select></label></div><button className="primary" onClick={start}>Start random 30-question quiz</button></section><section className="panel"><h3>Recent scores</h3>{history.length===0?<p className="muted">No quiz attempts yet.</p>:history.map((h,i)=><div className="scoreline" key={i}><span>{h.date}</span><b>{h.score}/{h.total}</b></div>)}<h3>Included learning areas</h3><ul className="checklist"><li>BRD purpose, scope, KPIs, lifecycle</li><li>QA role in requirements review</li><li>Static vs dynamic testing</li><li>User stories, use cases, RTM</li><li>Acceptance criteria and GWT format</li><li>Sprint planning, backlog, story points, prioritization</li></ul></section></main>}
function Quiz({current,index,total,answer,setAnswer,submitted,submit,next,evaluate}){const correct=evaluate(current,answer); return <main className="panel quiz"><div className="progress"><span>Question {index+1} of {total}</span><div><i style={{width:`${((index+1)/total)*100}%`}}></i></div></div><span className="badge">{current.topic} · {current.type}</span><h2>{current.prompt}</h2><QuestionInput q={current} answer={answer} setAnswer={setAnswer} disabled={submitted}/>{submitted&&<Feedback q={current} correct={correct}/>}<div className="actions"><button className="ghost" onClick={()=>location.reload()}><RotateCcw size={18}/> restart app</button>{!submitted?<button className="primary" onClick={submit} disabled={!hasAnswered(current,answer)}>Check answer</button>:<button className="primary" onClick={next}>{index===total-1?'Finish quiz':'Next question'}</button>}</div></main>}
function hasAnswered(q,a){if(!a)return false; if(q.type==='multiple')return a.length>0; if(q.type==='matching')return Object.keys(a).length===q.pairs.length; if(q.type==='truefalse')return Object.keys(a).length===q.statements.length; if(q.type==='scenario')return a.trim().length>0; return true;}
function QuestionInput({q,answer,setAnswer,disabled}){ if(q.type==='single') return <div className="options">{q.options.map(o=><button disabled={disabled} className={answer===o?'selected':''} key={o} onClick={()=>setAnswer(q.id,o)}>{o}</button>)}</div>;
 if(q.type==='multiple') return <div className="options">{q.options.map(o=><button disabled={disabled} className={(answer||[]).includes(o)?'selected':''} key={o} onClick={()=>{const a=answer||[]; setAnswer(q.id,a.includes(o)?a.filter(x=>x!==o):[...a,o])}}>☐ {o}</button>)}</div>;
 if(q.type==='matching') return <div className="matching">{q.pairs.map(p=><label key={p.term}><b>{p.term}</b><select disabled={disabled} value={answer?.[p.term]||''} onChange={e=>setAnswer(q.id,{...(answer||{}),[p.term]:e.target.value})}><option value="">Choose definition</option>{q.definitions.map(d=><option key={d} value={d}>{d}</option>)}</select></label>)}</div>;
 if(q.type==='truefalse') return <div className="tf">{q.statements.map(s=><label key={s.text}><span>{s.text}</span><select disabled={disabled} value={answer?.[s.text] ?? ''} onChange={e=>setAnswer(q.id,{...(answer||{}),[s.text]:e.target.value==='true'})}><option value="">Choose</option><option value="true">True</option><option value="false">False</option></select></label>)}</div>;
 return <textarea disabled={disabled} placeholder="Write your answer, then compare it with the model answer." value={answer||''} onChange={e=>setAnswer(q.id,e.target.value)} /> }
function Feedback({q,correct}){return <div className={'feedback '+(correct===true?'good':correct==='self'?'self':'bad')}>{correct===true?<CheckCircle2/>:correct==='self'?<BookOpen/>:<XCircle/>}<div><h3>{correct===true?'Correct!':correct==='self'?'Compare your answer':'Not quite.'}</h3><p>{q.explanation}</p>{q.modelAnswer&&<p><b>Model answer:</b> {q.modelAnswer}</p>}</div></div>}
function Result({score,total,quiz,answers,evaluate,start,reset}){return <main className="panel result"><Trophy className="trophy"/><h2>Quiz completed</h2><p className="bigscore">{score}/{total}</p><p>{score>=24?'Excellent. You are ready for harder scenario practice.':score>=18?'Good result. Review the explanations below and try another random set.':'Keep practicing. Focus on definitions, AC, RTM, and requirement ambiguity questions.'}</p><div className="actions"><button className="primary" onClick={start}>Generate another 30-question quiz</button><button className="ghost" onClick={reset}>Back to home</button></div><h3>Review</h3>{quiz.map((q,i)=><details key={q.id}><summary>{i+1}. {q.prompt} — {evaluate(q,answers[q.id])===true?'Correct':'Review'}</summary><p>{q.explanation}</p>{q.modelAnswer&&<p><b>Model answer:</b> {q.modelAnswer}</p>}</details>)}</main>}
createRoot(document.getElementById('root')).render(<App/>);
