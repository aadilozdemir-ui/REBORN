import React, { useState, useRef, useCallback, useEffect } from 'react';
import './App.css';

const API_BASE_URL = 'http://localhost:3001/api';
const LONG_PRESS_DURATION = 2000; // 2 seconds for level switching
const LEVEL2_HOLD_DURATION = 5000; // 5 seconds for Level 2 progression
const WAKE_TIME_WAIT = 600; // 10 minutes in seconds

interface Level {
  level: number; // Can be 1, 1.1, 1.2, 1.3, 1.4, 1.5, 2, 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7
  name: string;
  description: string;
  duration?: number; // in seconds (for Level 1 series)
}

interface AppState {
  currentLevel: number;
  sessionStartTime: number | null;
  elapsedTime: number;
  progress: number;
  message: string;
  isActive: boolean;
}

interface SleepSchedule {
  sleepTime: { hours: number; minutes: number } | null;
  wakeTime: { hours: number; minutes: number } | null;
  currentDay: number; // 2.1 to 2.7
  wakeTimeStart: number | null; // timestamp when wake time occurred
  canProgress: boolean; // true after 10 minutes of wake time
}

const LEVELS: Level[] = [
  {
    level: 1,
    name: 'Focus Mode',
    description: 'Build concentration and mindfulness',
    duration: 300 // 5 minutes
  },
  {
    level: 1.1,
    name: 'Deep Work',
    description: 'Extended focus session',
    duration: 900 // 15 minutes
  },
  {
    level: 1.2,
    name: 'Extended Focus',
    description: 'Longer concentration session',
    duration: 1500 // 25 minutes
  },
  {
    level: 1.3,
    name: 'Deep Concentration',
    description: 'Intensive focus period',
    duration: 2100 // 35 minutes
  },
  {
    level: 1.4,
    name: 'Intense Focus',
    description: 'Extended deep work session',
    duration: 2700 // 45 minutes
  },
  {
    level: 1.5,
    name: 'Marathon Session',
    description: 'Maximum focus challenge',
    duration: 3600 // 1 hour
  },
  {
    level: 2,
    name: 'Sleep Schedule',
    description: 'Adjust your sleep schedule'
  },
  {
    level: 2.1,
    name: 'Day 1',
    description: 'First day of sleep schedule adjustment'
  },
  {
    level: 2.2,
    name: 'Day 2',
    description: 'Second day of sleep schedule adjustment'
  },
  {
    level: 2.3,
    name: 'Day 3',
    description: 'Third day of sleep schedule adjustment'
  },
  {
    level: 2.4,
    name: 'Day 4',
    description: 'Fourth day of sleep schedule adjustment'
  },
  {
    level: 2.5,
    name: 'Day 5',
    description: 'Fifth day of sleep schedule adjustment'
  },
  {
    level: 2.6,
    name: 'Day 6',
    description: 'Sixth day of sleep schedule adjustment'
  },
  {
    level: 2.7,
    name: 'Day 7',
    description: 'Final day of sleep schedule adjustment'
  }
];

function App() {
  const [showIntro, setShowIntro] = useState(true);
  const [imageError, setImageError] = useState(false);
  
  const [state, setState] = useState<AppState>({
    currentLevel: 1,
    sessionStartTime: null,
    elapsedTime: 0,
    progress: 0,
    message: 'Tap to start your session',
    isActive: false
  });

  const [sleepSchedule, setSleepSchedule] = useState<SleepSchedule>({
    sleepTime: null,
    wakeTime: null,
    currentDay: 2.1,
    wakeTimeStart: null,
    canProgress: false
  });

  const [timePickerState, setTimePickerState] = useState<{
    mode: 'sleep' | 'wake' | null;
    hours: number;
    minutes: number;
  }>({
    mode: null,
    hours: 22,
    minutes: 0
  });

  const [isHolding, setIsHolding] = useState(false);
  const [holdProgress, setHoldProgress] = useState(0);
  const pressTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isLongPressRef = useRef(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const holdProgressRef = useRef<NodeJS.Timeout | null>(null);
  const wakeTimeCheckRef = useRef<NodeJS.Timeout | null>(null);

  // Find current level data
  const currentLevelData = LEVELS.find(l => l.level === state.currentLevel) || LEVELS[0];
  const isLevel2 = state.currentLevel >= 2 && state.currentLevel < 3;
  const isLevel2Day = state.currentLevel >= 2.1 && state.currentLevel <= 2.7;

  // Check if current time matches wake time (for Level 2.1-2.7)
  useEffect(() => {
    if (isLevel2Day && sleepSchedule.wakeTime && !sleepSchedule.wakeTimeStart) {
      const checkWakeTime = () => {
        const now = new Date();
        const currentHours = now.getHours();
        const currentMinutes = now.getMinutes();
        
        if (currentHours === sleepSchedule.wakeTime!.hours && 
            currentMinutes === sleepSchedule.wakeTime!.minutes) {
          setSleepSchedule(prev => ({
            ...prev,
            wakeTimeStart: Date.now(),
            canProgress: false
          }));
        }
      };

      wakeTimeCheckRef.current = setInterval(checkWakeTime, 1000);
      checkWakeTime(); // Check immediately

      return () => {
        if (wakeTimeCheckRef.current) {
          clearInterval(wakeTimeCheckRef.current);
        }
      };
    }
  }, [isLevel2Day, sleepSchedule.wakeTime, sleepSchedule.wakeTimeStart]);

  // Check if 10 minutes have passed since wake time
  useEffect(() => {
    if (isLevel2Day && sleepSchedule.wakeTimeStart && !sleepSchedule.canProgress) {
      const checkInterval = setInterval(() => {
        const elapsed = Math.floor((Date.now() - sleepSchedule.wakeTimeStart!) / 1000);
        if (elapsed >= WAKE_TIME_WAIT) {
          setSleepSchedule(prev => ({
            ...prev,
            canProgress: true
          }));
        }
      }, 1000);

      return () => clearInterval(checkInterval);
    }
  }, [isLevel2Day, sleepSchedule.wakeTimeStart, sleepSchedule.canProgress]);

  // Timer effect for Level 1 series
  useEffect(() => {
    if (!isLevel2 && state.isActive && state.sessionStartTime && currentLevelData.duration) {
      intervalRef.current = setInterval(() => {
        const elapsed = Math.floor((Date.now() - state.sessionStartTime!) / 1000);
        const progress = Math.min((elapsed / currentLevelData.duration!) * 100, 100);
        
        setState(prev => ({
          ...prev,
          elapsedTime: elapsed,
          progress: progress
        }));

        if (elapsed >= currentLevelData.duration!) {
          setState(prev => ({
            ...prev,
            isActive: false,
            message: `Level ${prev.currentLevel} completed! 🎉`,
            progress: 100
          }));
          if (intervalRef.current) {
            clearInterval(intervalRef.current);
          }
        }
      }, 1000);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [state.isActive, state.sessionStartTime, currentLevelData.duration, isLevel2]);

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const formatClockTime = (hours: number, minutes: number): string => {
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
  };

  const sendToBackend = useCallback(async (endpoint: string, action: string) => {
    try {
      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          action,
          level: state.currentLevel,
          timestamp: new Date().toISOString()
        })
      });

      const data = await response.json();
      console.log('Backend response:', data);
    } catch (error) {
      console.error('Error sending to backend:', error);
    }
  }, [state.currentLevel]);

  // Handle Level 2 time picker - adjust minutes (10 minute steps)
  const handleTimePickerClick = useCallback(() => {
    if (timePickerState.mode) {
      setTimePickerState(prev => {
        let newMinutes = prev.minutes + 10;
        let newHours = prev.hours;
        
        if (newMinutes >= 60) {
          newMinutes = newMinutes % 60;
          newHours = (newHours + 1) % 24;
        }
        
        return {
          ...prev,
          hours: newHours,
          minutes: newMinutes
        };
      });
    }
  }, [timePickerState.mode]);

  // Handle Level 2 time picker - confirm
  const handleTimePickerConfirm = useCallback(() => {
    if (timePickerState.mode === 'sleep') {
      setSleepSchedule(prev => ({
        ...prev,
        sleepTime: { hours: timePickerState.hours, minutes: timePickerState.minutes }
      }));
      setTimePickerState(prev => ({
        ...prev,
        mode: 'wake',
        hours: 7,
        minutes: 0
      }));
      setState(prev => ({
        ...prev,
        message: 'Set your wake time'
      }));
    } else if (timePickerState.mode === 'wake') {
      setSleepSchedule(prev => ({
        ...prev,
        wakeTime: { hours: timePickerState.hours, minutes: timePickerState.minutes }
      }));
      setTimePickerState(prev => ({
        ...prev,
        mode: null
      }));
      setState(prev => ({
        ...prev,
        currentLevel: 2.1,
        message: 'Day 1 started! Wait for wake time, then hold button for 5s after 10 minutes.'
      }));
      sendToBackend('/button/click', 'Sleep Schedule Started');
    }
  }, [timePickerState, sendToBackend]);

  // Handle Level 2.1-2.7 progression (5 second hold)
  const handleLevel2Progression = useCallback(() => {
    if (sleepSchedule.canProgress && isLevel2Day) {
      const currentDay = state.currentLevel;
      if (currentDay < 2.7) {
        const nextDay = Math.round((currentDay + 0.1) * 10) / 10;
        setState(prev => ({
          ...prev,
          currentLevel: nextDay,
          message: `Day ${Math.floor(nextDay * 10) % 10} started! Wait for wake time.`
        }));
        setSleepSchedule(prev => ({
          ...prev,
          currentDay: nextDay,
          wakeTimeStart: null,
          canProgress: false
        }));
        sendToBackend('/button/longpress', `Day ${Math.floor(nextDay * 10) % 10} Started`);
      } else {
        setState(prev => ({
          ...prev,
          message: '🎉 Week completed! Sleep schedule adjusted successfully!'
        }));
        sendToBackend('/button/longpress', 'Level 2 Completed');
      }
    }
  }, [sleepSchedule.canProgress, isLevel2Day, state.currentLevel, sendToBackend]);

  const handleClick = useCallback(() => {
    // Level 2 time picker mode
    if (state.currentLevel === 2) {
      if (!timePickerState.mode) {
        // Start sleep time picker
        setTimePickerState(prev => ({
          ...prev,
          mode: 'sleep',
          hours: 22,
          minutes: 0
        }));
        setState(prev => ({
          ...prev,
          message: 'Set your sleep time (tap to adjust in 10 min steps)'
        }));
      } else {
        handleTimePickerClick();
      }
      return;
    }

    // Level 2.1-2.7: No action on click (only hold works for progression)
    if (isLevel2Day && timePickerState.mode === null) {
      return;
    }

    // Level 1 series: Start/Pause
    if (!isLevel2 && currentLevelData.duration) {
      if (!state.isActive) {
        setState(prev => ({
          ...prev,
          isActive: true,
          sessionStartTime: Date.now(),
          elapsedTime: 0,
          progress: 0,
          message: `Level ${prev.currentLevel} - ${currentLevelData.name}`
        }));
        sendToBackend('/button/click', 'Start Session');
      } else {
        setState(prev => ({
          ...prev,
          isActive: false,
          message: 'Session paused. Tap to resume.'
        }));
        sendToBackend('/button/click', 'Pause Session');
      }
    }
  }, [state, isLevel2, isLevel2Day, timePickerState, sleepSchedule.canProgress, currentLevelData, handleTimePickerClick, handleTimePickerConfirm, sendToBackend]);

  const handleLongPress = useCallback(() => {
    // Level 2: Confirm time picker
    if (state.currentLevel === 2 && timePickerState.mode) {
      handleTimePickerConfirm();
      return;
    }

    // Level 2.1-2.7: 5 second hold to progress
    if (isLevel2Day && sleepSchedule.canProgress) {
      // Start 5 second hold
      let progress = 0;
      const startTime = Date.now();
      
      holdProgressRef.current = setInterval(() => {
        const elapsed = Date.now() - startTime;
        progress = Math.min((elapsed / LEVEL2_HOLD_DURATION) * 100, 100);
        setHoldProgress(progress);
        
        if (progress >= 100) {
          if (holdProgressRef.current) {
            clearInterval(holdProgressRef.current);
          }
          handleLevel2Progression();
          setHoldProgress(0);
        }
      }, 50);
      return;
    }

    // Level 1 series: Switch level (cycle through 1, 1.1, 1.2, 1.3, 1.4, 1.5, 2)
    if (!isLevel2) {
      setState(prev => {
        const level1Series = LEVELS.filter(l => l.level >= 1 && l.level < 2);
        const currentIndex = level1Series.findIndex(l => l.level === prev.currentLevel);
        let nextIndex = (currentIndex + 1) % (level1Series.length + 1); // +1 to include Level 2
        
        if (nextIndex === level1Series.length) {
          // Switch to Level 2
          return {
            ...prev,
            currentLevel: 2,
            isActive: false,
            sessionStartTime: null,
            elapsedTime: 0,
            progress: 0,
            message: 'Set your sleep schedule'
          };
        } else {
          const nextLevel = level1Series[nextIndex];
          return {
            ...prev,
            currentLevel: nextLevel.level,
            isActive: false,
            sessionStartTime: null,
            elapsedTime: 0,
            progress: 0,
            message: `Switched to Level ${nextLevel.level} - ${nextLevel.name}`
          };
        }
      });
      sendToBackend('/button/longpress', 'Switch Level');
    }
  }, [state.currentLevel, isLevel2, isLevel2Day, timePickerState.mode, sleepSchedule.canProgress, handleTimePickerConfirm, handleLevel2Progression, sendToBackend]);

  const handlePressStart = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    isLongPressRef.current = false;
    setIsHolding(true);
    
    pressTimerRef.current = setTimeout(() => {
      isLongPressRef.current = true;
      handleLongPress();
    }, LONG_PRESS_DURATION);
  }, [handleLongPress]);

  const handlePressEnd = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    setIsHolding(false);
    
    if (pressTimerRef.current) {
      clearTimeout(pressTimerRef.current);
      pressTimerRef.current = null;
    }

    // Cancel Level 2 hold if released early
    if (holdProgressRef.current) {
      clearInterval(holdProgressRef.current);
      holdProgressRef.current = null;
      setHoldProgress(0);
    }
    
    if (!isLongPressRef.current) {
      handleClick();
    }
    
    isLongPressRef.current = false;
  }, [handleClick]);

  const handlePressCancel = useCallback(() => {
    setIsHolding(false);
    if (pressTimerRef.current) {
      clearTimeout(pressTimerRef.current);
      pressTimerRef.current = null;
    }
    if (holdProgressRef.current) {
      clearInterval(holdProgressRef.current);
      holdProgressRef.current = null;
      setHoldProgress(0);
    }
    isLongPressRef.current = false;
  }, []);

  const remainingTime = currentLevelData.duration ? currentLevelData.duration - state.elapsedTime : 0;

  // Handle intro screen click - transition to Level 1
  const handleIntroClick = useCallback(() => {
    setShowIntro(false);
    setState(prev => ({
      ...prev,
      currentLevel: 1,
      message: 'Tap to start your session'
    }));
    sendToBackend('/button/click', 'Intro Completed');
  }, [sendToBackend]);

  // Render Intro Screen
  if (showIntro) {
    return (
      <div className="app intro-screen">
        <div className="content-area intro-content">
          <div className="egg-container">
            {!imageError ? (
              <img 
                src="/egg-potential.png" 
                alt="Potential Egg" 
                className="egg-image"
                onError={() => setImageError(true)}
              />
            ) : (
              <div className="css-egg"></div>
            )}
          </div>
          
          <div className="intro-text">
            <p className="intro-line">Every great journey starts small — and so do you.</p>
            <p className="intro-line">Inside this shell lies your potential, waiting to grow and shine.</p>
            <p className="intro-line">Over the next days, we'll grow together — step by step, crack by crack —</p>
            <p className="intro-line">until you hatch into your best self.</p>
            <p className="intro-line intro-final">Let's begin this journey together.</p>
          </div>
        </div>

        <button
          className="main-button intro-button"
          onClick={handleIntroClick}
          onTouchEnd={handleIntroClick}
        >
          <span className="button-text">Begin</span>
        </button>
      </div>
    );
  }

  // Render Level 2 time picker
  if (state.currentLevel === 2 && timePickerState.mode) {
    return (
      <div className="app">
        <div className="content-area">
          <div className="level-info">
            <div className="level-badge">Level 2</div>
            <h1 className="level-name">Sleep Schedule</h1>
            <p className="level-description">
              {timePickerState.mode === 'sleep' ? 'Set your sleep time' : 'Set your wake time'}
            </p>
          </div>

          <div className="time-picker-section">
            <div className="time-display-large">
              {formatClockTime(timePickerState.hours, timePickerState.minutes)}
            </div>
            <div className="time-picker-hint">
              Tap button to adjust (10 min steps)
            </div>
          </div>

          <div className="message-section">
            <div className="message">
              {state.message}
            </div>
          </div>
        </div>

        <button
          className={`main-button ${isHolding ? 'holding' : ''}`}
          onMouseDown={handlePressStart}
          onMouseUp={handlePressEnd}
          onMouseLeave={handlePressCancel}
          onTouchStart={handlePressStart}
          onTouchEnd={handlePressEnd}
          onTouchCancel={handlePressCancel}
          onContextMenu={(e) => e.preventDefault()}
        >
          <span className="button-text">Adjust</span>
          <span className="button-hint">Hold 2s to confirm</span>
        </button>
      </div>
    );
  }

  // Render Level 2.1-2.7
  if (isLevel2Day) {
    const timeSinceWake = sleepSchedule.wakeTimeStart 
      ? Math.floor((Date.now() - sleepSchedule.wakeTimeStart) / 1000)
      : 0;
    const minutesSinceWake = Math.floor(timeSinceWake / 60);
    const secondsSinceWake = timeSinceWake % 60;

    return (
      <div className="app">
        <div className="content-area">
          <div className="level-info">
            <div className="level-badge">Level {state.currentLevel}</div>
            <h1 className="level-name">{currentLevelData.name}</h1>
            <p className="level-description">{currentLevelData.description}</p>
          </div>

          {sleepSchedule.wakeTime && (
            <div className="timer-section">
              <div className="timer-display">
                {sleepSchedule.wakeTimeStart 
                  ? `${minutesSinceWake.toString().padStart(2, '0')}:${secondsSinceWake.toString().padStart(2, '0')}`
                  : formatClockTime(sleepSchedule.wakeTime.hours, sleepSchedule.wakeTime.minutes)
                }
              </div>
              <div className="timer-label">
                {sleepSchedule.wakeTimeStart 
                  ? (sleepSchedule.canProgress ? 'Ready! Hold 5s to progress' : 'Time since wake')
                  : 'Wake time'
                }
              </div>
            </div>
          )}

          {sleepSchedule.canProgress && (
            <div className="progress-section">
              <div className="progress-bar-container">
                <div 
                  className="progress-bar-fill" 
                  style={{ width: `${holdProgress}%` }}
                />
              </div>
              <div className="progress-text">
                {Math.round(holdProgress)}% - Hold for 5 seconds
              </div>
            </div>
          )}

          <div className="message-section">
            <div className={`message ${sleepSchedule.canProgress ? 'active' : ''}`}>
              {state.message}
            </div>
          </div>
        </div>

        <button
          className={`main-button ${isHolding ? 'holding' : ''} ${sleepSchedule.canProgress ? 'active' : ''}`}
          onMouseDown={handlePressStart}
          onMouseUp={handlePressEnd}
          onMouseLeave={handlePressCancel}
          onTouchStart={handlePressStart}
          onTouchEnd={handlePressEnd}
          onTouchCancel={handlePressCancel}
          onContextMenu={(e) => e.preventDefault()}
        >
          <span className="button-text">
            {sleepSchedule.canProgress ? 'Hold 5s' : 'Waiting...'}
          </span>
          <span className="button-hint">
            {sleepSchedule.canProgress ? 'Hold to progress to next day' : 'Wait 10 min after wake time'}
          </span>
        </button>
      </div>
    );
  }

  // Render Level 1 series
  return (
    <div className="app">
      <div className="content-area">
        <div className="level-info">
          <div className="level-badge">Level {state.currentLevel}</div>
          <h1 className="level-name">{currentLevelData.name}</h1>
          <p className="level-description">{currentLevelData.description}</p>
        </div>

        <div className="timer-section">
          <div className="timer-display">
            {formatTime(state.isActive ? remainingTime : (currentLevelData.duration || 0))}
          </div>
          <div className="timer-label">
            {state.isActive ? 'Time Remaining' : 'Session Duration'}
          </div>
        </div>

        <div className="progress-section">
          <div className="progress-bar-container">
            <div 
              className="progress-bar-fill" 
              style={{ width: `${state.progress}%` }}
            />
          </div>
          <div className="progress-text">
            {Math.round(state.progress)}% Complete
          </div>
        </div>

        <div className="message-section">
          <div className={`message ${state.isActive ? 'active' : ''}`}>
            {state.message}
          </div>
        </div>
      </div>

      <button
        className={`main-button ${isHolding ? 'holding' : ''} ${state.isActive ? 'active' : ''}`}
        onMouseDown={handlePressStart}
        onMouseUp={handlePressEnd}
        onMouseLeave={handlePressCancel}
        onTouchStart={handlePressStart}
        onTouchEnd={handlePressEnd}
        onTouchCancel={handlePressCancel}
        onContextMenu={(e) => e.preventDefault()}
      >
        <span className="button-text">
          {state.isActive ? 'Pause' : 'Start'}
        </span>
        <span className="button-hint">Hold 2s to switch level</span>
      </button>
    </div>
  );
}

export default App;
