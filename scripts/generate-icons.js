const fs = require('fs');
const path = require('path');

// Grid icon SVG — 4x4 grid with some cells filled (Stashbox brand)
function createGridIcon(size, padding, bgColor, cellColor, filledColor) {
  const gridSize = 4;
  const innerSize = size - padding * 2;
  const cellSize = Math.floor(innerSize / gridSize) - 4;
  const gap = 4;
  const cornerRadius = Math.round(cellSize * 0.25);
  const bgRadius = Math.round(size * 0.22);

  // Which cells are filled (diagonal pattern — looks like progress)
  const filled = [
    [true, true, true, true],
    [true, true, true, false],
    [true, true, false, false],
    [true, false, false, false],
  ];

  let cells = '';
  for (let r = 0; r < gridSize; r++) {
    for (let c = 0; c < gridSize; c++) {
      const x = padding + c * (cellSize + gap);
      const y = padding + r * (cellSize + gap);
      const fill = filled[r][c] ? filledColor : cellColor;
      cells += `  <rect x="${x}" y="${y}" width="${cellSize}" height="${cellSize}" rx="${cornerRadius}" fill="${fill}"/>\n`;
    }
  }

  return `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
  <rect width="${size}" height="${size}" rx="${bgRadius}" fill="${bgColor}"/>
${cells}</svg>`;
}

// App icon — 1024x1024
const appIcon = createGridIcon(1024, 180, '#0B3D2E', 'rgba(255,255,255,0.15)', '#1DB954');
fs.writeFileSync(path.join(__dirname, '..', 'assets', 'images', 'stashbox-icon.svg'), appIcon);

// Splash icon — 288x288 (will be resized by expo-splash-screen)
const splashIcon = createGridIcon(288, 50, 'none', 'rgba(11,61,46,0.12)', '#1DB954');
fs.writeFileSync(path.join(__dirname, '..', 'assets', 'images', 'stashbox-splash.svg'), splashIcon);

// Favicon — 48x48
const favicon = createGridIcon(48, 8, '#0B3D2E', 'rgba(255,255,255,0.15)', '#1DB954');
fs.writeFileSync(path.join(__dirname, '..', 'assets', 'images', 'stashbox-favicon.svg'), favicon);

// Android foreground — 1024x1024 transparent bg
const androidFg = createGridIcon(1024, 260, 'none', 'rgba(255,255,255,0.2)', '#FFFFFF');
fs.writeFileSync(path.join(__dirname, '..', 'assets', 'images', 'stashbox-android-fg.svg'), androidFg);

console.log('SVG icons generated. Convert to PNG using:');
console.log('  npx sharp-cli -i assets/images/stashbox-icon.svg -o assets/images/icon.png');
console.log('  or use https://svgtopng.com');
