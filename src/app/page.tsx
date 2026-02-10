"use client";

import { useRouter } from 'next/navigation';
import { 
  Network, 
  GitBranch, 
  Calendar, 
  Search, 
  Filter, 
  ArrowRight, 
  Sparkles,
  Shield,
  Zap,
  Layers,
  TrendingUp
} from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/Button';
import clsx from 'clsx';

export default function Home() {
  const router = useRouter();

  return (
    <AppLayout>
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        {/* Background Gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-background to-primary/5" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(99,102,241,0.1),transparent_50%)]" />
        
        <div className="relative max-w-7xl mx-auto px-4 md:px-6 py-20 md:py-32">
          <div className="text-center max-w-4xl mx-auto">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-primary/10 border border-primary/20 rounded-full mb-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
              <Sparkles size={14} className="text-primary" />
              <span className="text-xs font-bold uppercase tracking-wider text-primary">
                Interactive Network Visualization
              </span>
            </div>

            {/* Main Heading */}
            <h1 className="text-5xl md:text-7xl font-black tracking-tight text-foreground mb-6 animate-in fade-in slide-in-from-bottom-6 duration-700 delay-100">
              Map Relationships
              <br />
              <span className="text-primary">Uncover Connections</span>
            </h1>

            {/* Subheading */}
            <p className="text-xl md:text-2xl text-muted-foreground mb-12 max-w-2xl mx-auto leading-relaxed animate-in fade-in slide-in-from-bottom-8 duration-700 delay-200">
              Visualize complex networks of people, organizations, and events. 
              Built for investigative journalism and commission inquiries.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16 animate-in fade-in slide-in-from-bottom-10 duration-700 delay-300">
              <Button
                size="lg"
                icon={ArrowRight}
                onClick={() => router.push('/dags')}
                className="text-base px-8 py-4 shadow-lg hover:shadow-xl"
              >
                Get Started
              </Button>
              <Button
                variant="outline"
                size="lg"
                onClick={() => {
                  const element = document.getElementById('features');
                  element?.scrollIntoView({ behavior: 'smooth' });
                }}
                className="text-base px-8 py-4"
              >
                Learn More
              </Button>
            </div>

            {/* Visual Preview */}
            <div className="relative mt-16 animate-in fade-in slide-in-from-bottom-12 duration-1000 delay-500">
              <div className="relative bg-gradient-to-br from-primary/10 to-primary/5 rounded-2xl p-8 md:p-12 border border-primary/20 shadow-2xl">
                <div className="grid grid-cols-3 gap-4 md:gap-6">
                  {/* Mock Nodes */}
                  {[1, 2, 3, 4, 5, 6].map((i) => (
                    <div
                      key={i}
                      className={clsx(
                        "aspect-square rounded-xl border-2 flex items-center justify-center smooth-transition",
                        i === 1
                          ? "bg-primary/20 border-primary/40 scale-110"
                          : "bg-background/50 border-border/50 hover:border-primary/30 hover:scale-105"
                      )}
                    >
                      <Network 
                        size={i === 1 ? 32 : 24} 
                        className={i === 1 ? "text-primary" : "text-muted-foreground"} 
                      />
                    </div>
                  ))}
                </div>
                {/* Connection Lines */}
                <div className="absolute inset-0 pointer-events-none">
                  <svg className="w-full h-full">
                    <line
                      x1="33%"
                      y1="33%"
                      x2="66%"
                      y2="33%"
                      stroke="currentColor"
                      strokeWidth="2"
                      className="text-primary/30"
                    />
                    <line
                      x1="33%"
                      y1="66%"
                      x2="66%"
                      y2="66%"
                      stroke="currentColor"
                      strokeWidth="2"
                      className="text-primary/30"
                    />
                  </svg>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 md:py-32 bg-muted/30">
        <div className="max-w-7xl mx-auto px-4 md:px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-black tracking-tight text-foreground mb-4">
              Powerful Features
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Everything you need to map and visualize complex relationships
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
            {[
              {
                icon: Network,
                title: "Interactive Graphs",
                description: "Drag, zoom, and explore complex networks with an intuitive interface built on React Flow.",
                color: "text-primary",
                bgColor: "bg-primary/10",
              },
              {
                icon: GitBranch,
                title: "Relationship Mapping",
                description: "Connect entities with labeled edges to visualize relationships, transactions, and connections.",
                color: "text-success",
                bgColor: "bg-success/10",
              },
              {
                icon: Calendar,
                title: "Event Timeline",
                description: "Track events chronologically with rich metadata, filtering, and search capabilities.",
                color: "text-info",
                bgColor: "bg-info/10",
              },
              {
                icon: Search,
                title: "Smart Search",
                description: "Quickly find nodes, entities, and events across your investigation with powerful search.",
                color: "text-warning",
                bgColor: "bg-warning/10",
              },
              {
                icon: Filter,
                title: "Role-Based Filtering",
                description: "Filter by role categories (official, suspect, witness, etc.) to focus on specific groups.",
                color: "text-primary",
                bgColor: "bg-primary/10",
              },
              {
                icon: Shield,
                title: "Investigation Boards",
                description: "Organize multiple investigations with separate DAGs, each with its own network and timeline.",
                color: "text-success",
                bgColor: "bg-success/10",
              },
            ].map((feature, index) => (
              <div
                key={index}
                className="group relative bg-background rounded-2xl p-6 md:p-8 border border-border/50 hover:border-primary/50 shadow-sm hover:shadow-lg smooth-transition"
              >
                <div className={clsx(
                  "w-12 h-12 rounded-xl flex items-center justify-center mb-4",
                  feature.bgColor
                )}>
                  <feature.icon size={24} className={feature.color} />
                </div>
                <h3 className="text-xl font-bold text-foreground mb-2">
                  {feature.title}
                </h3>
                <p className="text-muted-foreground leading-relaxed">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Use Cases Section */}
      <section className="py-20 md:py-32">
        <div className="max-w-7xl mx-auto px-4 md:px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-black tracking-tight text-foreground mb-4">
              Built for Investigative Work
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Designed specifically for commission inquiries and state capture investigations
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12">
            {[
              {
                icon: Layers,
                title: "Commission Inquiries",
                description: "Map relationships between officials, witnesses, and suspects in judicial commissions of inquiry. Track testimonies, meetings, and key events chronologically.",
              },
              {
                icon: TrendingUp,
                title: "State Capture Investigations",
                description: "Visualize networks of corruption, financial flows, and organizational relationships. Connect the dots between entities and transactions.",
              },
              {
                icon: Zap,
                title: "Journalism Research",
                description: "Organize complex investigations with multiple sources, relationships, and timelines. Export and share findings with your team.",
              },
              {
                icon: Shield,
                title: "Legal Case Mapping",
                description: "Build visual case files showing connections between parties, evidence, and events. Present complex information clearly.",
              },
            ].map((useCase, index) => (
              <div
                key={index}
                className="flex gap-6 p-6 md:p-8 bg-muted/30 rounded-2xl border border-border/50 hover:border-primary/30 smooth-transition group"
              >
                <div className="shrink-0 w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 smooth-transition">
                  <useCase.icon size={28} className="text-primary" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-foreground mb-2">
                    {useCase.title}
                  </h3>
                  <p className="text-muted-foreground leading-relaxed">
                    {useCase.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 md:py-32 bg-gradient-to-br from-primary/10 via-background to-primary/5">
        <div className="max-w-4xl mx-auto px-4 md:px-6 text-center">
          <h2 className="text-4xl md:text-5xl font-black tracking-tight text-foreground mb-6">
            Ready to Start?
          </h2>
          <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            Create your first investigation network and start mapping relationships today.
          </p>
          <Button
            size="lg"
            icon={ArrowRight}
            onClick={() => router.push('/dags')}
            className="text-base px-8 py-4 shadow-lg hover:shadow-xl"
          >
            Create Investigation
          </Button>
        </div>
      </section>
    </AppLayout>
  );
}
