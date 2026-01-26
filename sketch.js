// Y-position of the floor (ground level)
let floorY3;

// Player character (soft, animated blob)
let blob3 = {
  // Position (centre of the blob)
  x: 80,
  y: 0,

  // Visual properties
  r: 26, // Base radius
  points: 48, // Number of points used to draw the blob
  wobble: 7, // Edge deformation amount
  wobbleFreq: 0.9,

  // Time values for breathing animation
  t: 0,
  tSpeed: 0.01,

  // Physics: velocity
  vx: 0, // Horizontal velocity
  vy: 0, // Vertical velocity

  // Movement tuning
  accel: 0.55, // Horizontal acceleration
  maxRun: 4.0, // Maximum horizontal speed
  gravity: 0.65, // Downward force
  jumpV: -11.0, // Initial jump impulse

  // State
  onGround: false, // True when standing on a platform

  // Friction
  frictionAir: 0.995, // Light friction in air
  frictionGround: 0.88, // Stronger friction on ground

  // MISCHIEF & EMOTION SYSTEM
  stolenItems: 0, // Number of items stolen
  guilt: 0, // Anxiety level (0-1)
  nervousShake: 0, // Current nervous shake offset
  idleTime: 0, // How long blob has been still
  nearItem: false, // Is blob near a stealable item?
};

// Stealable objects scattered around the map
let items = [];

// Visual effects (sweat drops, exclamation marks)
let effects = [];

// List of solid platforms the blob can stand on
// Each platform is an axis-aligned rectangle (AABB)
let platforms = [];

function setup() {
  createCanvas(640, 360);

  // Define the floor height
  floorY3 = height - 36;

  noStroke();
  textFont("sans-serif");
  textSize(14);

  // Create platforms (floor + steps)
  platforms = [
    { x: 0, y: floorY3, w: width, h: height - floorY3 }, // floor
    { x: 120, y: floorY3 - 70, w: 120, h: 12 }, // low step
    { x: 300, y: floorY3 - 120, w: 90, h: 12 }, // mid step
    { x: 440, y: floorY3 - 180, w: 130, h: 12 }, // high step
    { x: 520, y: floorY3 - 70, w: 90, h: 12 }, // return ramp
  ];

  // Start the blob resting on the floor
  blob3.y = floorY3 - blob3.r - 1;

  // Scatter stealable items on platforms
  items = [
    {
      x: 60,
      y: floorY3 - 25,
      vx: 0,
      vy: 0,
      size: 10,
      type: "coin",
      stolen: false,
    },
    {
      x: 180,
      y: floorY3 - 95,
      vx: 0,
      vy: 0,
      size: 12,
      type: "gem",
      stolen: false,
    },
    {
      x: 340,
      y: floorY3 - 145,
      vx: 0,
      vy: 0,
      size: 10,
      type: "coin",
      stolen: false,
    },
    {
      x: 360,
      y: floorY3 - 145,
      vx: 0,
      vy: 0,
      size: 8,
      type: "star",
      stolen: false,
    },
    {
      x: 500,
      y: floorY3 - 205,
      vx: 0,
      vy: 0,
      size: 14,
      type: "gem",
      stolen: false,
    },
    {
      x: 560,
      y: floorY3 - 95,
      vx: 0,
      vy: 0,
      size: 10,
      type: "coin",
      stolen: false,
    },
    {
      x: 220,
      y: floorY3 - 25,
      vx: 0,
      vy: 0,
      size: 8,
      type: "star",
      stolen: false,
    },
  ];
}

function draw() {
  background(240);

  // --- Draw all platforms ---
  fill(200);
  for (const p of platforms) {
    rect(p.x, p.y, p.w, p.h);
  }

  // --- Update guilt level based on stolen items (0 = calm, 1 = max panic) ---
  blob3.guilt = constrain(blob3.stolenItems / 4, 0, 1);

  // --- Nervous shake increases with guilt ---
  blob3.nervousShake = sin(frameCount * 0.3) * blob3.guilt * 3;

  // --- Track idle time for spontaneous nervous behavior ---
  if (abs(blob3.vx) < 0.5 && blob3.onGround) {
    blob3.idleTime++;
    // Spontaneous nervous hop when anxious and idle
    if (blob3.idleTime > 60 && blob3.guilt > 0.3 && random() < 0.02) {
      blob3.vy = -6;
      blob3.idleTime = 0;
    }
  } else {
    blob3.idleTime = 0;
  }

  // --- Input: left/right movement (jittery when guilty) ---
  let move = 0;
  if (keyIsDown(65) || keyIsDown(LEFT_ARROW)) move -= 1; // A or ←
  if (keyIsDown(68) || keyIsDown(RIGHT_ARROW)) move += 1; // D or →

  // Add random jitter to movement when guilty
  let jitter = random(-blob3.guilt * 0.3, blob3.guilt * 0.3);
  blob3.vx += blob3.accel * move + jitter;

  // --- Apply friction and clamp speed ---
  blob3.vx *= blob3.onGround ? blob3.frictionGround : blob3.frictionAir;
  blob3.vx = constrain(blob3.vx, -blob3.maxRun, blob3.maxRun);

  // --- Apply gravity ---
  blob3.vy += blob3.gravity;

  // --- Collision representation ---
  // We collide using a rectangle (AABB),
  // even though the blob is drawn as a circle
  let box = {
    x: blob3.x - blob3.r,
    y: blob3.y - blob3.r,
    w: blob3.r * 2,
    h: blob3.r * 2,
  };

  // --- STEP 1: Move horizontally, then resolve X collisions ---
  box.x += blob3.vx;
  for (const s of platforms) {
    if (overlap(box, s)) {
      if (blob3.vx > 0) {
        // Moving right → hit the left side of a platform
        box.x = s.x - box.w;
      } else if (blob3.vx < 0) {
        // Moving left → hit the right side of a platform
        box.x = s.x + s.w;
      }
      blob3.vx = 0;
    }
  }

  // --- STEP 2: Move vertically, then resolve Y collisions ---
  box.y += blob3.vy;
  blob3.onGround = false;

  for (const s of platforms) {
    if (overlap(box, s)) {
      if (blob3.vy > 0) {
        // Falling → land on top of a platform
        box.y = s.y - box.h;
        blob3.vy = 0;
        blob3.onGround = true;
      } else if (blob3.vy < 0) {
        // Rising → hit the underside of a platform
        box.y = s.y + s.h;
        blob3.vy = 0;
      }
    }
  }

  // --- Convert collision box back to blob centre ---
  blob3.x = box.x + box.w / 2;
  blob3.y = box.y + box.h / 2;

  // Keep blob inside the canvas horizontally
  blob3.x = constrain(blob3.x, blob3.r, width - blob3.r);

  // --- MISCHIEF MECHANICS: Item physics and stealing ---
  blob3.nearItem = false;

  for (let item of items) {
    if (item.stolen) continue;

    // Calculate distance to blob
    let d = dist(blob3.x, blob3.y, item.x, item.y);

    // STEAL: If blob is close enough, absorb the item
    if (d < blob3.r + item.size) {
      item.stolen = true;
      blob3.stolenItems++;

      // Visual feedback: Create panic effect
      effects.push({
        x: item.x,
        y: item.y,
        life: 30,
        type: "sweat",
      });

      // Blob jolts from excitement/anxiety
      blob3.vy = -3;
      continue;
    }

    // DETECT NEARBY: Blob gets nervous near items
    if (d < 60) {
      blob3.nearItem = true;
    }

    // BUMP PHYSICS: Items get knocked around by blob
    if (d < blob3.r + item.size + 15) {
      let angle = atan2(item.y - blob3.y, item.x - blob3.x);
      let pushForce = 2;
      item.vx += cos(angle) * pushForce;
      item.vy += sin(angle) * pushForce;
    }

    // Apply gravity to items
    item.vy += 0.4;

    // Apply velocity
    item.x += item.vx;
    item.y += item.vy;

    // Friction
    item.vx *= 0.9;

    // Platform collision for items
    for (const p of platforms) {
      let itemBox = {
        x: item.x - item.size / 2,
        y: item.y - item.size / 2,
        w: item.size,
        h: item.size,
      };

      if (overlap(itemBox, p)) {
        if (item.vy > 0) {
          item.y = p.y - item.size / 2;
          item.vy = 0;
        }
      }
    }

    // Keep items in bounds
    if (item.x < item.size) {
      item.x = item.size;
      item.vx *= -0.5;
    }
    if (item.x > width - item.size) {
      item.x = width - item.size;
      item.vx *= -0.5;
    }
  }

  // --- Draw items ---
  for (let item of items) {
    if (item.stolen) continue;

    // Items glow/pulse when blob is near
    let nearGlow =
      blob3.nearItem && dist(blob3.x, blob3.y, item.x, item.y) < 60;

    push();
    translate(item.x, item.y);

    if (item.type === "coin") {
      fill(255, 220, 0, nearGlow ? 255 : 200);
      ellipse(0, 0, item.size, item.size);
      fill(255, 240, 100);
      ellipse(0, 0, item.size * 0.5, item.size * 0.5);
    } else if (item.type === "gem") {
      fill(255, 100, 200, nearGlow ? 255 : 200);
      rotate(frameCount * 0.02);
      for (let i = 0; i < 6; i++) {
        rotate(PI / 3);
        triangle(0, -item.size / 2, item.size / 3, 0, -item.size / 3, 0);
      }
    } else if (item.type === "star") {
      fill(100, 255, 255, nearGlow ? 255 : 200);
      rotate(frameCount * 0.03);
      for (let i = 0; i < 5; i++) {
        rotate(TWO_PI / 5);
        triangle(0, -item.size / 2, item.size / 5, -item.size / 5, 0, 0);
      }
    }

    pop();
  }

  // --- Draw visual effects (sweat drops, exclamations) ---
  for (let i = effects.length - 1; i >= 0; i--) {
    let e = effects[i];
    e.life--;

    if (e.life <= 0) {
      effects.splice(i, 1);
      continue;
    }

    let alpha = map(e.life, 0, 30, 0, 255);

    if (e.type === "sweat") {
      fill(100, 200, 255, alpha);
      ellipse(e.x, e.y - (30 - e.life), 6, 8);
    }
  }

  // Draw guilt indicator (sweat drop above blob)
  if (blob3.guilt > 0.3) {
    let sweatX = blob3.x + 15 + sin(frameCount * 0.2) * 2;
    let sweatY = blob3.y - blob3.r - 10;
    fill(100, 200, 255, blob3.guilt * 200);
    ellipse(sweatX, sweatY, 5, 7);
  }

  // --- Draw the animated blob with emotional color ---
  blob3.t += blob3.tSpeed;
  drawBlobCircle(blob3);

  // --- HUD ---
  fill(0);
  text("Move: A/D or ←/→  •  Jump: Space/W/↑  •  Land on platforms", 10, 18);
}

// Axis-Aligned Bounding Box (AABB) overlap test
// Returns true if rectangles a and b intersect
function overlap(a, b) {
  return (
    a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y
  );
}

// Draws the blob using Perlin noise for a soft, breathing effect
function drawBlobCircle(b) {
  fill(20, 120, 255);
  beginShape();

  for (let i = 0; i < b.points; i++) {
    const a = (i / b.points) * TAU;

    // Noise-based radius offset
    const n = noise(
      cos(a) * b.wobbleFreq + 100,
      sin(a) * b.wobbleFreq + 100,
      b.t,
    );

    const r = b.r + map(n, 0, 1, -b.wobble, b.wobble);

    vertex(b.x + cos(a) * r, b.y + sin(a) * r);
  }

  endShape(CLOSE);
}

// Jump input (only allowed when grounded)
function keyPressed() {
  if (
    (key === " " || key === "W" || key === "w" || keyCode === UP_ARROW) &&
    blob3.onGround
  ) {
    blob3.vy = blob3.jumpV;
    blob3.onGround = false;
  }
}

/* In-class tweaks for experimentation:
   • Add a new platform:
     platforms.push({ x: 220, y: floorY3 - 150, w: 80, h: 12 });

   • “Ice” feel → frictionGround = 0.95
   • “Sand” feel → frictionGround = 0.80
*/
