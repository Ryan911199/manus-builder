import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Loader2,
  Code,
  Rocket,
  MessageSquare,
  Eye,
  FolderOpen,
  Settings,
  Zap,
  Shield,
  GitBranch,
} from "lucide-react";
import { getLoginUrl } from "@/const";
import { Link } from "wouter";

export default function Home() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border">
        <div className="container flex h-16 items-center justify-between">
          <div className="flex items-center gap-2">
            <Code className="h-6 w-6 text-primary" />
            <span className="text-xl font-bold">Manus Builder</span>
          </div>
          <nav className="flex items-center gap-4">
            {user ? (
              <>
                <span className="text-sm text-muted-foreground">
                  Welcome, {user.name}
                </span>
                <Button asChild>
                  <Link href="/builder">Open Builder</Link>
                </Button>
              </>
            ) : (
              <Button asChild>
                <Link href="/builder">Get Started (Dev Mode)</Link>
              </Button>
            )}
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-24 px-4">
        <div className="container text-center">
          <h1 className="text-5xl font-bold tracking-tight mb-6">
            Build Web Apps with <span className="text-primary">AI-Powered</span>{" "}
            Code Generation
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-8">
            Describe what you want to build in natural language. Watch as AI
            generates clean, working code. Preview instantly. Deploy to your own
            server with one click.
          </p>
          <div className="flex gap-4 justify-center">
            {user ? (
              <Button size="lg" asChild>
                <Link href="/builder">
                  <Zap className="h-5 w-5 mr-2" />
                  Start Building
                </Link>
              </Button>
            ) : (
              <Button size="lg" asChild>
                <Link href="/builder">
                  <Zap className="h-5 w-5 mr-2" />
                  Get Started (Dev Mode)
                </Link>
              </Button>
            )}
            <Button size="lg" variant="outline" asChild>
              <a
                href="https://github.com"
                target="_blank"
                rel="noopener noreferrer"
              >
                <GitBranch className="h-5 w-5 mr-2" />
                View on GitHub
              </a>
            </Button>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-16 px-4 bg-card/50">
        <div className="container">
          <h2 className="text-3xl font-bold text-center mb-12">
            Everything You Need
          </h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <MessageSquare className="h-10 w-10 text-primary mb-2" />
                <CardTitle>AI Chat Interface</CardTitle>
                <CardDescription>
                  Describe your app in plain English. The AI understands context
                  and generates complete, working code for your requirements.
                </CardDescription>
              </CardHeader>
            </Card>

            <Card>
              <CardHeader>
                <Eye className="h-10 w-10 text-primary mb-2" />
                <CardTitle>Live Preview</CardTitle>
                <CardDescription>
                  See your changes instantly with Sandpack-powered live preview.
                  Supports React, Vue, and vanilla JavaScript out of the box.
                </CardDescription>
              </CardHeader>
            </Card>

            <Card>
              <CardHeader>
                <Code className="h-10 w-10 text-primary mb-2" />
                <CardTitle>Full Code Editor</CardTitle>
                <CardDescription>
                  Professional code editing with syntax highlighting, multi-file
                  support, and a file tree navigator for complete control.
                </CardDescription>
              </CardHeader>
            </Card>

            <Card>
              <CardHeader>
                <Rocket className="h-10 w-10 text-primary mb-2" />
                <CardTitle>One-Click Deploy</CardTitle>
                <CardDescription>
                  Deploy directly to your Coolify-managed VPS. Automatic
                  Dockerfile generation and seamless deployment workflow.
                </CardDescription>
              </CardHeader>
            </Card>

            <Card>
              <CardHeader>
                <FolderOpen className="h-10 w-10 text-primary mb-2" />
                <CardTitle>Project Management</CardTitle>
                <CardDescription>
                  Save, load, and manage multiple projects. Version history lets
                  you track changes and restore previous states.
                </CardDescription>
              </CardHeader>
            </Card>

            <Card>
              <CardHeader>
                <Shield className="h-10 w-10 text-primary mb-2" />
                <CardTitle>Self-Hosted</CardTitle>
                <CardDescription>
                  Run on your own infrastructure. Your code, your data, your
                  control. No vendor lock-in or usage limits.
                </CardDescription>
              </CardHeader>
            </Card>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-16 px-4">
        <div className="container">
          <h2 className="text-3xl font-bold text-center mb-12">How It Works</h2>
          <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            <div className="text-center">
              <div className="w-12 h-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xl font-bold mx-auto mb-4">
                1
              </div>
              <h3 className="text-lg font-semibold mb-2">Describe</h3>
              <p className="text-muted-foreground">
                Tell the AI what you want to build using natural language
              </p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xl font-bold mx-auto mb-4">
                2
              </div>
              <h3 className="text-lg font-semibold mb-2">Preview</h3>
              <p className="text-muted-foreground">
                See your app come to life instantly in the live preview
              </p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xl font-bold mx-auto mb-4">
                3
              </div>
              <h3 className="text-lg font-semibold mb-2">Deploy</h3>
              <p className="text-muted-foreground">
                Push to production on your own server with one click
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 px-4 bg-primary/10">
        <div className="container text-center">
          <h2 className="text-3xl font-bold mb-4">Ready to Build?</h2>
          <p className="text-muted-foreground mb-8 max-w-xl mx-auto">
            Start creating web applications with the power of AI. No complex
            setup required.
          </p>
          {user ? (
            <Button size="lg" asChild>
              <Link href="/builder">
                <Zap className="h-5 w-5 mr-2" />
                Open Builder
              </Link>
            </Button>
          ) : (
            <Button size="lg" asChild>
              <Link href="/builder">
                <Zap className="h-5 w-5 mr-2" />
                Get Started (Dev Mode)
              </Link>
            </Button>
          )}
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-4 border-t border-border">
        <div className="container flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Code className="h-5 w-5 text-primary" />
            <span className="font-semibold">Manus Builder</span>
          </div>
          <p className="text-sm text-muted-foreground">
            Self-hosted AI-powered web development platform
          </p>
        </div>
      </footer>
    </div>
  );
}
