//components/CountdownTimer.tsx

'use client';

import { useState, useEffect } from 'react';

interface CountdownTimerProps {
  targetTimeIso: string | null;
}

const CountdownTimer: React.FC<CountdownTimerProps> = ({ targetTimeIso }) => {
  const [timeLeft, setTimeLeft] = useState<string>('Loading time...');

  useEffect(() => {
    if (!targetTimeIso) {
      setTimeLeft('Rearrangement time not yet set.');
      return;
    }

    const targetTime = new Date(targetTimeIso).getTime();

    if (isNaN(targetTime)) {
      setTimeLeft('Invalid target time provided.');
      return;
    }

    const calculateTimeLeft = () => {
      const now = new Date().getTime();
      const distance = targetTime - now;

      if (distance < 0) {
        setTimeLeft('The list may have recently been rearranged or is updating!');
        return null; 
      }

      const days = Math.floor(distance / (1000 * 60 * 60 * 24));
      const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((distance % (1000 * 60)) / 1000);

      let timerText = "";
      if (days > 0) timerText += `${days}d `;
      if (hours > 0 || days > 0) timerText += `${hours}h `;
      timerText += `${minutes}m ${seconds}s`;
      
      setTimeLeft(timerText);
      return distance;
    };

    if (calculateTimeLeft() === null) return;

    const intervalId = setInterval(() => {
      if (calculateTimeLeft() === null) {
        clearInterval(intervalId);
      }
    }, 1000);

    return () => clearInterval(intervalId); 
  }, [targetTimeIso]);

  return (
    <div className="text-center my-4 p-3 bg-gray-100 dark:bg-slate-700/50 rounded-lg shadow-inner border border-gray-200 dark:border-transparent">
      <p className="text-slate-600 dark:text-slate-300 text-sm">Players will be rearranged based on votes in</p>
      <p className="text-sky-600 dark:text-sky-400 font-mono text-lg font-semibold">
        {timeLeft}
      </p>
    </div>
  );
};

export default CountdownTimer;