const FILES = ["a", "b", "c", "d", "e", "f", "g", "h"];

const START_POSITION = [
  ["wp", "wp", "wp", "wp", "wp", "wp", "wp", "wp"],
  ["wr", "wn", "wb", "wq", "wk", "wb", "wn", "wr"],
  [null, null, null, null, null, null, null, null],
  [null, null, null, null, null, null, null, null],
  [null, null, null, null, null, null, null, null],
  [null, null, null, null, null, null, null, null],
  ["br", "bn", "bb", "bq", "bk", "bb", "bn", "br"],
  ["bp", "bp", "bp", "bp", "bp", "bp", "bp", "bp"],
];

const PIECE_VALUES = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };

let boardState = [];
let moveHistory = [];
let moveEvals = [30];
let moveIndex = 0;
let isBoardFlipped = false; // Global flag to track piece orientation

// ---------------------------------------------------------------------
// ENGINE INITIALIZATION
// ---------------------------------------------------------------------
let engine = null;
let engineReady = false;

function initEngine() {
  console.log(
    "[Engine] Attempting to create Worker('stockfish-18-single-lite.js')...",
  );
  try {
    engine = new Worker("stockfish-18-single.js");
    console.log("[Engine] Worker object created:", engine);
  } catch (err) {
    console.error("[Engine] Failed to create Worker:", err);
    engine = null;
    return;
  }

  engine.onmessage = function (event) {
    const line = typeof event === "string" ? event : event.data;
    console.log("[Engine:init]", line);
    if (line === "uciok") {
      engine.postMessage("isready");
    }
    if (line === "readyok") {
      engineReady = true;
      engine.postMessage("setoption name MultiPV value 2");
      console.log("[Engine] Ready ✅");
    }
  };

  engine.onerror = function (err) {
    console.error(
      "[Engine] Worker error:",
      err.message,
      "at",
      err.filename,
      "line",
      err.lineno,
    );
  };

  engine.postMessage("uci");
}

initEngine();

function waitForEngine(timeoutMs = 8000) {
  return new Promise((resolve) => {
    if (engineReady) return resolve(true);
    const start = Date.now();
    const check = setInterval(() => {
      if (engineReady) {
        clearInterval(check);
        resolve(true);
      } else if (Date.now() - start > timeoutMs) {
        clearInterval(check);
        console.error("[Engine] Timed out waiting for readiness.");
        resolve(false);
      }
    }, 100);
  });
}

// ---------------------------------------------------------------------
// BOARD RENDERING
// ---------------------------------------------------------------------
function buildBoard() {
  const board = document.getElementById("chess-board");
  if (!board) return;
  board.innerHTML = "";
  for (let rank = 0; rank < 8; rank++) {
    for (let file = 0; file < 8; file++) {
      const sq = document.createElement("div");
      sq.classList.add("square", (rank + file) % 2 === 0 ? "light" : "dark");
      sq.dataset.rank = rank;
      sq.dataset.file = file;
      board.appendChild(sq);
    }
  }
}

function renderBoard(state, highlightSquares = []) {
  const squares = document.querySelectorAll(".square");
  if (squares.length === 0) return;

  squares.forEach((sq) => {
    sq.innerHTML = "";

    // The visual row/col of the DOM square container
    const domRank = +sq.dataset.rank;
    const domFile = +sq.dataset.file;

    // If flipped, look up the piece from the opposite side of the array matrix
    const targetRank = isBoardFlipped ? 7 - domRank : domRank;
    const targetFile = isBoardFlipped ? 7 - domFile : domFile;

    const piece = state[targetRank][targetFile];
    if (piece) {
      const img = document.createElement("img");
      img.src = `./${piece}.png`;
      img.alt = piece;
      sq.appendChild(img);
    }

    // Remove old highlights from previous renders
    sq.className =
      "square " + ((domRank + domFile) % 2 === 0 ? "light" : "dark");
  });

  // Apply highlights using inverted lookup if flipped
  highlightSquares.forEach(({ rank, file, type }) => {
    const finalRank = isBoardFlipped ? 7 - rank : rank;
    const finalFile = isBoardFlipped ? 7 - file : file;

    const sq = document.querySelector(
      `.square[data-rank="${finalRank}"][data-file="${finalFile}"]`,
    );
    if (sq) sq.classList.add(`highlight-${type}`);
  });
}

// ---------------------------------------------------------------------
// CHESS.JS BOARD CONVERSION
// ---------------------------------------------------------------------
function convertChessJsBoard(board) {
  return board.map((row) =>
    row.map((cell) => (cell ? cell.color + cell.type : null)),
  );
}

// ---------------------------------------------------------------------
// STOCKFISH ANALYSIS — MultiPV 2
// ---------------------------------------------------------------------
function getStockfishAnalysis(fen, depth = 10) {
  return new Promise((resolve) => {
    if (!engine) {
      console.warn(
        "[Analysis] No engine available — returning defaults for FEN:",
        fen,
      );
      resolve({ bestEval: 0, secondEval: null, bestMove: null });
      return;
    }

    const scores = {};
    let bestMove = null;

    engine.onmessage = function (event) {
      const line = typeof event === "string" ? event : event.data;

      const multipvMatch = line.match(/multipv (\d+)/);
      const cpMatch = line.match(/score cp (-?\d+)/);
      const mateMatch = line.match(/score mate (-?\d+)/);

      if (multipvMatch && (cpMatch || mateMatch)) {
        const idx = parseInt(multipvMatch[1]);
        let score;
        if (cpMatch) {
          score = parseInt(cpMatch[1]);
        } else {
          const m = parseInt(mateMatch[1]);
          score = m > 0 ? 10000 : -10000;
        }
        scores[idx] = score;
      }

      if (line.startsWith("bestmove")) {
        const parts = line.split(" ");
        bestMove = parts[1];

        const result = {
          bestEval: scores[1] !== undefined ? scores[1] : 0,
          secondEval: scores[2] !== undefined ? scores[2] : null,
          bestMove: bestMove,
        };

        resolve(result);
      }
    };

    engine.postMessage("setoption name MultiPV value 2");
    engine.postMessage("ucinewgame");
    engine.postMessage(`position fen ${fen}`);
    engine.postMessage(`go depth ${depth}`);
  });
}

function centipawnsToWinChance(cp) {
  if (cp > 3000) return 1.0;
  if (cp < -3000) return 0.0;
  return 0.5 + 0.5 * (2 / (1 + Math.exp(-0.00368208 * cp)) - 1);
}

function classifyMove(prevEval, currentEval, isWhiteTurn, isForced = false) {
  if (isForced) return "highlight-forced";

  const pEval = isWhiteTurn ? prevEval : -prevEval;
  const cEval = isWhiteTurn ? currentEval : -currentEval;

  const winChanceBefore = centipawnsToWinChance(pEval);
  const winChanceAfter = centipawnsToWinChance(cEval);
  const expectedPointsLost = winChanceBefore - winChanceAfter;

  const cpLoss = pEval - cEval;

  if (cpLoss >= 300 || expectedPointsLost >= 0.2) return "highlight-blunder";
  if (cpLoss >= 175 || expectedPointsLost >= 0.1) return "highlight-mistake";
  if (cpLoss >= 75 || expectedPointsLost >= 0.05) return "highlight-inaccuracy";
  if (expectedPointsLost >= 0.02) return "highlight-good";
  if (expectedPointsLost > 0.0) return "highlight-excellent";
  return "highlight-best";
}

// ---------------------------------------------------------------------
// ATTACKER DETECTION
// ---------------------------------------------------------------------
function canReach(state, sr, sf, dr, df, piece, isWhite) {
  const [color, type] = [piece[0], piece[1]];
  const dr_ = dr - sr,
    df_ = df - sf;

  if (type === "p") {
    const dir = isWhite ? -1 : 1;
    if (sf === df) {
      if (dr_ === dir && !state[dr][df]) return true;
      if (
        sr === (isWhite ? 6 : 1) &&
        dr_ === 2 * dir &&
        !state[sr + dir][sf] &&
        !state[dr][df]
      )
        return true;
    } else if (Math.abs(df_) === 1 && dr_ === dir) {
      if (state[dr][df] && state[dr][df][0] !== color) return true;
    }
    return false;
  }
  if (type === "n") {
    if (state[dr][df] && state[dr][df][0] === color) return false;
    return (
      (Math.abs(dr_) === 2 && Math.abs(df_) === 1) ||
      (Math.abs(dr_) === 1 && Math.abs(df_) === 2)
    );
  }
  if (type === "k") {
    if (state[dr][df] && state[dr][df][0] === color) return false;
    return Math.abs(dr_) <= 1 && Math.abs(df_) <= 1;
  }
  if (type === "r") {
    if (state[dr][df] && state[dr][df][0] === color) return false;
    return (dr_ === 0 || df_ === 0) && pathClear(state, sr, sf, dr, df);
  }
  if (type === "b") {
    if (state[dr][df] && state[dr][df][0] === color) return false;
    return Math.abs(dr_) === Math.abs(df_) && pathClear(state, sr, sf, dr, df);
  }
  if (type === "q") {
    if (state[dr][df] && state[dr][df][0] === color) return false;
    return (
      (dr_ === 0 || df_ === 0 || Math.abs(dr_) === Math.abs(df_)) &&
      pathClear(state, sr, sf, dr, df)
    );
  }
  return false;
}

function pathClear(state, sr, sf, dr, df) {
  const rStep = dr === sr ? 0 : dr > sr ? 1 : -1;
  const fStep = df === sf ? 0 : df > sf ? 1 : -1;
  let r = sr + rStep,
    f = sf + fStep;
  while (r !== dr || f !== df) {
    if (state[r][f]) return false;
    r += rStep;
    f += fStep;
  }
  return true;
}

function getSquareAttackers(state, targetRank, targetFile, attackerIsWhite) {
  let attackers = [];
  const attackerColor = attackerIsWhite ? "w" : "b";
  for (let r = 0; r < 8; r++) {
    for (let f = 0; f < 8; f++) {
      const piece = state[r][f];
      if (piece && piece[0] === attackerColor) {
        if (
          canReach(state, r, f, targetRank, targetFile, piece, attackerIsWhite)
        ) {
          attackers.push({ rank: r, file: f, piece: piece });
        }
      }
    }
  }
  return attackers;
}

function checkIsBookMove(playedMovesSoFar) {
  if (typeof NORMALIZED_OPENING_BOOK === "undefined") return false;
  const n = playedMovesSoFar.length;
  for (const line of NORMALIZED_OPENING_BOOK) {
    if (line.length < n) continue;
    let matches = true;
    for (let i = 0; i < n; i++) {
      if (line[i] !== playedMovesSoFar[i]) {
        matches = false;
        break;
      }
    }
    if (matches) return true;
  }
  return false;
}

// ---------------------------------------------------------------------
// MAIN PGN LOAD + ANALYSIS LOOP
// ---------------------------------------------------------------------
async function loadPGN(pgn) {
  if (typeof Chess === "undefined") {
    console.error("[LoadPGN] chess.js not loaded.");
    return;
  }

  const ready = await waitForEngine();
  if (!ready) {
    console.error("[LoadPGN] Engine not ready.");
    return;
  }

  const game = new Chess();
  const tokens = [];
  const states = [];
  const fens = [];
  const moveObjs = [];
  const forcedMoveFlags = [];

  const loadedFromPgn = game.load_pgn(pgn, { sloppy: true });
  const replay = new Chess();

  states.push(convertChessJsBoard(replay.board()));
  fens.push(replay.fen());

  if (loadedFromPgn) {
    const history = game.history({ verbose: true });
    history.forEach((m) => {
      const legalMoves = replay.moves();
      forcedMoveFlags.push(legalMoves.length === 1);

      const result = replay.move(m.san, { sloppy: true });
      if (!result) return;
      tokens.push(m.san);
      moveObjs.push(result);
      states.push(convertChessJsBoard(replay.board()));
      fens.push(replay.fen());
    });
  } else {
    const rawTokens = pgn
      .replace(/\[[^\]]*\]/g, "")
      .replace(/\{[^}]*\}/g, "")
      .replace(/\([^)]*\)/g, "")
      .replace(/\$\d+/g, "")
      .replace(/\d+\.(\.\.)?/g, "")
      .replace(/1-0|0-1|1\/2-1\/2|\*/g, "")
      .trim()
      .split(/\s+/)
      .filter(Boolean);

    for (const token of rawTokens) {
      const legalMoves = replay.moves();
      forcedMoveFlags.push(legalMoves.length === 1);

      const result = replay.move(token, { sloppy: true });
      if (!result) break;
      tokens.push(token);
      moveObjs.push(result);
      states.push(convertChessJsBoard(replay.board()));
      fens.push(replay.fen());
    }
  }

  if (tokens.length === 0) return;

  moveHistory = states.map((s) => ({ state: s, highlight: null }));
  boardState = states[states.length - 1];
  moveIndex = 0;
  renderBoard(moveHistory[0].state);

  const analyses = [];
  for (let i = 0; i < fens.length - 1; i++) {
    const nextIsWhite = i % 2 === 0;
    const result = await getStockfishAnalysis(fens[i]);
    const whiteBest = nextIsWhite ? result.bestEval : -result.bestEval;
    const whiteSecond =
      result.secondEval !== null
        ? nextIsWhite
          ? result.secondEval
          : -result.secondEval
        : null;
    analyses.push({ ...result, nextIsWhite, whiteBest, whiteSecond });
  }

  const lastIdx = fens.length - 1;
  const lastIsWhite = lastIdx % 2 === 0;
  const lastResult = await getStockfishAnalysis(fens[lastIdx]);
  const lastWhiteEval = lastIsWhite
    ? lastResult.bestEval
    : -lastResult.bestEval;

  const evalAtPly = analyses.map((a) => a.whiteBest);
  evalAtPly.push(lastWhiteEval);
  moveEvals = evalAtPly;

  let isWhite = true;
  for (let i = 1; i < moveHistory.length; i++) {
    const prevEval = evalAtPly[i - 1];
    const whiteEval = evalAtPly[i];

    const analysis = analyses[i - 1];
    const moveObj = moveObjs[i - 1];
    const isForced = forcedMoveFlags[i - 1];

    const pEvalMover = isWhite ? prevEval : -prevEval;
    const cEvalMover = isWhite ? whiteEval : -whiteEval;
    const evalDeltaMover = cEvalMover - pEvalMover;

    const winChanceBeforeMover = centipawnsToWinChance(pEvalMover);
    let qualityClass = classifyMove(prevEval, whiteEval, isWhite, isForced);

    if (qualityClass !== "highlight-forced") {
      const playedSoFar = tokens
        .slice(0, i)
        .map((m) => m.replace(/[+#!?]/g, ""));
      if (checkIsBookMove(playedSoFar)) {
        qualityClass = "highlight-book";
      }
    }

    // Look-ahead: eval 2 plies later (after opponent's reply), mover's perspective
    let deferredEvalDeltaMover = null;
    if (i + 1 < evalAtPly.length) {
      const futureEval = evalAtPly[i + 1];
      const futureEvalMover = isWhite ? futureEval : -futureEval;
      deferredEvalDeltaMover = futureEvalMover - pEvalMover;
    }

    // --- BEST / GREAT DETECTION ---
    if (
      qualityClass !== "highlight-book" &&
      qualityClass !== "highlight-forced" &&
      analysis
    ) {
      const playedUci = moveObj.from + moveObj.to + (moveObj.promotion || "");
      const isBestMove = analysis.bestMove === playedUci;

      if (isBestMove) {
        qualityClass = "highlight-best";

        if (analysis.secondEval !== null) {
          const bestMover = isWhite ? analysis.bestEval : -analysis.bestEval;
          const secondMover = isWhite
            ? analysis.secondEval
            : -analysis.secondEval;
          const gap = bestMover - secondMover;

          const positionWasLive =
            winChanceBeforeMover > 0.15 && winChanceBeforeMover < 0.85;

          if (gap >= 120 && positionWasLive) {
            qualityClass = "highlight-great";
          }
        }
      }
    }

    const currentLayout = moveHistory[i].state;
    const previousLayout = moveHistory[i - 1].state;
    let landingPiece = null;
    let targetRank = -1,
      targetFile = -1;

    for (let r = 0; r < 8; r++) {
      for (let f = 0; f < 8; f++) {
        if (
          currentLayout[r][f] !== previousLayout[r][f] &&
          currentLayout[r][f] !== null
        ) {
          landingPiece = currentLayout[r][f];
          targetRank = r;
          targetFile = f;
        }
      }
    }

    // --- SIMPLIFIED BRILLIANCY CHECK ---
    const tempChess = new Chess(fens[i - 1]);
    tempChess.move(tokens[i - 1], { sloppy: true });
    const deliversCheckmate = tempChess.in_checkmate();

    if (deliversCheckmate) {
      qualityClass = "highlight-best";
    }

    const hasDeferredPayoff =
      deferredEvalDeltaMover !== null && deferredEvalDeltaMover >= 200;

    if (
      !deliversCheckmate &&
      landingPiece &&
      (qualityClass === "highlight-best" ||
        (hasDeferredPayoff &&
          (qualityClass === "highlight-inaccuracy" ||
            qualityClass === "highlight-mistake" ||
            qualityClass === "highlight-good" ||
            qualityClass === "highlight-excellent")))
    ) {
      const landingValue =
        PIECE_VALUES[moveObj.promotion ? moveObj.promotion : moveObj.piece];
      const capturedValue = moveObj.captured
        ? PIECE_VALUES[moveObj.captured]
        : 0;

      const destSquare = FILES[targetFile] + (8 - targetRank);

      // tempChess = position AFTER our move, opponent to move
      let potentialLoss = 0;

      const enemyCaptureMoves = tempChess
        .moves({ verbose: true })
        .filter((m) => m.to === destSquare && m.flags.includes("c"));

      if (enemyCaptureMoves.length > 0) {
        // Find the cheapest piece that can LEGALLY recapture
        let cheapestEnemyValue = 99;
        let cheapestMove = null;
        enemyCaptureMoves.forEach((m) => {
          const val = PIECE_VALUES[m.piece];
          if (val < cheapestEnemyValue) {
            cheapestEnemyValue = val;
            cheapestMove = m;
          }
        });

        // Simulate that recapture, then check if WE can legally recapture back
        const afterEnemyCapture = new Chess(tempChess.fen());
        afterEnemyCapture.move(cheapestMove.san, { sloppy: true });

        const ourRecaptureMoves = afterEnemyCapture
          .moves({ verbose: true })
          .filter((m) => m.to === destSquare && m.flags.includes("c"));

        if (ourRecaptureMoves.length === 0) {
          // No legal recapture for us -> piece is genuinely hanging
          potentialLoss = landingValue;
        } else if (cheapestEnemyValue < landingValue) {
          // We recapture, but only after losing the value difference
          potentialLoss = landingValue - cheapestEnemyValue;
        }
        // else: even trade or better -> potentialLoss stays 0
      }

      const netMaterialDelta = capturedValue - potentialLoss;
      const isRealSacrifice = netMaterialDelta <= -2;

      const positionStillSound = hasDeferredPayoff
        ? winChanceBeforeMover > 0.1
        : winChanceBeforeMover > 0.15 && evalDeltaMover >= -50;

      if (isRealSacrifice && positionStillSound) {
        qualityClass = "highlight-brilliant";
      }
    }

    // Only flag a miss if it wasn't a literal checkmate!
    if (
      !deliversCheckmate &&
      landingPiece &&
      qualityClass === "highlight-blunder"
    ) {
      const pEvalRelative = isWhite ? prevEval : -prevEval;
      const cEvalRelative = isWhite ? whiteEval : -whiteEval;
      if (pEvalRelative >= 150 && cEvalRelative <= 0) {
        qualityClass = "highlight-miss";
      }
    }

    if (landingPiece && qualityClass === "highlight-blunder") {
      const pEvalRelative = isWhite ? prevEval : -prevEval;
      const cEvalRelative = isWhite ? whiteEval : -whiteEval;
      if (pEvalRelative >= 150 && cEvalRelative <= 0) {
        qualityClass = "highlight-miss";
      }
    }

    moveHistory[i].highlight = {
      rank: targetRank,
      file: targetFile,
      type: qualityClass.replace("highlight-", ""),
    };
    isWhite = !isWhite;
  }

  console.table(
    moveHistory.slice(1).map((m, idx) => ({
      ply: idx + 1,
      san: tokens[idx],
      eval: moveEvals[idx + 1],
      class: m.highlight?.type,
    })),
  );
}

// ---------------------------------------------------------------------
// EVENT LISTENERS
// ---------------------------------------------------------------------
document.addEventListener("DOMContentLoaded", () => {
  let isAnimating = false; // Global lock state enclosed in DOM scope safely

  buildBoard();
  renderBoard(START_POSITION);

  function getCurrentStepState() {
    if (moveHistory.length > 0 && moveHistory[moveIndex]) {
      return {
        state: moveHistory[moveIndex].state,
        highlight: moveHistory[moveIndex].highlight
          ? [moveHistory[moveIndex].highlight]
          : [],
      };
    }
    return { state: START_POSITION, highlight: [] };
  }

  function goToStart() {
    if (moveHistory.length > 0) {
      moveIndex = 0;
      renderBoard(moveHistory[moveIndex].state, []);
    }
  }

  function goToPrevious() {
    if (moveIndex > 0) {
      moveIndex--;
      const step = getCurrentStepState();
      renderBoard(step.state, step.highlight);
    }
  }

  function goToNext() {
    if (moveIndex < moveHistory.length - 1) {
      moveIndex++;
      const step = getCurrentStepState();
      renderBoard(step.state, step.highlight);
    }
  }

  function goToEnd() {
    if (moveHistory.length > 0) {
      moveIndex = moveHistory.length - 1;
      const step = getCurrentStepState();
      renderBoard(step.state, step.highlight);
    }
  }

  // Navigation Click Listeners
  document.querySelector(".start-button")?.addEventListener("click", () => {
    if (!isAnimating) goToStart();
  });
  document.querySelector(".previous-button")?.addEventListener("click", () => {
    if (!isAnimating) goToPrevious();
  });
  document.querySelector(".next-button")?.addEventListener("click", () => {
    if (!isAnimating) goToNext();
  });
  document.querySelector(".end-button")?.addEventListener("click", () => {
    if (!isAnimating) goToEnd();
  });

  // Flip Button Click Handling
  const flipButton = document.querySelector(".flip-button");
  flipButton?.addEventListener("click", () => {
    if (isAnimating) return;

    isAnimating = true;
    // 1. Toggle the persistent class instead of adding a temporary one
    flipButton.classList.toggle("is-flipped");

    isBoardFlipped = !isBoardFlipped;

    const currentStep = getCurrentStepState();
    renderBoard(currentStep.state, currentStep.highlight);

    // 2. Since we switched to a CSS transition, use a timeout to release the input lock
    setTimeout(() => {
      isAnimating = false;
    }, 500); // 500ms matches the 0.5s transition in your CSS
  });

  // Reset Button Click Handling
  const resetButton = document.querySelector(".reset");
  resetButton?.addEventListener("click", () => {
    if (isAnimating) return;

    isAnimating = true;
    resetButton.classList.add("is-resetting");

    moveHistory = [];
    moveEvals = [30];
    moveIndex = 0;

    // 3. Revert the board state and remove the flipped class on reset
    isBoardFlipped = false;
    flipButton?.classList.remove("is-flipped");

    const inputEl =
      document.querySelector(".input") || document.querySelector("textarea");
    if (inputEl) {
      inputEl.value = "";
    }

    if (engineReady && engine) {
      engine.postMessage("ucinewgame");
      console.log("[Engine] State cleared via reset.");
    }

    renderBoard(START_POSITION, []);
  });

  resetButton?.addEventListener("animationend", () => {
    resetButton.classList.remove("is-resetting");
    isAnimating = false;
  });

  // Async listener to handle the loading state UI
  const analyzeBtn = document.querySelector(".analyze-button");
  async function triggerAnalysis() {
    if (isAnimating) return; // Guard against analysis runs during piece animations
    const inputEl =
      document.querySelector(".input") || document.querySelector("textarea");

    if (analyzeBtn && !analyzeBtn.disabled && inputEl && inputEl.value.trim()) {
      const originalText = analyzeBtn.textContent || "Analyze";
      analyzeBtn.disabled = true;
      analyzeBtn.textContent = "Analyzing...";

      try {
        await loadPGN(inputEl.value.trim());
      } catch (err) {
        console.error("[UI] Error during analysis:", err);
      } finally {
        analyzeBtn.disabled = false;
        analyzeBtn.textContent = originalText;
      }
    }
  }

  analyzeBtn?.addEventListener("click", triggerAnalysis);

  // Keyboard Shortcuts Listener
  window.addEventListener("keydown", (e) => {
    const activeEl = document.activeElement;
    if (
      activeEl &&
      (activeEl.tagName === "TEXTAREA" || activeEl.tagName === "INPUT")
    ) {
      if (e.key === "Enter") {
        e.preventDefault();
        triggerAnalysis();
      }
      return;
    }

    if (isAnimating) return;

    switch (e.key) {
      case "ArrowUp":
        e.preventDefault();
        goToStart();
        break;
      case "ArrowDown":
        e.preventDefault();
        goToEnd();
        break;
      case "ArrowLeft":
        goToPrevious();
        break;
      case "ArrowRight":
        goToNext();
        break;
      case "Enter":
        triggerAnalysis();
        break;
    }
  });
});
