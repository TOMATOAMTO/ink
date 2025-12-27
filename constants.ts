import { Difficulty } from "./types";

export const CANVAS_WIDTH = 960;
export const CANVAS_HEIGHT = 540;
export const GROUND_Y = 450;
export const GRAVITY = 0.9; // Increased gravity for snappier jumps (less floaty)
export const FRICTION = 0.8;

// Entity Stats
export const MAX_HP = 1000;
export const MAX_MP = 100;
export const MP_REGEN = 10 / 60; // Increased MP regen slightly (8 -> 10) to support faster pace
export const BLOCK_MP_COST = 5 / 60; 
export const WALK_SPEED = 9; // Signficantly increased (5 -> 9)
export const JUMP_FORCE = -18; // Stronger jump (-14 -> -18)
export const DASH_SPEED = 28; // Much faster dash (15 -> 28)
export const DASH_COST = 5; 

// Cooldowns
export const HEAL_COOLDOWN_FRAMES = 15 * 60; 

// Attacks
export const ATTACK_FRAME_DURATION = 15; // Snappier attacks (20 -> 15)
export const ATTACK_COOLDOWN = 8; // Lower cooldown (10 -> 8)

// Input Keys
export const KEYS = {
  LEFT: ['KeyA', 'ArrowLeft'],
  RIGHT: ['KeyD', 'ArrowRight'],
  UP: ['KeyW', 'ArrowUp', 'Space'],
  DOWN: ['KeyS', 'ArrowDown'],
  ATTACK: ['KeyJ', 'Click'], 
  HEAL: ['KeyQ'],
  PAUSE: ['Escape'],
  // Virtual Keys (Injected by logic)
  DASH_LEFT: ['Virtual_DashLeft'],
  DASH_RIGHT: ['Virtual_DashRight']
};

// Difficulty Settings
export const DIFFICULTY_CONFIG = {
  [Difficulty.EASY]: {
    name: '不入流',
    color: '#e0e0e0', 
    hpMod: 0.8,
    potions: 3,
    aiAggression: 0.35, // Increased from 0.1 to ensure they attack
    aiReaction: 40,    // Reduced from 60 to 40 (less standing still)
    allowSkills: false,
    skillRate: 0,
  },
  [Difficulty.MEDIUM]: {
    name: '二流',
    color: '#3b82f6', 
    hpMod: 1.0,
    potions: 2,
    aiAggression: 0.5, // Increased from 0.2
    aiReaction: 30,    // Reduced from 50 to 30
    allowSkills: true,
    skillRate: 0.25, 
  },
  [Difficulty.HARD]: {
    name: '一流',
    color: '#ef4444', 
    hpMod: 1.0, 
    potions: 1,
    aiAggression: 0.7, // Increased from 0.4
    aiReaction: 20,    // Reduced from 30
    allowSkills: true,
    skillRate: 0.45, 
  },
  [Difficulty.GRANDMASTER]: {
    name: '宗师',
    color: 'GOLD_CAPE', 
    hpMod: 1.2, 
    potions: 0,
    aiAggression: 0.9, // Very aggressive (was 0.6)
    aiReaction: 10,   // Almost instant (was 15)
    allowSkills: true,
    skillRate: 0.65, 
  }
};