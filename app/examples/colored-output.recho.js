/**
 * @title Colored Output
 * @author Luyu Cheng
 * @created 2026-10-20
 * @label Animation
 * @tui true
 * @thumbnail_start 128
 */

/**
 * ============================================================================
 * =                            Colored Output                                =
 * ============================================================================
 *
 * Output can have colour. A string with ANSI colour codes, the ones terminals
 * understand, is printed as is, without quotes, in its colours. The easiest
 * way to write those codes is chalk, the library many command-line tools use.
 *
 * The scene at the end is inspired by ascii.rest: every character gets its
 * own colour, and the glyphs get denser as the light gets brighter.
 */

const chalk = recho.require("chalk");

//➜ [31mRED[39m
echo(chalk.red("RED"));

/**
 * A log where each level has its colour.
 */

const level = {
  info: chalk.blue,
  warn: chalk.yellow,
  error: chalk.red.bold,
  done: chalk.green,
};

const log = (type, message) => level[type](type.toUpperCase().padEnd(5)) + " " + message;

//➜ [34mINFO [39m starting the server               
//➜ [33mWARN [39m port 3000 is busy, trying 3001    
//➜ [1;31mERROR[0m cannot read config.json           
//➜ [32mDONE [39m listening on [4mhttp://localhost:3001[24m
echo(
  [
    log("info", "starting the server"),
    log("warn", "port 3000 is busy, trying 3001"),
    log("error", "cannot read config.json"),
    log("done", "listening on " + chalk.underline("http://localhost:3001")),
  ].join("\n"),
);

//➜ [1mBold[22m, [3mitalic[23m, [4munderlined[24m, [9mstruck[29m, [2mdim[22m and [7m inverse [27m
echo(
  `${chalk.bold("Bold")}, ${chalk.italic("italic")}, ${chalk.underline("underlined")}, ` +
    `${chalk.strikethrough("struck")}, ${chalk.dim("dim")} and ${chalk.inverse(" inverse ")}`,
);

/**
 * A small bar chart, each bar in its own colour.
 */

const fruits = {apple: 12, banana: 7, cherry: 15, kiwi: 9};
const colors = {apple: "#e5484d", banana: "#f5c542", cherry: "#a3164a", kiwi: "#7cb342"};

//➜ apple  [38;2;229;72;77m████████████[39m 12   
//➜ banana [38;2;245;197;66m███████[39m 7         
//➜ cherry [38;2;163;22;74m███████████████[39m 15
//➜ kiwi   [38;2;124;179;66m█████████[39m 9       
echo(
  Object.entries(fruits)
    .map(([name, n]) => `${name.padEnd(6)} ${chalk.hex(colors[name])("█".repeat(n))} ${n}`)
    .join("\n"),
);

/**
 * ============================================================================
 * =                        A Planet Rising                                   =
 * ============================================================================
 *
 * A ringed planet rises over a twinkling starfield. Each frame is a grid of
 * cells, each with a glyph and a colour, joined into lines at the end.
 */

const width = 64;
const height = 24;

// The same stars every time: a tiny seeded random number generator.
const stars = (() => {
  let seed = 7;
  const random = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
  return Array.from({length: 110}, () => ({
    x: Math.floor(random() * width),
    y: Math.floor(random() * height),
    phase: random() * Math.PI * 2,
    speed: 1 + random() * 3,
    warmth: random(),
  }));
})();

// Glyphs from faint to bright.
const ramp = " ·•●";

const glyph = (light) => ramp[Math.max(0, Math.min(ramp.length - 1, Math.round(light * (ramp.length - 1))))];

// A warm gradient: deep red in the shadow, orange, then pale yellow in the light.
function warm(light) {
  const stops = [
    [70, 18, 40],
    [200, 60, 40],
    [245, 150, 50],
    [255, 230, 160],
  ];
  const t = Math.max(0, Math.min(1, light)) * (stops.length - 1);
  const i = Math.min(stops.length - 2, Math.floor(t));
  const f = t - i;
  return stops[i].map((c, k) => Math.round(c + (stops[i + 1][k] - c) * f));
}

const frame = recho.interval(1000 / 30);

//➜    [38;2;200;232;255m•[39m                                                      [38;2;200;232;255m•[39m     
//➜           [38;2;176;200;224m•[39m                                                     
//➜                                                    [38;2;248;216;152m•[39m     [38;2;208;176;128m·[39m      
//➜   [38;2;192;216;240m•[39m     [38;2;192;216;240m•[39m                   [38;2;184;208;232m•[39m           [38;2;184;208;232m•[39m                       
//➜                            [38;2;255;216;152m•[39m                          [38;2;184;208;232m•[39m   [38;2;144;160;184m·[39m     
//➜    [38;2;136;152;168m·[39m      [38;2;160;184;200m·[39m                   [38;2;192;216;240m•[39m        [38;2;208;232;255m•[39m    [38;2;144;168;184m·[39m                   
//➜                     [38;2;248;176;88m●●[38;2;248;168;72m●[38;2;248;152;56m●[38;2;240;136;48m•[38;2;224;112;48m•[38;2;208;80;40m•[39m                                     
//➜                  [38;2;248;184;104m●[38;2;248;192;112m●[38;2;248;200;112m●[38;2;248;192;104m●[38;2;248;184;96m●[38;2;248;176;80m●[38;2;248;160;64m●[38;2;240;144;48m●[38;2;232;128;48m•[38;2;224;112;48m•[38;2;216;96;48m•[38;2;208;64;40m•[38;2;168;48;40m•[38;2;80;24;40m·[39m                  [38;2;168;144;104m·[39m              
//➜                [38;2;248;184;104m●[38;2;248;200;120m●[38;2;255;200;120m●●[38;2;248;200;120m●[38;2;248;200;112m●[38;2;248;192;104m●[38;2;248;184;96m●[38;2;248;176;88m●[38;2;248;168;80m●[38;2;248;160;64m●[38;2;248;152;48m●[38;2;240;136;48m•[38;2;232;120;48m•[38;2;216;96;48m•[38;2;200;64;40m•[38;2;144;40;40m·[39m                                
//➜           [38;2;200;232;255m•[39m   [38;2;255;224;144m●[38;2;255;232;160m●●●●[38;2;255;224;152m●●[38;2;255;216;144m●[38;2;255;216;136m●[38;2;255;208;128m●[38;2;248;192;112m●[38;2;248;184;96m●[38;2;248;168;80m●[38;2;248;152;56m●[38;2;232;128;48m•[38;2;224;104;48m•[38;2;208;80;40m•[38;2;184;56;40m•[38;2;128;40;40m·[38;2;104;32;40m·[39m          [38;2;248;208;144m•[39m                   
//➜              [38;2;255;216;144m●[38;2;255;232;160m●●●●●●●[38;2;255;224;152m●[38;2;255;216;136m●[38;2;248;200;120m●[38;2;248;184;96m●[38;2;248;168;72m●[38;2;248;152;48m●[38;2;232;128;48m•[38;2;224;104;48m•[38;2;208;80;40m•[38;2;192;56;40m•[38;2;152;40;40m•[38;2;104;32;40m·[38;2;72;16;40m·[39m                             [38;2;248;208;152m•[39m
//➜  [38;2;128;136;152m·[39m   [38;2;216;176;120m•[38;2;224;184;120m●[38;2;224;184;128m●[38;2;232;192;128m●[39m   [38;2;248;168;72m●[38;2;248;192;112m●[38;2;255;208;136m●[38;2;255;216;144m●[38;2;255;224;152m●●●[38;2;255;216;144m●[38;2;255;208;128m●[38;2;248;200;112m●[38;2;248;184;96m●[38;2;248;168;72m●[38;2;248;152;56m●[38;2;240;136;48m•[38;2;232;120;48m•[38;2;216;96;48m•[38;2;208;80;40m•[38;2;200;56;40m•[38;2;160;48;40m•[38;2;120;32;40m·[38;2;80;24;40m·[38;2;72;16;40m··[39m   [38;2;192;160;104m•[38;2;192;152;104m•[38;2;184;152;104m•[38;2;184;152;96m·[39m   [38;2;248;216;152m•[39m                  
//➜   [38;2;168;136;96m···[39m       [38;2;248;160;64m●[38;2;248;184;88m●[38;2;248;192;104m●[38;2;248;192;112m●●●[38;2;248;192;104m●[38;2;248;184;96m●[38;2;248;176;88m●[38;2;248;168;72m●[38;2;248;160;64m●[38;2;248;152;48m●[38;2;240;136;48m•[38;2;232;128;48m•[38;2;232;120;48m•[38;2;224;104;48m•[38;2;216;88;40m•[38;2;208;72;40m•[38;2;176;56;40m•[38;2;144;40;40m·[38;2;96;24;40m·[38;2;72;16;40m··[39m       [38;2;184;152;104m••[38;2;192;152;104m•[39m                   
//➜  [38;2;160;136;96m·[38;2;208;176;112m•[38;2;208;176;120m•[38;2;216;176;120m•[39m       [38;2;248;176;80m●[38;2;248;192;104m●[38;2;248;192;112m●●[38;2;248;192;104m●●[38;2;248;184;96m●[38;2;248;176;88m●●[38;2;248;168;80m●[38;2;248;168;72m●[38;2;248;160;64m●[38;2;248;152;48m●[38;2;240;136;48m•[38;2;232;128;48m•[38;2;224;112;48m•[38;2;216;96;48m•[38;2;208;72;40m•[38;2;184;56;40m•[38;2;144;40;40m·[38;2;104;32;40m··[38;2;96;24;40m·[39m       [38;2;240;200;128m●[38;2;240;192;128m●●●[39m               [38;2;184;208;232m•[39m  
//➜ [38;2;168;184;208m·[39m   [38;2;240;192;128m●[38;2;232;192;128m●●●[39m    [38;2;248;152;56m●[38;2;248;184;88m●[38;2;248;192;104m●[38;2;248;192;112m●●●[38;2;248;192;104m●[38;2;248;184;96m●[38;2;248;176;88m●[38;2;248;176;80m●[38;2;248;160;72m●[38;2;248;152;56m●[38;2;240;136;48m•[38;2;232;120;48m•[38;2;224;104;48m•[38;2;208;80;40m•[38;2;192;56;40m•[38;2;160;48;40m•[38;2;128;32;40m·[38;2;88;24;40m·[38;2;80;24;40m··[38;2;88;24;40m·[39m    [38;2;192;160;104m•[38;2;200;160;112m•[38;2;200;168;112m•[38;2;208;168;112m•[39m        [38;2;176;192;216m•[39m            
//➜            [38;2;176;144;96m·[38;2;168;136;96m··[38;2;168;144;96m·[38;2;176;144;96m··[38;2;184;152;104m•[38;2;248;160;72m●[38;2;248;160;64m●[38;2;248;152;48m●[38;2;240;136;48m•[38;2;232;120;48m•[38;2;224;104;48m•[38;2;216;88;40m•[38;2;208;72;40m•[38;2;184;56;40m•[38;2;152;48;40m•[38;2;120;32;40m·[38;2;224;184;120m●[38;2;216;176;120m•[38;2;208;168;112m•[38;2;200;160;112m•[38;2;192;160;104m•[38;2;184;152;104m•[38;2;184;144;96m·[39m   [38;2;208;176;128m·[39m  [38;2;255;216;152m•[38;2;160;184;200m·[38;2;240;208;144m•[39m          [38;2;200;224;248m•[39m        
//➜         [38;2;168;144;104m·[39m   [38;2;184;160;112m·[38;2;184;56;40m•[38;2;208;80;40m•[38;2;216;96;48m•[38;2;224;104;48m••••[38;2;216;88;40m•[38;2;208;80;40m•[38;2;208;72;40m•[38;2;192;56;40m•[38;2;176;56;40m•[38;2;152;48;40m•[38;2;136;40;40m·[38;2;112;32;40m·[38;2;88;24;40m·[38;2;72;16;40m·····[39m           [38;2;136;160;176m·[39m                  
//➜               [38;2;128;40;40m·[38;2;184;56;40m•[38;2;200;64;40m••••[38;2;192;56;40m•[38;2;184;56;40m•[38;2;176;56;40m•[38;2;168;48;40m•[38;2;152;48;40m•[38;2;136;40;40m·[38;2;120;32;40m·[38;2;96;24;40m······[39m      [38;2;184;160;112m·[39m                        
//➜                 [38;2;136;40;40m·[38;2;160;48;40m•[38;2;168;48;40m•••[38;2;160;48;40m•[38;2;152;48;40m•[38;2;136;40;40m·[38;2;120;32;40m·[38;2;104;32;40m··[38;2;96;24;40m···[38;2;88;24;40m·[39m [38;2;160;184;200m·[39m  [38;2;200;232;255m•[39m                       [38;2;176;152;104m·[39m    
//➜                    [38;2;104;32;40m·[38;2;96;24;40m···[38;2;88;24;40m·[38;2;80;24;40m·[38;2;72;16;40m···[39m                               [38;2;168;144;104m·[39m [38;2;208;232;255m•[39m  
//➜           [38;2;136;152;168m·[39m                  [38;2;184;200;224m•[39m                                  
//➜                          [38;2;144;160;176m·[39m                        [38;2;176;200;224m•[39m       [38;2;232;200;136m•[39m     
//➜                                         [38;2;136;152;168m·[39m    [38;2;248;216;152m•[39m [38;2;200;224;248m•[39m            [38;2;208;232;255m•[39m   
//➜ [38;2;152;168;192m·[39m                 [38;2;200;224;255m•[39m           [38;2;200;224;255m•[39m                        [38;2;184;208;224m•[39m        
{
  const t = frame / 30;
  const cells = Array.from({length: height}, () => Array(width).fill(null));

  // Twinkling stars, cool or warm white.
  for (const star of stars) {
    const light = 0.5 + 0.5 * Math.sin(t * star.speed + star.phase);
    const c = Math.round(120 + 135 * light);
    cells[star.y][star.x] = [glyph(light * 0.7), star.warmth > 0.7 ? [c, c * 0.85, c * 0.6] : [c * 0.8, c * 0.9, c]];
  }

  // The planet rises for five seconds, then bobs gently.
  const radius = 7;
  const rise = 1 - Math.pow(1 - Math.min(1, t / 5), 3);
  // Left of centre, so the starfield has room on the right.
  const cx = width * 0.36;
  const cy = height + radius - rise * (height / 2 + radius - 1) + Math.sin(t * 0.8) * 0.4;
  // From light to dark: lit from the upper left.
  const lx = -0.55;
  const ly = -0.45;
  const lz = 0.7;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      // A character is 0.6 times as wide as it is tall.
      const dx = ((x - cx) * 0.6) / radius;
      const dy = (y - cy) / radius;
      const d2 = dx * dx + dy * dy;

      // The ring: an ellipse around the planet, in front of it below the
      // middle, behind it above. Its glyphs shimmer as it turns.
      const ring = (dx / 1.9) ** 2 + (dy / 0.42) ** 2;
      const onRing = ring > 0.72 && ring < 1;
      const front = dy > 0;

      if (d2 < 1 && !(onRing && front)) {
        const z = Math.sqrt(1 - d2);
        const bands = 0.08 * Math.sin(dy * 10 + Math.sin(dx * 3 + t));
        const light = Math.max(0, dx * lx + dy * ly + z * lz) + bands;
        cells[y][x] = [glyph(0.35 + light * 0.75), warm(light)];
      } else if (onRing) {
        const angle = Math.atan2(dy / 0.42, dx / 1.9);
        const shimmer = 0.5 + 0.5 * Math.sin(angle * 5 - t * 2);
        const c = 170 + 70 * shimmer;
        cells[y][x] = [glyph(0.4 + shimmer * 0.6), [c, c * 0.82, c * 0.55]];
      }
    }
  }

  // Each line, with neighbouring cells of the same colour in one run.
  const lines = cells.map((row) => {
    let line = "";
    let run = "";
    let color = null;
    const flush = () => {
      if (run) line += color ? chalk.rgb(...color)(run) : run;
      run = "";
    };
    for (const cell of row) {
      const [char, rgb] = cell ?? [" ", null];
      const next = char === " " || !rgb ? null : rgb.map((c) => Math.min(255, Math.round(c / 8) * 8));
      if (String(next) !== String(color)) flush();
      color = next;
      run += char;
    }
    flush();
    return line;
  });

  // Compact output: one em per row, so the planet stays round.
  echo.set("compact", true)(lines.join("\n"));
}
