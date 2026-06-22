/**
 * Arena Question Engine
 * Generates a shuffled set of 10 questions with progressive difficulty
 * by pulling from existing game logic functions.
 */
import { generateSwitchPuzzle, checkSwitchAnswer, type SwitchPuzzle } from "@/features/switch-challenge/gameLogic";
import { generatePuzzle as generateDeductivePuzzle, checkAnswer as checkDeductiveAnswer, type Puzzle as DeductivePuzzle } from "@/features/deductive-challenge/gameLogic";

export type ArenaQuestionType = "switch" | "deductive" | "sequence" | "logic";

export interface ArenaQuestion {
  id: string;
  type: ArenaQuestionType;
  difficulty: 1 | 2 | 3 | 4 | 5;
  timeLimit: number; // seconds
  // The actual puzzle data
  switchPuzzle?: SwitchPuzzle;
  deductivePuzzle?: DeductivePuzzle;
  // For sequence / logic text questions
  question?: string;
  options?: string[];
  correctAnswer?: number;
}

export interface ArenaSession {
  questions: ArenaQuestion[];
  currentIndex: number;
  startTime: number;
  answers: Array<{ questionId: string; selectedAnswer: string | null; isCorrect: boolean; timeTakenMs: number }>;
}

// Difficulty -> time limit mapping
const TIME_LIMITS: Record<number, number> = {
  1: 30,
  2: 25,
  3: 20,
  4: 15,
  5: 12,
};

// Built-in sequence/logic questions (text-based, used to fill slots)
const SEQUENCE_QUESTIONS: Array<{
  question: string;
  options: string[];
  correctAnswer: number;
  difficulty: 1 | 2 | 3 | 4 | 5;
}> = [
  {
    question: "What comes next: 2, 4, 8, 16, ___?",
    options: ["24", "32", "28", "64"],
    correctAnswer: 1,
    difficulty: 1,
  },
  {
    question: "What comes next: 1, 1, 2, 3, 5, 8, ___?",
    options: ["11", "12", "13", "21"],
    correctAnswer: 2,
    difficulty: 2,
  },
  {
    question: "What comes next: 3, 6, 12, 24, ___?",
    options: ["36", "42", "48", "60"],
    correctAnswer: 2,
    difficulty: 2,
  },
  {
    question: "What is 17 × 12?",
    options: ["184", "196", "204", "201"],
    correctAnswer: 2,
    difficulty: 3,
  },
  {
    question: "All Bloops are Razzies. Some Razzies are Lazzies. Therefore all Bloops are Lazzies.",
    options: ["True", "False", "Cannot be determined", "Partially true"],
    correctAnswer: 2,
    difficulty: 3,
  },
  {
    question: "If FACE = 6 + 1 + 3 + 5 = 15, what does BASE equal?",
    options: ["14", "15", "16", "17"],
    correctAnswer: 0,
    difficulty: 4,
  },
  {
    question: "What comes next: 1, 4, 9, 16, 25, ___?",
    options: ["30", "36", "42", "49"],
    correctAnswer: 1,
    difficulty: 3,
  },
  {
    question: "A train travels 60 km in 45 minutes. What is its speed in km/h?",
    options: ["70", "75", "80", "90"],
    correctAnswer: 2,
    difficulty: 4,
  },
  {
    question: "What comes next: Z, Y, X, W, ___?",
    options: ["U", "V", "T", "S"],
    correctAnswer: 1,
    difficulty: 2,
  },
  {
    question: "If 5 workers can build a wall in 10 days, how many days for 10 workers?",
    options: ["3", "4", "5", "6"],
    correctAnswer: 2,
    difficulty: 4,
  },
  {
    question: "What is the next prime number after 13?",
    options: ["15", "17", "19", "21"],
    correctAnswer: 1,
    difficulty: 2,
  },
  {
    question: "What comes next: 1, 8, 27, 64, ___?",
    options: ["100", "121", "125", "144"],
    correctAnswer: 2,
    difficulty: 5,
  },
];

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * Generate a set of 10 arena questions with progressive difficulty.
 * Distribution: levels 1-5 covered with escalating difficulty.
 */
export function generateArenaQuestions(): ArenaQuestion[] {
  // Progressive difficulty: 2×easy, 2×medium-easy, 2×medium, 2×medium-hard, 2×hard
  const difficultyPlan: Array<1 | 2 | 3 | 4 | 5> = [1, 1, 2, 2, 3, 3, 4, 4, 5, 5];

  // Shuffle sequence questions for variety
  const seqShuffled = shuffle(SEQUENCE_QUESTIONS);
  let seqIndex = 0;

  const questions: ArenaQuestion[] = difficultyPlan.map((difficulty, i) => {
    // Even slots: use deductive/switch game puzzles
    // Odd slots: use sequence/logic text questions
    const useGamePuzzle = i % 2 === 0;

    if (useGamePuzzle && difficulty <= 2) {
      // Use switch challenge for easy/medium-easy
      const level = difficulty === 1 ? Math.floor(Math.random() * 4) + 1 : Math.floor(Math.random() * 4) + 5;
      const switchPuzzle = generateSwitchPuzzle(level);
      return {
        id: `switch-${i}-${Date.now()}`,
        type: "switch" as ArenaQuestionType,
        difficulty,
        timeLimit: TIME_LIMITS[difficulty],
        switchPuzzle,
      };
    }

    if (useGamePuzzle && difficulty >= 3) {
      // Use deductive challenge for medium+
      const gameLevel = difficulty === 3 ? 5 : difficulty === 4 ? 12 : 20;
      const deductivePuzzle = generateDeductivePuzzle(gameLevel + Math.floor(Math.random() * 5));
      return {
        id: `deductive-${i}-${Date.now()}`,
        type: "deductive" as ArenaQuestionType,
        difficulty,
        timeLimit: TIME_LIMITS[difficulty],
        deductivePuzzle,
      };
    }

    // Text-based sequence/logic question
    const seqQ = seqShuffled[seqIndex % seqShuffled.length];
    seqIndex++;
    return {
      id: `seq-${i}-${Date.now()}`,
      type: "sequence" as ArenaQuestionType,
      difficulty,
      timeLimit: TIME_LIMITS[difficulty],
      question: seqQ.question,
      options: seqQ.options,
      correctAnswer: seqQ.correctAnswer,
    };
  });

  return questions;
}

/**
 * Check if a given answer is correct for an arena question.
 */
export function checkArenaAnswer(question: ArenaQuestion, selectedAnswer: string): boolean {
  if (question.type === "switch" && question.switchPuzzle) {
    return checkSwitchAnswer(question.switchPuzzle, selectedAnswer);
  }
  if (question.type === "deductive" && question.deductivePuzzle) {
    return checkDeductiveAnswer(question.deductivePuzzle, selectedAnswer);
  }
  if ((question.type === "sequence" || question.type === "logic") && question.options) {
    return question.options[question.correctAnswer ?? -1] === selectedAnswer;
  }
  return false;
}
