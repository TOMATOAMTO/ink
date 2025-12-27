export type Direction = 1 | -1; // 1 = Right, -1 = Left

export enum GameScene {
  MENU = 'MENU',
  GAME = 'GAME',
  GAME_OVER = 'GAME_OVER',
  VICTORY = 'VICTORY'
}

export enum Difficulty {
  EASY = 'EASY',     // 不入流
  MEDIUM = 'MEDIUM', // 二流
  HARD = 'HARD',     // 一流
  GRANDMASTER = 'GRANDMASTER' // 宗师
}

export enum ActionState {
  IDLE = 'IDLE',
  RUN = 'RUN',
  JUMP = 'JUMP',
  DASH = 'DASH',
  ATTACK_1 = 'ATTACK_1',
  ATTACK_2 = 'ATTACK_2',
  ATTACK_3 = 'ATTACK_3',
  BLOCK = 'BLOCK',
  HIT = 'HIT',
  DEAD = 'DEAD',
  
  // Special Moves
  SKILL_PROJECTILE = 'SKILL_PROJECTILE', // 泼墨 (S+J)
  SKILL_UPPERCUT = 'SKILL_UPPERCUT',     // 升龙 (W+J)
  SKILL_OMNI_SLASH = 'SKILL_OMNI_SLASH',   // 五连斩 (S+J -> J) - New
  
  // Air Moves
  AIR_SLASH = 'AIR_SLASH', // 空中普攻
  AIR_DIVE = 'AIR_DIVE',   // 空中下劈 (Air S+J)

  // AI Specific
  SKILL_DASH_STRIKE = 'SKILL_DASH_STRIKE', 
  SKILL_SMASH = 'SKILL_SMASH', 
}

export interface HitBox {
  x: number;
  y: number;
  width: number;
  height: number;
  damage: number;
  knockbackX: number;
  knockbackY: number;
  activeFrames: number; 
}

export interface Particle {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  color: string;
  type: 'INK' | 'SPARK' | 'HEAL' | 'TEXT' | 'MIST';
  text?: string;
}

export interface Projectile {
  id: string;
  ownerId: string; // 'player' or 'enemy'
  x: number;
  y: number;
  vx: number;
  vy: number;
  width: number;
  height: number;
  damage: number;
  life: number;
  hit: boolean;
}

export interface Entity {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  width: number;
  height: number;
  direction: Direction;
  hp: number;
  maxHp: number;
  mp: number;
  maxMp: number;
  state: ActionState;
  stateTimer: number; // Frames in current state
  isGrounded: boolean;
  
  // Combat
  comboIndex: number; // 0, 1, 2 for light attacks
  isBlocking: boolean;
  isInvulnerable: boolean;
  invulnerableTimer: number;
  
  // Visuals
  trail: {x: number, y: number, state: ActionState}[];
  colorGlow: string; // For Enemy difficulty distinction
  scarfColor: string; // New Scarf Color (Can be 'GOLD_CAPE')

  // Mechanics
  healPotions: number;
  healActive: boolean;
  healTimer: number; // For the 3-stage heal
  healCooldown: number;
  
  // Jump Mechanics
  jumpCount: number;
  canJump: boolean;
}

export interface GameState {
  player: Entity;
  enemy: Entity;
  projectiles: Projectile[];
  particles: Particle[];
  difficulty: Difficulty;
  timeRemaining: number; // Seconds (optional)
  cameraShake: number;
  gameSpeed: number; // For slow motion finish
}