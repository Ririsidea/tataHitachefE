import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import './Loader.css';

const MACHINES = [
  { src: '/loader/excavator.gif', name: 'excavator' },
  { src: '/loader/backhoe-loader.gif', name: 'backhoe loader' },
  { src: '/loader/wheel-loader.gif', name: 'wheel loader' },
];

const MIN_VISIBLE_MS = 400; // so a fast response does not just flash the loader
const FADE_MS = 300;
const ROTATE_MS = 1800;

const randomMachine = () => Math.floor(Math.random() * MACHINES.length);

// Body scroll is locked while any loader is on screen and restored when the last one goes.
let scrollLocks = 0;
let savedOverflow = '';
function lockScroll() {
  if (scrollLocks === 0) {
    savedOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
  }
  scrollLocks += 1;
}
function unlockScroll() {
  scrollLocks -= 1;
  if (scrollLocks === 0) document.body.style.overflow = savedOverflow;
}

// Full-screen Tata Hitachi loader: white screen with one machine GIF, picked at random each time
// it opens (rotate = cycle through them every 1.8s). Shown for at least 400ms, fades out over
// 300ms once `show` turns false, and is unmounted afterwards.
export default function Loader({ show, rotate = false, label = 'Loading…' }) {
  const [phase, setPhase] = useState(show ? 'visible' : 'hidden'); // 'hidden' | 'visible' | 'leaving'
  const [prevShow, setPrevShow] = useState(show);
  const [machine, setMachine] = useState(randomMachine);
  const shownAt = useRef(0);

  // Re-opening (also while it is still fading out) cancels the fade.
  if (show !== prevShow) {
    setPrevShow(show);
    if (show) setPhase('visible');
  }

  useEffect(() => {
    if (show) shownAt.current = Date.now();
  }, [show]);

  useEffect(() => {
    if (show || phase !== 'visible') return undefined;
    const remaining = Math.max(0, MIN_VISIBLE_MS - (Date.now() - shownAt.current));
    const timer = setTimeout(() => setPhase('leaving'), remaining);
    return () => clearTimeout(timer);
  }, [show, phase]);

  useEffect(() => {
    if (phase !== 'leaving') return undefined;
    const timer = setTimeout(() => {
      setPhase('hidden');
      setMachine(randomMachine());
    }, FADE_MS);
    return () => clearTimeout(timer);
  }, [phase]);

  useEffect(() => {
    if (phase === 'hidden') return undefined;
    lockScroll();
    return unlockScroll;
  }, [phase]);

  useEffect(() => {
    if (!rotate || phase !== 'visible') return undefined;
    const timer = setInterval(() => setMachine((i) => (i + 1) % MACHINES.length), ROTATE_MS);
    return () => clearInterval(timer);
  }, [rotate, phase]);

  if (phase === 'hidden') return null;

  const current = MACHINES[machine];
  // Portalled to <body> so a transformed ancestor (e.g. an animating modal) cannot trap the overlay.
  return createPortal(
    <div
      className={phase === 'leaving' ? 'th-loader is-leaving' : 'th-loader'}
      role="status"
      aria-live="polite"
      aria-busy={phase === 'visible'}
    >
      <img
        className="th-loader-machine"
        src={current.src}
        alt={`Tata Hitachi ${current.name} loading animation`}
        draggable={false}
      />
      <span className="th-loader-label">{label}</span>
    </div>,
    document.body
  );
}
