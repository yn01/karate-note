import { Card, LinkButton, PageTitle } from "@/components/ui";

export default function Page() {
  return (
    <div className="space-y-4">
      <PageTitle>道場生一覧</PageTitle>
      <Card tone="coach" className="space-y-3 text-sm">
        <p className="text-muted">一覧は準備中です。デモでは、たくやくんのノートを確認できます。</p>
        <LinkButton href="/coach/review">たくやくんのノートを確認する</LinkButton>
      </Card>
    </div>
  );
}
