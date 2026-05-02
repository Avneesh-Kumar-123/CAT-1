import { motion } from "framer-motion";
import { ShieldCheck } from "lucide-react";
import { MenuShell } from "@/components/MenuShell";
import { AdBanner } from "@/components/AdBanner";

const SUPPORT_EMAIL = "catchase.official@gmail.com";

export const PrivacyPolicy = () => {
  return (
    <MenuShell themeBg={["#e0f2fe", "#ede9fe"]}>
      <div className="relative z-10 min-h-screen flex flex-col items-center px-6 pt-24 pb-16">
        <motion.div
          initial={{ scale: 0, rotate: -90 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: "spring", stiffness: 200 }}
          className="mb-4 bg-primary/15 border-2 border-primary rounded-full p-4"
        >
          <ShieldCheck className="h-10 w-10 text-primary" />
        </motion.div>

        <motion.h1
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="font-display font-bold text-4xl sm:text-5xl mb-2 text-center"
        >
          Privacy <span className="text-primary">Policy</span>
        </motion.h1>
        <p className="text-sm text-muted-foreground mb-8">Last updated: April 2026</p>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-card border-2 border-card-border rounded-3xl p-6 sm:p-8 max-w-2xl w-full shadow-lg space-y-6 text-foreground/90 leading-relaxed"
        >
          <section>
            <h2 className="font-display font-bold text-xl mb-2 text-primary">1. Overview</h2>
            <p>
              Cat Chase: Mouse Hunt ("the game", "we", "our") is a small browser
              arcade game. We respect your privacy and aim to collect as little
              information about you as possible.
            </p>
          </section>

          <section>
            <h2 className="font-display font-bold text-xl mb-2 text-primary">2. Information We Store</h2>
            <p>
              The game stores your progress (highest unlocked level, total mice
              caught, and your sound and difficulty preferences) <strong>only on your own device</strong>{" "}
              using your browser's local storage. This data never leaves your
              device and is not transmitted to us or anyone else.
            </p>
          </section>

          <section>
            <h2 className="font-display font-bold text-xl mb-2 text-primary">3. Cookies & Tracking</h2>
            <p>
              We do not use cookies, analytics, advertising trackers, or any
              third-party tracking scripts inside the game.
            </p>
          </section>

          <section>
            <h2 className="font-display font-bold text-xl mb-2 text-primary">4. Children's Privacy</h2>
            <p>
              The game is suitable for all ages. We do not knowingly collect
              any personal information from children or adults.
            </p>
          </section>

          <section>
            <h2 className="font-display font-bold text-xl mb-2 text-primary">5. Clearing Your Data</h2>
            <p>
              You can erase your saved progress at any time by opening{" "}
              <strong>Settings</strong> in the game and tapping{" "}
              <strong>Reset Progress</strong>, or by clearing your browser's
              site data.
            </p>
          </section>

          <section>
            <h2 className="font-display font-bold text-xl mb-2 text-primary">6. Changes to This Policy</h2>
            <p>
              We may update this Privacy Policy from time to time. The "Last
              updated" date above will reflect any changes.
            </p>
          </section>

          <AdBanner slot="3456789012" testLabel="privacy" />

          <section>
            <h2 className="font-display font-bold text-xl mb-2 text-primary">7. Contact Us</h2>
            <p>
              Questions about privacy? Reach out at{" "}
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
