import React, { useState } from 'react';
import { Difficulty } from '../types';
import { DIFFICULTY_CONFIG } from '../constants';

interface MainMenuProps {
  onStart: (diff: Difficulty) => void;
  unlockedGrandmaster: boolean;
  progress: { easy: boolean; medium: boolean; hard: boolean; grandmaster: boolean };
}

const MainMenu: React.FC<MainMenuProps> = ({ onStart, unlockedGrandmaster, progress }) => {
  const difficulties = [Difficulty.EASY, Difficulty.MEDIUM, Difficulty.HARD];
  const [showMoves, setShowMoves] = useState(false);

  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#f3f0e6] z-10">
      <h1 className="text-6xl mb-12 ink-font font-bold tracking-widest text-black">墨韵</h1>
      
      {/* Move List Toggle */}
      <div className="absolute top-8 right-8">
        <button 
          onClick={() => setShowMoves(!showMoves)}
          className="text-2xl ink-font border-2 border-black px-4 py-2 hover:bg-black hover:text-white transition-colors"
        >
          {showMoves ? '关闭' : '武功秘籍'}
        </button>
        
        {/* Move List Content */}
        {showMoves && (
          <div className="absolute top-14 right-0 w-80 bg-[#1a1a1a] text-[#f3f0e6] p-6 rounded border-2 border-gray-600 shadow-xl z-20 font-serif">
            <h3 className="text-2xl mb-4 border-b border-gray-600 pb-2 ink-font text-center">招式表</h3>
            <ul className="space-y-3 text-sm">
              <li className="flex justify-between items-center">
                <span className="text-gray-400">普攻连段</span>
                <span className="font-bold text-yellow-500">J + J + J</span>
              </li>
              <li className="flex justify-between items-center">
                <span className="text-gray-400">泼墨剑气</span>
                <span className="font-bold text-yellow-500">S + J</span>
              </li>
              <li className="flex justify-between items-center">
                <span className="text-gray-400">升龙斩</span>
                <span className="font-bold text-yellow-500">W + J</span>
              </li>
              <li className="flex justify-between items-center">
                <span className="text-gray-400">空中回旋</span>
                <span className="font-bold text-yellow-500">空中 + J</span>
              </li>
              <li className="flex justify-between items-center">
                <span className="text-gray-400">天坠</span>
                <span className="font-bold text-yellow-500">空中 + S</span>
              </li>
              <li className="flex justify-between items-center">
                <span className="text-gray-400">二段跳</span>
                <span className="font-bold text-yellow-500">空中 + W</span>
              </li>
              <li className="flex justify-between items-center">
                <span className="text-gray-400">瞬步 (闪避)</span>
                <span className="font-bold text-yellow-500">双击 A 或 D</span>
              </li>
              <li className="flex justify-between items-center">
                <span className="text-gray-400">格挡</span>
                <span className="font-bold text-yellow-500">按住 S</span>
              </li>
              <li className="flex justify-between items-center">
                <span className="text-gray-400">调息 (回血)</span>
                <span className="font-bold text-yellow-500">Q</span>
              </li>
            </ul>
          </div>
        )}
      </div>

      <div className="flex gap-6">
        {difficulties.map((diff) => {
          let isBeaten = false;
          if (diff === Difficulty.EASY) isBeaten = progress.easy;
          if (diff === Difficulty.MEDIUM) isBeaten = progress.medium;
          if (diff === Difficulty.HARD) isBeaten = progress.hard;

          return (
            <DifficultyCard 
              key={diff} 
              difficulty={diff} 
              onClick={() => onStart(diff)} 
              isBeaten={isBeaten}
            />
          );
        })}

        {/* Grandmaster Card */}
        <div 
          onClick={() => unlockedGrandmaster && onStart(Difficulty.GRANDMASTER)}
          className={`
            relative w-48 h-72 border-4 border-black flex flex-col items-center justify-center cursor-pointer transition-all duration-300
            ${unlockedGrandmaster ? 'hover:scale-105 hover:bg-black hover:text-[#D4AF37]' : 'opacity-50 cursor-not-allowed grayscale'}
          `}
        >
          {progress.grandmaster && (
             <div className="absolute top-4 right-4 border-4 border-red-700 text-red-700 font-bold ink-font text-3xl p-2 rounded-lg rotate-[-15deg] opacity-90 z-20 pointer-events-none">
                得胜
             </div>
          )}

          <div className="text-4xl ink-font mb-4">
             <span>宗</span>
             <span className="ml-1" style={{ color: unlockedGrandmaster ? '#D4AF37' : 'inherit' }}>师</span>
          </div>
          {unlockedGrandmaster ? (
            <div className="text-sm px-4 text-center font-serif">Grandmaster</div>
          ) : (
            <div className="text-xs px-4 text-center mt-2 font-serif">击败所有难度解锁</div>
          )}
        </div>
      </div>
      
      <div className="mt-12 text-gray-500 text-sm font-serif tracking-widest">
        操作: WASD 移动/跳跃/格挡 | J 攻击 | Q 调息
      </div>
    </div>
  );
};

const DifficultyCard: React.FC<{ difficulty: Difficulty; onClick: () => void; isBeaten: boolean }> = ({ difficulty, onClick, isBeaten }) => {
  const config = DIFFICULTY_CONFIG[difficulty];
  
  // Custom Character Rendering
  const renderTitle = () => {
      if (difficulty === Difficulty.EASY) {
          return (
              <div className="text-5xl ink-font mb-4 flex justify-center">
                  <span style={{ color: '#78716c' }}>不</span>
                  <span>入</span>
                  <span>流</span>
              </div>
          )
      }
      if (difficulty === Difficulty.MEDIUM) {
          return (
              <div className="text-5xl ink-font mb-4 flex justify-center">
                  <span style={{ color: '#3b82f6' }}>二</span>
                  <span className="ml-2">流</span>
              </div>
          )
      }
      if (difficulty === Difficulty.HARD) {
          return (
              <div className="text-5xl ink-font mb-4 flex justify-center">
                  <span style={{ color: '#ef4444' }}>一</span>
                  <span className="ml-2">流</span>
              </div>
          )
      }
      return null;
  }
  
  return (
    <div 
      onClick={onClick}
      className="group w-48 h-72 border-4 border-black flex flex-col items-center justify-center cursor-pointer hover:bg-black hover:text-white transition-all duration-300 relative overflow-hidden"
    >
      {isBeaten && (
         <div className="absolute top-4 right-4 border-4 border-red-700 text-red-700 font-bold ink-font text-3xl p-2 rounded-lg rotate-[-15deg] opacity-90 z-20 pointer-events-none mix-blend-multiply bg-[#f3f0e6]/50">
            得胜
         </div>
      )}

      <div className="z-10">{renderTitle()}</div>
      <div className="z-10 text-xs uppercase tracking-widest font-serif opacity-60">{difficulty}</div>
      
      {/* Visual flair on hover */}
      <div className="absolute inset-0 opacity-0 group-hover:opacity-20 bg-gray-500 transition-opacity"></div>
    </div>
  );
};

export default MainMenu;