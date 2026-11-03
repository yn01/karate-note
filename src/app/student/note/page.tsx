import Link from "next/link";
import { PageTitle } from "@/components/ui";
import { F } from "@/components/ui/Furigana";
import { FuriganaToggle } from "@/components/ui/FuriganaToggle";
import { NoteCapture } from "./NoteCapture";

// 読み取り（最長 45秒×2）に余裕をもたせる
export const maxDuration = 120;

export default function NotePage() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Link href="/student" className="text-sm text-muted underline">
          <F>{"← ホームに{戻|もど}る"}</F>
        </Link>
        <FuriganaToggle />
      </div>
      <PageTitle>
        <F>{"ノートを{取|と}りこむ"}</F>
      </PageTitle>
      <NoteCapture />
    </div>
  );
}
