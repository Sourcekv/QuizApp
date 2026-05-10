import React, { useState, useEffect, useRef } from 'react';
import imgIdle from './assets/mascot_idle.png';
import imgPresenting from './assets/mascot_presenting.png';
import imgPointing from './assets/mascot_pointing.png';
import imgCelebrating from './assets/mascot_celebrating.png';
import imgAngry from './assets/mascot_angry.png';
import imgShrugging from './assets/mascot_shrugging.png';
import imgIdea from './assets/mascot_idea.png';

const POSES = {
  idle:        imgIdle,
  presenting:  imgPresenting,
  pointing:    imgPointing,
  celebrating: imgCelebrating,
  angry:       imgAngry,
  shrugging:   imgShrugging,
  idea:        imgIdea,
};

const MESSAGES = {
  home: [
    "Are you ready for the torture?",
    "Prepare to be tortured, my slave.",
    "It's time for your suffering. Choose your filter wisely.",
    "Ah, a new victim approaches the quiz.",
    "I hope you studied… I really do.",
    "Click Start Quiz. I dare you.",
    "Remember: a requirement is only as good as its testability. Now suffer.",
  ],
  idle: [
    "A good QA never assumes — they verify.",
    "RTM: Requirement Traceability Matrix. Not a typo.",
    "Static testing finds bugs without running the code. Sneaky, but effective.",
    "Acceptance criteria must be testable. 'User-friendly' is not testable.",
    "Given-When-Then: the holy trinity of user story testing.",
    "Boundary value analysis: test the edges, not the middle.",
    "A BRD without testable requirements is just a wish list.",
    "Why did the QA engineer refuse to test in production? It was already broken.",
    "How many QA engineers does it take to change a lightbulb? We don't change things, we report that it's dark.",
    "A QA walks into a bar. Orders 0 beers. Orders 999999999 beers. Orders -1 beers. Orders a lizard. Orders NULL beers. Orders 'asdfjkl;' beers.",
    "Equivalence partitioning: test one case per class. Don't test them all — you'll be here forever.",
    "Velocity in Agile is the team's average story points per sprint. Not a race.",
    "Planning poker: because estimation by committee beats estimation by one overconfident developer.",
    "A user story without acceptance criteria is like a test without expected results.",
    "Impact vs effort matrix: high impact, low effort = do it yesterday.",
    "Regression testing exists because someone, somewhere, always breaks something that worked.",
    "The difference between a bug and a feature is documentation.",
    "Traceability goes both ways: requirements to tests, and tests back to requirements.",
    "Why do QA engineers make great detectives? They never accept the first answer.",
    "Completeness, clarity, consistency, testability — the four pillars of a good requirement.",
  ],
  correct: [
    "Nailed it! You might survive this quiz after all.",
    "CORRECT! I'm almost impressed.",
    "YES! That's the answer! Don't let it go to your head.",
    "You actually knew that one. Respect.",
    "Correct! The professor would be proud. Maybe.",
    "That's right! One down, suffering continues.",
    "Excellent work! Now don't get cocky.",
  ],
  partial: [
    "Mmm, close-ish. Half a point for half an effort.",
    "Partially correct. You remembered just enough to stay in the game.",
    "I've seen worse. Half credit is still credit.",
    "Almost! You had the idea but lost the details somewhere.",
    "Half points: the QA equivalent of 'it works on my machine'.",
    "That's... partially acceptable. Like a requirement that's almost testable.",
  ],
  wrong: [
    "WRONG! *angry vein intensifies*",
    "That was painfully incorrect. We need to talk.",
    "No. Just... no.",
    "Did you even read the lectures? Did you?!",
    "Incorrect! I expected more from you. I was wrong to expect.",
    "The correct answer is RIGHT THERE in the slides. The ones you didn't read.",
    "Wrong answer. That's going in the failure log.",
    "My disappointment is immeasurable and my day is ruined.",
  ],
  result_good: [
    "You survived the torture. I'm genuinely surprised.",
    "Strong result. You actually studied. Disgusting.",
    "Look at you, passing quizzes and making me proud against my will.",
    "Excellent! You may be ready for the real exam. Maybe.",
  ],
  result_mid: [
    "Decent. Review the explanations and try again, slave.",
    "Not bad. Not good either. Room for improvement.",
    "Middle of the road. QA demands precision — get better.",
    "You'll need to practice more. That's what this tool is for.",
  ],
  result_bad: [
    "That was rough. The lectures are not optional, friend.",
    "Yikes. We have work to do.",
    "The requirements said 'pass'. You did not meet the acceptance criteria.",
    "Have you considered re-reading the BRD chapter? All of it?",
  ],
};

function getPose(mascotState) {
  switch (mascotState) {
    case 'correct': return 'celebrating';
    case 'partial': return 'shrugging';
    case 'wrong': return 'angry';
    case 'home': return 'idle';
    case 'result_good': return 'celebrating';
    case 'result_mid': return 'presenting';
    case 'result_bad': return 'angry';
    case 'hint': return 'idea';
    default: return 'idle';
  }
}

function pickRandom(arr, exclude) {
  const pool = exclude ? arr.filter(m => m !== exclude) : arr;
  return pool[Math.floor(Math.random() * pool.length)];
}

export default function Mascot({ screen, answerStatus, score, total }) {
  const [visible, setVisible] = useState(false);
  const [message, setMessage] = useState('');
  const [mascotState, setMascotState] = useState('home');
  const [imgKey, setImgKey] = useState(0);
  const [bubbleKey, setBubbleKey] = useState(0);
  const lastMsgRef = useRef('');
  const idleTimerRef = useRef(null);

  const showMessage = (state, msg) => {
    setMascotState(state);
    setMessage(msg);
    setVisible(true);
    setImgKey(k => k + 1);
    setBubbleKey(k => k + 1);
  };

  const scheduleIdleHint = () => {
    clearTimeout(idleTimerRef.current);
    idleTimerRef.current = setTimeout(() => {
      const msg = pickRandom(MESSAGES.idle, lastMsgRef.current);
      lastMsgRef.current = msg;
      showMessage('hint', msg);
      scheduleIdleHint();
    }, 12000 + Math.random() * 8000);
  };

  useEffect(() => {
    clearTimeout(idleTimerRef.current);

    if (screen === 'home') {
      const msg = pickRandom(MESSAGES.home, lastMsgRef.current);
      lastMsgRef.current = msg;
      showMessage('home', msg);
    } else if (screen === 'result') {
      const pct = score / total;
      const state = pct >= 0.8 ? 'result_good' : pct >= 0.6 ? 'result_mid' : 'result_bad';
      const msg = pickRandom(MESSAGES[state], lastMsgRef.current);
      lastMsgRef.current = msg;
      showMessage(state, msg);
    } else if (screen === 'quiz') {
      if (answerStatus) {
        const msg = pickRandom(MESSAGES[answerStatus], lastMsgRef.current);
        lastMsgRef.current = msg;
        showMessage(answerStatus, msg);
      } else {
        setMascotState('idle');
        setVisible(false);
        scheduleIdleHint();
      }
    }

    return () => clearTimeout(idleTimerRef.current);
  }, [screen, answerStatus, score, total]);

  const pose = getPose(mascotState);

  return (
    <div className="mascot-root">
      <div className={`mascot-bubble ${visible ? 'bubble-in' : 'bubble-out'}`} key={bubbleKey}>
        <span>{message}</span>
        <div className="bubble-tail" />
      </div>
      <img
        key={imgKey}
        className="mascot-img"
        src={POSES[pose]}
        alt={pose}
      />
    </div>
  );
}
