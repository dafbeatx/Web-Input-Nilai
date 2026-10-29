"use client";

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  ArrowLeft, RotateCcw, Volume2, VolumeX, 
  Trophy, CheckCircle2, 
  XCircle, Clock, Zap, Bot, Users,
  ShieldAlert, Undo2, Swords, ShieldCheck
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

type BoardState = (Piece | null)[][]; // 8x8: row 0 = rank 8 (Black), row 7 = rank 1 (White)

interface Position {
  r: number;
  c: number;
}

interface Move {
  from: Position;
  to: Position;
  captured?: Piece | null;
  isCastling?: 'kingside' | 'queenside';
  isPromotion?: boolean;
}

interface HasMovedState {
  wKing: boolean;
  wRookA: boolean; // col 0
  wRookH: boolean; // col 7
  bKing: boolean;
  bRookA: boolean;
  bRookH: boolean;
}

interface HistoryStep {
  board: BoardState;
  currentTurn: PieceColor;
  lastMove: Move | null;
  hasMoved: HasMovedState;
  score: number;
  capturedByWhite: Piece[];
  capturedByBlack: Piece[];
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

// Synthesizer Audio Engine using Web Audio API
function playSound(type: 'move' | 'capture' | 'check' | 'correct' | 'wrong' | 'victory', soundEnabled: boolean) {
  if (!soundEnabled || typeof window === 'undefined') return;
  try {
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();

    if (type === 'move') {
      // Warm, resonant wooden board thud
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(260, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(110, ctx.currentTime + 0.09);
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.09);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.09);
    } else if (type === 'capture') {
      // Crisp, punchy snap
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = 'square';
      osc1.frequency.setValueAtTime(480, ctx.currentTime);
      osc1.frequency.exponentialRampToValueAtTime(160, ctx.currentTime + 0.12);
      gain1.gain.setValueAtTime(0.25, ctx.currentTime);
      gain1.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.12);
      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.start();
      osc1.stop(ctx.currentTime + 0.12);
    } else if (type === 'check') {
      // Two-tone high-pitched alert chime
      const now = ctx.currentTime;
      [660, 880].forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + i * 0.08);
        gain.gain.setValueAtTime(0.22, now + i * 0.08);
        gain.gain.exponentialRampToValueAtTime(0.01, now + i * 0.08 + 0.18);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + i * 0.08);
        osc.stop(now + i * 0.08 + 0.18);
      });
    } else if (type === 'correct') {
      // Uplifting major triad arpeggio
      const now = ctx.currentTime;
      [523.25, 659.25, 783.99, 1046.5].forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + i * 0.07);
        gain.gain.setValueAtTime(0.2, now + i * 0.07);
        gain.gain.exponentialRampToValueAtTime(0.01, now + i * 0.07 + 0.18);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + i * 0.07);
        osc.stop(now + i * 0.07 + 0.18);
      });
    } else if (type === 'wrong') {
      // Gentle low buzzer
      const now = ctx.currentTime;
      [240, 180].forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(freq, now + i * 0.1);
        gain.gain.setValueAtTime(0.18, now + i * 0.1);
        gain.gain.exponentialRampToValueAtTime(0.01, now + i * 0.1 + 0.16);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + i * 0.1);
        osc.stop(now + i * 0.1 + 0.16);
      });
    } else if (type === 'victory') {
      // Royal fanfare
      const now = ctx.currentTime;
      [523.25, 659.25, 783.99, 1046.5, 1318.51].forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + i * 0.09);
        gain.gain.setValueAtTime(0.25, now + i * 0.09);
        gain.gain.exponentialRampToValueAtTime(0.01, now + i * 0.09 + 0.35);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + i * 0.09);
        osc.stop(now + i * 0.09 + 0.35);
      });
    }
  } catch (e) {
    console.warn('[ChessAudio] Sound synthesis notice:', e);
  }
}

// ═══════════════════════════════════════════════════════════════════
// CHESS RULES ENGINE: Attack / Check / Legal Moves / Castling
// ═══════════════════════════════════════════════════════════════════

function isSquareUnderAttack(targetR: number, targetC: number, attackerColor: PieceColor, currentBoard: BoardState): boolean {
  // 1. Pawn attacks
  const pDir = attackerColor === 'w' ? -1 : 1;
  // A pawn on (targetR - pDir, targetC +/- 1) attacks targetR, targetC
  const pawnR = targetR - pDir;
  if (pawnR >= 0 && pawnR < 8) {
    [-1, 1].forEach(dc => {
      const pawnC = targetC + dc;
      if (pawnC >= 0 && pawnC < 8) {
        const p = currentBoard[pawnR][pawnC];
        if (p && p.type === 'p' && p.color === attackerColor) {
          return true;
        }
      }
    });
    // Check both columns directly
    for (const dc of [-1, 1]) {
      const pawnC = targetC + dc;
      if (pawnC >= 0 && pawnC < 8) {
        const p = currentBoard[pawnR][pawnC];
        if (p && p.type === 'p' && p.color === attackerColor) return true;
      }
    }
  }

  // 2. Knight attacks
  const knightJumps = [
    [-2, -1], [-2, 1], [-1, -2], [-1, 2],
    [1, -2], [1, 2], [2, -1], [2, 1]
  ];
  for (const [dr, dc] of knightJumps) {
    const nr = targetR + dr;
    const nc = targetC + dc;
    if (nr >= 0 && nr < 8 && nc >= 0 && nc < 8) {
      const p = currentBoard[nr][nc];
      if (p && p.type === 'n' && p.color === attackerColor) return true;
    }
  }

  // 3. King attacks (adjacent 1 square)
  for (let dr = -1; dr <= 1; dr++) {
    for (let dc = -1; dc <= 1; dc++) {
      if (dr === 0 && dc === 0) continue;
      const nr = targetR + dr;
      const nc = targetC + dc;
      if (nr >= 0 && nr < 8 && nc >= 0 && nc < 8) {
        const p = currentBoard[nr][nc];
        if (p && p.type === 'k' && p.color === attackerColor) return true;
      }
    }
  }

  // 4. Orthogonal attacks (Rook or Queen)
  const orthoDirs = [[-1, 0], [1, 0], [0, -1], [0, 1]];
  for (const [dr, dc] of orthoDirs) {
    let step = 1;
    while (true) {
      const nr = targetR + dr * step;
      const nc = targetC + dc * step;
      if (nr < 0 || nr >= 8 || nc < 0 || nc >= 8) break;
      const p = currentBoard[nr][nc];
      if (p) {
        if (p.color === attackerColor && (p.type === 'r' || p.type === 'q')) {
          return true;
        }
        break; // Ray blocked
      }
      step++;
    }
  }

  // 5. Diagonal attacks (Bishop or Queen)
  const diagDirs = [[-1, -1], [-1, 1], [1, -1], [1, 1]];
  for (const [dr, dc] of diagDirs) {
    let step = 1;
    while (true) {
      const nr = targetR + dr * step;
      const nc = targetC + dc * step;
      if (nr < 0 || nr >= 8 || nc < 0 || nc >= 8) break;
      const p = currentBoard[nr][nc];
      if (p) {
        if (p.color === attackerColor && (p.type === 'b' || p.type === 'q')) {
          return true;
        }
        break; // Ray blocked
      }
      step++;
    }
  }

  return false;
}

function isKingInCheck(color: PieceColor, currentBoard: BoardState): boolean {
  let kingPos: Position | null = null;
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const p = currentBoard[r][c];
      if (p && p.type === 'k' && p.color === color) {
        kingPos = { r, c };
        break;
      }
    }
    if (kingPos) break;
  }
  if (!kingPos) return false;
  return isSquareUnderAttack(kingPos.r, kingPos.c, color === 'w' ? 'b' : 'w', currentBoard);
}

// Simulates a move and tests if moving side's king ends up in check
function leavesKingInCheck(from: Position, to: Position, currentBoard: BoardState, pieceColor: PieceColor): boolean {
  const simulated = currentBoard.map(row => [...row]);
  const movingPiece = simulated[from.r][from.c];
  simulated[from.r][from.c] = null;
  simulated[to.r][to.c] = movingPiece;
  return isKingInCheck(pieceColor, simulated);
}

// ═══════════════════════════════════════════════════════════════════
// BEAUTIFUL STAUNTON CHESS PIECES (Vector SVG with high contrast)
// ═══════════════════════════════════════════════════════════════════

function ChessPieceGraphic({ piece }: { piece: Piece }) {
  const isWhite = piece.color === 'w';
  const fill = isWhite ? '#FFFFFF' : '#1E293B';
  const stroke = isWhite ? '#18181B' : '#F8FAFC';
  const innerLine = isWhite ? '#475569' : '#E2E8F0';
  const accent = isWhite ? '#E2E8F0' : '#334155';

  switch (piece.type) {
    case 'k': // King
      return (
        <svg viewBox="0 0 45 45" className="w-[85%] h-[85%] drop-shadow-md select-none pointer-events-none transition-transform duration-200">
          <g fill="none" fillRule="evenodd" stroke={stroke} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22.5 11.63V6M20 8h5" stroke={stroke} strokeWidth="1.5" />
            <path d="M22.5 25s4.5-7.5 3-10.5c0 0-1-2.5-3-2.5s-3 2.5-3 2.5c-1.5 3 3 10.5 3 10.5" fill={fill} />
            <path d="M11.5 37c5.5 3.5 15.5 3.5 21 0v-7s9-4.5 6-10.5c-4-6.5-13.5-3.5-16 4V23.5M11.5 30c-5.5-3.5-15.5-3.5-21 0" fill={fill} />
            <path d="M11.5 30c5.5-2 15.5-2 21 0m-21 3.5c5.5-2 15.5-2 21 0m-21 3.5c5.5-2 15.5-2 21 0" stroke={innerLine} />
            <circle cx="22.5" cy="18" r="1.5" fill={accent} />
          </g>
        </svg>
      );
    case 'q': // Queen
      return (
        <svg viewBox="0 0 45 45" className="w-[85%] h-[85%] drop-shadow-md select-none pointer-events-none transition-transform duration-200">
          <g fill={fill} fillRule="evenodd" stroke={stroke} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 26c8.5-1.5 21-1.5 27 0l2-12-7 11-4-15-4.5 15-7-11 2.5 12z" />
            <path d="M9 26c0 2 1.5 2 2.5 4 1 1.5 1 1 .5 3.5-1.5 1-1.5 2.5-1.5 2.5-1.5 1.5.5 2.5.5 2.5 6.5 1 16.5 1 23 0 0 0 2-1 .5-2.5 0 0 0-1.5-1.5-2.5-.5-2.5-.5-2 .5-3.5 1-2 2.5-2 2.5-4-8.5-1.5-18.5-1.5-27 0z" />
            <circle cx="6" cy="12" r="2" fill={accent} stroke={stroke} strokeWidth="1" />
            <circle cx="14" cy="9" r="2" fill={accent} stroke={stroke} strokeWidth="1" />
            <circle cx="22.5" cy="8" r="2" fill={accent} stroke={stroke} strokeWidth="1" />
            <circle cx="31" cy="9" r="2" fill={accent} stroke={stroke} strokeWidth="1" />
            <circle cx="39" cy="12" r="2" fill={accent} stroke={stroke} strokeWidth="1" />
            <path d="M12 36c4-1 17-1 21 0" stroke={innerLine} strokeWidth="1.2" fill="none" />
          </g>
        </svg>
      );
    case 'r': // Rook
      return (
        <svg viewBox="0 0 45 45" className="w-[82%] h-[82%] drop-shadow-md select-none pointer-events-none transition-transform duration-200">
          <g fill={fill} fillRule="evenodd" stroke={stroke} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 39h27v-3H9v3zm3-3v-4.5h21V36H12zm2-4.5l1.5-13.5h14l1.5 13.5H14zM11 14h23v4H11v-4z" />
            <path d="M12 14v-4h3v2h4v-2h6v2h4v-2h4v4H12z" />
            <path d="M14 29.5h17M14 16.5h17" stroke={innerLine} strokeWidth="1" fill="none" />
          </g>
        </svg>
      );
    case 'b': // Bishop
      return (
        <svg viewBox="0 0 45 45" className="w-[84%] h-[84%] drop-shadow-md select-none pointer-events-none transition-transform duration-200">
          <g fill="none" fillRule="evenodd" stroke={stroke} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 36c3.39-.97 10.11.43 13.5-2 3.39 2.43 10.11 1.03 13.5 2 0 0 1.65.54 3 2-.68.97-1.65.99-3 .5-3.39-.97-10.11.46-13.5-1-3.39 1.46-10.11.03-13.5 1-1.35.49-2.32.47-3-.5 1.35-1.46 3-2 3-2z" fill={fill} />
            <path d="M15 32c2.5 2.5 12.5 2.5 15 0 .5-1.5 0-2 0-2 0-2.5-2.5-4-2.5-4 5.5-1.5 6-11.5-5-15.5-11 4-10.5 14-5 15.5 0 0-2.5 1.5-2.5 4 0 0-.5.5 0 2z" fill={fill} />
            <circle cx="22.5" cy="8.5" r="1.5" fill={accent} stroke={stroke} strokeWidth="1" />
            <path d="M17.5 26h10M22.5 21v10" stroke={innerLine} strokeWidth="1.5" />
          </g>
        </svg>
      );
    case 'n': // Knight
      return (
        <svg viewBox="0 0 45 45" className="w-[85%] h-[85%] drop-shadow-md select-none pointer-events-none transition-transform duration-200">
          <g fill="none" fillRule="evenodd" stroke={stroke} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22 10c10.5 1 16.5 8 16 29H15c0-9 10-6.5 8-21" fill={fill} />
            <path d="M24 18c.38 2.91-5.55 7.37-8 9-3 2-2.82 4.34-5 4-1.042-.94 1.41-3.04 0-3-1 0-.06 1.23-1 2-1 1-4.08 1.66-4-1 0-1.5 1.5-2.5 2-4 .5-1.5-1-2.5-1-4 0-1.5 1-2 2-3s1-2.5 2-3 2-2 3-2.5c2.5-1 4.5-1.5 6-1 2.5.5 3 2.5 4 4.5z" fill={fill} />
            <circle cx="9.5" cy="25.5" r="1.2" fill={stroke} />
            <path d="M15 15.5c.5.5 1.5 1 3 0" stroke={innerLine} strokeWidth="1.2" />
          </g>
        </svg>
      );
    case 'p': // Pawn
    default:
      return (
        <svg viewBox="0 0 45 45" className="w-[78%] h-[78%] drop-shadow-md select-none pointer-events-none transition-transform duration-200">
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

// ═══════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════

export default function ChessGame({ initialSubject = 'Matematika', onBack }: ChessGameProps) {
  const [board, setBoard] = useState<BoardState>(createInitialBoard);
  const [currentTurn, setCurrentTurn] = useState<PieceColor>('w');
  const [selectedPos, setSelectedPos] = useState<Position | null>(null);
  const [validMoves, setValidMoves] = useState<Move[]>([]);
  const [selectedSubject, setSelectedSubject] = useState<string>(initialSubject);
  const [gameMode, setGameMode] = useState<'bot' | 'pvp'>('bot');
  const [soundEnabled, setSoundEnabled] = useState(true);

  // Castling tracker
  const [hasMoved, setHasMoved] = useState<HasMovedState>({
    wKing: false,
    wRookA: false,
    wRookH: false,
    bKing: false,
    bRookA: false,
    bRookH: false,
  });

  // Last Move highlight (from, to)
  const [lastMove, setLastMove] = useState<Move | null>(null);

  // Move history for Undo
  const [history, setHistory] = useState<HistoryStep[]>([]);

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
    duelRole: 'attack' | 'defend'; // 'attack' = human takes enemy; 'defend' = enemy attacks human
    attackerColor: PieceColor;
    answered: boolean;
    isCorrect: boolean | null;
    selectedOption: number | null;
  } | null>(null);

  const [duelTimeLeft, setDuelTimeLeft] = useState(30);

  // Check state
  const isWhiteChecked = isKingInCheck('w', board);
  const isBlackChecked = isKingInCheck('b', board);

  // Play check alert sound when check status transitions to true
  const prevCheckedRef = useRef(false);
  useEffect(() => {
    const checked = isWhiteChecked || isBlackChecked;
    if (checked && !prevCheckedRef.current) {
      playSound('check', soundEnabled);
    }
    prevCheckedRef.current = checked;
  }, [isWhiteChecked, isBlackChecked, soundEnabled]);

  // Compute standard legal moves for a given piece on board (strictly preventing self-check)
  const getLegalMoves = useCallback((pos: Position, currentBoard: BoardState, currentHasMoved: HasMovedState): Move[] => {
    const piece = currentBoard[pos.r][pos.c];
    if (!piece) return [];
    const moves: Move[] = [];
    const { r, c } = pos;
    const isW = piece.color === 'w';

    const addIfLegal = (targetR: number, targetC: number): boolean => {
      if (targetR < 0 || targetR >= 8 || targetC < 0 || targetC >= 8) return false;
      const targetPiece = currentBoard[targetR][targetC];
      if (!targetPiece) {
        if (!leavesKingInCheck(pos, { r: targetR, c: targetC }, currentBoard, piece.color)) {
          moves.push({ from: pos, to: { r: targetR, c: targetC } });
        }
        return true; // continue ray if empty
      }
      if (targetPiece.color !== piece.color) {
        if (!leavesKingInCheck(pos, { r: targetR, c: targetC }, currentBoard, piece.color)) {
          moves.push({ from: pos, to: { r: targetR, c: targetC }, captured: targetPiece });
        }
      }
      return false; // ray blocked
    };

    switch (piece.type) {
      case 'p': { // Pawn
        const dir = isW ? -1 : 1;
        const startRow = isW ? 6 : 1;
        // 1 step forward
        if (r + dir >= 0 && r + dir < 8 && !currentBoard[r + dir][c]) {
          if (!leavesKingInCheck(pos, { r: r + dir, c }, currentBoard, piece.color)) {
            moves.push({ from: pos, to: { r: r + dir, c } });
          }
          // 2 steps forward from initial rank
          if (r === startRow && !currentBoard[r + 2 * dir][c]) {
            if (!leavesKingInCheck(pos, { r: r + 2 * dir, c }, currentBoard, piece.color)) {
              moves.push({ from: pos, to: { r: r + 2 * dir, c } });
            }
          }
        }
        // Diagonal captures
        [-1, 1].forEach(dc => {
          const nr = r + dir;
          const nc = c + dc;
          if (nr >= 0 && nr < 8 && nc >= 0 && nc < 8) {
            const target = currentBoard[nr][nc];
            if (target && target.color !== piece.color) {
              if (!leavesKingInCheck(pos, { r: nr, c: nc }, currentBoard, piece.color)) {
                moves.push({ from: pos, to: { r: nr, c: nc }, captured: target });
              }
            }
          }
        });
        break;
      }
      case 'n': { // Knight (8 L-shaped jumps)
        const jumps = [
          [-2, -1], [-2, 1], [-1, -2], [-1, 2],
          [1, -2], [1, 2], [2, -1], [2, 1]
        ];
        jumps.forEach(([dr, dc]) => addIfLegal(r + dr, c + dc));
        break;
      }
      case 'b': { // Bishop (Diagonals)
        const dirs = [[-1, -1], [-1, 1], [1, -1], [1, 1]];
        dirs.forEach(([dr, dc]) => {
          let step = 1;
          while (addIfLegal(r + dr * step, c + dc * step)) {
            step++;
          }
        });
        break;
      }
      case 'r': { // Rook (Orthogonals)
        const dirs = [[-1, 0], [1, 0], [0, -1], [0, 1]];
        dirs.forEach(([dr, dc]) => {
          let step = 1;
          while (addIfLegal(r + dr * step, c + dc * step)) {
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
          while (addIfLegal(r + dr * step, c + dc * step)) {
            step++;
          }
        });
        break;
      }
      case 'k': { // King (1 square all directions + Castling)
        const dirs = [
          [-1, -1], [-1, 0], [-1, 1],
          [0, -1],           [0, 1],
          [1, -1],  [1, 0],  [1, 1]
        ];
        dirs.forEach(([dr, dc]) => addIfLegal(r + dr, c + dc));

        // Castling logic (Rokade)
        const enemyColor: PieceColor = isW ? 'b' : 'w';
        const kingMoved = isW ? currentHasMoved.wKing : currentHasMoved.bKing;
        const rookAMoved = isW ? currentHasMoved.wRookA : currentHasMoved.bRookA;
        const rookHMoved = isW ? currentHasMoved.wRookH : currentHasMoved.bRookH;

        if (!kingMoved && !isKingInCheck(piece.color, currentBoard)) {
          // Kingside castling (O-O) -> King to col 6
          if (!rookHMoved && !currentBoard[r][5] && !currentBoard[r][6]) {
            if (!isSquareUnderAttack(r, 5, enemyColor, currentBoard) && !isSquareUnderAttack(r, 6, enemyColor, currentBoard)) {
              moves.push({
                from: pos,
                to: { r, c: 6 },
                isCastling: 'kingside'
              });
            }
          }
          // Queenside castling (O-O-O) -> King to col 2
          if (!rookAMoved && !currentBoard[r][1] && !currentBoard[r][2] && !currentBoard[r][3]) {
            if (!isSquareUnderAttack(r, 3, enemyColor, currentBoard) && !isSquareUnderAttack(r, 2, enemyColor, currentBoard)) {
              moves.push({
                from: pos,
                to: { r, c: 2 },
                isCastling: 'queenside'
              });
            }
          }
        }
        break;
      }
    }

    return moves;
  }, []);

  // Execute a move on the board
  const applyMove = useCallback((move: Move) => {
    // Save state to history for undo
    setHistory(prev => [
      ...prev,
      {
        board: board.map(row => [...row]),
        currentTurn,
        lastMove,
        hasMoved: { ...hasMoved },
        score,
        capturedByWhite: [...capturedByWhite],
        capturedByBlack: [...capturedByBlack],
      }
    ]);

    setBoard(prev => {
      const next = prev.map(row => [...row]);
      const piece = next[move.from.r][move.from.c];
      const target = next[move.to.r][move.to.c];

      next[move.from.r][move.from.c] = null;

      // Handle Castling: move rook alongside king
      if (move.isCastling === 'kingside') {
        const rookRow = move.to.r;
        const rook = next[rookRow][7];
        next[rookRow][7] = null;
        next[rookRow][5] = rook;
      } else if (move.isCastling === 'queenside') {
        const rookRow = move.to.r;
        const rook = next[rookRow][0];
        next[rookRow][0] = null;
        next[rookRow][3] = rook;
      }

      // Pawn promotion to Queen on end rank
      if (piece && piece.type === 'p' && (move.to.r === 0 || move.to.r === 7)) {
        next[move.to.r][move.to.c] = { type: 'q', color: piece.color };
      } else {
        next[move.to.r][move.to.c] = piece;
      }

      // Check King capture for win (instant game over)
      if (target && target.type === 'k') {
        setWinner(piece?.color || 'w');
        playSound('victory', soundEnabled);
      }

      return next;
    });

    // Update hasMoved state
    setHasMoved(prev => {
      const updated = { ...prev };
      if (move.from.r === 7 && move.from.c === 4) updated.wKing = true;
      if (move.from.r === 7 && move.from.c === 0) updated.wRookA = true;
      if (move.from.r === 7 && move.from.c === 7) updated.wRookH = true;
      if (move.from.r === 0 && move.from.c === 4) updated.bKing = true;
      if (move.from.r === 0 && move.from.c === 0) updated.bRookA = true;
      if (move.from.r === 0 && move.from.c === 7) updated.bRookH = true;
      return updated;
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

    setLastMove(move);
    setSelectedPos(null);
    setValidMoves([]);
    setCurrentTurn(prev => (prev === 'w' ? 'b' : 'w'));
  }, [board, currentTurn, hasMoved, lastMove, score, capturedByWhite, capturedByBlack, soundEnabled]);

  // Initiate duel when a capture happens
  const initiateDuel = useCallback((move: Move, duelRole: 'attack' | 'defend', attackerColor: PieceColor) => {
    const question = GameQuestionsService.getRandomQuestionForDuel(selectedSubject);
    setDuelTimeLeft(30);
    setActiveDuel({
      pendingMove: move,
      question,
      duelRole,
      attackerColor,
      answered: false,
      isCorrect: null,
      selectedOption: null
    });
  }, [selectedSubject]);

  // Handle player answer in duel modal
  const handleAnswerSelect = useCallback((optionIdx: number) => {
    if (!activeDuel || activeDuel.answered) return;

    const isCorrect = optionIdx === activeDuel.question.correct_index;
    setActiveDuel(prev => prev ? {
      ...prev,
      answered: true,
      isCorrect,
      selectedOption: optionIdx
    } : null);

    if (activeDuel.duelRole === 'attack') {
      // ── HUMAN ATTACKING BOT (or Active Player Attacking in PvP) ──
      if (isCorrect) {
        playSound('correct', soundEnabled);
        setScore(s => s + 10);
        setCorrectAnswersCount(c => c + 1);

        // Execute successful capture!
        setTimeout(() => {
          applyMove(activeDuel.pendingMove);
          setActiveDuel(null);
        }, 1500);
      } else {
        playSound('wrong', soundEnabled);
        setWrongAnswersCount(w => w + 1);

        // Enemy defends: capture cancelled, piece retreats, turn passes!
        setTimeout(() => {
          setActiveDuel(null);
          setSelectedPos(null);
          setValidMoves([]);
          setCurrentTurn(prev => (prev === 'w' ? 'b' : 'w'));
        }, 2200);
      }
    } else {
      // ── BOT ATTACKING HUMAN: HUMAN MUST DEFEND! ──
      if (isCorrect) {
        // Human defended successfully! Bot's attack is parried!
        playSound('correct', soundEnabled);
        setScore(s => s + 15); // Bonus for clutch defense
        setCorrectAnswersCount(c => c + 1);

        setTimeout(() => {
          setActiveDuel(null);
          setSelectedPos(null);
          setValidMoves([]);
          // Bot failed capture, turn passes to human!
          setCurrentTurn('w');
        }, 1800);
      } else {
        // Human failed defense, Bot's capture succeeds!
        playSound('wrong', soundEnabled);
        setWrongAnswersCount(w => w + 1);

        setTimeout(() => {
          applyMove(activeDuel.pendingMove);
          setActiveDuel(null);
        }, 1800);
      }
    }
  }, [activeDuel, soundEnabled, applyMove]);

  // Timer countdown for duel
  useEffect(() => {
    if (!activeDuel || activeDuel.answered) return;
    const interval = setInterval(() => {
      setDuelTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          handleAnswerSelect(-1); // Timeout penalty (wrong answer)
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [activeDuel, handleAnswerSelect]);

  // Smart AI Bot (Guru AI)
  useEffect(() => {
    if (gameMode !== 'bot' || currentTurn !== 'b' || winner || activeDuel) return;

    const timer = setTimeout(() => {
      // Gather all legal moves for Black pieces
      const blackMoves: Move[] = [];
      for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
          const piece = board[r][c];
          if (piece && piece.color === 'b') {
            const moves = getLegalMoves({ r, c }, board, hasMoved);
            blackMoves.push(...moves);
          }
        }
      }

      if (blackMoves.length === 0) {
        // Stalemate or Checkmate
        setWinner('w');
        playSound('victory', soundEnabled);
        return;
      }

      // Material Values
      const pieceVal: Record<PieceType, number> = {
        p: 100,
        n: 320,
        b: 330,
        r: 500,
        q: 900,
        k: 20000
      };

      // Heuristic Evaluation for Bot Moves
      const scoredMoves = blackMoves.map(m => {
        let moveScore = 0;
        const movingPiece = board[m.from.r][m.from.c];
        const target = board[m.to.r][m.to.c];

        // 1. Capture evaluation (MVV-LVA: Most Valuable Victim - Least Valuable Attacker)
        if (target) {
          moveScore += pieceVal[target.type] * 10 - (movingPiece ? pieceVal[movingPiece.type] : 0);
          if (target.type === 'k') moveScore += 50000; // Priority: take king
        }

        // 2. Check bonus
        const simulated = board.map(row => [...row]);
        simulated[m.from.r][m.from.c] = null;
        simulated[m.to.r][m.to.c] = movingPiece;
        if (isKingInCheck('w', simulated)) {
          moveScore += 60;
        }

        // 3. Center control (rows 3,4 and cols 3,4)
        if ((m.to.r === 3 || m.to.r === 4) && (m.to.c === 3 || m.to.c === 4)) {
          moveScore += 25;
        }

        // 4. Pawn advancement
        if (movingPiece && movingPiece.type === 'p') {
          moveScore += m.to.r * 8; // Moving down towards White side
        }

        // 5. Penalty if moving to an attacked square
        if (isSquareUnderAttack(m.to.r, m.to.c, 'w', simulated)) {
          moveScore -= movingPiece ? pieceVal[movingPiece.type] * 0.7 : 50;
        }

        return { move: m, score: moveScore };
      });

      // Sort descending by score
      scoredMoves.sort((a, b) => b.score - a.score);

      // Pick top move or one of top 2 with small variance
      const topCount = Math.min(2, scoredMoves.length);
      const chosen = scoredMoves[Math.floor(Math.random() * topCount)].move;

      if (chosen.captured) {
        // Bot attacks student piece: student gets defense duel!
        initiateDuel(chosen, 'defend', 'b');
      } else {
        applyMove(chosen);
      }
    }, 700);

    return () => clearTimeout(timer);
  }, [currentTurn, gameMode, winner, activeDuel, board, hasMoved, getLegalMoves, applyMove, initiateDuel, soundEnabled]);

  // Click on Board Square
  const handleSquareClick = (r: number, c: number) => {
    if (winner || activeDuel) return;
    if (gameMode === 'bot' && currentTurn !== 'w') return;

    const clickedPiece = board[r][c];

    // If already selected a piece, check if clicked square is a valid move
    if (selectedPos) {
      const matchedMove = validMoves.find(m => m.to.r === r && m.to.c === c);
      if (matchedMove) {
        if (matchedMove.captured) {
          // Trigger Attack Duel!
          initiateDuel(matchedMove, 'attack', currentTurn);
        } else {
          // Regular move (or castling)
          applyMove(matchedMove);
        }
        return;
      }
    }

    // Select piece if it belongs to current player
    if (clickedPiece && clickedPiece.color === currentTurn) {
      setSelectedPos({ r, c });
      const moves = getLegalMoves({ r, c }, board, hasMoved);
      setValidMoves(moves);
    } else {
      setSelectedPos(null);
      setValidMoves([]);
    }
  };

  // Undo Move (Batal Langkah)
  const handleUndo = () => {
    if (history.length === 0 || activeDuel || winner) return;

    // In Bot mode, undo 2 steps (bot move + player move) to return to player's turn
    const stepsToPop = (gameMode === 'bot' && history.length >= 2) ? 2 : 1;
    const targetIdx = history.length - stepsToPop;
    const restored = history[targetIdx];

    setBoard(restored.board);
    setCurrentTurn(restored.currentTurn);
    setLastMove(restored.lastMove);
    setHasMoved(restored.hasMoved);
    setScore(restored.score);
    setCapturedByWhite(restored.capturedByWhite);
    setCapturedByBlack(restored.capturedByBlack);

    setSelectedPos(null);
    setValidMoves([]);
    setHistory(prev => prev.slice(0, targetIdx));
  };

  const resetGame = () => {
    setBoard(createInitialBoard());
    setCurrentTurn('w');
    setSelectedPos(null);
    setValidMoves([]);
    setLastMove(null);
    setHistory([]);
    setCapturedByWhite([]);
    setCapturedByBlack([]);
    setScore(0);
    setWinner(null);
    setActiveDuel(null);
    setHasMoved({
      wKing: false,
      wRookA: false,
      wRookH: false,
      bKing: false,
      bRookA: false,
      bRookH: false,
    });
  };

  // Calculate material balance
  const pieceValues: Record<PieceType, number> = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };
  const whiteMaterial = capturedByWhite.reduce((sum, p) => sum + pieceValues[p.type], 0);
  const blackMaterial = capturedByBlack.reduce((sum, p) => sum + pieceValues[p.type], 0);
  const materialAdvantage = whiteMaterial - blackMaterial;

  return (
    <div className="w-full max-w-2xl mx-auto flex flex-col items-center space-y-3 pb-8">
      {/* Top Header Bar */}
      <div className="w-full flex items-center justify-between gap-2 bg-white/95 backdrop-blur-md border border-slate-200/90 rounded-2xl p-2.5 sm:p-3 shadow-sm">
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
              <span className="text-[10px] font-extrabold px-1.5 py-0.5 rounded-md bg-indigo-50 text-indigo-700 border border-indigo-100 uppercase tracking-wide">
                Master 2D
              </span>
            </h2>
            <p className="text-[10px] sm:text-[11px] text-slate-500 font-medium">
              Mapel Kuis: <strong className="text-indigo-600">{selectedSubject}</strong>
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-1.5">
          {/* Mode Switcher */}
          <button
            onClick={() => {
              setGameMode(m => m === 'bot' ? 'pvp' : 'bot');
              resetGame();
            }}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all active:scale-95"
            title="Ganti Mode Lawan"
          >
            {gameMode === 'bot' ? <Bot size={15} className="text-indigo-600" /> : <Users size={15} className="text-emerald-600" />}
            <span className="hidden sm:inline">{gameMode === 'bot' ? 'vs Guru AI' : '2 Pemain'}</span>
          </button>

          {/* Undo Move */}
          <button
            onClick={handleUndo}
            disabled={history.length === 0 || activeDuel !== null || winner !== null}
            className={`w-9 h-9 rounded-xl flex items-center justify-center transition-colors ${
              history.length === 0 || activeDuel !== null || winner !== null
                ? 'bg-slate-50 text-slate-300 cursor-not-allowed'
                : 'bg-slate-100 hover:bg-amber-50 hover:text-amber-600 text-slate-700 active:scale-95'
            }`}
            title="Batal Langkah (Undo)"
          >
            <Undo2 size={16} />
          </button>

          {/* Sound Toggle */}
          <button
            onClick={() => setSoundEnabled(s => !s)}
            className="w-9 h-9 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center transition-colors active:scale-95"
            title={soundEnabled ? 'Matikan Suara' : 'Aktifkan Suara'}
          >
            {soundEnabled ? <Volume2 size={16} /> : <VolumeX size={16} className="text-slate-400" />}
          </button>

          {/* Reset */}
          <button
            onClick={resetGame}
            className="w-9 h-9 rounded-xl bg-slate-100 hover:bg-rose-50 hover:text-rose-600 text-slate-700 flex items-center justify-center transition-colors active:scale-95"
            title="Mulai Ulang Game"
          >
            <RotateCcw size={16} />
          </button>
        </div>
      </div>

      {/* Subject Filter Pills */}
      <div className="w-full flex items-center gap-1.5 overflow-x-auto pb-1.5 no-scrollbar">
        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider shrink-0 mr-1">
          Soal:
        </span>
        {GAME_SUBJECTS.map(subj => (
          <button
            key={subj}
            onClick={() => setSelectedSubject(subj)}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all shrink-0 ${
              selectedSubject === subj
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/20 scale-[1.02]'
                : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            {subj}
          </button>
        ))}
      </div>

      {/* Main Chess Card Container */}
      <div className="w-full bg-white border border-slate-200/90 rounded-3xl p-3 sm:p-5 shadow-xl shadow-slate-200/40 flex flex-col items-center">
        {/* Top Player Status: Black (AI / Player 2) */}
        <div className="w-full flex items-center justify-between mb-2.5 px-1.5 sm:px-2">
          <div className="flex items-center gap-2">
            <div className={`w-3.5 h-3.5 rounded-full flex items-center justify-center ${
              currentTurn === 'b' ? 'bg-indigo-600 ring-4 ring-indigo-100 animate-pulse' : 'bg-slate-300'
            }`} />
            <div className="flex items-center gap-1.5">
              <span className="text-xs sm:text-sm font-bold text-slate-800">
                {gameMode === 'bot' ? 'Guru AI' : 'Pemain 2 (Hitam)'}
              </span>
              {currentTurn === 'b' && (
                <span className="text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-700 animate-pulse">
                  Giliran Jalan
                </span>
              )}
            </div>
          </div>

          {/* Captured Pieces by White */}
          <div className="flex items-center gap-1 bg-slate-50 px-2 py-1 rounded-xl border border-slate-100 min-h-[26px]">
            {capturedByWhite.length === 0 ? (
              <span className="text-[10px] text-slate-400 font-medium">Bidak Utuh</span>
            ) : (
              <div className="flex items-center gap-0.5">
                {capturedByWhite.map((p, idx) => (
                  <span key={idx} className="text-[10px] font-black uppercase text-slate-700 bg-white px-1 rounded shadow-2xs">
                    {p.type}
                  </span>
                ))}
                {materialAdvantage > 0 && (
                  <span className="text-[10px] font-extrabold text-emerald-600 ml-1">+{materialAdvantage}</span>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Check Alert Banner */}
        {(isWhiteChecked || isBlackChecked) && (
          <div className="w-full mb-2.5 py-1.5 px-3 bg-rose-50 border border-rose-200 rounded-xl flex items-center justify-center gap-2 text-rose-700 text-xs font-bold animate-pulse">
            <ShieldAlert size={16} className="text-rose-600" />
            <span>SKAK! Raja {isWhiteChecked ? 'Putih' : 'Hitam'} Dalam Bahaya Terancam!</span>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════
            2D CHESS BOARD (8x8)
        ═══════════════════════════════════════════════════════════ */}
        <div className="relative w-full max-w-[340px] xs:max-w-[380px] sm:max-w-[430px] md:max-w-[460px] aspect-square rounded-2xl overflow-hidden border-4 border-slate-800 shadow-2xl bg-slate-900 select-none">
          <div className="grid grid-cols-8 grid-rows-8 w-full h-full">
            {board.map((row, r) =>
              row.map((piece, c) => {
                const isLight = (r + c) % 2 === 0;
                const isSelected = selectedPos?.r === r && selectedPos?.c === c;
                const validMove = validMoves.find(m => m.to.r === r && m.to.c === c);
                const isValidMove = !!validMove;
                const isCapture = isValidMove && (piece !== null || !!validMove?.captured);
                const isLastMoveSquare = (lastMove?.from.r === r && lastMove?.from.c === c) || (lastMove?.to.r === r && lastMove?.to.c === c);
                const isKingInDanger = piece?.type === 'k' && ((piece.color === 'w' && isWhiteChecked) || (piece.color === 'b' && isBlackChecked));

                return (
                  <button
                    key={`${r}-${c}`}
                    type="button"
                    onClick={() => handleSquareClick(r, c)}
                    className={`relative flex items-center justify-center transition-all duration-150 outline-none ${
                      isLight ? 'bg-[#EEEED2]' : 'bg-[#769656]'
                    } ${isLastMoveSquare ? '!bg-[#BACA44]/80' : ''} ${
                      isSelected ? '!bg-amber-300 ring-4 ring-amber-400 z-10 scale-[1.03]' : ''
                    } ${isKingInDanger ? '!bg-rose-500/50 ring-4 ring-rose-500 animate-pulse z-10' : ''}`}
                  >
                    {/* Rank coordinate tags on leftmost column */}
                    {c === 0 && (
                      <span className={`absolute top-0.5 left-1 text-[8px] sm:text-[9px] font-black pointer-events-none ${
                        isLight ? 'text-[#769656]' : 'text-[#EEEED2]'
                      }`}>
                        {8 - r}
                      </span>
                    )}

                    {/* File coordinate tags on bottom row */}
                    {r === 7 && (
                      <span className={`absolute bottom-0.5 right-1 text-[8px] sm:text-[9px] font-black pointer-events-none ${
                        isLight ? 'text-[#769656]' : 'text-[#EEEED2]'
                      }`}>
                        {String.fromCharCode(97 + c)}
                      </span>
                    )}

                    {/* Chess Piece Graphic */}
                    {piece && <ChessPieceGraphic piece={piece} />}

                    {/* Move Indicator: Peaceful Destination */}
                    {isValidMove && !isCapture && (
                      <div className="w-3.5 h-3.5 sm:w-4 sm:h-4 rounded-full bg-emerald-600/80 ring-4 ring-emerald-500/20 shadow-sm pointer-events-none animate-pulse" />
                    )}

                    {/* Move Indicator: Capture Target */}
                    {isCapture && (
                      <div className="absolute inset-0 rounded-sm border-2 border-rose-500 bg-rose-500/25 pointer-events-none animate-pulse" />
                    )}
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Bottom Player Status: White (You) */}
        <div className="w-full flex items-center justify-between mt-2.5 px-1.5 sm:px-2">
          <div className="flex items-center gap-2">
            <div className={`w-3.5 h-3.5 rounded-full flex items-center justify-center ${
              currentTurn === 'w' ? 'bg-indigo-600 ring-4 ring-indigo-100 animate-pulse' : 'bg-slate-300'
            }`} />
            <div className="flex items-center gap-1.5">
              <span className="text-xs sm:text-sm font-bold text-slate-800">
                {gameMode === 'bot' ? 'Kamu (Putih)' : 'Pemain 1 (Putih)'}
              </span>
              {currentTurn === 'w' && (
                <span className="text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-700 animate-pulse">
                  Giliran Kamu
                </span>
              )}
            </div>
          </div>

          {/* Captured Pieces by Black */}
          <div className="flex items-center gap-1 bg-slate-50 px-2 py-1 rounded-xl border border-slate-100 min-h-[26px]">
            {capturedByBlack.length === 0 ? (
              <span className="text-[10px] text-slate-400 font-medium">Bidak Utuh</span>
            ) : (
              <div className="flex items-center gap-0.5">
                {capturedByBlack.map((p, idx) => (
                  <span key={idx} className="text-[10px] font-black uppercase text-slate-700 bg-white px-1 rounded shadow-2xs">
                    {p.type}
                  </span>
                ))}
                {materialAdvantage < 0 && (
                  <span className="text-[10px] font-extrabold text-rose-600 ml-1">+{Math.abs(materialAdvantage)}</span>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Bottom Instructions & Score */}
        <div className="w-full mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-600 font-semibold px-1">
          <div className="flex items-center gap-1.5 text-indigo-600">
            <Zap size={15} />
            <span className="hidden sm:inline">Tangkap bidak untuk memicu duel kuis edukatif!</span>
            <span className="sm:hidden">Tangkap bidak untuk kuis!</span>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-800 font-black">
              <Trophy size={13} className="text-amber-500" />
              <span>{score} Pts</span>
            </div>
            <div className="text-[11px] text-slate-500">
              Benar: <strong className="text-emerald-600">{correctAnswersCount}</strong> | Salah: <strong className="text-rose-600">{wrongAnswersCount}</strong>
            </div>
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════
          DUEL MODAL: QUESTION CHALLENGE UPON PIECE CAPTURE
      ═══════════════════════════════════════════════════════════ */}
      {activeDuel && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-white rounded-3xl border border-slate-200 shadow-2xl p-5 sm:p-6 text-center animate-in zoom-in-95 duration-200">
            {/* Header with Role Distinction */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
              <div className="flex items-center gap-2.5">
                <div className={`w-10 h-10 rounded-2xl flex items-center justify-center font-bold ${
                  activeDuel.duelRole === 'attack' ? 'bg-amber-100 text-amber-700' : 'bg-rose-100 text-rose-700'
                }`}>
                  {activeDuel.duelRole === 'attack' ? <Swords size={20} /> : <ShieldAlert size={20} />}
                </div>
                <div className="text-left">
                  <h3 className="text-base font-black text-slate-900 leading-tight">
                    {activeDuel.duelRole === 'attack' ? 'Tantangan Menyerang!' : 'Peringatan Bertahan!'}
                  </h3>
                  <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-wide">
                    {activeDuel.question.subject} • {activeDuel.question.difficulty || 'Sedang'}
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

            {/* Duel Objective Explanation */}
            <div className={`p-2.5 rounded-xl text-left text-xs mb-3 border ${
              activeDuel.duelRole === 'attack'
                ? 'bg-amber-50/70 border-amber-200/80 text-amber-900'
                : 'bg-rose-50/70 border-rose-200/80 text-rose-900'
            }`}>
              <div className="flex items-center gap-1.5 font-bold">
                {activeDuel.duelRole === 'attack' ? <Zap size={14} /> : <ShieldCheck size={14} />}
                <span>
                  {activeDuel.duelRole === 'attack'
                    ? 'Jawab benar untuk merebut bidak lawan!'
                    : 'Bidakmu diserang Guru AI! Jawab benar untuk menangkis!'}
                </span>
              </div>
            </div>

            {/* Question Text */}
            <div className="p-4 bg-slate-50 border border-slate-200/80 rounded-2xl mb-4 text-left">
              <p className="text-sm font-bold text-slate-800 leading-relaxed">
                {activeDuel.question.question}
              </p>
            </div>

            {/* Options */}
            <div className="space-y-2 mb-4">
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
                    className={`w-full p-3 rounded-xl border text-left text-xs sm:text-sm font-bold flex items-center justify-between transition-all active:scale-[0.99] min-h-[44px] ${btnStyle}`}
                  >
                    <div className="flex items-center gap-2.5">
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
                      <span>
                        {activeDuel.duelRole === 'attack'
                          ? 'Hebat! Jawaban Anda Tepat (+10 Poin). Bidak lawan direbut!'
                          : 'Luar Biasa! Serangan Lawan Berhasil Ditangkis (+15 Poin)!'}
                      </span>
                    </>
                  ) : (
                    <>
                      <XCircle size={16} className="text-rose-600" />
                      <span>
                        {activeDuel.duelRole === 'attack'
                          ? 'Kurang Tepat! Bidak lawan berhasil bertahan. Serangan gagal!'
                          : 'Kurang Tepat! Pertahanan jebol, bidakmu direbut!'}
                      </span>
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
              {winner === 'w'
                ? (gameMode === 'bot' ? 'Selamat! Kamu Menang!' : 'Pemain 1 (Putih) Menang!')
                : (gameMode === 'bot' ? 'Guru AI Menang!' : 'Pemain 2 (Hitam) Menang!')}
            </h3>
            <p className="text-xs text-slate-600 mb-5">
              Raja lawan berhasil ditaklukkan melalui strategi catur yang cermat dan kecerdasan intelektual.
            </p>

            <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-2xl text-xs space-y-1.5 mb-5 text-left">
              <div className="flex justify-between">
                <span className="text-slate-500 font-medium">Total Skor:</span>
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
              className="w-full py-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold active:scale-95 transition-all shadow-md"
            >
              Main Lagi
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
