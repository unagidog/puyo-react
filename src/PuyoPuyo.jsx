import React, { useState, useEffect, useRef } from "react";
import "./App.css";

const ROWS = 12;
const COLS = 6;
const COLORS = ["red", "blue", "green", "yellow", "purple"];

const getRandomColor = () => COLORS[Math.floor(Math.random() * COLORS.length)];

const createEmptyField = () => Array.from({ length: ROWS }, () => Array(COLS).fill(null));

const DIRECTIONS = [
  [0, 1],
  [1, 0],
  [0, -1],
  [-1, 0],
];

export default function PuyoPuyo() {
  const [field, setField] = useState(createEmptyField());
  const [current, setCurrent] = useState({ x: 2, y: -1, colors: [getRandomColor(), getRandomColor()], rotation: 0 });
  const [score, setScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);

  const gameLoop = useRef(null);

  const canMove = (x, y, colors) => {
    for (let i = 0; i < colors.length; i++) {
      const nx = x;
      const ny = y + i;
      if (ny >= ROWS) return false;
      if (ny >= 0 && field[ny][nx]) return false;
    }
    return true;
  };

  const placePuyo = () => {
    setField(prev => {
      const newField = prev.map(row => [...row]);
      current.colors.forEach((color, i) => {
        const ny = current.y + i;
        if (ny >= 0) newField[ny][current.x] = color;
      });
      return newField;
    });
    checkClear();
    spawnNext();
  };

  const checkClear = () => {
    const visited = Array.from({ length: ROWS }, () => Array(COLS).fill(false));
    let totalScore = 0;

    const dfs = (x, y, color) => {
      const stack = [[x, y]];
      const connected = [];
      while (stack.length) {
        const [cx, cy] = stack.pop();
        if (cx < 0 || cx >= COLS || cy < 0 || cy >= ROWS) continue;
        if (visited[cy][cx] || field[cy][cx] !== color) continue;
        visited[cy][cx] = true;
        connected.push([cx, cy]);
        DIRECTIONS.forEach(([dx, dy]) => stack.push([cx + dx, cy + dy]));
      }
      return connected;
    };

    let newField = field.map(row => [...row]);
    let chain = 0;

    while (true) {
      const toClear = [];
      for (let y = 0; y < ROWS; y++) {
        for (let x = 0; x < COLS; x++) {
          if (!newField[y][x] || visited[y][x]) continue;
          const connected = dfs(x, y, newField[y][x]);
          if (connected.length >= 4) toClear.push(...connected);
        }
      }

      if (toClear.length === 0) break;

      chain++;
      totalScore += toClear.length * 10 * chain; // 連鎖スコア加算

      toClear.forEach(([x, y]) => {
        newField[y][x] = null;
      });

      // 落下処理
      for (let x = 0; x < COLS; x++) {
        for (let y = ROWS - 1; y >= 0; y--) {
          if (!newField[y][x]) {
            let k = y - 1;
            while (k >= 0 && !newField[k][x]) k--;
            if (k >= 0) {
              newField[y][x] = newField[k][x];
              newField[k][x] = null;
            }
          }
        }
      }
    }

    setField(newField);
    setScore(prev => prev + totalScore);
  };

  const spawnNext = () => {
    const next = { x: 2, y: -1, colors: [getRandomColor(), getRandomColor()], rotation: 0 };
    if (!canMove(next.x, next.y, next.colors)) {
      setGameOver(true);
      clearInterval(gameLoop.current);
      return;
    }
    setCurrent(next);
  };

  const move = (dx) => {
    if (canMove(current.x + dx, current.y, current.colors)) {
      setCurrent(prev => ({ ...prev, x: prev.x + dx }));
    }
  };

  const rotate = () => {
    // 簡易回転（上下を入れ替えるだけ）
    const newColors = [current.colors[1], current.colors[0]];
    if (canMove(current.x, current.y, newColors)) {
      setCurrent(prev => ({ ...prev, colors: newColors }));
    }
  };

  const drop = () => {
    if (canMove(current.x, current.y + 1, current.colors)) {
      setCurrent(prev => ({ ...prev, y: prev.y + 1 }));
    } else {
      placePuyo();
    }
  };

  useEffect(() => {
    gameLoop.current = setInterval(drop, 500);
    return () => clearInterval(gameLoop.current);
  });

  useEffect(() => {
    const handleKey = (e) => {
      if (gameOver) return;
      if (e.key === "ArrowLeft") move(-1);
      if (e.key === "ArrowRight") move(1);
      if (e.key === "ArrowUp") rotate();
      if (e.key === "ArrowDown") drop();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [current, gameOver]);

  return (
    <div>
      <h1>Puyo Puyo (スライム版)</h1>
      <h2>Score: {score}</h2>
      {gameOver && <h2 style={{ color: "red" }}>GAME OVER</h2>}
      <div style={{ display: "grid", gridTemplateColumns: `repeat(${COLS}, 40px)` }}>
        {field.map((row, y) =>
          row.map((color, x) => {
            let displayColor = color;
            if (current.x === x && (current.y === y || current.y + 1 === y)) {
              displayColor = current.colors[y - current.y];
            }
            return (
              <div key={`${x}-${y}`} style={{
                width: 38,
                height: 38,
                border: "1px solid #333",
                margin: 1,
                borderRadius: "50%",
                backgroundColor: displayColor || "#eee",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}>
                {displayColor && <div style={{
                  width: 16,
                  height: 16,
                  borderRadius: "50%",
                  backgroundColor: "white",
                  marginTop: -4,
                }}></div>}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
