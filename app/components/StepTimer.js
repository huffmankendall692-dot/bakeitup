"use client";

import { useEffect, useRef, useState } from "react";

function formatTime(milliseconds) {
  const totalSeconds = Math.ceil(milliseconds / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = String(totalSeconds % 60).padStart(2, "0");
  return hours > 0
    ? `${hours}:${String(minutes).padStart(2, "0")}:${seconds}`
    : `${minutes}:${seconds}`;
}

export default function StepTimer({ minutes }) {
  const duration = Math.round(minutes * 60) * 1000;
  // An end time rather than a counter, so throttled background tabs stay accurate.
  const [endsAt, setEndsAt] = useState(null);
  const [remaining, setRemaining] = useState(duration);
  const audioRef = useRef(null);

  useEffect(() => {
    if (endsAt === null) {
      return undefined;
    }
    const interval = setInterval(() => {
      const left = Math.max(0, endsAt - Date.now());
      setRemaining(left);
      if (left === 0) {
        setEndsAt(null);
        playAlarm(audioRef.current);
      }
    }, 250);
    return () => clearInterval(interval);
  }, [endsAt]);

  useEffect(() => () => audioRef.current?.close(), []);

  function start() {
    // Browsers only allow sound that a click has unlocked.
    audioRef.current ??= new AudioContext();
    setEndsAt(Date.now() + remaining);
  }

  function pause() {
    setRemaining(Math.max(0, endsAt - Date.now()));
    setEndsAt(null);
  }

  function reset() {
    setEndsAt(null);
    setRemaining(duration);
  }

  const running = endsAt !== null;
  const finished = remaining === 0;

  return (
    <div className="step-timer">
      <span className="step-timer-time" role="timer">
        {formatTime(remaining)}
      </span>
      {!finished && (
        <button type="button" onClick={running ? pause : start}>
          {running ? "Pause" : remaining === duration ? "Start timer" : "Resume"}
        </button>
      )}
      {(finished || (!running && remaining !== duration)) && (
        <button type="button" onClick={reset}>
          Reset
        </button>
      )}
      {finished && (
        <span className="auth-notice step-timer-done" role="status">
          Time's up!
        </span>
      )}
    </div>
  );
}

function playAlarm(audio) {
  if (!audio) {
    return;
  }
  [0, 0.4, 0.8].forEach((delay) => {
    const oscillator = audio.createOscillator();
    oscillator.connect(audio.destination);
    oscillator.frequency.value = 880;
    oscillator.start(audio.currentTime + delay);
    oscillator.stop(audio.currentTime + delay + 0.25);
  });
}
