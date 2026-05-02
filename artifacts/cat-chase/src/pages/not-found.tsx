import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { CatSprite } from "@/game/sprites";

export default function NotFound() {
  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center bg-background gap-4 px-6 text-center">
      <div className="animate-wiggle">
        <CatSprite size={140} />
      </div>
      <h1 className="font-display text-6xl font-bold text-primary">404</h1>
      <p className="text-lg text-muted-foreground max-w-sm">
        The mouse ran somewhere else. This page doesn't exist.
      </p>
      <Link href="/">
        <Button size="lg" className="font-display font-bold">Back to menu</Button>
      </Link>
    </div>
  );
}
