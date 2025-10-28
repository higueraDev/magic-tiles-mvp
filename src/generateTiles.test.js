// Simple test harness for tile generation logic from game.js
// Run with: node src/generateTiles.test.js

const laneCount = 4;
const tileSpacingMs = 600;
const songDurationMs = 30000;

function generateTiles() {
  const tiles = [];
  let t = tileSpacingMs * 2;
  let id = 1;
  const end = songDurationMs - 800;
  while (t < end) {
    tiles.push({ id, time: t, lane: Math.floor(Math.random() * laneCount), hit: false });
    t += tileSpacingMs;
    id++;
  }
  return tiles;
}

function assert(condition, msg) { if (!condition) throw new Error(msg); }

(function runTests() {
  const tiles = generateTiles();
  assert(tiles.length > 0, 'Should generate some tiles');
  // Ensure spacing monotonic increase
  for (let i=1;i<tiles.length;i++) {
    assert(tiles[i].time - tiles[i-1].time === tileSpacingMs, 'Tiles not evenly spaced');
  }
  // Lane range
  for (const tile of tiles) {
    assert(tile.lane >=0 && tile.lane < laneCount, 'Lane out of range');
  }
  console.log('All tests passed. Generated', tiles.length, 'tiles.');
})();
