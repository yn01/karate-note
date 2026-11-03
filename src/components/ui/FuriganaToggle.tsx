"use client";

import { useEffect, useState } from "react";

const KEY = "karate-note:furigana";

// ふりがなの あり／なし。<html data-furigana> を切り替える（保存できないときは「あり」のまま）
export function FuriganaToggle() {
  const [on, setOn] = useState(true);

  useEffect(() => {
    let saved: string | null = null;
    try {
      saved = window.localStorage.getItem(KEY);
    } catch {}
    if (saved === "off") {
      document.documentElement.dataset.furigana = "off";
      // eslint-disable-next-line react-hooks/set-state-in-effect -- 保存した設定を最初の表示のあとで読む
      setOn(false);
    }
  }, []);

  const toggle = () => {
    const next = !on;
    setOn(next);
    document.documentElement.dataset.furigana = next ? "on" : "off";
    try {
      window.localStorage.setItem(KEY, next ? "on" : "off");
    } catch {}
  };

  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={on}
      className="shrink-0 whitespace-nowrap rounded-full border border-line bg-paper px-3 py-1 text-xs text-muted"
    >
      ふりがな {on ? "あり" : "なし"}
    </button>
  );
}
