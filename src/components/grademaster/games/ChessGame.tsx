"use client";

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  ArrowLeft, RotateCcw, Volume2, VolumeX, 
  Trophy, Sparkles, HelpCircle, CheckCircle2, 
  XCircle, Clock, Zap, BookOpen, Bot, Users
} from 'lucide-react';
import { 
  GameQuestion, 
  GameQuestionsService, 
  GAME_SUBJECTS 
} from '@/lib/grademaster/services/game-questions.service';

type PieceType = 'p' | 'r' | 'n' | 'b' | 'q' | 'k';
type PieceColor = 'w' | 'b';

interface Piece {
  type: PieceType;
  color: PieceColor;
}

type BoardState = (Piece | null)[][]; // 8x8: row 0 = rank 8 (Black back rank), row 7 = rank 1 (White back rank)

interface Position {
  r: number;
  c: number;
}

interface Move {
  from: Position;
  to: Position;
  captured?: Piece | null;
}

interface ChessGameProps {
  initialSubject?: string;
  onBack: () => void;
}

// Initial Standard Chess Board
function createInitialBoard(): BoardState {
  const board: BoardState = Array(8).fill(null).map(() => Array(8).fill(null));

  // Black pieces (row 0 & 1)
  const backRankBlack: PieceType[] = ['r', 'n', 'b', 'q', 'k', 'b', 'n', 'r'];
  for (let c = 0; c < 8; c++) {
    board[0][c] = { type: backRankBlack[c], color: 'b' };
    board[1][c] = { type: 'p', color: 'b' };
  }

  // White pieces (row 6 & 7)
  const backRankWhite: PieceType[] = ['r', 'n', 'b', 'q', 'k', 'b', 'n', 'r'];
  for (let c = 0; c < 8; c++) {
    board[6][c] = { type: 'p', color: 'w' };
    board[7][c] = { type: backRankWhite[c], color: 'w' };
  }

  return board;
}

// Clean Web Audio Synthesizer for sounds without external file dependencies
function playSound(type: 'move' | 'capture' | 'correct' | 'wrong' | 'victory', soundEnabled: boolean) {
  if (!soundEnabled || typeof window === 'undefined') return;
  try {
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();

    if (type === 'move') {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(320, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(180, ctx.currentTime + 0.08);
      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.08);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.08);
    } else if (type === 'capture') {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'square';
      osc.frequency.setValueAtTime(440, ctx.currentTime);
      osc.frequency.setValueAtTime(580, ctx.currentTime + 0.06);
      gain.gain.setValueAtTime(0.25, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.15);
    } else if (type === 'correct') {
      const now = ctx.currentTime;
      [523.25, 659.25, 783.99, 1046.5].forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.frequency.setValueAtTime(freq, now + i * 0.07);
        gain.gain.setValueAtTime(0.2, now + i * 0.07);
        gain.gain.exponentialRampToValueAtTime(0.01, now + i * 0.07 + 0.15);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + i * 0.07);
        osc.stop(now + i * 0.07 + 0.15);
      });
    } else if (type === 'wrong') {
      const now = ctx.currentTime;
      [280, 220].forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(freq, now + i * 0.12);
        gain.gain.setValueAtTime(0.25, now + i * 0.12);
        gain.gain.exponentialRampToValueAtTime(0.01, now + i * 0.12 + 0.18);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + i * 0.12);
        osc.stop(now + i * 0.12 + 0.18);
      });
    } else if (type === 'victory') {
      const now = ctx.currentTime;
      [523.25, 659.25, 783.99, 1046.5, 1318.51].forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + i * 0.1);
        gain.gain.setValueAtTime(0.25, now + i * 0.1);
        gain.gain.exponentialRampToValueAtTime(0.01, now + i * 0.1 + 0.3);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + i * 0.1);
        osc.stop(now + i * 0.1 + 0.3);
      });
    }
  } catch (e) {
    console.warn('[ChessAudio] Sound synthesis notice:', e);
  }
}

// 2D Chess Piece SVG Graphic Component
function ChessPieceGraphic({ piece }: { piece: Piece }) {
  const isWhite = piece.color === 'w';
  const fill = isWhite ? '#FFFFFF' : '#1E293B';
  const stroke = isWhite ? '#0F172A' : '#F8FAFC';
  const accent = isWhite ? '#CBD5E1' : '#0F172A';

  switch (piece.type) {
    case 'k': // King
      return (
        <svg viewBox="0 0 45 45" className="w-4/5 h-4/5 drop-shadow-md select-none pointer-events-none">
          <g fill="none" fillRule="evenodd" stroke={stroke} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22.5 11.63V6M20 8h5" stroke={stroke} strokeWidth="1.5" />
            <path d="M22.5 25s4.5-7.5 3-10.5c0 0-1-2.5-3-2.5s-3 2.5-3 2.5c-1.5 3 3 10.5 3 10.5" fill={fill} />
            <path d="M11.5 37c5.5 3.5 15.5 3.5 21 0v-7s9-4.5 6-10.5c-4-6.5-13.5-3.5-16 4V23.5M11.5 30c-5.5-3.5-15.5-3.5-21 0" fill={fill} />
            <path d="M11.5 30c5.5-2 15.5-2 21 0m-21 3.5c5.5-2 15.5-2 21 0m-21 3.5c5.5-2 15.5-2 21 0" />
          </g>
        </svg>
      );
    case 'q': // Queen
      return (
        <svg viewBox="0 0 45 45" className="w-4/5 h-4/5 drop-shadow-md select-none pointer-events-none">
          <g fill={fill} fillRule="evenodd" stroke={stroke} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 26c8.5-1.5 21-1.5 27 0l2-12-7 11-4-15-4.5 15-7-11 2.5 12z" />
            <path d="M9 26c0 2 1.5 2 2.5 4 1 1.5 1 1 .5 3.5-1.5 1-1.5 2.5-1.5 2.5-1.5 1.5.5 2.5.5 2.5 6.5 1 16.5 1 23 0 0 0 2-1 .5-2.5 0 0 0-1.5-1.5-2.5-.5-2.5-.5-2 .5-3.5 1-2 2.5-2 2.5-4-8.5-1.5-18.5-1.5-27 0z" />
            <circle cx="6" cy="12" r="2" fill={accent} />
            <circle cx="14" cy="9" r="2" fill={accent} />
            <circle cx="22.5" cy="8" r="2" fill={accent} />
            <circle cx="31" cy="9" r="2" fill={accent} />
            <circle cx="39" cy="12" r="2" fill={accent} />
          </g>
        </svg>
      );
    case 'r': // Rook
      return (
        <svg viewBox="0 0 45 45" className="w-4/5 h-4/5 drop-shadow-md select-none pointer-events-none">
          <g fill={fill} fillRule="evenodd" stroke={stroke} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 39h27v-3H9v3zm3-3v-4.5h21V36H12zm2-4.5l1.5-13.5h14l1.5 13.5H14zM11 14h23v4H11v-4z" />
            <path d="M12 14v-4h3v2h4v-2h6v2h4v-2h4v4H12z" />
          </g>
        </svg>
      );
    case 'b': // Bishop
      return (
        <svg viewBox="0 0 45 45" className="w-4/5 h-4/5 drop-shadow-md select-none pointer-events-none">
          <g fill="none" fillRule="evenodd" stroke={stroke} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 36c3.39-.97 10.11.43 13.5-2 3.39 2.43 10.11 1.03 13.5 2 0 0 1.65.54 3 2-.68.97-1.65.99-3 .5-3.39-.97-10.11.46-13.5-1-3.39 1.46-10.11.03-13.5 1-1.35.49-2.32.47-3-.5 1.35-1.46 3-2 3-2z" fill={fill} />
            <path d="M15 32c2.5 2.5 12.5 2.5 15 0 .5-1.5 0-2 0-2 0-2.5-2.5-4-2.5-4 5.5-1.5 6-11.5-5-15.5-11 4-10.5 14-5 15.5 0 0-2.5 1.5-2.5 4 0 0-.5.5 0 2z" fill={fill} />
            <circle cx="22.5" cy="8.5" r="1.5" fill={accent} />
            <path d="M17.5 26h10M22.5 21v10" stroke={stroke} strokeWidth="1.5" />
          </g>
        </svg>
      );
    case 'n': // Knight
      return (
        <svg viewBox="0 0 45 45" className="w-4/5 h-4/5 drop-shadow-md select-none pointer-events-none">
          <g fill="none" fillRule="evenodd" stroke={stroke} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22 10c10.5 1 16.5 8 16 29H15c0-9 10-6.5 8-21" fill={fill} />
            <path d="M24 18c.38 2.91-5.55 7.37-8 9-3 2-2.82 4.34-5 4-1.042-.94 1.41-3.04 0-3-1 0-.06 1.23-1 2-1 1-4.08 1.66-4-1 0-1.5 1.5-2.5 2-4 .5-1.5-1-2.5-1-4 0-1.5 1-2 2-3s1-2.5 2-3 2-2 3-2.5c2.5-1 4.5-1.5 6-1 2.5.5 3 2.5 4 4.5z" fill={fill} />
            <circle cx="9.5" cy="25.5" r="1" fill={stroke} />
            <path d="M15 15.5c.5.5 1.5 1 3 0" stroke={stroke} />
          </g>
        </svg>
      );
    case 'p': // Pawn
    default:
      return (
        <svg viewBox="0 0 45 45" className="w-3/4 h-3/4 drop-shadow-md select-none pointer-events-none">
          <path
            d="M22.5 9c-2.21 0-4 1.79-4 4 0 .89.29 1.71.78 2.38C17.33 16.5 16 18.59 16 21c0 2.03.94 3.84 2.41 5.03-3 1.06-7.41 5.55-7.41 13.47h23c0-7.92-4.41-12.41-7.41-13.47 1.47-1.19 2.41-3 2.41-5.03 0-2.41-1.33-4.5-3.28-5.62.49-.67.78-1.49.78-2.38 0-2.21-1.79-4-4-4z"
            fill={fill}
            stroke={stroke}
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      );
  }
}

export default function ChessGame({ initialSubject = 'Matematika', onBack }: ChessGameProps) {
  const [board, setBoard] = useState<BoardState>(createInitialBoard);
  const [currentTurn, setCurrentTurn] = useState<PieceColor>('w');
  const [selectedPos, setSelectedPos] = useState<Position | null>(null);
  const [validMoves, setValidMoves] = useState<Position[]>([]);
  const [selectedSubject, setSelectedSubject] = useState<string>(initialSubject);
  const [gameMode, setGameMode] = useState<'bot' | 'pvp'>('bot');
  const [soundEnabled, setSoundEnabled] = useState(true);

  // Stats & captured pieces
  const [capturedByWhite, setCapturedByWhite] = useState<Piece[]>([]);
  const [capturedByBlack, setCapturedByBlack] = useState<Piece[]>([]);
  const [score, setScore] = useState(0);
  const [correctAnswersCount, setCorrectAnswersCount] = useState(0);
  const [wrongAnswersCount, setWrongAnswersCount] = useState(0);
  const [winner, setWinner] = useState<PieceColor | null>(null);

  // Question Duel Modal state
  const [activeDuel, setActiveDuel] = useState<{
    pendingMove: Move;
    question: GameQuestion;
    answered: boolean;
    isCorrect: boolean | null;
    selectedOption: number | null;
  } | null>(null);

  const [duelTimeLeft, setDuelTimeLeft] = useState(30);

  // Timer countdown for duel
  useEffect(() => {
    if (!activeDuel || activeDuel.answered) return;
    const interval = setInterval(() => {
      setDuelTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          handleAnswerSelect(-1); // Timeout penalty
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [activeDuel]);

  // Compute standard legal moves for a given piece on board
  const getLegalMoves = useCallback((pos: Position, currentBoard: BoardState): Position[] => {
    const piece = currentBoard[pos.r][pos.c];
    if (!piece) return [];
    const moves: Position[] = [];
    const { r, c } = pos;
    const isW = piece.color === 'w';

    const addIfValid = (targetR: number, targetC: number): boolean => {
      if (targetR < 0 || targetR >= 8 || targetC < 0 || targetC >= 8) return false;
      const targetPiece = currentBoard[targetR][targetC];
      if (!targetPiece) {
        moves.push({ r: targetR, c: targetC });
        return true;
      }
      if (targetPiece.color !== piece.color) {
        moves.push({ r: targetR, c: targetC }); // Capture
      }
      return false; // Stop ray on piece
    };

    switch (piece.type) {
      case 'p': { // Pawn
        const dir = isW ? -1 : 1;
        const startRow = isW ? 6 : 1;
        // 1 step forward
        if (r + dir >= 0 && r + dir < 8 && !currentBoard[r + dir][c]) {
          moves.push({ r: r + dir, c });
          // 2 steps forward from initial rank
          if (r === startRow && !currentBoard[r + 2 * dir][c]) {
            moves.push({ r: r + 2 * dir, c });
          }
        }
        // Diagonal captures
        [-1, 1].forEach(dc => {
          const nr = r + dir;
          const nc = c + dc;
          if (nr >= 0 && nr < 8 && nc >= 0 && nc < 8) {
            const target = currentBoard[nr][nc];
            if (target && target.color !== piece.color) {
              moves.push({ r: nr, c: nc });
            }
          }
        });
        break;
      }
      case 'n': { // Knight (8 L-shaped moves)
        const jumps = [
          [-2, -1], [-2, 1], [-1, -2], [-1, 2],
          [1, -2], [1, 2], [2, -1], [2, 1]
        ];
        jumps.forEach(([dr, dc]) => addIfValid(r + dr, c + dc));
        break;
      }
      case 'b': { // Bishop (Diagonals)
        const dirs = [[-1, -1], [-1, 1], [1, -1], [1, 1]];
        dirs.forEach(([dr, dc]) => {
          let step = 1;
          while (addIfValid(r + dr * step, c + dc * step)) {
            step++;
          }
        });
        break;
      }
      case 'r': { // Rook (Orthogonals)
        const dirs = [[-1, 0], [1, 0], [0, -1], [0, 1]];
        dirs.forEach(([dr, dc]) => {
          let step = 1;
          while (addIfValid(r + dr * step, c + dc * step)) {
            step++;
          }
        });
        break;
      }
      case 'q': { // Queen (Orthogonals + Diagonals)
        const dirs = [
          [-1, -1], [-1, 1], [1, -1], [1, 1],
          [-1, 0], [1, 0], [0, -1], [0, 1]
        ];
        dirs.forEach(([dr, dc]) => {
          let step = 1;
          while (addIfValid(r + dr * step, c + dc * step)) {
            step++;
          }
        });
        break;
      }
      case 'k': { // King (1 square all directions)
        const dirs = [
          [-1, -1], [-1, 0], [-1, 1],
          [0, -1],           [0, 1],
          [1, -1],  [1, 0],  [1, 1]
        ];
        dirs.forEach(([dr, dc]) => addIfValid(r + dr, c + dc));
        break;
      }
    }

    return moves;
  }, []);

  // Execute a move on the board
  const applyMove = useCallback((move: Move) => {
    setBoard(prev => {
      const next = prev.map(row => [...row]);
      const piece = next[move.from.r][move.from.c];
      const target = next[move.to.r][move.to.c];

      next[move.from.r][move.from.c] = null;
      // Pawn promotion to Queen on end rank
      if (piece && piece.type === 'p' && (move.to.r === 0 || move.to.r === 7)) {
        next[move.to.r][move.to.c] = { type: 'q', color: piece.color };
      } else {
        next[move.to.r][move.to.c] = piece;
      }

      // Check King capture for win
      if (target && target.type === 'k') {
        setWinner(piece?.color || 'w');
        playSound('victory', soundEnabled);
      }

      return next;
    });

    if (move.captured) {
      if (move.captured.color === 'b') {
        setCapturedByWhite(prev => [...prev, move.captured!]);
      } else {
        setCapturedByBlack(prev => [...prev, move.captured!]);
      }
      playSound('capture', soundEnabled);
    } else {
      playSound('move', soundEnabled);
    }

    setSelectedPos(null);
    setValidMoves([]);
    setCurrentTurn(prev => (prev === 'w' ? 'b' : 'w'));
  }, [soundEnabled]);

  // Trigger duel when a capture happens
  const initiateDuel = (move: Move) => {
    const question = GameQuestionsService.getRandomQuestionForDuel(selectedSubject);
    setDuelTimeLeft(30);
    setActiveDuel({
      pendingMove: move,
      question,
      answered: false,
      isCorrect: null,
      selectedOption: null
    });
  };

  // Handle player answer in duel modal
  const handleAnswerSelect = (optionIdx: number) => {
    if (!activeDuel || activeDuel.answered) return;

    const isCorrect = optionIdx === activeDuel.question.correct_index;
    setActiveDuel(prev => prev ? {
      ...prev,
      answered: true,
      isCorrect,
      selectedOption: optionIdx
    } : null);

    if (isCorrect) {
      playSound('correct', soundEnabled);
      setScore(s => s + 10);
      setCorrectAnswersCount(c => c + 1);

      // Execute capture after a brief moment
      setTimeout(() => {
        applyMove(activeDuel.pendingMove);
        setActiveDuel(null);
      }, 1600);
    } else {
      playSound('wrong', soundEnabled);
      setWrongAnswersCount(w => w + 1);

      // Cancel capture move: piece defends itself!
      setTimeout(() => {
        setActiveDuel(null);
        setSelectedPos(null);
        setValidMoves([]);
        // Switch turn because move attempt failed
        setCurrentTurn(prev => (prev === 'w' ? 'b' : 'w'));
      }, 2500);
    }
  };

  // Bot Turn (AI)
  useEffect(() => {
    if (gameMode !== 'bot' || currentTurn !== 'b' || winner || activeDuel) return;

    const timer = setTimeout(() => {
      // Find all black pieces and their moves
      const blackMoves: Move[] = [];
      for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
          const piece = board[r][c];
          if (piece && piece.color === 'b') {
            const moves = getLegalMoves({ r, c }, board);
            moves.forEach(m => {
              const target = board[m.r][m.c];
              blackMoves.push({
                from: { r, c },
                to: m,
                captured: target
              });
            });
          }
        }
      }

      if (blackMoves.length === 0) {
        setWinner('w'); // White wins (stalemate/checkmate)
        return;
      }

      // Prioritize capture moves, especially King
      const captureMoves = blackMoves.filter(m => m.captured !== null && m.captured !== undefined);
      const chosenMove = captureMoves.length > 0
        ? captureMoves[Math.floor(Math.random() * captureMoves.length)]
        : blackMoves[Math.floor(Math.random() * blackMoves.length)];

      // When bot captures human piece, human must answer question to defend the piece!
      if (chosenMove.captured) {
        initiateDuel(chosenMove);
      } else {
        applyMove(chosenMove);
      }
    }, 800);

    return () => clearTimeout(timer);
  }, [currentTurn, gameMode, winner, activeDuel, board, getLegalMoves, applyMove]);

  // Click on Board Square
  const handleSquareClick = (r: number, c: number) => {
    if (winner || activeDuel) return;
    if (gameMode === 'bot' && currentTurn !== 'w') return;

    const clickedPiece = board[r][c];

    // If already selected a piece, check if clicked square is a valid move
    if (selectedPos) {
      const isValid = validMoves.some(m => m.r === r && m.c === c);
      if (isValid) {
        const move: Move = {
          from: selectedPos,
          to: { r, c },
          captured: clickedPiece
        };

        if (move.captured) {
          // Trigger Educational Quiz Duel on piece capture!
          initiateDuel(move);
        } else {
          // Regular peaceful move
          applyMove(move);
        }
        return;
      }
    }

    // Select piece if it belongs to current player
    if (clickedPiece && clickedPiece.color === currentTurn) {
      setSelectedPos({ r, c });
      const moves = getLegalMoves({ r, c }, board);
      setValidMoves(moves);
    } else {
      setSelectedPos(null);
      setValidMoves([]);
    }
  };

  const resetGame = () => {
    setBoard(createInitialBoard());
    setCurrentTurn('w');
    setSelectedPos(null);
    setValidMoves([]);
    setCapturedByWhite([]);
    setCapturedByBlack([]);
    setScore(0);
    setWinner(null);
    setActiveDuel(null);
  };

  return (
    <div className="w-full max-w-xl mx-auto flex flex-col items-center space-y-3">
      {/* Top Header Bar */}
      <div className="w-full flex items-center justify-between gap-2 bg-white/95 backdrop-blur-md border border-slate-200/90 rounded-2xl p-3 shadow-sm">
        <div className="flex items-center gap-2">
          <button
            onClick={onBack}
            className="w-9 h-9 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center transition-colors active:scale-95"
            title="Kembali ke Hub Games"
          >
            <ArrowLeft size={18} />
          </button>
          <div>
            <h2 className="text-sm sm:text-base font-black text-slate-900 leading-tight flex items-center gap-1.5">
              <span>Catur Pintar</span>
              <span className="text-[10px] font-extrabold px-1.5 py-0.5 rounded-md bg-indigo-50 text-indigo-700 border border-indigo-100">
                2D Edition
              </span>
            </h2>
            <p className="text-[10.5px] text-slate-500 font-medium">
              Mapel: <strong className="text-indigo-600">{selectedSubject}</strong>
            </p>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-1.5">
          {/* Mode Switcher */}
          <button
            onClick={() => setGameMode(m => m === 'bot' ? 'pvp' : 'bot')}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all"
            title="Ganti Mode Lawan"
          >
            {gameMode === 'bot' ? <Bot size={15} className="text-indigo-600" /> : <Users size={15} className="text-emerald-600" />}
            <span className="hidden sm:inline">{gameMode === 'bot' ? 'vs Guru AI' : '2 Pemain'}</span>
          </button>

          {/* Sound Toggle */}
          <button
            onClick={() => setSoundEnabled(s => !s)}
            className="w-9 h-9 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center transition-colors"
            title={soundEnabled ? 'Matikan Suara' : 'Aktifkan Suara'}
          >
            {soundEnabled ? <Volume2 size={16} /> : <VolumeX size={16} className="text-slate-400" />}
          </button>

          {/* Reset */}
          <button
            onClick={resetGame}
            className="w-9 h-9 rounded-xl bg-slate-100 hover:bg-rose-50 hover:text-rose-600 text-slate-700 flex items-center justify-center transition-colors"
            title="Mulai Ulang Game"
          >
            <RotateCcw size={16} />
          </button>
        </div>
      </div>

      {/* Subject Filter Pills */}
      <div className="w-full flex items-center gap-1.5 overflow-x-auto pb-2.5 mb-2 no-scrollbar">
        <span className="text-[10.5px] font-bold text-slate-400 uppercase tracking-wider shrink-0 mr-1">
          Pilih Soal:
        </span>
        {GAME_SUBJECTS.map(subj => (
          <button
            key={subj}
            onClick={() => setSelectedSubject(subj)}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all shrink-0 ${
              selectedSubject === subj
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/20'
                : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            {subj}
          </button>
        ))}
      </div>

      {/* Main Game Card */}
      <div className="w-full bg-white border border-slate-200/90 rounded-3xl p-3 sm:p-5 shadow-xl shadow-slate-200/50 flex flex-col items-center">
        {/* Score & Turn Banner */}
        <div className="w-full flex items-center justify-between mb-3 px-2">
          {/* Black Status */}
          <div className="flex items-center gap-2">
            <div className={`w-3 h-3 rounded-full ${currentTurn === 'b' ? 'bg-indigo-600 animate-pulse' : 'bg-slate-300'}`} />
            <span className="text-xs font-bold text-slate-700">
              {gameMode === 'bot' ? 'Guru AI (Hitam)' : 'Hitam'}
            </span>
            <div className="flex items-center gap-0.5 ml-1">
              {capturedByWhite.map((p, idx) => (
                <span key={idx} className="text-xs opacity-75">{p.type.toUpperCase()}</span>
              ))}
            </div>
          </div>

          {/* Points Badge */}
          <div className="flex items-center gap-2">
            <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-800 text-xs font-black">
              <Trophy size={14} className="text-amber-500" />
              <span>{score} Pts</span>
            </div>
          </div>

          {/* White Status */}
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-0.5 mr-1">
              {capturedByBlack.map((p, idx) => (
                <span key={idx} className="text-xs opacity-75">{p.type.toUpperCase()}</span>
              ))}
            </div>
            <span className="text-xs font-bold text-slate-700">Putih (Kamu)</span>
            <div className={`w-3 h-3 rounded-full ${currentTurn === 'w' ? 'bg-indigo-600 animate-pulse' : 'bg-slate-300'}`} />
          </div>
        </div>

        {/* 2D CHESS BOARD (8x8) */}
        <div className="relative w-full max-w-[360px] aspect-square rounded-2xl overflow-hidden border-2 border-slate-800 shadow-xl bg-slate-900 select-none">
          <div className="grid grid-cols-8 grid-rows-8 w-full h-full">
            {board.map((row, r) =>
              row.map((piece, c) => {
                const isLight = (r + c) % 2 === 0;
                const isSelected = selectedPos?.r === r && selectedPos?.c === c;
                const isValidMove = validMoves.some(m => m.r === r && m.c === c);
                const isCapture = isValidMove && piece !== null;

                return (
                  <button
                    key={`${r}-${c}`}
                    type="button"
                    onClick={() => handleSquareClick(r, c)}
                    className={`relative flex items-center justify-center transition-all ${
                      isLight ? 'bg-[#EEEED2]' : 'bg-[#769656]'
                    } ${isSelected ? '!bg-amber-300 ring-2 ring-amber-500 z-10' : ''}`}
                  >
                    {/* Square coordinate tags on edges */}
                    {c === 0 && (
                      <span className={`absolute top-0.5 left-1 text-[8px] font-bold ${isLight ? 'text-[#769656]' : 'text-[#EEEED2]'}`}>
                        {8 - r}
                      </span>
                    )}
                    {r === 7 && (
                      <span className={`absolute bottom-0.5 right-1 text-[8px] font-bold ${isLight ? 'text-[#769656]' : 'text-[#EEEED2]'}`}>
                        {String.fromCharCode(97 + c)}
                      </span>
                    )}

                    {/* Chess Piece Graphic */}
                    {piece && <ChessPieceGraphic piece={piece} />}

                    {/* Move Indicators */}
                    {isValidMove && !isCapture && (
                      <div className="w-3.5 h-3.5 rounded-full bg-emerald-500/80 shadow-sm pointer-events-none animate-pulse" />
                    )}
                    {isCapture && (
                      <div className="absolute inset-0 rounded-sm border-2 border-rose-500 bg-rose-500/30 pointer-events-none animate-pulse" />
                    )}
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Bottom Status / Instructions */}
        <div className="w-full max-w-[420px] mt-3 flex items-center justify-between text-[11px] text-slate-500 font-semibold px-1">
          <div className="flex items-center gap-1 text-indigo-600">
            <Zap size={14} />
            <span>Makan pion lawan untuk memicu tantangan kuis!</span>
          </div>
          <div>Benar: <strong className="text-emerald-600">{correctAnswersCount}</strong> | Salah: <strong className="text-rose-600">{wrongAnswersCount}</strong></div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════
          DUEL MODAL: QUESTION CHALLENGE UPON PIECE CAPTURE
      ═══════════════════════════════════════════════════════════ */}
      {activeDuel && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-white rounded-3xl border border-slate-200 shadow-2xl p-5 sm:p-6 text-center animate-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
                  <Sparkles size={20} />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900 leading-tight">
                    Tantangan Duel Tangkapan!
                  </h3>
                  <span className="text-[10.5px] font-bold text-indigo-600 uppercase tracking-wide">
                    Mata Pelajaran: {activeDuel.question.subject}
                  </span>
                </div>
              </div>

              {/* Timer */}
              <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full font-mono text-xs font-bold ${
                duelTimeLeft <= 10 ? 'bg-rose-50 text-rose-600 animate-pulse' : 'bg-slate-100 text-slate-700'
              }`}>
                <Clock size={14} />
                <span>{duelTimeLeft}s</span>
              </div>
            </div>

            {/* Question Text */}
            <div className="p-4 bg-slate-50 border border-slate-200/80 rounded-2xl mb-4 text-left">
              <p className="text-sm font-bold text-slate-800 leading-relaxed">
                {activeDuel.question.question}
              </p>
            </div>

            {/* Options */}
            <div className="space-y-2.5 mb-4">
              {activeDuel.question.options.map((option, idx) => {
                const isSelected = activeDuel.selectedOption === idx;
                const isCorrectOption = idx === activeDuel.question.correct_index;
                let btnStyle = 'bg-white hover:bg-slate-50 border-slate-200 text-slate-700';

                if (activeDuel.answered) {
                  if (isCorrectOption) {
                    btnStyle = 'bg-emerald-500 text-white border-emerald-600 shadow-md shadow-emerald-500/20';
                  } else if (isSelected) {
                    btnStyle = 'bg-rose-500 text-white border-rose-600 shadow-md shadow-rose-500/20';
                  } else {
                    btnStyle = 'bg-slate-50 border-slate-200 text-slate-400 opacity-60';
                  }
                }

                return (
                  <button
                    key={idx}
                    type="button"
                    disabled={activeDuel.answered}
                    onClick={() => handleAnswerSelect(idx)}
                    className={`w-full p-3.5 rounded-xl border text-left text-xs sm:text-sm font-bold flex items-center justify-between transition-all active:scale-[0.99] min-h-[46px] ${btnStyle}`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="w-6 h-6 rounded-lg bg-black/5 flex items-center justify-center text-xs font-black uppercase">
                        {String.fromCharCode(65 + idx)}
                      </span>
                      <span>{option}</span>
                    </div>
                    {activeDuel.answered && isCorrectOption && (
                      <CheckCircle2 size={18} className="text-white shrink-0" />
                    )}
                    {activeDuel.answered && isSelected && !isCorrectOption && (
                      <XCircle size={18} className="text-white shrink-0" />
                    )}
                  </button>
                );
              })}
            </div>

            {/* Feedback & Explanation */}
            {activeDuel.answered && (
              <div className={`p-3.5 rounded-2xl text-left border animate-in fade-in duration-300 ${
                activeDuel.isCorrect ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-rose-50 border-rose-200 text-rose-800'
              }`}>
                <div className="flex items-center gap-1.5 font-bold text-xs mb-1">
                  {activeDuel.isCorrect ? (
                    <>
                      <CheckCircle2 size={16} className="text-emerald-600" />
                      <span>Hebat! Jawaban Anda Tepat (+10 Poin)</span>
                    </>
                  ) : (
                    <>
                      <XCircle size={16} className="text-rose-600" />
                      <span>Kurang Tepat! Pion lawan berhasil lolos</span>
                    </>
                  )}
                </div>
                {activeDuel.question.explanation && (
                  <p className="text-[11px] leading-relaxed opacity-90 mt-1">
                    <strong>Pembahasan:</strong> {activeDuel.question.explanation}
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════
          GAME OVER / WINNER MODAL
      ═══════════════════════════════════════════════════════════ */}
      {winner && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="w-full max-w-sm bg-white rounded-3xl border border-slate-200 shadow-2xl p-6 text-center animate-in zoom-in-95 duration-200">
            <div className="w-16 h-16 rounded-2xl bg-amber-50 text-amber-500 mx-auto flex items-center justify-center mb-4 shadow-inner">
              <Trophy size={32} />
            </div>
            <h3 className="text-xl font-black text-slate-900 mb-1 font-outfit">
              {winner === 'w' ? 'Selamat! Kamu Menang!' : 'Guru AI Menang!'}
            </h3>
            <p className="text-xs text-slate-600 mb-5">
              Raja lawan berhasil ditaklukkan melalui keahlian strategi dan pengetahuan.
            </p>

            <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-2xl text-xs space-y-1 mb-5 text-left">
              <div className="flex justify-between">
                <span className="text-slate-500 font-medium">Skor Poin:</span>
                <strong className="text-indigo-600 font-bold">{score} Poin</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-medium">Kuis Berhasil Dijawab:</span>
                <strong className="text-emerald-600 font-bold">{correctAnswersCount}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-medium">Kuis Meleset:</span>
                <strong className="text-rose-600 font-bold">{wrongAnswersCount}</strong>
              </div>
            </div>

            <button
              onClick={resetGame}
              className="w-full py-3 rounded-xl bg-slate-900 text-white text-xs font-bold hover:bg-slate-800 active:scale-95 transition-all shadow-md"
            >
              Main Lagi
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
