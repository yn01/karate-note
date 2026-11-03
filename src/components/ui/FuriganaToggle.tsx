"use client";

import { useEffect, useState } from "react";

export const FURIGANA_KEY = "karate-note:furigana";

// ふりがなの あり／なし。設定は <html data-furigana> に持つ。
// 最初の値は layout の head のスクリプトが描画の前に入れるので、読みが一瞬出ることはない。
// ボタンの表示は、ハイドレーションのあとで その値に合わせる（保存できないときは「あり」のまま）
export function FuriganaToggle() {
  const [on, setOn] = useState(true);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- 描画の前に入った設定にボタンを合わせる
    setOn(document.documentElement.dataset.furigana !== "off");
  }, []);

  const toggle = () => {
    const next = !on;
    setOn(next);
    document.documentElement.dataset.furigana = next ? "on" : "off";
    try {
      window.localStorage.setItem(FURIGANA_KEY, next ? "on" : "off");
    } catch {}
  };

  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={on}
      className={`shrink-0 whitespace-nowrap rounded-full border px-3 py-1 text-xs ${
        on ? "border-ai bg-ai text-white" : "border-line bg-paper text-muted"
      }`}
    >
      ふりがな
    </button>
  );
}
