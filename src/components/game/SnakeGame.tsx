"use client";

import { useEffect, useRef, useState, useCallback } from "react";

type Direction = "UP" | "DOWN" | "LEFT" | "RIGHT";
type Point = { x: number; y: number };

const GRID_SIZE = 16;
const CELL_SIZE = 18;
const BOARD_PX = GRID_SIZE * CELL_SIZE; // 288px
const INITIAL_SPEED_MS = 140;

export default function SnakeGame() {
  const [snake, setSnake] = useState<Point[]>([
    { x: 8, y: 8 },
    { x: 7, y: 8 },
    { x: 6, y: 8 },
  ]);
  const [food, setFood] = useState<Point>({ x: 12, y: 8 });
  const [direction, setDirection] = useState<Direction>("RIGHT");
  const [gameState, setGameState] = useState<"idle" | "playing" | "paused" | "gameover">("idle");
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState<number>(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem("wb_snake_highscore");
        return saved ? parseInt(saved, 10) || 0 : 0;
      } catch {
        return 0;
      }
    }
    return 0;
  });

  const directionRef = useRef<Direction>("RIGHT");
  const nextDirectionRef = useRef<Direction>("RIGHT");
  const gameStateRef = useRef<"idle" | "playing" | "paused" | "gameover">("idle");

  // Sync refs
  useEffect(() => {
    directionRef.current = direction;
    nextDirectionRef.current = direction;
  }, [direction]);

  useEffect(() => {
    gameStateRef.current = gameState;
  }, [gameState]);

  const spawnFood = useCallback((currentSnake: Point[]): Point => {
    let newFood: Point;
    let collision = true;
    while (collision) {
      newFood = {
        x: Math.floor(Math.random() * GRID_SIZE),
        y: Math.floor(Math.random() * GRID_SIZE),
      };
      collision = currentSnake.some((seg) => seg.x === newFood.x && seg.y === newFood.y);
    }
    return newFood!;
  }, []);

  const startGame = useCallback(() => {
    const initialSnake = [
      { x: 8, y: 8 },
      { x: 7, y: 8 },
      { x: 6, y: 8 },
    ];
    setSnake(initialSnake);
    setDirection("RIGHT");
    directionRef.current = "RIGHT";
    nextDirectionRef.current = "RIGHT";
    setFood(spawnFood(initialSnake));
    setScore(0);
    setGameState("playing");
  }, [spawnFood]);

  const togglePause = useCallback(() => {
    setGameState((prev) => (prev === "playing" ? "paused" : prev === "paused" ? "playing" : prev));
  }, []);

  const changeDirection = useCallback((newDir: Direction) => {
    const current = directionRef.current;
    if (newDir === "UP" && current !== "DOWN") nextDirectionRef.current = "UP";
    if (newDir === "DOWN" && current !== "UP") nextDirectionRef.current = "DOWN";
    if (newDir === "LEFT" && current !== "RIGHT") nextDirectionRef.current = "LEFT";
    if (newDir === "RIGHT" && current !== "LEFT") nextDirectionRef.current = "RIGHT";

    if (gameStateRef.current === "idle") {
      startGame();
    }
  }, [startGame]);

  // Keyboard navigation
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (["INPUT", "TEXTAREA", "SELECT"].includes((e.target as HTMLElement)?.tagName)) {
        return;
      }

      if (["ArrowUp", "KeyW"].includes(e.code)) {
        e.preventDefault();
        changeDirection("UP");
      } else if (["ArrowDown", "KeyS"].includes(e.code)) {
        e.preventDefault();
        changeDirection("DOWN");
      } else if (["ArrowLeft", "KeyA"].includes(e.code)) {
        e.preventDefault();
        changeDirection("LEFT");
      } else if (["ArrowRight", "KeyD"].includes(e.code)) {
        e.preventDefault();
        changeDirection("RIGHT");
      } else if (e.code === "Space") {
        e.preventDefault();
        if (gameStateRef.current === "playing" || gameStateRef.current === "paused") {
          togglePause();
        } else if (gameStateRef.current === "idle" || gameStateRef.current === "gameover") {
          startGame();
        }
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [changeDirection, togglePause, startGame]);

  // Game Loop
  useEffect(() => {
    if (gameState !== "playing") return;

    const interval = setInterval(() => {
      setSnake((prevSnake) => {
        const head = prevSnake[0];
        const dir = nextDirectionRef.current;
        directionRef.current = dir;

        let nextX = head.x;
        let nextY = head.y;

        if (dir === "UP") nextY -= 1;
        if (dir === "DOWN") nextY += 1;
        if (dir === "LEFT") nextX -= 1;
        if (dir === "RIGHT") nextX += 1;

        // Wall collision check
        if (nextX < 0 || nextX >= GRID_SIZE || nextY < 0 || nextY >= GRID_SIZE) {
          setGameState("gameover");
          return prevSnake;
        }

        // Self collision check
        if (prevSnake.some((seg) => seg.x === nextX && seg.y === nextY)) {
          setGameState("gameover");
          return prevSnake;
        }

        const newHead = { x: nextX, y: nextY };
        const newSnake = [newHead, ...prevSnake];

        // Eat food check
        if (nextX === food.x && nextY === food.y) {
          setScore((s) => {
            const nextScore = s + 1;
            setHighScore((prevHigh) => {
              if (nextScore > prevHigh) {
                try {
                  localStorage.setItem("wb_snake_highscore", nextScore.toString());
                } catch {
                  // Ignore local storage error
                }
                return nextScore;
              }
              return prevHigh;
            });
            return nextScore;
          });
          setFood(spawnFood(newSnake));
        } else {
          newSnake.pop();
        }

        return newSnake;
      });
    }, INITIAL_SPEED_MS);

    return () => clearInterval(interval);
  }, [gameState, food, spawnFood]);

  return (
    <div className="w-full max-w-sm mx-auto rounded-3xl border border-white/10 bg-zinc-950/80 p-5 backdrop-blur-xl shadow-2xl flex flex-col items-center">
      {/* Header / Score bar */}
      <div className="w-full flex items-center justify-between mb-3 px-1 text-xs font-mono">
        <div className="flex items-center gap-2">
          <span className="inline-block h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-zinc-400">RETRO SNAKE</span>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-zinc-300">
            SCORE: <strong className="text-emerald-400">{score}</strong>
          </span>
          <span className="text-zinc-500">
            HIGH: <strong className="text-zinc-300">{highScore}</strong>
          </span>
        </div>
      </div>

      {/* Game Board */}
      <div
        className="relative rounded-2xl border border-white/10 bg-black/90 overflow-hidden flex items-center justify-center shadow-inner"
        style={{ width: BOARD_PX, height: BOARD_PX }}
      >
        {/* Grid Background Pattern */}
        <div
          className="absolute inset-0 opacity-15"
          style={{
            backgroundImage: `radial-gradient(circle, #ffffff 1px, transparent 1px)`,
            backgroundSize: `${CELL_SIZE}px ${CELL_SIZE}px`,
          }}
        />

        {/* Snake rendering */}
        {snake.map((segment, index) => {
          const isHead = index === 0;
          return (
            <div
              key={`${segment.x}-${segment.y}-${index}`}
              className={`absolute transition-all duration-75 rounded-sm ${
                isHead
                  ? "bg-gradient-to-r from-emerald-400 to-teal-400 shadow-sm shadow-emerald-400/50 z-10"
                  : "bg-emerald-500/80"
              }`}
              style={{
                width: CELL_SIZE - 2,
                height: CELL_SIZE - 2,
                left: segment.x * CELL_SIZE + 1,
                top: segment.y * CELL_SIZE + 1,
              }}
            />
          );
        })}

        {/* Food rendering */}
        <div
          className="absolute rounded-full bg-gradient-to-tr from-violet-400 to-purple-400 shadow-md shadow-violet-500/80 animate-pulse"
          style={{
            width: CELL_SIZE - 4,
            height: CELL_SIZE - 4,
            left: food.x * CELL_SIZE + 2,
            top: food.y * CELL_SIZE + 2,
          }}
        />

        {/* Overlay States */}
        {gameState === "idle" && (
          <div className="absolute inset-0 bg-black/75 backdrop-blur-xs flex flex-col items-center justify-center p-4 text-center">
            <p className="text-sm font-semibold text-white mb-2">Play while you wait!</p>
            <p className="text-xs text-zinc-400 mb-4">Press Arrow Keys or WASD</p>
            <button
              onClick={startGame}
              className="rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 px-5 py-2 text-xs font-bold text-black hover:opacity-90 active:scale-95 transition shadow-lg shadow-emerald-500/20"
            >
              Start Game
            </button>
          </div>
        )}

        {gameState === "paused" && (
          <div className="absolute inset-0 bg-black/75 backdrop-blur-xs flex flex-col items-center justify-center p-4 text-center">
            <p className="text-sm font-bold text-white mb-3">Game Paused</p>
            <button
              onClick={togglePause}
              className="rounded-xl bg-white px-5 py-2 text-xs font-bold text-black hover:opacity-90 active:scale-95 transition"
            >
              Resume
            </button>
          </div>
        )}

        {gameState === "gameover" && (
          <div className="absolute inset-0 bg-black/85 backdrop-blur-xs flex flex-col items-center justify-center p-4 text-center">
            <p className="text-sm font-bold text-red-400 mb-1">Game Over</p>
            <p className="text-xs text-zinc-400 mb-4">Final Score: {score}</p>
            <button
              onClick={startGame}
              className="rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 px-5 py-2 text-xs font-bold text-black hover:opacity-90 active:scale-95 transition shadow-lg shadow-emerald-500/20"
            >
              Play Again
            </button>
          </div>
        )}
      </div>

      {/* Touch D-Pad for Mobile Controls */}
      <div className="mt-4 flex flex-col items-center gap-1.5 w-full">
        <button
          type="button"
          onClick={() => changeDirection("UP")}
          aria-label="Move Up"
          className="h-10 w-14 rounded-xl border border-white/10 bg-white/5 active:bg-white/20 text-xs font-bold flex items-center justify-center text-zinc-300"
        >
          ▲
        </button>
        <div className="flex gap-4">
          <button
            type="button"
            onClick={() => changeDirection("LEFT")}
            aria-label="Move Left"
            className="h-10 w-14 rounded-xl border border-white/10 bg-white/5 active:bg-white/20 text-xs font-bold flex items-center justify-center text-zinc-300"
          >
            ◀
          </button>
          <button
            type="button"
            onClick={() => changeDirection("DOWN")}
            aria-label="Move Down"
            className="h-10 w-14 rounded-xl border border-white/10 bg-white/5 active:bg-white/20 text-xs font-bold flex items-center justify-center text-zinc-300"
          >
            ▼
          </button>
          <button
            type="button"
            onClick={() => changeDirection("RIGHT")}
            aria-label="Move Right"
            className="h-10 w-14 rounded-xl border border-white/10 bg-white/5 active:bg-white/20 text-xs font-bold flex items-center justify-center text-zinc-300"
          >
            ▶
          </button>
        </div>
      </div>

      {/* Footer Controls & Info */}
      <div className="mt-3 flex items-center justify-between w-full text-[11px] text-zinc-500 px-2">
        <span>Controls: WASD / Arrows</span>
        {gameState === "playing" && (
          <button
            onClick={togglePause}
            className="text-zinc-400 hover:text-white transition underline"
          >
            Pause
          </button>
        )}
      </div>
    </div>
  );
}
