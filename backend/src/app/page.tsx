import { Logo } from "@/components/logo";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function Home() {
  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col justify-center gap-6 p-8 md:p-12">
      <div className="space-y-3">
        <Badge variant="secondary">API Server</Badge>
        <Logo title="Ezra Bid Assistant API" size="lg" />
        <p className="text-muted-foreground">
          Backend for the Ezra Bid Assistant Chrome Extension.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Endpoints</CardTitle>
          <CardDescription>Available routes on this server.</CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="space-y-3 text-sm">
            <li className="flex items-center gap-3">
              <Badge>GET</Badge>
              <code className="font-mono text-foreground">/api/health</code>
              <span className="text-muted-foreground">— health check</span>
            </li>
            <li className="flex items-center gap-3">
              <Badge>POST</Badge>
              <code className="font-mono text-foreground">/api/generate-bid</code>
              <span className="text-muted-foreground">— generate a proposal</span>
            </li>
          </ul>
        </CardContent>
      </Card>
    </main>
  );
}
