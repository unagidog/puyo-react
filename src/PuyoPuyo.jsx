import React, { useState, useEffect, useRef } from "react";

const ROWS = 12;
const COLS = 6;
const COLORS = ["red", "blue", "green", "yellow", "purple"];

const getRandomColor = () => COLORS[Math.floor(Math.random() * COLORS.length)];

const createEmptyField = () => Array.from({ length: ROWS }, () => Array(COLS).fill(null));

export default function PuyoPuyo() {
  const [field, setField] = useState(createEmptyField());
  const [current, setCurrent] = useState({ x: 2, y: -1, colors: [getRandomColor(), getRandomColor()] });
  const [score, setScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);

  const gameLoop = useRef(null);

  // フィールド内でぷよが置けるか確認
  const canMove = (x, y, colors) => {
    for (let i = 0; i < colors.length; i++) {
      const ny = y + i;
      if (ny >= ROWS) return false;
      if (ny >= 0 && field[ny][x]) return false;
    }
    return true;
  };

  // ぷよをフィールドに固定
  const placePuyo = () => {
    setField(prev => {
      const newField = prev.map(row => [...row]);
      current.colors.forEach((color, i) => {
        const ny = current.y + i;
        if (ny >= 0) newField[ny][current.x] = color;
      });
      return newField;
    });
    setCurrent({ x: 2, y: -1, colors: [getRandomColor(), getRandomColor()] });
  };

  // 落下処理
  const drop = () => {
    if (canMove(current.x, current.y + 1, current.colors)) {
      setCurrent(prev => ({ ...prev, y: prev.y + 1 }));
    } else {
      placePuyo();
      checkClear();
      // ゲームオーバー判定
      if (!canMove(2, -1, [getRandomColor(), getRandomColor()])) {
        setGameOver(true);
        clearInterval(gameLoop.current);
      }
    }
  };

  // 左右移動
  const move = dx => {
    if (canMove(current.x + dx, current.y, current.colors)) {
      setCurrent(prev => ({ ...prev, x: prev.x + dx }));
    }
  };

  // 回転（上下入れ替え）
  const rotate = () => {
    const newColors = [current.colors[1], current.colors[0]];
    if (canMove(current.x, current.y, newColors)) {
      setCurrent(prev => ({ ...prev, colors: newColors }));
    }
  };

  // 連鎖＆消去判定
  const checkClear = () => {
    const visited = Array.from({ length: ROWS }, () => Array(COLS).fill(false));
    let totalScore = 0;
    let newField = field.map(row => [...row]);
    let chain = 0;

    const dfs = (x, y, color) => {
      const stack = [[x, y]];
      const connected = [];
      while (stack.length) {
        const [cx, cy] = stack.pop();
        if (cx < 0 || cx >= COLS || cy < 0 || cy >= ROWS) continue;
        if (visited[cy][cx] || newField[cy][cx] !== color) continue;
        visited[cy][cx] = true;
        connected.push([cx, cy]);
        [[0,1],[1,0],[0,-1],[-1,0]].forEach(([dx,dy]) => stack.push([cx+dx,cy+dy]));
      }
      return connected;
    };

    while (true) {
      const toClear = [];
      for (let y=0; y<ROWS; y++) {
        for (let x=0; x<COLS; x++) {
          if (newField[y][x] && !visited[y][x]) {
            const connected = dfs(x, y, newField[y][x]);
            if (connected.length >= 4) toClear.push(...connected);
          }
        }
      }

      if (toClear.length === 0) break;

      chain++;
      totalScore += toClear.length * 10 * chain;

      // 光って消えるアニメ（簡易）
      toClear.forEach(([x,y]) => newField[y][x] = "white");
      setField([...newField]);
      setTimeout(() => {
        toClear.forEach(([x,y]) => newField[y][x] = null);
        // 落下
        for (let x=0; x<COLS; x++) {
          for (let y=ROWS-1; y>=0; y--) {
            if (!newField[y][x]) {
              let k = y-1;
              while (k>=0 && !newField[k][x]) k--;
              if (k>=0) {
                newField[y][x] = newField[k][x];
                newField[k][x] = null;
              }
            }
          }
        }
        setField([...newField]);
      }, 200);
      visited.forEach(row => row.fill(false));
    }
    setScore(prev => prev + totalScore);
  };

  useEffect(() => {
    gameLoop.current = setInterval(drop, 500);
    return () => clearInterval(gameLoop.current);
  });

  useEffect(() => {
    const handleKey = e => {
      if (gameOver) return;
      if (e.key === "ArrowLeft") move(-1);
      if (e.key === "ArrowRight") move(1);
      if (e.key === "ArrowUp") rotate(); // 上キーで回転
      if (e.key === "ArrowDown") drop();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [current, gameOver]);

  return (
    <div style={{ textAlign:"center" }}>
      <h1>ぷよぷよスライム版</h1>
      <h2>Score: {score}</h2>
      {gameOver && <h2 style={{ color:"red" }}>GAME OVER</h2>}
      <div style={{ display:"grid", gridTemplateColumns:`repeat(${COLS}, 40px)`, justifyContent:"center" }}>
        {field.map((row,y) => row.map((color,x) => {
          let displayColor = color;
          if (current.x === x && (current.y === y || current.y+1 === y)) {
            displayColor = current.colors[y-current.y];
          }
          return (
            <div key={`${x}-${y}`} style={{
              width:38, height:38, margin:1, borderRadius:"50%",
              border:"2px solid #333",
              backgroundColor:displayColor || "#eee",
              display:"flex", alignItems:"center", justifyContent:"center",
              transition:"background-color 0.2s"
            }}>
              {displayColor && <div style={{
                width:10, height:10, borderRadius:"50%", backgroundColor:"white", marginTop:-4
              }}></div>}
            </div>
          )
        }))}
      </div>
    </div>
  );
}
