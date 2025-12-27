import React, { useState, useEffect } from 'react';
import GameCanvas from './components/GameCanvas';
import MainMenu from './components/MainMenu';
import { Difficulty, GameScene } from './types';

function App() {
  const [scene, setScene] = useState<GameScene>(GameScene.MENU);
  const [difficulty, setDifficulty] = useState<Difficulty>(Difficulty.EASY);
  const [progress, setProgress] = useState({
    easy: false,
    medium: false,
    hard: false,
    grandmaster: false
  });

  // Load progress
  useEffect(() => {
    const e = localStorage.getItem('beat_easy') === 'true';
    const m = localStorage.getItem('beat_medium') === 'true';
    const h = localStorage.getItem('beat_hard') === 'true';
    const gm = localStorage.getItem('beat_grandmaster') === 'true';
    setProgress({ easy: e, medium: m, hard: h, grandmaster: gm });
  }, []);

  const startGame = (diff: Difficulty) => {
    setDifficulty(diff);
    setScene(GameScene.GAME);
  };

  const handleGameOver = (won: boolean) => {
    if (won) {
      if (difficulty === Difficulty.EASY) localStorage.setItem('beat_easy', 'true');
      if (difficulty === Difficulty.MEDIUM) localStorage.setItem('beat_medium', 'true');
      if (difficulty === Difficulty.HARD) localStorage.setItem('beat_hard', 'true');
      if (difficulty === Difficulty.GRANDMASTER) localStorage.setItem('beat_grandmaster', 'true');
      
      // Update local state to reflect unlock immediately if applicable
      const e = localStorage.getItem('beat_easy') === 'true';
      const m = localStorage.getItem('beat_medium') === 'true';
      const h = localStorage.getItem('beat_hard') === 'true';
      const gm = localStorage.getItem('beat_grandmaster') === 'true';
      setProgress({ easy: e, medium: m, hard: h, grandmaster: gm });
      
      setScene(GameScene.VICTORY);
    } else {
      setScene(GameScene.GAME_OVER);
    }
  };

  const grandmasterUnlocked = progress.easy && progress.medium && progress.hard;

  return (
    <div className="w-screen h-screen flex items-center justify-center bg-gray-900">
      {scene === GameScene.MENU && (
        <MainMenu onStart={startGame} unlockedGrandmaster={grandmasterUnlocked} progress={progress} />
      )}

      {scene === GameScene.GAME && (
        <GameCanvas 
            difficulty={difficulty} 
            onGameOver={handleGameOver} 
            onExit={() => setScene(GameScene.MENU)}
        />
      )}

      {scene === GameScene.GAME_OVER && (
        <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center text-white z-50">
           <h2 className="text-5xl ink-font mb-4 text-gray-400">胜败乃兵家常事</h2>
           <p className="mb-8 font-serif">Defeat is but a lesson.</p>
           <button 
             onClick={() => setScene(GameScene.MENU)}
             className="px-8 py-3 border border-white hover:bg-white hover:text-black transition-colors"
           >
             返回主菜单 (Menu)
           </button>
        </div>
      )}

      {scene === GameScene.VICTORY && (
        <div className="absolute inset-0 bg-[#f3f0e6]/95 flex flex-col items-center justify-center text-black z-50">
           <h2 className="text-9xl ink-font mb-8 text-red-700 animate-pulse border-8 border-red-700 p-8 rounded-xl rotate-[-5deg]">得胜</h2>
           <button 
             onClick={() => setScene(GameScene.MENU)}
             className="px-8 py-3 border-4 border-black font-bold ink-font text-2xl hover:bg-black hover:text-white transition-colors"
           >
             凯旋
           </button>
        </div>
      )}
    </div>
  );
}

export default App;