import { motion } from "framer-motion";
import { Sparkles, Gamepad2, Heart } from "lucide-react";
import { MenuShell } from "@/components/MenuShell";
import { AdBanner } from "@/components/AdBanner";
import { CatSprite, MouseSprite } from "@/game/sprites";

const SUPPORT_EMAIL = "catchase.official@gmail.com";

export const AboutUs = () => {
  return (
    <MenuShell themeBg={["#fef3c7", "#fce7f3"]}>
      <div className="relative z-10 min-h-screen flex flex-col items-center px-6 pt-24 pb-16">
        <motion.div
          initial={{ scale: 0, rotate: -180 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: "spring", stiffness: 200 }}
          className="animate-float mb-4 flex items-end gap-2"
        >
          <CatSprite size={110} />
          <div className="mb-2">
            <MouseSprite size={56} />
          </div>
        </motion.div>

        <motion.h1
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="font-display font-bold text-4xl sm:text-5xl mb-2 text-center"
        >
          About <span className="text-primary">Us</span>
        </motion.h1>
        <p className="text-lg text-muted-foreground mb-8 text-center max-w-md">
          The tiny team behind Cat Chase: Mouse Hunt.
        </p>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-card border-2 border-card-border rounded-3xl p-6 sm:p-8 max-w-2xl w-full shadow-lg space-y-6 text-foreground/90 leading-relaxed"
        >
          <section>
            <h2 className="font-display font-bold text-xl mb-2 text-primary flex items-center gap-2">
              <Sparkles className="h-5 w-5" /> Our Story
            </h2>
            <p>
              Cat Chase started as a weekend doodle: one cat, one mouse, and
              the eternal question of whether the cat will <em>ever</em> get a
              snack. It grew into a colorful, fast-paced arcade adventure with
              eight handcrafted levels and a soundtrack of cheerful boops.
            </p>
          </section>

          <section>
            <h2 className="font-display font-bold text-xl mb-2 text-primary flex items-center gap-2">
              <Gamepad2 className="h-5 w-5" /> What We Believe
            </h2>
            <p>
              Games should be quick to pick up, friendly to everyone, and free
              of trackers and ads. No accounts. No data collection. Just a cat,
              some mice, and your reflexes.
            </p>
          </section>

          <section>
            <h2 className="font-display font-bold text-xl mb-2 text-primary flex items-center gap-2">
              <Heart className="h-5 w-5 text-destructive fill-current" /> Made With
            </h2>
            <ul className="list-disc pl-5 space-y-1">
              <li>React, TypeScript, and the HTML5 Canvas</li>
              <li>Framer Motion for the bouncy bits</li>
              <li>Tailwind CSS for the colors</li>
              <li>The Web Audio API for the squeaks and boops</li>
              <li>A great deal of cat-themed enthusiasm</li>
            </ul>
          </section>

          <AdBanner slot="2345678901" testLabel="about" />

          <section>
            <h2 className="font-display font-bold text-xl mb-2 text-primary">Get In Touch</h2>
            <p>
              Want to say hi, report a bug, or suggest a level idea? Email us at{" "}
              <a
                href={`mailto:${SUPPORT_EMAIL}`}
                className="text-primary font-bold underline underline-offset-2"
              >
                {SUPPORT_EMAIL}
              </a>
              .
            </p>
          </section>
        </motion.div>
      </div>
    </MenuShell>
  );
};
