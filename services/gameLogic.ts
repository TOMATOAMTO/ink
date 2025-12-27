import { 
  ActionState, Direction, Entity, GameState, 
  Particle, Projectile, Difficulty, HitBox 
} from "../types";
import { 
  CANVAS_WIDTH, GRAVITY, FRICTION, GROUND_Y, 
  MAX_HP, MAX_MP, MP_REGEN, BLOCK_MP_COST,
  DIFFICULTY_CONFIG, JUMP_FORCE, WALK_SPEED, KEYS,
  DASH_SPEED, DASH_COST
} from "../constants";

const AI_MP_COST_MULT = 1.5;

// --- Factory Functions ---

export function createInitialState(difficulty: Difficulty): GameState {
  const diffConfig = DIFFICULTY_CONFIG[difficulty];
  
  const player: Entity = {
    id: 'player',
    x: 200,
    y: GROUND_Y,
    vx: 0,
    vy: 0,
    width: 50,
    height: 100,
    direction: 1,
    hp: MAX_HP,
    maxHp: MAX_HP,
    mp: MAX_MP,
    maxMp: MAX_MP,
    state: ActionState.IDLE,
    stateTimer: 0,
    isGrounded: true,
    comboIndex: 0,
    isBlocking: false,
    isInvulnerable: false,
    invulnerableTimer: 0,
    trail: [],
    colorGlow: '',
    scarfColor: 'GOLD', // Player uses Gold Scarf
    healPotions: diffConfig.potions,
    healActive: false,
    healTimer: 0,
    healCooldown: 0,
    jumpCount: 0,
    canJump: true
  };

  const enemy: Entity = {
    ...player,
    id: 'enemy',
    x: CANVAS_WIDTH - 200,
    direction: -1,
    maxHp: MAX_HP * diffConfig.hpMod,
    hp: MAX_HP * diffConfig.hpMod,
    colorGlow: diffConfig.color,
    scarfColor: diffConfig.color, // Can be 'GOLD_CAPE' for GM
    healPotions: 0, // Enemy doesn't heal
    jumpCount: 0,
    canJump: true
  };

  return {
    player,
    enemy,
    projectiles: [],
    particles: [],
    difficulty,
    timeRemaining: 60, // 60 Seconds Duel
    cameraShake: 0,
    gameSpeed: 1.0,
  };
}

// --- Main Update Loop ---

export function updateGameState(state: GameState, inputKeys: Set<string>): GameState {
  if (state.gameSpeed === 0) return state;

  // Process Entities
  updateEntity(state.player, inputKeys, state);
  updateAI(state.enemy, state.player, state.difficulty, state);
  updateEntity(state.enemy, new Set(), state); // AI input simulated inside updateAI

  // Physics & Collision
  applyPhysics(state.player);
  applyPhysics(state.enemy);
  const hits = checkCollisions(state);

  // Process Combat Results
  hits.forEach(hit => applyHit(hit, state));

  // Projectiles
  updateProjectiles(state);

  // Particles
  updateParticles(state);

  // Global State
  if (state.cameraShake > 0) state.cameraShake--;
  
  // Timer Logic
  if (state.player.state !== ActionState.DEAD && state.enemy.state !== ActionState.DEAD) {
      state.timeRemaining -= 1/60;
      if (state.timeRemaining <= 0) {
          state.timeRemaining = 0;
          // Time Over Decision - Higher HP Wins
          if (state.player.hp >= state.enemy.hp) {
              state.enemy.hp = 0; // Enemy dies
              state.enemy.state = ActionState.DEAD;
              state.gameSpeed = 0.1;
          } else {
              state.player.hp = 0; // Player dies
              state.player.state = ActionState.DEAD;
              state.gameSpeed = 0.2;
          }
      }
  }
  
  // Game End Check (HP Depletion)
  if (state.player.hp <= 0 && state.player.state !== ActionState.DEAD) {
    state.player.state = ActionState.DEAD;
    state.gameSpeed = 0.2; // Slow mo death
  } else if (state.enemy.hp <= 0 && state.enemy.state !== ActionState.DEAD) {
    state.enemy.state = ActionState.DEAD;
    state.gameSpeed = 0.1; // Epic victory slow mo
  }

  return state;
}

// --- Entity Logic ---

function updateEntity(entity: Entity, input: Set<string>, gameState: GameState) {
  entity.stateTimer++;
  
  // Cooldowns & Regen
  if (entity.healCooldown > 0) entity.healCooldown--;
  if (entity.invulnerableTimer > 0) entity.invulnerableTimer--;
  else entity.isInvulnerable = false;

  // MP Regen / Drain
  if (entity.state === ActionState.BLOCK) {
    entity.mp -= BLOCK_MP_COST;
    if (entity.mp <= 0) {
      entity.mp = 0;
      entity.state = ActionState.IDLE; // Guard break
    }
  } else {
    entity.mp = Math.min(entity.maxMp, entity.mp + MP_REGEN);
  }

  // Healing Logic
  if (entity.healActive) {
    processHealing(entity, gameState);
  }

  // State Machine Transitions
  if (entity.state === ActionState.DEAD || entity.state === ActionState.HIT) {
    if (entity.state === ActionState.HIT && entity.stateTimer > 20) {
      entity.state = ActionState.IDLE;
    }
    return; 
  }

  // Trail Logic
  if (entity.stateTimer % 5 === 0 || entity.state === ActionState.DASH || entity.state === ActionState.SKILL_OMNI_SLASH) {
      entity.trail.push({ x: entity.x, y: entity.y, state: entity.state });
      if (entity.trail.length > 5) entity.trail.shift();
  }

  // Inputs extraction
  const isLeft = KEYS.LEFT.some(k => input.has(k));
  const isRight = KEYS.RIGHT.some(k => input.has(k));
  const isUp = KEYS.UP.some(k => input.has(k));
  const isDown = KEYS.DOWN.some(k => input.has(k));
  const isAttack = KEYS.ATTACK.some(k => input.has(k));
  const isHeal = KEYS.HEAL.some(k => input.has(k));
  const isDashLeft = KEYS.DASH_LEFT.some(k => input.has(k));
  const isDashRight = KEYS.DASH_RIGHT.some(k => input.has(k));

  // --- SPECIAL COMBO LOGIC: SJSJ (Projectile -> Omni Slash) ---
  if (entity.state === ActionState.SKILL_PROJECTILE && entity.stateTimer > 2 && entity.stateTimer < 25) {
      if (isAttack && isDown && entity.mp >= 20) {
          entity.mp -= 20;
          entity.state = ActionState.SKILL_OMNI_SLASH;
          entity.stateTimer = 0;
          entity.vx = entity.direction * 15; // Lunge forward
          createParticleBurst(gameState, entity.x, entity.y, 'INK_DASH');
          return;
      }
  }

  // --- PRIORITY SKILL / CANCEL LOGIC: Projectile (S + J) ---
  // We handle this BEFORE the generic busy check to allow cancelling attacks/blocks into Projectile
  if (entity.isGrounded && isDown && isAttack && entity.mp >= 10) {
      const validCancelStates = [
          ActionState.IDLE, ActionState.RUN, ActionState.BLOCK, 
          ActionState.ATTACK_1, ActionState.ATTACK_2, ActionState.ATTACK_3
      ];
      
      // If we are in a valid state to cancel (or just idle), and NOT already doing the skill
      if (validCancelStates.includes(entity.state) && entity.state !== ActionState.SKILL_PROJECTILE) {
          entity.mp -= 10;
          entity.state = ActionState.SKILL_PROJECTILE;
          entity.stateTimer = 0;
          entity.isBlocking = false; // Force stop blocking
          entity.vx = 0; // Stop movement
          return; // Skip remaining logic for this frame to prevent state overwrite
      }
  }

  // Determine if busy
  const busyStates = [
      ActionState.ATTACK_1, ActionState.ATTACK_2, ActionState.ATTACK_3, 
      ActionState.SKILL_PROJECTILE, ActionState.SKILL_UPPERCUT, 
      ActionState.SKILL_OMNI_SLASH, ActionState.DASH,
      ActionState.AIR_SLASH, ActionState.AIR_DIVE
  ];
  const canAct = !busyStates.includes(entity.state);
  
  // Input Handling for Jump Reset
  if (!isUp) {
      entity.canJump = true;
  }

  if (canAct) {
    // 1. Dash
    if ((isDashLeft || isDashRight) && entity.mp >= DASH_COST) {
        entity.state = ActionState.DASH;
        entity.stateTimer = 0;
        entity.mp -= DASH_COST;
        entity.direction = isDashLeft ? -1 : 1;
        entity.vx = entity.direction * DASH_SPEED;
        entity.isInvulnerable = true;
        entity.invulnerableTimer = 15;
        createParticleBurst(gameState, entity.x, entity.y, 'INK_DASH');
        return;
    }

    // 2. Air Actions
    if (!entity.isGrounded) {
        // Air Movement
        if (isLeft) { entity.vx = -WALK_SPEED; entity.direction = -1; }
        else if (isRight) { entity.vx = WALK_SPEED; entity.direction = 1; }
        
        // Double Jump
        if (isUp && entity.canJump && entity.jumpCount < 2) {
             entity.vy = JUMP_FORCE * 0.9;
             entity.jumpCount++;
             entity.canJump = false; 
             entity.state = ActionState.JUMP;
             createParticleBurst(gameState, entity.x, entity.y + 20, 'MIST');
        }

        // Air Dive (Just DOWN key in air)
        if (isDown) {
            entity.state = ActionState.AIR_DIVE;
            entity.stateTimer = 0;
            entity.vy = 20; // Fast fall
            entity.vx = 0; 
        }
        
        // Air Attacks
        else if (isAttack) {
             // J (Air Slash)
             entity.state = ActionState.AIR_SLASH;
             entity.stateTimer = 0;
             entity.vy = -3; // Little hop/stall
        }
    } 
    // 3. Ground Actions
    else {
        // Movement
        if (isLeft) {
          entity.vx = -WALK_SPEED;
          entity.direction = -1;
          if (entity.state !== ActionState.BLOCK) entity.state = ActionState.RUN;
        } else if (isRight) {
          entity.vx = WALK_SPEED;
          entity.direction = 1;
          if (entity.state !== ActionState.BLOCK) entity.state = ActionState.RUN;
        } else {
          entity.vx = 0;
          if (entity.state === ActionState.RUN) entity.state = ActionState.IDLE;
        }

        // Jump (Ground)
        if (isUp && entity.canJump) {
          if (isAttack && entity.mp >= 15) { 
              // W + J (Uppercut)
              entity.mp -= 15; 
              entity.vy = JUMP_FORCE * 1.2;
              entity.state = ActionState.SKILL_UPPERCUT;
              entity.stateTimer = 0;
          } else {
              entity.vy = JUMP_FORCE;
              entity.state = ActionState.JUMP;
              entity.isGrounded = false;
              entity.jumpCount = 1;
              entity.canJump = false;
          }
        }

        // Crouch / Block
        if (isDown) {
            // Note: Projectile Logic moved to top for priority cancel
            if (entity.mp > 5) {
                entity.state = ActionState.BLOCK;
                entity.isBlocking = true;
            }
        } else {
            // Stop Blocking
            if (entity.state === ActionState.BLOCK) entity.state = ActionState.IDLE;
            entity.isBlocking = false;
        }

        // Normal Attacks
        if (isAttack && !entity.isBlocking && (entity.state === ActionState.IDLE || entity.state === ActionState.RUN)) {
             entity.state = ActionState.ATTACK_1;
             entity.stateTimer = 0;
             entity.vx = entity.direction * 2; 
        }
        
        // Combo Logic
        if (isAttack && [ActionState.ATTACK_1, ActionState.ATTACK_2].includes(entity.state) && entity.stateTimer > 8) {
             if (entity.state === ActionState.ATTACK_1) {
                 entity.state = ActionState.ATTACK_2;
                 entity.stateTimer = 0;
                 entity.vx = entity.direction * 5;
             } else {
                 entity.state = ActionState.ATTACK_3;
                 entity.stateTimer = 0;
                 entity.vx = entity.direction * 10;
             }
        }
    }
    
    // Heal
    if (isHeal && !entity.healActive && entity.healPotions > 0 && entity.healCooldown === 0) {
        entity.healPotions--;
        entity.healActive = true;
        entity.healCooldown = 15 * 60; 
    }
  }

  // Action Physics/Friction Updates
  updateActionPhysics(entity, gameState);
}

function processHealing(entity: Entity, gameState: GameState) {
    entity.healTimer++;
    if (entity.healTimer === 1 || entity.healTimer === 30 || entity.healTimer === 60) {
      let healAmount = 0;
      if (entity.healTimer === 1) healAmount = entity.maxHp * 0.15;
      if (entity.healTimer === 30) healAmount = entity.maxHp * 0.07;
      if (entity.healTimer === 60) healAmount = entity.maxHp * 0.03;
      entity.hp = Math.min(entity.maxHp, entity.hp + healAmount);
      gameState.particles.push({
        id: Math.random().toString(),
        x: entity.x,
        y: entity.y - entity.height,
        vx: 0,
        vy: -1,
        life: 60,
        maxLife: 60,
        size: 16,
        color: '#10B981',
        type: 'TEXT',
        text: `+${Math.floor(healAmount)}`
      });
    }
    if (entity.healTimer > 70) {
        entity.healActive = false;
        entity.healTimer = 0;
    }
}

function updateActionPhysics(entity: Entity, gameState: GameState) {
    if ([ActionState.ATTACK_1, ActionState.ATTACK_2, ActionState.ATTACK_3, ActionState.SKILL_UPPERCUT].includes(entity.state)) {
        entity.vx *= 0.8;
        // Reduced recovery frames for faster combat flow
        if (entity.stateTimer > 18) entity.state = ActionState.IDLE; 
    }

    if (entity.state === ActionState.SKILL_PROJECTILE) {
        entity.vx *= 0.8;
        // Spawn Projectile logic moved here to sync with animation frame
        if (entity.stateTimer === 10) {
             gameState.projectiles.push({
                 id: Math.random().toString(),
                 ownerId: entity.id,
                 x: entity.x + (entity.direction * 40),
                 y: entity.y - entity.height/2,
                 vx: entity.direction * 15,
                 vy: 0,
                 width: 60,
                 height: 60,
                 damage: 60,
                 life: 100,
                 hit: false
             });
        }
        if (entity.stateTimer > 20) entity.state = ActionState.IDLE; // Faster recovery
    }
    
    // Dash
    if (entity.state === ActionState.DASH) {
        if (entity.stateTimer > 10) entity.vx *= 0.7;
        if (entity.stateTimer > 15) entity.state = ActionState.IDLE;
    }

    // Omni Slash (New Combo)
    if (entity.state === ActionState.SKILL_OMNI_SLASH) {
        // Fast burst movement
        if (entity.stateTimer < 5) entity.vx = entity.direction * 20;
        else entity.vx *= 0.6;
        
        if (entity.stateTimer > 35) entity.state = ActionState.IDLE;
    }

    // Air Slash
    if (entity.state === ActionState.AIR_SLASH) {
        if (entity.stateTimer > 20) entity.state = ActionState.JUMP; 
    }

    // Air Dive 
    if (entity.state === ActionState.AIR_DIVE && entity.isGrounded) {
        entity.state = ActionState.IDLE;
        entity.stateTimer = -5; 
    }
}

// --- Physics ---

function applyPhysics(entity: Entity) {
  entity.vy += GRAVITY;
  entity.x += entity.vx;
  entity.y += entity.vy;

  // Ground collision
  if (entity.y >= GROUND_Y) {
    entity.y = GROUND_Y;
    entity.vy = 0;
    entity.isGrounded = true;
    entity.jumpCount = 0; // Reset jumps
    if (entity.state === ActionState.JUMP || entity.state === ActionState.AIR_SLASH) {
        entity.state = ActionState.IDLE;
    }
  }

  // Wall collision
  if (entity.x < 20) entity.x = 20;
  if (entity.x > CANVAS_WIDTH - 20) entity.x = CANVAS_WIDTH - 20;
}

// --- AI (Behavior Tree - Simplified) ---

function updateAI(ai: Entity, target: Entity, difficulty: Difficulty, state: GameState) {
    // Reset jump input state logic for AI
    ai.canJump = true; 

    // Grandmaster Teleport
    if (difficulty === Difficulty.GRANDMASTER && ai.state === ActionState.HIT) {
        if (Math.random() < 0.1) {
            ai.x = target.x - (target.direction * 100);
            ai.state = ActionState.IDLE;
            createParticleBurst(state, ai.x, ai.y, 'INK_HIT');
            return;
        }
    }

    if (ai.state === ActionState.DEAD || ai.state === ActionState.HIT || ai.state === ActionState.DASH || ai.state === ActionState.SKILL_OMNI_SLASH) return;

    const diffConfig = DIFFICULTY_CONFIG[difficulty];
    const dx = target.x - ai.x;
    const dist = Math.abs(dx);
    const dy = target.y - ai.y;
    
    ai.direction = dx > 0 ? 1 : -1;
    if (ai.stateTimer < diffConfig.aiReaction) return;

    const rand = Math.random();
    // Base aggression check
    const isAggressive = rand < diffConfig.aiAggression;
    // Skill check based on difficulty setting
    const useSkill = Math.random() < (diffConfig.skillRate || 0);
    
    // AI Double Jump Logic
    if (!ai.isGrounded && ai.jumpCount < 2 && dy < -100 && rand < 0.1) {
        ai.vy = JUMP_FORCE * 0.9;
        ai.jumpCount++;
        ai.state = ActionState.JUMP;
        createParticleBurst(state, ai.x, ai.y + 20, 'MIST');
        return;
    }

    // Distance Based Logic
    if (dist < 150) {
        if ((target.state as string).includes('ATTACK')) {
            const cost = 15 * AI_MP_COST_MULT;
            if (ai.mp > cost && isAggressive) { 
                // Uppercut Counter
                ai.state = ActionState.SKILL_UPPERCUT;
                ai.vy = JUMP_FORCE * 1.2;
                ai.mp -= cost; 
                ai.stateTimer = 0;
            } else {
                ai.state = ActionState.BLOCK;
                ai.isBlocking = true;
            }
        } else {
            if (isAggressive) {
                 // Basic Combo
                 ai.state = ActionState.ATTACK_1;
                 ai.stateTimer = 0;
                 ai.vx = ai.direction * 2;
            } else {
                // NEW: Passive behavior - Don't just stand there
                // 5% chance to Block proactively
                if (Math.random() < 0.05) {
                    ai.state = ActionState.BLOCK;
                    ai.isBlocking = true;
                } 
                // 10% chance to reposition (micro spacing)
                else if (Math.random() < 0.1) {
                    ai.vx = -ai.direction * WALK_SPEED * 0.5; // Back off
                    ai.state = ActionState.RUN;
                }
                // Otherwise idle/guard up
            }
        }
    } else if (dist > 300) {
        const projCost = 10 * AI_MP_COST_MULT;
        // Projectile check
        if (diffConfig.allowSkills && ai.mp > projCost && (useSkill && Math.random() < 0.1)) { 
             ai.state = ActionState.SKILL_PROJECTILE;
             ai.mp -= projCost; 
             ai.stateTimer = 0;
             // Projectile spawned in updateActionPhysics
        } else {
            // Move fast to close gap (Full speed active approach)
            ai.vx = ai.direction * WALK_SPEED; 
            ai.state = ActionState.RUN;
        }
    } else {
        if (Math.random() < 0.05 && ai.isGrounded) {
            ai.vy = JUMP_FORCE;
            ai.state = ActionState.JUMP;
            ai.isGrounded = false;
            ai.jumpCount = 1;
        } else {
             // Move steadily (70% speed)
             ai.vx = ai.direction * WALK_SPEED * 0.7;
             ai.state = ActionState.RUN;
        }
    }
}

// --- Combat System ---

function checkCollisions(state: GameState): {attacker: Entity, target: Entity, damage: number, type: string}[] {
    const hits: {attacker: Entity, target: Entity, damage: number, type: string}[] = [];

    const entities = [state.player, state.enemy];

    entities.forEach(attacker => {
        const target = attacker.id === 'player' ? state.enemy : state.player;
        if (target.isInvulnerable || target.state === ActionState.DEAD) return;

        let damage = 0;
        let activeFrameStart = 5;
        let activeFrameEnd = 15;
        let range = 80;
        let yRange = 50;

        // Hitbox Definitions
        switch(attacker.state) {
            case ActionState.ATTACK_1: damage = 30; break;
            case ActionState.ATTACK_2: damage = 30; break;
            case ActionState.ATTACK_3: damage = 50; activeFrameStart = 8; range = 120; break;
            case ActionState.SKILL_UPPERCUT: damage = 70; activeFrameStart = 2; yRange = 100; break;
            case ActionState.SKILL_OMNI_SLASH:
                damage = 15; // Hit multiple times potentially
                activeFrameStart = 5;
                activeFrameEnd = 30;
                range = 150;
                yRange = 80;
                break;
            case ActionState.AIR_SLASH: damage = 40; yRange = 80; break;
            case ActionState.AIR_DIVE: damage = 60; activeFrameStart = 2; activeFrameEnd = 30; yRange = 80; break;
        }

        if (damage > 0 && attacker.stateTimer >= activeFrameStart && attacker.stateTimer <= activeFrameEnd) {
             const dist = Math.abs(attacker.x - target.x);
             const yDist = Math.abs(attacker.y - target.y);
             
             // Attacker must be facing target (mostly)
             const facing = (attacker.x < target.x && attacker.direction === 1) || (attacker.x > target.x && attacker.direction === -1);
             
             // For Blade Storm/Omni, hit box is all around slightly
             if (attacker.state === ActionState.SKILL_OMNI_SLASH) {
                 if (dist < range && yDist < 60) hits.push({ attacker, target, damage, type: 'MELEE' });
             } else if (dist < range && yDist < yRange && facing) {
                 hits.push({ attacker, target, damage, type: 'MELEE' });
             }
        }
    });

    state.projectiles.forEach(p => {
        if (p.hit) return;
        const target = p.ownerId === 'player' ? state.enemy : state.player;
        if (target.isInvulnerable || target.state === ActionState.DEAD) return;
        const dist = Math.abs(p.x - target.x);
        const yDist = Math.abs(p.y - (target.y - target.height/2));
        if (dist < 40 && yDist < 60) {
            p.hit = true;
            hits.push({ attacker: target /* placeholder */, target, damage: p.damage, type: 'PROJECTILE' });
        }
    });

    return hits;
}

function applyHit(hit: {attacker: Entity, target: Entity, damage: number, type: string}, state: GameState) {
    const { target, damage } = hit;

    if (target.isBlocking && target.mp > 0) {
        target.hp -= damage * 0.1;
        // NEW: Restore MP on Block instead of cost
        target.mp = Math.min(target.maxMp, target.mp + 10);
        
        createParticleBurst(state, target.x, target.y - target.height/2, 'SPARK');
        
        // Add text particle for MP Gain
        state.particles.push({
            id: Math.random().toString(),
            x: target.x,
            y: target.y - target.height - 20,
            vx: 0,
            vy: -1,
            life: 40,
            maxLife: 40,
            size: 14,
            color: '#3b82f6',
            type: 'TEXT',
            text: '+MP'
        });

    } else {
        target.hp -= damage;
        target.state = ActionState.HIT;
        target.stateTimer = 0;
        target.vx = -target.direction * 5; 
        target.isInvulnerable = true;
        target.invulnerableTimer = 20; 
        state.cameraShake = 5;

        createParticleBurst(state, target.x, target.y - target.height/2, 'INK_HIT');
    }
}

function createParticleBurst(state: GameState, x: number, y: number, type: 'INK_HIT' | 'INK_DASH' | 'SPARK' | 'MIST') {
    if (type === 'INK_HIT') {
        // Explosion of ink
        for(let i=0; i<12; i++) {
            state.particles.push({
                id: Math.random().toString(),
                x: x,
                y: y,
                vx: (Math.random() - 0.5) * 15,
                vy: (Math.random() - 0.5) * 15,
                life: 40 + Math.random() * 20,
                maxLife: 60,
                size: Math.random() * 8 + 4,
                color: '#000',
                type: 'INK'
            });
        }
        // Dripping ink
        for(let i=0; i<5; i++) {
             state.particles.push({
                id: Math.random().toString(),
                x: x + (Math.random() - 0.5) * 20,
                y: y,
                vx: (Math.random() - 0.5) * 2,
                vy: Math.random() * 2, // Falling down
                life: 60,
                maxLife: 60,
                size: Math.random() * 4 + 2,
                color: '#000',
                type: 'INK'
            });
        }
    } else if (type === 'INK_DASH' || type === 'MIST') {
        // Mist/Trail
         for(let i=0; i<5; i++) {
            state.particles.push({
                id: Math.random().toString(),
                x: x + (Math.random() - 0.5) * 20,
                y: y + (type === 'MIST' ? 0 : 20),
                vx: (Math.random() - 0.5) * 5,
                vy: (Math.random() - 0.5) * 2,
                life: 20,
                maxLife: 20,
                size: Math.random() * 10 + 2,
                color: '#aaa',
                type: 'MIST'
            });
        }
    } else {
        // Sparks (White)
        for(let i=0; i<8; i++) {
            state.particles.push({
                id: Math.random().toString(),
                x: x,
                y: y,
                vx: (Math.random() - 0.5) * 12,
                vy: (Math.random() - 0.5) * 12,
                life: 20,
                maxLife: 20,
                size: Math.random() * 3 + 1,
                color: '#FFF',
                type: 'SPARK'
            });
        }
    }
}

function updateProjectiles(state: GameState) {
    state.projectiles = state.projectiles.filter(p => {
        p.x += p.vx;
        p.life--;
        // Projectile trail
        if (p.life % 2 === 0) {
             state.particles.push({
                id: Math.random().toString(),
                x: p.x,
                y: p.y,
                vx: 0,
                vy: 0,
                life: 10,
                maxLife: 10,
                size: 4,
                color: '#000',
                type: 'INK'
            });
        }
        return p.life > 0 && !p.hit && p.x > 0 && p.x < CANVAS_WIDTH;
    });
}

function updateParticles(state: GameState) {
    state.particles = state.particles.filter(p => {
        p.x += p.vx;
        p.y += p.vy;
        p.life--;
        // Gravity for heavy ink
        if (p.type === 'INK' && p.vy < 5) {
            p.vy += 0.2;
        }
        return p.life > 0;
    });
}