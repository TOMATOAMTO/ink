import { CANVAS_HEIGHT, CANVAS_WIDTH, GROUND_Y } from "../constants";
import { ActionState, Difficulty, Entity, GameState, Particle, Projectile } from "../types";

// --- Background Cache ---
// Store generated canvases here so they are only drawn once per session/difficulty switch.
const backgroundCache: Partial<Record<Difficulty, HTMLCanvasElement>> = {};

export function drawGame(ctx: CanvasRenderingContext2D, state: GameState) {
  // Clear and Draw Background (Cached)
  drawCachedBackground(ctx, state.difficulty);
  
  // Draw Ground (Thick Ink Stroke)
  ctx.beginPath();
  ctx.moveTo(0, GROUND_Y);
  ctx.lineTo(CANVAS_WIDTH, GROUND_Y);
  ctx.lineWidth = 10;
  ctx.strokeStyle = '#1a1a1a';
  ctx.lineCap = 'round';
  ctx.stroke();

  // Draw Entities
  drawEntity(ctx, state.player, false);
  drawEntity(ctx, state.enemy, true);

  // Draw Projectiles
  state.projectiles.forEach(p => drawProjectile(ctx, p));

  // Draw Particles
  state.particles.forEach(p => drawParticle(ctx, p));
}

function drawCachedBackground(ctx: CanvasRenderingContext2D, difficulty: Difficulty) {
    // If cache exists, use it
    if (backgroundCache[difficulty]) {
        ctx.drawImage(backgroundCache[difficulty]!, 0, 0);
        return;
    }

    // Generate cache
    const offscreen = document.createElement('canvas');
    offscreen.width = CANVAS_WIDTH;
    offscreen.height = CANVAS_HEIGHT;
    const offCtx = offscreen.getContext('2d');
    
    if (offCtx) {
        renderStaticBackgroundToCanvas(offCtx, difficulty);
        backgroundCache[difficulty] = offscreen;
        ctx.drawImage(offscreen, 0, 0);
    }
}

function renderStaticBackgroundToCanvas(ctx: CanvasRenderingContext2D, difficulty: Difficulty) {
    // Base Paper Color
    ctx.fillStyle = '#f3f0e6'; 
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    ctx.save();
    
    if (difficulty === Difficulty.EASY) {
        // --- BAMBOO FOREST (Static) ---
        ctx.fillStyle = '#e8f5e9'; // Very light green tint
        ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
        
        ctx.globalAlpha = 0.2;
        const bambooPositions = [20, 100, 180, 240, 320, 400, 480, 560, 640, 720, 800, 880, 940];
        
        bambooPositions.forEach((x, i) => {
             const width = 15 + (i % 3) * 5; 
             // Draw Bamboo Stalk
             ctx.fillStyle = '#2e4a33';
             ctx.fillRect(x, 0, width, GROUND_Y);
             
             // Draw Bamboo Joints (Use fillRect with BG color instead of clearRect to prevent transparency artifacts)
             ctx.fillStyle = '#e8f5e9'; 
             for(let j=0; j<8; j++) {
                 const y = j * 80 + 40 + (i % 2) * 20;
                 ctx.fillRect(x - 2, y, width + 4, 3);
             }
        });
        ctx.globalAlpha = 1.0;

    } else if (difficulty === Difficulty.MEDIUM) {
        // --- MISTY MOUNTAINS (Static) ---
        ctx.fillStyle = '#eceff1'; 
        ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

        const drawStaticMountain = (yOffset: number, color: string, seedOffset: number) => {
             ctx.fillStyle = color;
             ctx.beginPath();
             ctx.moveTo(0, CANVAS_HEIGHT);
             ctx.lineTo(0, CANVAS_HEIGHT - yOffset);
             ctx.bezierCurveTo(
                 200 + seedOffset, CANVAS_HEIGHT - yOffset - 150, 
                 400 - seedOffset, CANVAS_HEIGHT - yOffset - 50, 
                 500, CANVAS_HEIGHT - yOffset - 100
             );
             ctx.bezierCurveTo(
                 600 + seedOffset, CANVAS_HEIGHT - yOffset - 200, 
                 800, CANVAS_HEIGHT - yOffset, 
                 CANVAS_WIDTH, CANVAS_HEIGHT - yOffset - 50
             );
             ctx.lineTo(CANVAS_WIDTH, CANVAS_HEIGHT);
             ctx.fill();
        };

        ctx.globalAlpha = 0.3;
        drawStaticMountain(200, '#90a4ae', 0); // Far
        ctx.globalAlpha = 0.5;
        drawStaticMountain(50, '#546e7a', 50); // Mid
        ctx.globalAlpha = 1.0;

    } else if (difficulty === Difficulty.HARD) {
        // --- SUNSET BATTLEFIELD (Static) ---
        const gradient = ctx.createLinearGradient(0, 0, 0, CANVAS_HEIGHT);
        gradient.addColorStop(0, '#ffcc80');
        gradient.addColorStop(1, '#f3f0e6');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

        ctx.fillStyle = '#e53935';
        ctx.globalAlpha = 0.8;
        ctx.beginPath();
        ctx.arc(CANVAS_WIDTH * 0.7, 150, 80, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#d84315';
        ctx.globalAlpha = 0.6;
        const leafPositions = [[100, 100], [250, 200], [500, 50], [800, 300], [900, 100], [50, 400], [300, 350], [600, 250]];
        leafPositions.forEach(([lx, ly]) => {
             ctx.beginPath();
             ctx.ellipse(lx, ly, 8, 4, Math.PI/4, 0, Math.PI * 2);
             ctx.fill();
        });
        ctx.globalAlpha = 1.0;

    } else if (difficulty === Difficulty.GRANDMASTER) {
        // --- MOONLIT ROOFTOP (Static) ---
        const gradient = ctx.createLinearGradient(0, 0, 0, CANVAS_HEIGHT);
        gradient.addColorStop(0, '#263238'); 
        gradient.addColorStop(1, '#455a64');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

        ctx.fillStyle = '#fff9c4';
        ctx.shadowBlur = 50;
        ctx.shadowColor = '#fff9c4';
        ctx.beginPath();
        ctx.arc(100, 100, 60, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;

        ctx.fillStyle = '#102027';
        ctx.beginPath();
        ctx.moveTo(0, GROUND_Y);
        ctx.lineTo(200, GROUND_Y - 100);
        ctx.lineTo(CANVAS_WIDTH - 200, GROUND_Y - 100);
        ctx.lineTo(CANVAS_WIDTH, GROUND_Y);
        ctx.fill();
    }

    ctx.restore();
}

function drawEntity(ctx: CanvasRenderingContext2D, entity: Entity, isEnemy: boolean) {
  const { x, y, width, height, direction, state, colorGlow, scarfColor, trail, vx, vy } = entity;
  
  // 1. Draw Trail (Ghosting)
  trail.forEach((t, i) => {
    ctx.globalAlpha = 0.1 + (i / trail.length) * 0.2;
    // Pass fake velocity for trail to keep static pose
    drawCharacterSilhouette(ctx, t.x, t.y, width, height, direction, t.state, isEnemy ? scarfColor : undefined, true, 0, 0, 0);
  });
  ctx.globalAlpha = 1.0;

  // 2. Draw Main Character
  if (!isEnemy && entity.healActive) {
     ctx.shadowBlur = 15;
     ctx.shadowColor = '#10B981'; // Green healing glow
  }

  drawCharacterSilhouette(ctx, x, y, width, height, direction, state, scarfColor, false, entity.stateTimer, vx, vy);
  
  ctx.shadowBlur = 0;
}

function drawCharacterSilhouette(
  ctx: CanvasRenderingContext2D, 
  x: number, 
  y: number, 
  w: number, 
  h: number, 
  dir: number, 
  state: ActionState,
  scarfColor: string | undefined, 
  isTrail: boolean,
  timer: number,
  vx: number,
  vy: number
) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(dir, 1); 
  
  // CAPE Logic for Grandmaster
  if (scarfColor === 'GOLD_CAPE' && !isTrail) {
     drawCape(ctx, 0, -h + 10, '#D4AF37', state, timer);
  }

  // Body Color
  ctx.fillStyle = '#0a0a0a'; 
  if (state === ActionState.DASH) {
      ctx.globalAlpha = 0.5;
      ctx.strokeStyle = '#000';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(-50, -h/2); ctx.lineTo(-100, -h/2);
      ctx.stroke();
  }
  
  ctx.beginPath();
  
  // Base shapes based on State
  switch (state) {
    case ActionState.IDLE:
      ctx.moveTo(-10, -h); 
      ctx.bezierCurveTo(-20, -h/2, -25, -10, -15, 0); 
      ctx.lineTo(15, 0); 
      ctx.bezierCurveTo(25, -10, 20, -h/2, 10, -h); 
      break;

    case ActionState.RUN:
    case ActionState.DASH:
    case ActionState.SKILL_OMNI_SLASH:
      ctx.moveTo(0, -h + 10);
      ctx.bezierCurveTo(-30, -h/2, -40, -10, -20, 0); 
      ctx.lineTo(20, 0); 
      ctx.bezierCurveTo(30, -30, 15, -h/2, 10, -h + 10);
      
      // OMNI SLASH VISUALS (FIVE SLASH)
      if (state === ActionState.SKILL_OMNI_SLASH && !isTrail) {
          ctx.save();
          const slashTime = timer;
          ctx.strokeStyle = '#D4AF37'; // Gold slash for special move
          ctx.lineWidth = 2;
          
          // Generate 5 random lines around the player
          for(let i=0; i<5; i++) {
              const offset = (slashTime + i * 20) % 30;
              if (offset < 15) {
                ctx.beginPath();
                ctx.moveTo(10 + Math.random() * 80, -h/2 + Math.random() * 80 - 40);
                ctx.lineTo(-20 - Math.random() * 40, -h/2 - Math.random() * 80 + 40);
                ctx.globalAlpha = 0.6;
                ctx.stroke();
              }
          }
          ctx.restore();
      }
      break;
    
    case ActionState.ATTACK_1:
      ctx.moveTo(-5, -h + 5);
      ctx.lineTo(-25, 0); 
      ctx.lineTo(25, 0); 
      ctx.lineTo(15, -h/2);
      ctx.lineTo(5, -h + 5);
      if (!isTrail) {
          drawSword(ctx, -h/2, 0, timer);
          drawSlash(ctx, 'HORIZONTAL', timer);
      }
      break;

    case ActionState.ATTACK_2:
      ctx.moveTo(0, -h + 10);
      ctx.lineTo(-20, 0);
      ctx.lineTo(10, -10);
      ctx.lineTo(10, -h + 10);
      if (!isTrail) {
          drawSword(ctx, -h/2, -Math.PI/4, timer);
          drawSlash(ctx, 'UPWARD', timer);
      }
      break;

    case ActionState.ATTACK_3:
      ctx.moveTo(-15, -h + 15);
      ctx.lineTo(-40, 0); 
      ctx.lineTo(40, 0); 
      ctx.lineTo(30, -h/2);
      if (!isTrail) {
          drawSword(ctx, -h/2, Math.PI/2, timer);
          drawSlash(ctx, 'THRUST', timer);
      }
      break;

    case ActionState.SKILL_UPPERCUT:
      ctx.moveTo(0, -h);
      ctx.bezierCurveTo(-10, -h/2, -10, -10, 0, 0);
      ctx.bezierCurveTo(10, -10, 10, -h/2, 0, -h);
      if (!isTrail) {
         ctx.save();
         ctx.translate(0, -h/2);
         ctx.rotate(-Math.PI/2 * (timer/10));
         drawSlash(ctx, 'UPWARD', timer);
         ctx.restore();
      }
      break;

    case ActionState.SKILL_PROJECTILE:
        ctx.moveTo(0, -h);
        ctx.lineTo(-20, 0);
        ctx.lineTo(20, 0);
        if (!isTrail) drawSword(ctx, -h/2, 0, 10);
        break;

    case ActionState.AIR_SLASH:
        ctx.arc(0, -h/2, 25, 0, Math.PI * 2);
        if (!isTrail) {
            ctx.save();
            ctx.translate(0, -h/2);
            ctx.rotate(timer * 0.5); 
            ctx.beginPath();
            ctx.arc(0, 0, 60, 0, Math.PI * 1.5);
            ctx.strokeStyle = '#000';
            ctx.lineWidth = 5;
            ctx.stroke();
            drawSword(ctx, 0, 0, 0);
            ctx.restore();
        }
        break;

    case ActionState.AIR_DIVE:
        ctx.save();
        ctx.rotate(Math.PI / 4);
        ctx.rect(-15, -h, 30, h);
        ctx.restore();
        if (!isTrail) {
            drawSword(ctx, -h/2, Math.PI/3, 0);
            ctx.strokeStyle = 'rgba(0,0,0,0.5)';
            ctx.lineWidth = 10;
            ctx.beginPath();
            ctx.moveTo(-20, -h);
            ctx.lineTo(-80, -h - 60);
            ctx.stroke();
        }
        break;

    case ActionState.BLOCK:
      ctx.moveTo(0, -h * 0.7);
      ctx.quadraticCurveTo(-20, -h/2, -15, 0);
      ctx.lineTo(15, 0);
      ctx.quadraticCurveTo(20, -h/2, 10, -h * 0.7);
      if (!isTrail) {
        ctx.strokeStyle = 'rgba(0,0,0,0.5)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(10, -h/2, 40, -Math.PI/2, Math.PI/2);
        ctx.stroke();
      }
      break;
      
    default:
      ctx.rect(-w/2, -h, w, h);
      break;
  }

  ctx.fill();

  // Head
  ctx.beginPath();
  ctx.arc(0, -h + 10, 10, 0, Math.PI * 2);
  ctx.fill();

  // Scarf (Normal) - Check if it's NOT a Cape
  if (scarfColor && scarfColor !== 'GOLD_CAPE' && !isTrail) {
      drawScarf(ctx, 0, -h + 15, scarfColor, timer, vx, vy);
  }

  ctx.restore();
}

function drawScarf(ctx: CanvasRenderingContext2D, x: number, y: number, color: string, time: number, vx: number, vy: number) {
    ctx.save();
    
    // GOLD SCARF STYLING
    if (color === 'GOLD') {
        const gradient = ctx.createLinearGradient(x, y, x - 40, y + 20);
        gradient.addColorStop(0, '#FFD700'); // Gold
        gradient.addColorStop(0.5, '#FDB931');
        gradient.addColorStop(1, '#DAA520'); // Goldenrod
        ctx.strokeStyle = gradient;
        ctx.shadowColor = '#FFD700';
        ctx.shadowBlur = 8;
    } else {
        ctx.strokeStyle = color;
    }

    ctx.lineWidth = 4;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    
    const wave = Math.sin(time * 0.15) * 4;
    
    // Physics Simulation for Flow
    // Default flow (hanging down)
    let endX = -10;
    let endY = 40;
    let midX = -15;
    let midY = 20;

    const isMovingHoriz = Math.abs(vx) > 0.1;
    const isMovingVert = Math.abs(vy) > 0.1;

    if (isMovingHoriz) {
        // Flowing backward
        endX = -50;
        endY = 10;
        midX = -30;
        midY = 5;
    }
    
    // Vertical Influence
    if (isMovingVert) {
        // If falling (vy > 0), scarf flows UP relative to body
        // If jumping (vy < 0), scarf flows DOWN relative to body
        endY -= vy * 3; 
        midY -= vy * 1.5;
    }

    // Add wave animation
    endY += wave;
    midX += wave * 0.5;

    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.quadraticCurveTo(x + midX, y + midY, x + endX, y + endY);
    ctx.stroke();
    
    // Extra ribbon for gold scarf volume
    if (color === 'GOLD') {
         ctx.beginPath();
         ctx.moveTo(x, y + 3);
         ctx.quadraticCurveTo(x + midX + 5, y + midY + 5, x + endX + 5, y + endY + 5);
         ctx.lineWidth = 2;
         ctx.globalAlpha = 0.7;
         ctx.stroke();
    }

    ctx.restore();
}

function drawCape(ctx: CanvasRenderingContext2D, x: number, y: number, color: string, state: ActionState, time: number) {
    ctx.save();
    ctx.fillStyle = color;
    
    const isMoving = [ActionState.RUN, ActionState.DASH].includes(state);
    const flow = isMoving ? 20 : 0;
    const wave = Math.sin(time * 0.1) * 5;

    ctx.beginPath();
    // Shoulder Attachments
    ctx.moveTo(x - 10, y);
    ctx.lineTo(x + 10, y);
    
    // Bottom Hem (Wide and Flowing)
    ctx.lineTo(x + 35 - flow, y + 90 + wave);
    ctx.lineTo(x - 35 - flow, y + 90 - wave);
    
    ctx.closePath();
    ctx.fill();

    // Subtle outline
    ctx.strokeStyle = '#B8860B'; // Dark goldenrod
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.restore();
}

function drawSword(ctx: CanvasRenderingContext2D, y: number, angleOffset: number, timer: number) {
    ctx.save();
    ctx.translate(10, y);
    const swing = Math.sin(timer * 0.3) * 1;
    ctx.rotate(angleOffset + swing);
    
    ctx.fillStyle = '#111';
    ctx.fillRect(0, -2, 60, 4); 
    ctx.fillStyle = '#333';
    ctx.fillRect(0, -8, 4, 16);
    ctx.fillStyle = '#555';
    ctx.fillRect(-15, -3, 15, 6);

    ctx.strokeStyle = '#888';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(5, -1);
    ctx.lineTo(55, -1);
    ctx.stroke();

    ctx.restore();
}

function drawSlash(ctx: CanvasRenderingContext2D, type: 'HORIZONTAL' | 'UPWARD' | 'THRUST', timer: number) {
    if (timer > 15) return; 

    ctx.save();
    ctx.strokeStyle = 'rgba(0,0,0,0.8)';
    ctx.lineWidth = 8 - (timer * 0.3);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    const progress = timer / 10;
    
    ctx.beginPath();
    if (type === 'HORIZONTAL') {
        const startAngle = -Math.PI / 3;
        const endAngle = Math.PI / 3;
        const currentAngle = startAngle + (endAngle - startAngle) * progress;
        ctx.arc(10, -50, 60, startAngle, currentAngle);
    } else if (type === 'UPWARD') {
        ctx.moveTo(30, 0);
        ctx.quadraticCurveTo(50, -50, 20, -120 * progress);
    } else if (type === 'THRUST') {
        ctx.moveTo(20, -50);
        ctx.lineTo(20 + 100 * progress, -50);
        ctx.lineWidth = 2;
        ctx.arc(20 + 100 * progress, -50, 10 + timer * 2, 0, Math.PI * 2);
    }
    
    ctx.stroke();
    ctx.restore();
}

function drawProjectile(ctx: CanvasRenderingContext2D, p: Projectile) {
  ctx.save();
  ctx.translate(p.x, p.y);
  
  ctx.fillStyle = '#000';
  
  if (p.vx < 0) ctx.scale(-1, 1);

  ctx.beginPath();
  ctx.arc(0, 0, 30, -Math.PI/4, Math.PI/4, false); 
  ctx.bezierCurveTo(-10, 10, -10, -10, 0, -21); 
  ctx.fill();
  
  ctx.strokeStyle = 'rgba(0,0,0,0.3)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(-5, 0, 35, -Math.PI/3, Math.PI/3);
  ctx.stroke();

  ctx.restore();
}

function drawParticle(ctx: CanvasRenderingContext2D, p: Particle) {
  ctx.save();
  ctx.translate(p.x, p.y);
  ctx.globalAlpha = p.life / p.maxLife;

  if (p.type === 'TEXT') {
    ctx.font = 'bold 24px "Noto Serif SC"';
    ctx.fillStyle = p.color;
    ctx.textAlign = 'center';
    ctx.fillText(p.text || '', 0, 0);
  } else if (p.type === 'INK' || p.type === 'MIST') {
    ctx.fillStyle = p.color;
    ctx.beginPath();
    if (p.type === 'MIST') {
        ctx.globalAlpha = (p.life / p.maxLife) * 0.3; 
        ctx.arc(0, 0, p.size, 0, Math.PI * 2);
    } else {
        ctx.beginPath();
        ctx.arc(0, 0, p.size, 0, Math.PI * 2);
        if (Math.abs(p.vy) > 2) {
             ctx.moveTo(-p.size/2, 0);
             ctx.lineTo(0, -p.size * 3);
             ctx.lineTo(p.size/2, 0);
        }
    }
    ctx.fill();
  } else if (p.type === 'HEAL') {
    ctx.fillStyle = '#10B981';
    ctx.fillRect(-2, -2, 4, 4);
  } else if (p.type === 'SPARK') {
      ctx.fillStyle = '#FFF';
      ctx.fillRect(-1, -1, 3, 3);
  }

  ctx.restore();
}