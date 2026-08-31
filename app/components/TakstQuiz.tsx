"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { takstQuizQuestions, type QuizQuestion } from "@/app/utils/takstQuizQuestions";
import {
  addLeaderboardEntry,
  formatQuizTime,
  loadLeaderboard,
  type LeaderboardEntry,
} from "@/app/utils/takstQuizLeaderboard";
import {
  addMountainProgress,
  getMountainStandings,
  MOUNTAIN_PLAYERS,
  type MountainPlayer,
  type MountainStanding,
} from "@/app/utils/quizMountain";
import { MOUNTAIN_AVATARS } from "@/app/components/quiz/MountainAvatars";
import MountainRace from "@/app/components/quiz/MountainRace";

const ROUND_SIZES = [10, 20] as const;

export interface TakstQuizProps {
  questions?: QuizQuestion[];
  /** Antall spørsmål trukket til hver runde (forhåndsvalgt lengde). */
  questionsPerRound?: (typeof ROUND_SIZES)[number];
  introTitle?: string;
  introSubtitle?: string;
  startLabel?: string;
  onComplete?: (score: number, total: number) => void;
}

interface Answer {
  chosen: number;
  correct: number;
  isCorrect: boolean;
}

type View = "intro" | "quiz" | "done";

function letterFor(i: number) {
  return String.fromCharCode(65 + i);
}

function shuffle<T>(arr: T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function getScoreVerdict(score: number, total: number): string {
  const pct = score / total;
  if (pct >= 38 / 42) return "Toppa lag!";
  if (pct >= 32 / 42) return "Ikke på Toppen helt enda";
  if (pct >= 26 / 42) return "Nærmer seg Toppen. Prøv en gang til.";
  return "Aiai. Her må det øves.";
}

function Leaderboards({ leaderboards }: { leaderboards: Record<number, LeaderboardEntry[]> }) {
  return (
    <div className="lb-grid">
      {ROUND_SIZES.map((size) => {
        const entries = leaderboards[size] ?? [];
        return (
          <div key={size} className="lb-panel">
            <p className="lb-title">Topp 5 · {size} spørsmål</p>
            {entries.length === 0 ? (
              <p className="lb-empty">Ingen resultater ennå</p>
            ) : (
              <ol className="lb-list">
                {entries.map((e, i) => (
                  <li key={`${e.name}-${e.date}`} className="lb-row">
                    <span className="lb-rank">{i + 1}</span>
                    <span className="lb-name">{e.name}</span>
                    <span className="lb-score">
                      {e.score}/{e.total}
                    </span>
                    <span className="lb-time">{formatQuizTime(e.timeMs)}</span>
                  </li>
                ))}
              </ol>
            )}
          </div>
        );
      })}
      <style jsx>{`
        .lb-grid {
          margin-top: 28px;
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
          gap: 14px;
          text-align: left;
        }
        .lb-panel {
          border: 1px solid var(--border-soft);
          background: var(--panel);
          border-radius: 14px;
          padding: 16px;
        }
        .lb-title {
          margin: 0 0 10px;
          font-size: 0.75rem;
          font-weight: 700;
          letter-spacing: 0.03em;
          text-transform: uppercase;
          color: var(--muted);
        }
        .lb-empty {
          margin: 0;
          font-size: 0.8rem;
          color: var(--faint);
        }
        .lb-list {
          list-style: none;
          margin: 0;
          padding: 0;
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        .lb-row {
          display: grid;
          grid-template-columns: 18px 1fr auto auto;
          align-items: center;
          gap: 8px;
          font-size: 0.82rem;
          color: var(--text);
        }
        .lb-rank {
          font-weight: 700;
          color: var(--primary-dark);
        }
        .lb-name {
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .lb-score {
          font-weight: 700;
          color: var(--heading);
        }
        .lb-time {
          font-variant-numeric: tabular-nums;
          color: var(--muted);
        }
      `}</style>
    </div>
  );
}

export default function TakstQuiz({
  questions = takstQuizQuestions,
  questionsPerRound = 20,
  introTitle = "Se hvor nærme Toppen du kommer!",
  introSubtitle = "Velg lengde og finn riktig takstkombinasjon for hver pasientcase – nytt utvalg og ny rekkefølge hver gang.",
  startLabel = "Start quizen",
  onComplete,
}: TakstQuizProps) {
  const [roundSizeChoice, setRoundSizeChoice] = useState<number>(questionsPerRound);
  const roundSize = Math.min(roundSizeChoice, questions.length);
  const [view, setView] = useState<View>("intro");
  const [deck, setDeck] = useState<QuizQuestion[]>(questions.slice(0, roundSize));
  const [current, setCurrent] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [player, setPlayer] = useState<MountainPlayer | null>(null);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [leaderboards, setLeaderboards] = useState<Record<number, LeaderboardEntry[]>>({});
  const [standings, setStandings] = useState<MountainStanding[]>([]);
  const [justWon, setJustWon] = useState<MountainPlayer | null>(null);
  const startedAtRef = useRef<number | null>(null);

  const total = deck.length;
  const question = deck[current];
  const score = answers.filter((a) => a.isCorrect).length;
  const progressPct = Math.round(((current + (selected !== null ? 1 : 0)) / total) * 100);

  useEffect(() => {
    setLeaderboards({
      10: loadLeaderboard(10),
      20: loadLeaderboard(20),
    });
    getMountainStandings().then(setStandings);
  }, []);

  function backToIntro() {
    setView("intro");
    getMountainStandings().then(setStandings);
  }

  function start() {
    if (!player) return;
    setDeck(shuffle(questions).slice(0, roundSize));
    setCurrent(0);
    setSelected(null);
    setAnswers([]);
    setJustWon(null);
    startedAtRef.current = Date.now();
    setView("quiz");
  }

  function selectAnswer(i: number) {
    if (selected !== null) return;
    const isCorrect = i === question.correct;
    setSelected(i);
    setAnswers((prev) => [...prev, { chosen: i, correct: question.correct, isCorrect }]);
  }

  async function next() {
    if (current + 1 >= total) {
      const timeMs = startedAtRef.current ? Date.now() - startedAtRef.current : 0;
      setElapsedMs(timeMs);
      const updated = addLeaderboardEntry(total, {
        name: player ?? "",
        score,
        total,
        timeMs,
        date: new Date().toISOString(),
      });
      setLeaderboards((prev) => ({ ...prev, [total]: updated }));
      setView("done");
      onComplete?.(score, total);

      if (player) {
        const { standings: updatedStandings, winner } = await addMountainProgress(player, score);
        setStandings(updatedStandings);
        setJustWon(winner);
      }
    } else {
      setCurrent((c) => c + 1);
      setSelected(null);
    }
  }

  if (view === "intro") {
    return (
      <div className="quiz-wrap">
        <div className="quiz-card quiz-intro">
          <span className="quiz-flag">🚩</span>
          <h2>{introTitle}</h2>
          <p className="quiz-sub">{introSubtitle}</p>

          <div className="quiz-avatar-picker" role="group" aria-label="Hvem er du">
            {MOUNTAIN_PLAYERS.map((name) => {
              const Avatar = MOUNTAIN_AVATARS[name];
              return (
                <button
                  key={name}
                  type="button"
                  className={`quiz-avatar-btn ${player === name ? "is-active" : ""}`}
                  onClick={() => setPlayer(name)}
                >
                  <Avatar size={40} state="idle" />
                  <span>{name}</span>
                </button>
              );
            })}
          </div>

          <MountainRace standings={standings} highlightPlayer={player ?? undefined} />

          <div className="quiz-size-picker" role="group" aria-label="Antall spørsmål">
            {ROUND_SIZES.map((size) => (
              <button
                key={size}
                type="button"
                className={`quiz-size-btn ${roundSizeChoice === size ? "is-active" : ""}`}
                onClick={() => setRoundSizeChoice(size)}
              >
                {size} spørsmål
              </button>
            ))}
          </div>

          <button className="quiz-btn quiz-btn-primary" onClick={start} disabled={!player}>
            {startLabel}
          </button>
          {!player && <p className="quiz-hint">Velg hvem du er for å starte</p>}
          <p className="quiz-meta">{questions.length} spørsmål i banken · {roundSize} trekkes ut hver runde</p>

          <Leaderboards leaderboards={leaderboards} />
        </div>
        <style jsx>{`
          .quiz-wrap {
            max-width: 560px;
            margin: 0 auto;
            width: 100%;
          }
          .quiz-card {
            border: 1px solid var(--border-soft);
            background: var(--card);
            border-radius: 20px;
            box-shadow: var(--shadow-soft);
          }
          .quiz-intro {
            padding: 40px 36px;
            text-align: center;
          }
          .quiz-flag {
            font-size: 2.25rem;
          }
          .quiz-intro h2 {
            margin: 16px 0 0;
            font-size: 1.6rem;
            font-weight: 700;
            color: var(--heading);
            font-family: "Zilla Slab", serif;
          }
          .quiz-sub {
            margin: 12px auto 0;
            max-width: 420px;
            font-size: 0.9rem;
            line-height: 1.55;
            color: var(--muted);
          }
          .quiz-meta {
            margin: 16px 0 0;
            font-size: 0.75rem;
            color: var(--faint);
          }
          .quiz-avatar-picker {
            margin-top: 24px;
            display: flex;
            justify-content: center;
            gap: 10px;
            flex-wrap: wrap;
          }
          .quiz-avatar-btn {
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 4px;
            border: 1px solid var(--border);
            border-radius: 12px;
            background: var(--panel);
            color: var(--text);
            padding: 10px 12px;
            font-size: 0.8rem;
            font-weight: 600;
            cursor: pointer;
            transition: border-color 0.15s ease, background 0.15s ease, color 0.15s ease;
          }
          .quiz-avatar-btn:hover {
            border-color: var(--primary);
          }
          .quiz-avatar-btn.is-active {
            border-color: var(--primary);
            background: var(--primary-bg);
            color: var(--primary-dark);
          }
          .quiz-hint {
            margin: 8px 0 0;
            font-size: 0.75rem;
            color: var(--faint);
          }
          .quiz-size-picker {
            margin-top: 20px;
            display: flex;
            justify-content: center;
            gap: 10px;
          }
          .quiz-size-btn {
            border: 1px solid var(--border);
            border-radius: 10px;
            background: var(--panel);
            color: var(--text);
            padding: 8px 18px;
            font-size: 0.85rem;
            font-weight: 600;
            cursor: pointer;
            transition: border-color 0.15s ease, background 0.15s ease, color 0.15s ease;
          }
          .quiz-size-btn:hover {
            border-color: var(--primary);
          }
          .quiz-size-btn.is-active {
            border-color: var(--primary);
            background: var(--primary);
            color: var(--primary-text);
          }
          .quiz-btn {
            border: none;
            border-radius: 12px;
            font-weight: 600;
            font-size: 0.9rem;
            cursor: pointer;
            transition: background 0.15s ease, transform 0.1s ease, opacity 0.15s ease;
          }
          .quiz-btn:active:not(:disabled) {
            transform: translateY(1px);
          }
          .quiz-btn-primary {
            margin-top: 20px;
            padding: 12px 24px;
            background: var(--primary);
            color: var(--primary-text);
          }
          .quiz-btn-primary:hover:not(:disabled) {
            background: var(--primary-dark);
          }
          .quiz-btn-primary:disabled {
            opacity: 0.4;
            cursor: not-allowed;
          }
        `}</style>
      </div>
    );
  }

  if (view === "done") {
    const verdict = getScoreVerdict(score, total);

    return (
      <div className="quiz-wrap">
        <div className="quiz-card quiz-done">
          <p className="quiz-eyebrow">Resultat</p>
          <p className="quiz-score">
            {score}
            <span>/{total}</span>
          </p>
          <p className="quiz-verdict">{verdict}</p>
          <p className="quiz-time">{player} · Tid brukt: {formatQuizTime(elapsedMs)}</p>

          <MountainRace standings={standings} highlightPlayer={player ?? undefined} justWon={justWon} />

          <div className="quiz-history">
            {deck.map((q, idx) => {
              const a = answers[idx];
              return (
                <div key={q.id} className={`quiz-history-row ${a.isCorrect ? "is-correct" : "is-wrong"}`}>
                  <p className="quiz-history-idx">Spørsmål {idx + 1}</p>
                  <p className="quiz-history-answer">
                    Riktig svar: {q.options[q.correct]}
                    {!a.isCorrect && <> · Ditt svar: {q.options[a.chosen]}</>}
                  </p>
                </div>
              );
            })}
          </div>

          <button className="quiz-btn quiz-btn-primary quiz-btn-full" onClick={backToIntro}>
            Ta quizen på nytt
          </button>

          <Leaderboards leaderboards={leaderboards} />
        </div>
        <style jsx>{`
          .quiz-wrap {
            max-width: 560px;
            margin: 0 auto;
            width: 100%;
            --quiz-danger: #c0392b;
          }
          .quiz-card {
            border: 1px solid var(--border-soft);
            background: var(--card);
            border-radius: 20px;
            box-shadow: var(--shadow-soft);
          }
          .quiz-done {
            padding: 28px 32px;
          }
          .quiz-eyebrow {
            margin: 0;
            text-align: center;
            font-size: 0.7rem;
            font-weight: 700;
            letter-spacing: 0.04em;
            text-transform: uppercase;
            color: var(--muted);
          }
          .quiz-score {
            margin: 8px 0 0;
            text-align: center;
            font-family: "Zilla Slab", serif;
            font-size: 2.75rem;
            font-weight: 700;
            color: var(--heading);
          }
          .quiz-score span {
            font-size: 1.4rem;
            font-weight: 400;
            color: var(--faint);
          }
          .quiz-verdict {
            margin: 8px 0 0;
            text-align: center;
            font-size: 1rem;
            font-weight: 700;
            color: var(--primary-dark);
          }
          .quiz-time {
            margin: 6px 0 0;
            text-align: center;
            font-size: 0.8rem;
            color: var(--muted);
          }
          .quiz-history {
            margin-top: 24px;
            max-height: 320px;
            overflow-y: auto;
            display: flex;
            flex-direction: column;
            gap: 8px;
            padding-right: 4px;
          }
          .quiz-history-row {
            border-radius: 10px;
            background: var(--panel);
            border-left: 4px solid var(--border);
            padding: 10px 12px;
            font-size: 0.85rem;
          }
          .quiz-history-row.is-correct {
            border-left-color: var(--success);
          }
          .quiz-history-row.is-wrong {
            border-left-color: var(--quiz-danger);
          }
          .quiz-history-idx {
            margin: 0;
            font-size: 0.7rem;
            color: var(--muted);
          }
          .quiz-history-answer {
            margin: 2px 0 0;
            color: var(--text);
          }
          .quiz-btn {
            border: none;
            border-radius: 12px;
            font-weight: 600;
            font-size: 0.9rem;
            cursor: pointer;
            transition: background 0.15s ease, transform 0.1s ease;
          }
          .quiz-btn:active {
            transform: translateY(1px);
          }
          .quiz-btn-primary {
            background: var(--primary);
            color: var(--primary-text);
          }
          .quiz-btn-primary:hover {
            background: var(--primary-dark);
          }
          .quiz-btn-full {
            margin-top: 24px;
            width: 100%;
            padding: 12px;
          }
        `}</style>
      </div>
    );
  }

  return (
    <div className="quiz-wrap">
      <Link href="/" className="quiz-home-link">
        ← Til forsiden
      </Link>
      <div className="quiz-progress-row">
        <span>
          Spørsmål {current + 1} av {total}
        </span>
        <span className="quiz-score-inline">Poeng: {score}</span>
      </div>
      <div className="quiz-progress-track">
        <div className="quiz-progress-fill" style={{ width: `${Math.max(progressPct, 4)}%` }} />
      </div>

      <div className="quiz-card quiz-question">
        <p className="quiz-eyebrow">Case {current + 1}</p>
        <p className="quiz-case">{question.case}</p>

        <div className="quiz-options">
          {question.options.map((opt, i) => {
            const isSelected = selected === i;
            const isCorrectOpt = i === question.correct;
            const showState = selected !== null;

            let state = "";
            if (showState && isCorrectOpt) state = "is-correct";
            else if (showState && isSelected && !isCorrectOpt) state = "is-wrong";
            else if (showState) state = "is-faded";

            return (
              <button
                key={i}
                onClick={() => selectAnswer(i)}
                disabled={selected !== null}
                className={`quiz-option ${state}`}
              >
                <span className={`quiz-option-letter ${state}`}>{letterFor(i)}</span>
                <span>{opt}</span>
              </button>
            );
          })}
        </div>

        {selected !== null && (
          <div className={`quiz-feedback ${selected === question.correct ? "is-correct" : "is-wrong"}`}>
            <p className="quiz-feedback-title">{selected === question.correct ? "Riktig" : "Feil"}</p>
            <p className="quiz-feedback-body">{question.explanation}</p>
          </div>
        )}

        <div className="quiz-next-row">
          <button className="quiz-btn quiz-btn-primary" onClick={next} disabled={selected === null}>
            {current + 1 === total ? "Se resultat" : "Neste spørsmål"}
          </button>
        </div>
      </div>

      <style jsx>{`
        .quiz-wrap {
          max-width: 560px;
          margin: 0 auto;
          width: 100%;
          --quiz-danger: #c0392b;
        }
        :global(.quiz-home-link) {
          display: inline-block;
          margin-bottom: 14px;
          font-size: 0.8rem;
          font-weight: 600;
          color: var(--muted);
          text-decoration: none;
        }
        :global(.quiz-home-link:hover) {
          color: var(--primary);
        }
        .quiz-progress-row {
          display: flex;
          justify-content: space-between;
          font-size: 0.75rem;
          color: var(--muted);
          margin-bottom: 6px;
        }
        .quiz-score-inline {
          font-weight: 700;
          color: var(--heading);
        }
        .quiz-progress-track {
          height: 6px;
          border-radius: 999px;
          background: var(--panel-2);
          overflow: hidden;
        }
        .quiz-progress-fill {
          height: 100%;
          border-radius: 999px;
          background: var(--primary);
          transition: width 0.3s ease;
        }
        .quiz-card {
          border: 1px solid var(--border-soft);
          background: var(--card);
          border-radius: 20px;
          box-shadow: var(--shadow-soft);
        }
        .quiz-question {
          margin-top: 20px;
          padding: 28px;
        }
        .quiz-eyebrow {
          margin: 0 0 8px;
          font-size: 0.7rem;
          font-weight: 700;
          letter-spacing: 0.04em;
          text-transform: uppercase;
          color: var(--muted);
        }
        .quiz-case {
          margin: 0 0 20px;
          font-size: 1rem;
          line-height: 1.55;
          color: var(--heading);
        }
        .quiz-options {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }
        .quiz-option {
          display: flex;
          align-items: center;
          gap: 12px;
          width: 100%;
          border-radius: 12px;
          border: 1px solid var(--border);
          background: var(--panel);
          padding: 12px 16px;
          text-align: left;
          font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
          font-size: 0.85rem;
          color: var(--text);
          cursor: pointer;
          transition: border-color 0.15s ease, background 0.15s ease, opacity 0.15s ease;
        }
        .quiz-option:hover:not(:disabled) {
          border-color: var(--primary);
          background: var(--primary-bg);
        }
        .quiz-option:disabled {
          cursor: default;
        }
        .quiz-option.is-correct {
          border-color: var(--success);
          background: color-mix(in srgb, var(--success) 14%, var(--panel));
        }
        .quiz-option.is-wrong {
          border-color: var(--quiz-danger);
          background: color-mix(in srgb, var(--quiz-danger) 14%, var(--panel));
        }
        .quiz-option.is-faded {
          opacity: 0.5;
        }
        .quiz-option-letter {
          flex: none;
          display: flex;
          align-items: center;
          justify-content: center;
          width: 24px;
          height: 24px;
          border-radius: 999px;
          border: 1px solid var(--border);
          background: var(--panel-2);
          font-family: "Nunito Sans", sans-serif;
          font-size: 0.7rem;
          font-weight: 700;
          color: var(--muted);
        }
        .quiz-option-letter.is-correct {
          border-color: var(--success);
          background: var(--success);
          color: #fff;
        }
        .quiz-option-letter.is-wrong {
          border-color: var(--quiz-danger);
          background: var(--quiz-danger);
          color: #fff;
        }
        .quiz-feedback {
          margin-top: 20px;
          border-radius: 12px;
          border: 1px solid var(--border);
          padding: 14px 16px;
          font-size: 0.85rem;
          line-height: 1.5;
        }
        .quiz-feedback.is-correct {
          border-color: var(--success);
          background: color-mix(in srgb, var(--success) 10%, var(--card));
        }
        .quiz-feedback.is-wrong {
          border-color: var(--quiz-danger);
          background: color-mix(in srgb, var(--quiz-danger) 10%, var(--card));
        }
        .quiz-feedback-title {
          margin: 0 0 6px;
          font-size: 0.7rem;
          font-weight: 700;
          letter-spacing: 0.04em;
          text-transform: uppercase;
        }
        .quiz-feedback.is-correct .quiz-feedback-title {
          color: var(--success);
        }
        .quiz-feedback.is-wrong .quiz-feedback-title {
          color: var(--quiz-danger);
        }
        .quiz-feedback-body {
          margin: 0;
          color: var(--text);
        }
        .quiz-next-row {
          margin-top: 24px;
          display: flex;
          justify-content: flex-end;
        }
        .quiz-btn {
          border: none;
          border-radius: 12px;
          font-weight: 600;
          font-size: 0.9rem;
          cursor: pointer;
          transition: background 0.15s ease, transform 0.1s ease, opacity 0.15s ease;
        }
        .quiz-btn:active:not(:disabled) {
          transform: translateY(1px);
        }
        .quiz-btn-primary {
          padding: 11px 22px;
          background: var(--primary);
          color: var(--primary-text);
        }
        .quiz-btn-primary:hover:not(:disabled) {
          background: var(--primary-dark);
        }
        .quiz-btn-primary:disabled {
          opacity: 0.35;
          cursor: not-allowed;
        }
      `}</style>
    </div>
  );
}
