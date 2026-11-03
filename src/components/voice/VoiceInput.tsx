"use client";

import { useEffect, useRef, useState } from "react";

// ブラウザの音声入力（Web Speech API、ja-JP）。音声はブラウザの中で文字になるだけで、このアプリには文字だけが渡る。
type Recognition = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start: () => void;
  stop: () => void;
  onresult: ((e: { resultIndex: number; results: ArrayLike<{ isFinal: boolean; 0: { transcript: string } }> }) => void) | null;
  onend: (() => void) | null;
  onerror: ((e: { error: string }) => void) | null;
};
type RecognitionCtor = new () => Recognition;

function getCtor(): RecognitionCtor | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as { SpeechRecognition?: RecognitionCtor; webkitSpeechRecognition?: RecognitionCtor };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

type Props = {
  onText: (finalText: string) => void; // 確定した文を足す
  onInterim?: (text: string) => void; // 話している途中の文
};

export function VoiceInput({ onText, onInterim }: Props) {
  const [supported, setSupported] = useState<boolean | null>(null);
  const [listening, setListening] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const rec = useRef<Recognition | null>(null);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- ブラウザで使えるかは描画のあとで調べる
    setSupported(getCtor() !== null);
    return () => rec.current?.stop();
  }, []);

  const start = () => {
    const Ctor = getCtor();
    if (!Ctor) return;
    setError(null);
    const r = new Ctor();
    r.lang = "ja-JP";
    r.continuous = true;
    r.interimResults = true;
    r.onresult = (e) => {
      let interim = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const res = e.results[i];
        if (res.isFinal) onText(res[0].transcript);
        else interim += res[0].transcript;
      }
      onInterim?.(interim);
    };
    r.onerror = (e) => {
      setError(e.error === "not-allowed" ? "マイクの使用が許可されていません" : "音声入力が止まりました");
    };
    r.onend = () => {
      setListening(false);
      onInterim?.("");
    };
    rec.current = r;
    r.start();
    setListening(true);
  };

  const stop = () => rec.current?.stop();

  if (supported === false) {
    return (
      <p className="text-xs text-muted">
        このブラウザでは音声入力が使えません。iPhone のキーボードのマイクで入力してください。
      </p>
    );
  }
  return (
    <div className="space-y-1">
      <button
        type="button"
        onClick={listening ? stop : start}
        disabled={supported === null}
        aria-pressed={listening}
        className={`w-full rounded border-2 py-2.5 font-bold ${
          listening ? "border-shu bg-shu text-white" : "border-sumi bg-paper"
        } disabled:opacity-50`}
      >
        {listening ? "■ 止める（話しています…）" : "🎙 話して入力"}
      </button>
      {error && <p className="text-xs text-shu">{error}</p>}
    </div>
  );
}
