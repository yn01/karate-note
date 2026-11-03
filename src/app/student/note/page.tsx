import Link from "next/link";
import { NoteCapture } from "./NoteCapture";

// 読み取り（最長 45秒×2）に余裕をもたせる
export const maxDuration = 120;

export default function NotePage() {
  return (
    <div className="space-y-4">
      <Link href="/student" className="text-sm text-ink/70 underline">
        ← ホームに もどる
      </Link>
      <h1 className="text-xl font-bold">ノートを とりこむ</h1>
      <NoteCapture />
    </div>
  );
}
