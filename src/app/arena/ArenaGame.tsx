"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Clock, CheckCircle2, XCircle, Trophy, Zap, RotateCcw, LogIn,
  Shield, ChevronRight, AlertTriangle
} from "lucide-react";
import { cn } from "@/lib/utils";
import { nanoid } from "nanoid";
import ProctorEngine from "@/components/arena/ProctorEngine";
import type { ArenaUser, ArenaLeaderboardEntry, QuestionLogEntry, WarningReason } from "@/types/arena";
import {
  generateArenaQuestions,
  checkArenaAnswer,
  type ArenaQuestion,
} from "@/features/arena/questionEngine";
import { submitPracticeAttempt, getPracticeLeaderboard } from "@/features/arena/actions";
import Link from "next/link";

interface Props {
  user: ArenaUser | null;
  strictMode: boolean;
  onExit: () => void;
}

type GameStatus = "countdown" | "playing" | "transitioning" | "results";

function formatTime(ms: number): string {
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  return m > 0 ? `${m}m ${s % 60}s` : `${s}s`;
}

function getDifficultyLabel(d: number) {
  return ["", "Easy", "Medium-Easy", "Medium", "Medium-Hard", "Hard"][d] ?? "Hard";
}

function getDifficultyColor(d: number) {
  const colors = ["", "text-emerald-400", "text-green-400", "text-yellow-400", "text-orange-400", "text-red-400"];
  return colors[d] ?? "text-red-400";
}

export default function ArenaGame({ user, strictMode, onExit }: Props) {
  const sessionId = useRef(nanoid(24)).current;
  const startTimeRef = useRef(Date.now());
  const questionStartRef = useRef(Date.now());

  const [questions] = useState<ArenaQuestion[]>(() => generateArenaQuestions());
  const [currentIndex, setCurrentIndex] = useState(0);
  const [gameStatus, setGameStatus] = useState<GameStatus>("countdown");
  const [countdown, setCountdown] = useState(3);
  const [timeLeft, setTimeLeft] = useState(questions[0]?.timeLimit ?? 30);
  const [selected, setSelected] = useState<string | null>(null);
  const [isAnswered, setIsAnswered] = useState(false);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [score, setScore] = useState(0);
  const [warningsCount, setWarningsCount] = useState(0);
  const [terminated, setTerminated] = useState(false);
  const [questionLog, setQuestionLog] = useState<QuestionLogEntry[]>([]);
  const [totalElapsed, setTotalElapsed] = useState(0);
  const [finalLeaderboard, setFinalLeaderboard] = useState<ArenaLeaderboardEntry[]>([]);
  const [myRank, setMyRank] = useState<number | null>(null);

  const currentQuestion = questions[currentIndex];
  const totalQuestions = questions.length;

  // Countdown
  useEffect(() => {
    if (gameStatus !== "countdown") return;
    if (countdown <= 0) {
      setGameStatus("playing");
      questionStartRef.current = Date.now();
      return;
    }
    const t = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [countdown, gameStatus]);

  // Question timer
  useEffect(() => {
    if (gameStatus !== "playing" || isAnswered) return;
    if (timeLeft <= 0) {
      handleAnswer(null); // timeout = wrong
      return;
    }
    const t = setTimeout(() => setTimeLeft((t) => t - 1), 1000);
    return () => clearTimeout(t);
  }, [timeLeft, isAnswered, gameStatus]);

  const handleAnswer = useCallback(
    (answer: string | null) => {
      if (isAnswered || gameStatus !== "playing") return;

      const timeTaken = Date.now() - questionStartRef.current;
      const correct = answer !== null && checkArenaAnswer(currentQuestion, answer);

      setSelected(answer);
      setIsAnswered(true);
      setIsCorrect(correct);
      if (correct) setScore((s) => s + 1);

      setQuestionLog((log) => [
        ...log,
        {
          question_id: currentQuestion.id,
          game_slug: currentQuestion.type,
          difficulty: currentQuestion.difficulty,
          time_taken_ms: timeTaken,
          is_correct: correct,
          selected_answer: answer,
        },
      ]);

      setTimeout(() => {
        if (currentIndex + 1 >= totalQuestions) {
          finishGame(correct ? score + 1 : score);
        } else {
          setCurrentIndex((i) => i + 1);
          setGameStatus("transitioning");
          setTimeout(() => {
            setSelected(null);
            setIsAnswered(false);
            setIsCorrect(null);
            setTimeLeft(questions[currentIndex + 1]?.timeLimit ?? 20);
            questionStartRef.current = Date.now();
            setGameStatus("playing");
          }, 600);
        }
      }, 1200);
    },
    [isAnswered, gameStatus, currentQuestion, currentIndex, totalQuestions, questions, score]
  );

  const finishGame = useCallback(
    async (finalScore: number) => {
      const elapsed = Date.now() - startTimeRef.current;
      setTotalElapsed(elapsed);
      setGameStatus("results");

      if (user) {
        const { attempt } = await submitPracticeAttempt({
          score: finalScore,
          totalQuestions,
          timeTakenMs: elapsed,
          difficulty: "mixed",
          questionLog,
          warningsCount,
          isStrictMode: strictMode,
        });

        const lb = await getPracticeLeaderboard(20);
        setFinalLeaderboard(lb);
        if (attempt) {
          const rank = lb.findIndex((e) => e.user_id === user.id) + 1;
          setMyRank(rank > 0 ? rank : null);
        }
      }
    },
    [user, totalQuestions, questionLog, warningsCount, strictMode]
  );

  const handleWarning = useCallback((reason: WarningReason, count: number) => {
    setWarningsCount(count);
  }, []);

  const handleTerminate = useCallback(
    (reason: string) => {
      setTerminated(true);
      finishGame(score);
    },
    [score, finishGame]
  );

  // ── Countdown screen ─────────────────────────────────────────
  if (gameStatus === "countdown") {
    return (
      <div className="fixed inset-0 bg-background flex items-center justify-center z-50">
        <div className="text-center">
          <p className="text-sm text-muted-foreground mb-4 uppercase tracking-widest">Get Ready</p>
          <div className="text-8xl font-black font-heading text-foreground animate-pulse">
            {countdown === 0 ? "GO!" : countdown}
          </div>
          {strictMode && (
            <div className="mt-6 flex items-center gap-2 text-orange-400 text-sm">
              <Shield className="w-4 h-4" />
              Strict Mode Active — Tab switching is monitored
            </div>
          )}
        </div>
      </div>
    );
  }

  // ── Results screen ────────────────────────────────────────────
  if (gameStatus === "results") {
    const percentage = Math.round((score / totalQuestions) * 100);
    const grade =
      percentage >= 90 ? "S" : percentage >= 70 ? "A" : percentage >= 50 ? "B" : percentage >= 30 ? "C" : "D";
    const gradeColor =
      grade === "S" ? "text-yellow-400" : grade === "A" ? "text-emerald-400" : grade === "B" ? "text-blue-400" : grade === "C" ? "text-orange-400" : "text-red-400";

    return (
      <div className="min-h-screen bg-background pt-20 pb-16">
        <div className="max-w-4xl mx-auto px-4">
          {/* Score card */}
          <div className="rounded-2xl border border-border bg-card p-8 mb-8">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
              <div>
                {terminated && (
                  <div className="flex items-center gap-2 text-red-400 text-sm mb-3">
                    <AlertTriangle className="w-4 h-4" />
                    Session terminated due to violations
                  </div>
                )}
                <p className="text-sm text-muted-foreground uppercase tracking-widest mb-2">Arena Result</p>
                <div className="flex items-baseline gap-3">
                  <span className={cn("text-7xl font-black font-heading", gradeColor)}>{grade}</span>
                  <div>
                    <p className="text-3xl font-bold text-foreground">{score}/{totalQuestions}</p>
                    <p className="text-muted-foreground text-sm">{percentage}% correct</p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="rounded-xl bg-muted p-4 text-center">
                  <Clock className="w-4 h-4 text-muted-foreground mx-auto mb-1" />
                  <p className="text-sm font-bold text-foreground">{formatTime(totalElapsed)}</p>
                  <p className="text-xs text-muted-foreground">Total Time</p>
                </div>
                <div className="rounded-xl bg-muted p-4 text-center">
                  <AlertTriangle className="w-4 h-4 text-muted-foreground mx-auto mb-1" />
                  <p className="text-sm font-bold text-foreground">{warningsCount}</p>
                  <p className="text-xs text-muted-foreground">Warnings</p>
                </div>
                {myRank && (
                  <div className="col-span-2 rounded-xl bg-purple-500/10 border border-purple-500/20 p-4 text-center">
                    <Trophy className="w-4 h-4 text-purple-400 mx-auto mb-1" />
                    <p className="text-sm font-bold text-purple-300">Rank #{myRank}</p>
                    <p className="text-xs text-muted-foreground">on Leaderboard</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Question breakdown */}
          <div className="rounded-xl border border-border bg-card mb-6">
            <div className="px-5 py-4 border-b border-border">
              <h3 className="font-semibold text-sm font-heading">Question Breakdown</h3>
            </div>
            <div className="divide-y divide-border/50">
              {questionLog.map((entry, i) => (
                <div key={i} className="flex items-center gap-4 px-5 py-3">
                  <span className="text-xs text-muted-foreground w-4">{i + 1}</span>
                  {entry.is_correct ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                  ) : (
                    <XCircle className="w-4 h-4 text-red-500 shrink-0" />
                  )}
                  <span className="text-xs text-muted-foreground capitalize">{entry.game_slug}</span>
                  <Badge variant="outline" className={cn("text-xs ml-auto", getDifficultyColor(entry.difficulty))}>
                    {getDifficultyLabel(entry.difficulty)}
                  </Badge>
                  <span className="text-xs text-muted-foreground font-mono w-12 text-right">
                    {Math.round(entry.time_taken_ms / 1000)}s
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Leaderboard preview */}
          {finalLeaderboard.length > 0 && (
            <div className="rounded-xl border border-border bg-card mb-6">
              <div className="px-5 py-4 border-b border-border flex items-center gap-2">
                <Trophy className="w-4 h-4 text-yellow-500" />
                <h3 className="font-semibold text-sm font-heading">Updated Leaderboard</h3>
              </div>
              {finalLeaderboard.slice(0, 5).map((e) => (
                <div
                  key={e.user_id}
                  className={cn(
                    "flex items-center gap-3 px-5 py-3 border-b border-border/50 last:border-0",
                    e.user_id === user?.id && "bg-purple-500/5"
                  )}
                >
                  <span className="text-xs font-mono text-muted-foreground w-5">#{e.rank}</span>
                  <Avatar className="w-6 h-6">
                    <AvatarFallback className="text-xs bg-muted">
                      {e.name?.[0]?.toUpperCase() ?? "?"}
                    </AvatarFallback>
                  </Avatar>
                  <span className={cn("text-sm flex-1 truncate", e.user_id === user?.id && "text-purple-300")}>
                    {e.name ?? "Anonymous"}
                  </span>
                  <span className="text-sm font-bold">{e.score}/10</span>
                  <span className="text-xs text-muted-foreground font-mono">{formatTime(e.time_taken_ms)}</span>
                </div>
              ))}
            </div>
          )}

          {!user && (
            <div className="rounded-xl border border-purple-500/30 bg-purple-500/5 p-5 mb-6 flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-foreground">Save your score to the leaderboard</p>
                <p className="text-xs text-muted-foreground mt-0.5">Sign in to track your progress and compete globally</p>
              </div>
              <Button asChild size="sm">
                <Link href="/arena/auth?redirect=/arena">
                  <LogIn className="w-4 h-4 mr-2" />
                  Sign In
                </Link>
              </Button>
            </div>
          )}

          <div className="flex gap-3">
            <Button onClick={onExit} variant="outline" className="flex-1 h-11">
              Back to Arena
            </Button>
            <Button
              onClick={() => window.location.reload()}
              className="flex-1 h-11"
            >
              <RotateCcw className="w-4 h-4 mr-2" />
              Play Again
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // ── Playing screen ────────────────────────────────────────────
  const timerPercent = (timeLeft / (currentQuestion?.timeLimit ?? 30)) * 100;
  const timerColor =
    timerPercent > 60 ? "bg-emerald-500" : timerPercent > 30 ? "bg-yellow-500" : "bg-red-500";

  const gameContent = (
    <div className="min-h-screen bg-background pt-20 pb-16">
      <div className="max-w-3xl mx-auto px-4">
        {/* Header bar */}
        <div className="flex items-center justify-between mb-6 pt-4">
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground">
              Question <span className="font-semibold text-foreground">{currentIndex + 1}</span>/{totalQuestions}
            </span>
            <Badge variant="outline" className={cn("text-xs", getDifficultyColor(currentQuestion?.difficulty ?? 1))}>
              {getDifficultyLabel(currentQuestion?.difficulty ?? 1)}
            </Badge>
          </div>

          <div className="flex items-center gap-3">
            {warningsCount > 0 && (
              <div className="flex items-center gap-1.5 text-orange-400 text-xs">
                <AlertTriangle className="w-3.5 h-3.5" />
                {warningsCount} warning{warningsCount > 1 ? "s" : ""}
              </div>
            )}
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-muted-foreground" />
              <span className={cn("text-lg font-bold font-mono tabular-nums", timeLeft <= 5 && "text-red-400")}>
                {timeLeft}
              </span>
            </div>
          </div>
        </div>

        {/* Progress */}
        <div className="flex gap-1 mb-8">
          {questions.map((_, i) => (
            <div
              key={i}
              className={cn(
                "h-1.5 flex-1 rounded-full transition-all duration-300",
                i < currentIndex
                  ? questionLog[i]?.is_correct
                    ? "bg-emerald-500"
                    : "bg-red-500"
                  : i === currentIndex
                  ? "bg-primary"
                  : "bg-muted"
              )}
            />
          ))}
        </div>

        {/* Timer bar */}
        <div className="h-1 bg-muted rounded-full mb-8 overflow-hidden">
          <div
            className={cn("h-full rounded-full transition-all duration-1000", timerColor)}
            style={{ width: `${timerPercent}%` }}
          />
        </div>

        {/* Question card */}
        <div className="rounded-2xl border border-border bg-card p-6 md:p-8 mb-6">
          {/* Switch Challenge */}
          {currentQuestion?.type === "switch" && currentQuestion.switchPuzzle && (
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-widest mb-4">
                Switch Operator Challenge
              </p>
              <div className="mb-6 flex flex-col sm:flex-row items-center justify-center gap-6">
                <div className="text-center">
                  <p className="text-xs text-muted-foreground mb-2">Input</p>
                  <div className="flex gap-1.5">
                    {currentQuestion.switchPuzzle.input.map((s, i) => (
                      <div key={i} className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center text-sm font-bold">
                        {s}
                      </div>
                    ))}
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-muted-foreground hidden sm:block" />
                <div className="text-center">
                  <p className="text-xs text-muted-foreground mb-2">Output</p>
                  <div className="flex gap-1.5">
                    {currentQuestion.switchPuzzle.output.map((s, i) => (
                      <div key={i} className="w-10 h-10 rounded-lg bg-primary/20 border border-primary/30 flex items-center justify-center text-sm font-bold">
                        {s}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              <p className="text-center text-sm text-muted-foreground mb-6">
                Which operator transforms Input → Output?
              </p>
              <div className="grid grid-cols-2 gap-3">
                {currentQuestion.switchPuzzle.options.map((opt) => (
                  <button
                    key={opt}
                    onClick={() => handleAnswer(opt)}
                    disabled={isAnswered}
                    className={cn(
                      "rounded-xl border p-4 text-sm font-mono font-medium transition-all duration-200",
                      !isAnswered && "hover:bg-white/5 hover:border-white/20 cursor-pointer",
                      selected === opt && isCorrect && "bg-emerald-500/20 border-emerald-500/60 text-emerald-300",
                      selected === opt && !isCorrect && "bg-red-500/20 border-red-500/60 text-red-300",
                      selected !== opt && isAnswered && "opacity-40 cursor-not-allowed",
                      !isAnswered && "border-border bg-card"
                    )}
                  >
                    [{opt}]
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Deductive Challenge */}
          {currentQuestion?.type === "deductive" && currentQuestion.deductivePuzzle && (
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-widest mb-4">
                Deductive Challenge — Find the missing symbol
              </p>
              <div className="mb-6 overflow-x-auto">
                <div className="inline-block">
                  {currentQuestion.deductivePuzzle.grid.map((row, rIdx) => (
                    <div key={rIdx} className="flex gap-1.5 mb-1.5">
                      {row.map((cell, cIdx) => {
                        const isEmpty = currentQuestion.deductivePuzzle!.emptyCells.some(
                          (e) => e.row === rIdx && e.col === cIdx
                        );
                        const isTarget =
                          currentQuestion.deductivePuzzle!.targetCell.row === rIdx &&
                          currentQuestion.deductivePuzzle!.targetCell.col === cIdx;
                        return (
                          <div
                            key={cIdx}
                            className={cn(
                              "w-10 h-10 rounded-lg flex items-center justify-center text-lg",
                              isTarget
                                ? "bg-purple-500/20 border-2 border-purple-500/60 border-dashed"
                                : isEmpty
                                ? "bg-muted/50 border border-dashed border-border/50"
                                : "bg-muted"
                            )}
                          >
                            {isTarget ? "?" : cell ?? ""}
                          </div>
                        );
                      })}
                    </div>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {currentQuestion.deductivePuzzle.options.map((opt) => (
                  <button
                    key={opt}
                    onClick={() => handleAnswer(opt)}
                    disabled={isAnswered}
                    className={cn(
                      "rounded-xl border p-4 text-2xl flex items-center justify-center transition-all duration-200 min-h-[56px]",
                      !isAnswered && "hover:bg-white/5 hover:border-white/20 cursor-pointer",
                      selected === opt && isCorrect && "bg-emerald-500/20 border-emerald-500/60",
                      selected === opt && !isCorrect && "bg-red-500/20 border-red-500/60",
                      selected !== opt && isAnswered && "opacity-40 cursor-not-allowed",
                      !isAnswered && "border-border bg-card"
                    )}
                  >
                    {opt}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Sequence / Logic text question */}
          {(currentQuestion?.type === "sequence" || currentQuestion?.type === "logic") && (
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-widest mb-4">
                {currentQuestion.type === "sequence" ? "Number Sequence" : "Logical Reasoning"}
              </p>
              <p className="text-lg font-medium text-foreground mb-8 leading-relaxed">
                {currentQuestion.question}
              </p>
              <div className="grid grid-cols-2 gap-3">
                {currentQuestion.options?.map((opt, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleAnswer(opt)}
                    disabled={isAnswered}
                    className={cn(
                      "rounded-xl border p-4 text-sm font-medium text-left transition-all duration-200",
                      !isAnswered && "hover:bg-white/5 hover:border-white/20 cursor-pointer",
                      selected === opt && isCorrect && "bg-emerald-500/20 border-emerald-500/60 text-emerald-300",
                      selected === opt && !isCorrect && "bg-red-500/20 border-red-500/60 text-red-300",
                      selected !== opt && isAnswered && "opacity-40 cursor-not-allowed",
                      !isAnswered && "border-border bg-card"
                    )}
                  >
                    <span className="text-xs text-muted-foreground mr-2 font-mono">
                      {String.fromCharCode(65 + idx)}.
                    </span>
                    {opt}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Answer feedback */}
          {isAnswered && (
            <div
              className={cn(
                "mt-4 flex items-center gap-2 text-sm rounded-lg px-4 py-3",
                isCorrect ? "bg-emerald-500/10 text-emerald-400" : "bg-red-500/10 text-red-400"
              )}
            >
              {isCorrect ? (
                <CheckCircle2 className="w-4 h-4 shrink-0" />
              ) : (
                <XCircle className="w-4 h-4 shrink-0" />
              )}
              {isCorrect ? "Correct!" : "Incorrect — next question coming up..."}
            </div>
          )}
        </div>

        {/* Score display */}
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>Score: <span className="font-bold text-foreground">{score}</span>/{currentIndex}</span>
          <button onClick={onExit} className="text-xs hover:text-foreground transition-colors">
            Exit Arena
          </button>
        </div>
      </div>
    </div>
  );

  if (strictMode) {
    return (
      <ProctorEngine
        sessionId={sessionId}
        sessionType="practice"
        maxWarnings={3}
        requireFullscreen={true}
        enabled={true}
        onWarning={handleWarning}
        onTerminate={handleTerminate}
      >
        {gameContent}
      </ProctorEngine>
    );
  }

  return gameContent;
}
