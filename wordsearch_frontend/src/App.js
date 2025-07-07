import React, { useState, useEffect, useRef } from 'react';
import './App.css';

// List of sample words (could be replaced with dynamic puzzle data in the future)
const SAMPLE_WORDS = [
  "REACT", "JAVASCRIPT", "GRID", "PUZZLE", "SEARCH", "GAME", "STATE", "HOOK"
];

// Directions for word selection (row,col increments)
const DIRECTIONS = [
  { dr: 0, dc: 1 },   // right
  { dr: 1, dc: 0 },   // down
  { dr: 1, dc: 1 },   // down-right
  { dr: 1, dc: -1 },  // down-left
  { dr: 0, dc: -1 },  // left
  { dr: -1, dc: 0 },  // up
  { dr: -1, dc: -1 }, // up-left
  { dr: -1, dc: 1 }   // up-right
];

// Default grid size (can be made dynamic later)
const GRID_SIZE = 12;

// --- Utility functions ---

// PUBLIC_INTERFACE
function randomInt(max) {
  /** Return a random integer between 0 (inclusive) and max (exclusive). */
  return Math.floor(Math.random() * max);
}

// PUBLIC_INTERFACE
function shuffleArray(array) {
  /** Shuffle an array in place using Fisher-Yates algorithm. */
  const a = array.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = randomInt(i + 1);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Returns the cells (row,col) that make up a word at a start and direction
// PUBLIC_INTERFACE
function getWordCells(start, direction, length) {
  /** Return array of [row,col] cells for a word starting at (start.row,start.col) in "direction" */
  const cells = [];
  let { row, col } = start;
  for (let i = 0; i < length; i++) {
    cells.push([row, col]);
    row += direction.dr;
    col += direction.dc;
  }
  return cells;
}

/**
 * Try to place a word in the grid in a random direction and position.
 * Returns true if placed, false if not.
 * @param {*} grid
 * @param {*} word
 * @param {*} attempts
 */
function placeWord(grid, word, attempts = 100) {
  const N = grid.length;
  const directions = shuffleArray(DIRECTIONS);
  for (let trial = 0; trial < attempts; ++trial) {
    const dir = directions[trial % directions.length];
    const maxRow = dir.dr === 1 ? N - word.length : dir.dr === -1 ? word.length - 1 : N - 1;
    const maxCol = dir.dc === 1 ? N - word.length : dir.dc === -1 ? word.length - 1 : N - 1;
    const startRow = randomInt(N);
    const startCol = randomInt(N);

    // Ensure word fits
    if (
      startRow < 0 || startCol < 0 ||
      startRow > maxRow || startCol > maxCol
    ) continue;

    // Check if fits (can overlap if same letter)
    let fits = true;
    let positions = [];
    for (let i = 0; i < word.length; i++) {
      const r = startRow + dir.dr * i;
      const c = startCol + dir.dc * i;
      if (
        r < 0 || r >= N || c < 0 || c >= N ||
        (grid[r][c] !== '' && grid[r][c] !== word[i])
      ) {
        fits = false;
        break;
      }
      positions.push([r, c]);
    }
    if (!fits) continue;

    // Place the word
    for (let i = 0; i < word.length; i++) {
      const [r, c] = positions[i];
      grid[r][c] = word[i];
    }
    return positions;
  }
  return null;
}

/**
 * Generate a random wordsearch grid and word positions.
 * Returns {grid, wordPositions} where grid is a 2D array and wordPositions is { WORD: [[row,col], ...] }
 */
// PUBLIC_INTERFACE
function generatePuzzle(words, gridSize = GRID_SIZE) {
  /**
   * Generate and return:
   *   - an N x N grid of letters,
   *   - a mapping of word to its placement (if any).
   */
  const grid = Array.from({ length: gridSize }, () => Array(gridSize).fill(''));
  const wordPositions = {};
  const placedWords = [];
  for (let rawWord of words) {
    const word = rawWord.toUpperCase();
    const pos = placeWord(grid, word);
    if (pos) {
      wordPositions[word] = pos;
      placedWords.push(word);
    }
  }
  // Fill empty spots with random letters
  for (let r = 0; r < gridSize; r++) {
    for (let c = 0; c < gridSize; c++) {
      if (grid[r][c] === '') {
        grid[r][c] = String.fromCharCode(65 + randomInt(26));
      }
    }
  }
  return { grid, wordPositions, placedWords };
}

/**
 * Determines if the selected cells correspond to a valid word (and in wordPositions).
 * @param {*} selection Array of [row, col] pairs
 * @param {*} wordPositions Map from word => array of [row, col]
 */
function checkSelection(selection, wordPositions) {
  if (!selection || selection.length < 2) return null;
  for (const [word, positions] of Object.entries(wordPositions)) {
    if (
      selection.length === positions.length &&
      selection.every(([r, c], i) => r === positions[i][0] && c === positions[i][1])
    ) {
      return word;
    }
    // Check reversed direction
    const reversed = positions.slice().reverse();
    if (
      selection.length === reversed.length &&
      selection.every(([r, c], i) => r === reversed[i][0] && c === reversed[i][1])
    ) {
      return word;
    }
  }
  return null;
}

// --- Main Components ---

// PUBLIC_INTERFACE
function WordsearchGrid({
  grid,
  wordPositions,
  foundWords,
  currentSelection,
  setCurrentSelection,
  onWordFound,
  isSelecting,
  setIsSelecting,
  disabled,
}) {
  /**
   * The interactive wordsearch puzzle grid component.
   * Handles highlighting of cells for found words and current selection.
   */
  const gridSize = grid.length;

  // Track cell hover and mouse/touch logic (for selection)
  function handleCellPointerDown(row, col) {
    if (disabled) return;
    setCurrentSelection([[row, col]]);
    setIsSelecting(true);
  }
  function handleCellPointerEnter(row, col) {
    if (!isSelecting || disabled) return;
    setCurrentSelection((sel) => {
      if (!sel || sel.length === 0) return [[row, col]];
      return [sel[0], [row, col]];
    });
  }
  function handleCellPointerUp(row, col) {
    if (disabled) return;
    setIsSelecting(false);
    setCurrentSelection((sel) => {
      if (sel && sel.length === 2 && (sel[0][0] !== sel[1][0] || sel[0][1] !== sel[1][1])) {
        const dir = [
          Math.sign(sel[1][0] - sel[0][0]),
          Math.sign(sel[1][1] - sel[0][1])
        ];
        // determine length (whichever axis moved more)
        let length = Math.max(
          Math.abs(sel[1][0] - sel[0][0]),
          Math.abs(sel[1][1] - sel[0][1])
        ) + 1;
        // generate cells in that direction and check if matches a word
        const selCells = [];
        let r = sel[0][0], c = sel[0][1];
        for (let i = 0; i < length; i++) {
          selCells.push([r, c]);
          r += dir[0];
          c += dir[1];
        }
        // Check
        const found = checkSelection(selCells, wordPositions);
        if (found && !foundWords.includes(found)) {
          onWordFound(found);
        }
      }
      return [];
    });
  }

  // (For accessibility and mobile)
  const gridTable = [];
  for (let r = 0; r < gridSize; r++) {
    const rowCells = [];
    for (let c = 0; c < gridSize; c++) {
      let cellClass = 'ws-cell';
      let inFound = false;
      for (const word of foundWords) {
        if (wordPositions[word]?.some(([rr, cc]) => rr === r && cc === c)) {
          cellClass += ' ws-cell-found';
          inFound = true;
          break;
        }
      }
      // Current selection highlight
      if (currentSelection && currentSelection.length === 2 && !inFound) {
        const [start, end] = currentSelection;
        const dr = Math.sign(end[0] - start[0]), dc = Math.sign(end[1] - start[1]);
        const maxLen = Math.max(Math.abs(end[0] - start[0]), Math.abs(end[1] - start[1])) + 1;
        let rr = start[0], cc = start[1];
        for (let i = 0; i < maxLen; i++) {
          if (rr === r && cc === c) {
            cellClass += ' ws-cell-select';
          }
          rr += dr;
          cc += dc;
        }
      }
      rowCells.push(
        <td
          key={c}
          className={cellClass}
          onPointerDown={() => handleCellPointerDown(r, c)}
          onPointerEnter={() => handleCellPointerEnter(r, c)}
          onPointerUp={() => handleCellPointerUp(r, c)}
          tabIndex={0}
        >
          <span>{grid[r][c]}</span>
        </td>
      );
    }
    gridTable.push(<tr key={r}>{rowCells}</tr>);
  }

  return (
    <div className="ws-grid-container">
      <table className="ws-grid" cellSpacing={0}>
        <tbody>
          {gridTable}
        </tbody>
      </table>
    </div>
  );
}

// PUBLIC_INTERFACE
function WordList({ words, foundWords }) {
  /**
   * Displays the list of words to find, with found words highlighted.
   */
  return (
    <div className="ws-wordlist">
      <h3>Word List</h3>
      <ul>
        {words.map(word => (
          <li
            key={word}
            className={foundWords.includes(word) ? "ws-word-found" : ""}
          >
            {word}
          </li>
        ))}
      </ul>
    </div>
  );
}

// PUBLIC_INTERFACE
function Timer({ running, elapsed }) {
  /**
   * Displays a timer showing elapsed time.
   */
  // elapsed is in seconds
  const mins = Math.floor(elapsed / 60);
  const secs = elapsed % 60;
  return <div className="ws-timer">
    <span role="img" aria-label="Timer">⏱️</span>
    {` ${mins}:${secs.toString().padStart(2, "0")}`}
    {running ? "" : " (paused)"}
  </div>;
}

// PUBLIC_INTERFACE
function Score({ found, total }) {
  /**
   * Displays the current score (words found out of total).
   */
  return <div className="ws-score">
    <span role="img" aria-label="Score">⭐</span>
    {` ${found} / ${total} words`}
  </div>;
}

// --- Main App Component ---

// PUBLIC_INTERFACE
function App() {
  /**
   * The main app entry point: hosts header, theme toggle, wordsearch game components, controls, and responsive layout.
   */
  // THEME STATE
  const [theme, setTheme] = useState('light');
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);
  const toggleTheme = () => setTheme(prev => prev === 'light' ? 'dark' : 'light');

  // GAME STATE
  const [puzzle, setPuzzle] = useState(null);
  const [foundWords, setFoundWords] = useState([]);
  const [currentSelection, setCurrentSelection] = useState([]);
  const [isSelecting, setIsSelecting] = useState(false);

  // TIMER STATE
  const [timer, setTimer] = useState(0);
  const [timerRunning, setTimerRunning] = useState(true);
  const intervalRef = useRef();

  // On mount: generate puzzle
  useEffect(() => {
    restartGame();
    // eslint-disable-next-line
  }, []);

  // Timer logic
  useEffect(() => {
    if (timerRunning) {
      intervalRef.current = setInterval(() => setTimer(t => t + 1), 1000);
    } else if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [timerRunning]);

  // When all words found, stop timer
  useEffect(() => {
    if (puzzle && foundWords.length === puzzle.placedWords.length) {
      setTimerRunning(false);
    }
  }, [foundWords, puzzle]);

  // On window pointer up (so outside grid, too)
  useEffect(() => {
    const handler = () => {
      setIsSelecting(false);
      setCurrentSelection([]);
    };
    window.addEventListener('pointerup', handler);
    return () => window.removeEventListener('pointerup', handler);
  }, []);

  // PUBLIC_INTERFACE
  function restartGame() {
    const { grid, wordPositions, placedWords } = generatePuzzle(SAMPLE_WORDS, GRID_SIZE);
    setPuzzle({
      grid,
      wordPositions,
      placedWords,
    });
    setFoundWords([]);
    setTimer(0);
    setTimerRunning(true);
    setIsSelecting(false);
    setCurrentSelection([]);
  }

  // PUBLIC_INTERFACE
  function handleWordFound(word) {
    setFoundWords((fw) => fw.includes(word) ? fw : [...fw, word]);
  }

  return (
    <div className="App">
      <header className="App-header">
        <button
          className="theme-toggle"
          onClick={toggleTheme}
          aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
        >
          {theme === 'light' ? '🌙 Dark' : '☀️ Light'}
        </button>
        <h1 className="ws-title">Wordsearch Game</h1>
        <div className="ws-meta-row">
          <Score found={foundWords.length} total={puzzle?.placedWords.length || 0} />
          <Timer running={timerRunning} elapsed={timer} />
        </div>
        <div className="ws-game-area">
          {puzzle &&
            <WordsearchGrid
              grid={puzzle.grid}
              wordPositions={puzzle.wordPositions}
              foundWords={foundWords}
              currentSelection={currentSelection}
              setCurrentSelection={setCurrentSelection}
              onWordFound={handleWordFound}
              isSelecting={isSelecting}
              setIsSelecting={setIsSelecting}
              disabled={foundWords.length === puzzle.placedWords.length}
            />
          }
          <WordList words={puzzle?.placedWords || []} foundWords={foundWords} />
        </div>
        <div className="ws-controls">
          <button className="ws-btn" onClick={restartGame}>Restart</button>
        </div>
        <p className="ws-footer">
          <a className="App-link" href="https://reactjs.org" target="_blank" rel="noopener noreferrer">
            React Docs ↗
          </a>
          {" | "}
          <span style={{ opacity: 0.6 }}>Grid Size: {GRID_SIZE}x{GRID_SIZE}</span>
        </p>
      </header>
    </div>
  );
}

export default App;
