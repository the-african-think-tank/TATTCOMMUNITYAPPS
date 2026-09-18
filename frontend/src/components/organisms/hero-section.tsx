import { Button } from "@/components/atoms/button";
import { FeatureCard } from "@/components/molecules/feature-card";

const features = [
  {
    title: "Member Networking",
    description: "Find, connect, and collaborate with community members.",
  },
  {
    title: "Chapters & Events",
    description: "Discover regional chapters and upcoming TATT activities.",
  },
  {
    title: "Resource Hub",
    description: "Access premium resources based on membership tier.",
  },
];

export function HeroSection() {
  return (
    <section className="mx-auto flex w-full max-w-5xl flex-col gap-10 p-6 md:p-10">
      <header className="space-y-4">
        <p className="text-sm font-medium uppercase tracking-wider text-primary">
          The African Think Tank
        </p>
        <h1 className="text-4xl font-bold tracking-tight md:text-5xl">
          TATT-U Member Portal
        </h1>
        <p className="max-w-2xl text-base text-foreground/80 md:text-lg">
          A modern membership platform frontend built with Next.js 16, strict
          TypeScript, Tailwind v4, and atomic design principles.
        </p>
        <div className="flex items-center gap-3">
          <Button>Get Started</Button>
          <Button variant="secondary">Explore Features</Button>
        </div>
      </header>

      <div className="grid gap-4 md:grid-cols-3">
        {features.map((feature) => (
          <FeatureCard
            key={feature.title}
            title={feature.title}
            description={feature.description}
          />
        ))}
      </div>
    </section>
  );
}
