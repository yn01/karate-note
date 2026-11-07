"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

// ブラウザの音声入力（Web Speech API、ja-JP）。このアプリには文字だけが渡り、音声は届かない・保存しない。
// 文字にする処理はブラウザ・OS の音声認識が行う（Chrome は Google、Safari は Apple のサーバーを使うことがある）。
type Result = { isFinal: boolean; 0: { transcript: string } };
type Recognition = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: ((e: { resultIndex: number; results: ArrayLike<Result> }) => void) | null;
  onend: (() => void) | null;
  onerror: ((e: { error: string }) => void) | null;
};
type RecognitionCtor = new () => Recognition;

function getCtor(): RecognitionCtor | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as { SpeechRecognition?: RecognitionCtor; webkitSpeechRecognition?: RecognitionCtor };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

// スマホは連続の聞き取りで確定文が重なることがあるので、話し終えるたびに区切る
const isMobile = () => typeof navigator !== "undefined" && /iPhone|iPad|Android/i.test(navigator.userAgent);

// 案内とエラーの文（道場生の画面では texts で、ふりがな付きの文に差し替える）
const MESSAGES = {
  listening: "聞き取っています",
  failed: "音声入力を始められませんでした。もう一度押してください",
  stopped: "音声入力が止まりました",
  unsupported: "このブラウザでは音声入力が使えません。iPhone のキーボードのマイクで入力してください。",
  "not-allowed": "マイクの使用が許可されていません",
  "service-not-allowed": "マイクの使用が許可されていません（音声入力の設定を確かめてください）",
  "no-speech": "声が聞こえませんでした。もう一度話してください",
} as const;
type MessageKey = keyof typeof MESSAGES;
const ERROR_KEYS: MessageKey[] = ["not-allowed", "service-not-allowed", "no-speech"];

type Props = {
  onText: (finalText: string) => void; // 確定した文を足す
  onInterim?: (text: string) => void; // 話している途中の文
  onListeningChange?: (listening: boolean) => void;
  disabled?: boolean;
  startLabel?: ReactNode; // ボタンの文字（道場生の画面では、ふりがな付きにする）
  stopLabel?: ReactNode;
  // 案内とエラーの文（道場生の画面では、ふりがな付きにする）
  texts?: Partial<Record<MessageKey, ReactNode>>;
};

export function VoiceInput({ onText, onInterim, onListeningChange, disabled, startLabel, stopLabel, texts = {} }: Props) {
  const [supported, setSupported] = useState<boolean | null>(null);
  const [listening, setListeningState] = useState(false);
  const setListening = (v: boolean) => {
    setListeningState(v);
    onListeningChange?.(v);
  };
  const [message, setMessage] = useState<MessageKey | "">("");
  const say = (k: MessageKey) => texts[k] ?? MESSAGES[k];
  const rec = useRef<Recognition | null>(null);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- ブラウザで使えるかは描画のあとで調べる
    setSupported(getCtor() !== null);
    return () => {
      // 画面を離れたら、あとから結果が届いても何もしない
      const r = rec.current;
      if (r) {
        r.onresult = r.onend = r.onerror = null;
        r.abort();
      }
    };
  }, []);

  const start = () => {
    const Ctor = getCtor();
    if (!Ctor) return;
    setMessage("");
    const r = new Ctor();
    r.lang = "ja-JP";
    r.continuous = !isMobile();
    r.interimResults = true;
    const done = new Set<number>(); // 処理した確定文（同じ文が二度届いても足さない）
    let interim = "";
    r.onresult = (e) => {
      interim = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const res = e.results[i];
        if (res.isFinal) {
          if (!done.has(i)) {
            done.add(i);
            onText(res[0].transcript);
          }
        } else interim += res[0].transcript;
      }
      onInterim?.(interim);
    };
    r.onerror = (e) => setMessage(ERROR_KEYS.find((k) => k === e.error) ?? "stopped");
    r.onend = () => {
      // 確定しないまま止まった文も残す
      if (interim) onText(interim);
      interim = "";
      setListening(false);
      onInterim?.("");
    };
    rec.current = r;
    try {
      r.start();
      setListening(true);
      setMessage("listening");
    } catch {
      setMessage("failed");
    }
  };

  const stop = () => rec.current?.stop();

  if (supported === false) {
    return (
      <p className="text-xs text-muted">{say("unsupported")}</p>
    );
  }
  return (
    <div className="space-y-1">
      <button
        type="button"
        onClick={listening ? stop : start}
        disabled={supported === null || disabled}
        aria-pressed={listening}
        className={`w-full rounded-xl border-2 py-2.5 font-bold ${
          listening ? "border-shu bg-shu text-white" : "border-sumi bg-paper"
        } disabled:opacity-50`}
      >
        <span aria-hidden="true">{listening ? "■ " : "● "}</span>
        {listening ? (stopLabel ?? "止める（話しています…）") : (startLabel ?? "話して入力")}
      </button>
      <p role="status" className={`text-xs ${message && !listening ? "text-shu" : "text-muted"}`}>
        {message ? say(message) : ""}
      </p>
    </div>
  );
}
