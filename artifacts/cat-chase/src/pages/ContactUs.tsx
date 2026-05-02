import { motion } from "framer-motion";
import { Mail, Bug, Lightbulb, MessageCircle, Copy, Check } from "lucide-react";
import { useState } from "react";
import { MenuShell } from "@/components/MenuShell";
import { AdBanner } from "@/components/AdBanner";
import { Button } from "@/components/ui/button";
import { sfx } from "@/game/audio";

const SUPPORT_EMAIL = "catchase.official@gmail.com";

export const ContactUs = () => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(SUPPORT_EMAIL);
      sfx.click();
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* ignore */
    }
  };

  return (
    <MenuShell themeBg={["#dcfce7", "#fef3c7"]}>
      <div className="relative z-10 min-h-screen flex flex-col items-center px-6 pt-24 pb-16">
        <motion.div
          initial={{ scale: 0, rotate: -90 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: "spring", stiffness: 200 }}
          className="mb-4 bg-secondary/20 border-2 border-secondary rounded-full p-4"
        >
          <Mail className="h-10 w-10 text-secondary" />
        </motion.div>

        <motion.h1
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="font-display font-bold text-4xl sm:text-5xl mb-2 text-center"
        >
          Contact <span className="text-primary">Us</span>
        </motion.h1>
        <p className="text-lg text-muted-foreground mb-8 text-center max-w-md">
          Bugs, ideas, fan mail — we read everything.
        </p>

        {/* Email card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-card border-2 border-card-border rounded-3xl p-6 sm:p-8 max-w-2xl w-full shadow-lg space-y-5"
        >
          <div>
            <p className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-2">
              Email Us
            </p>
            <div className="flex flex-col sm:flex-row sm:items-center gap-3 bg-muted/40 border-2 border-card-border rounded-2xl px-4 py-3">
              <a
                href={`mailto:${SUPPORT_EMAIL}`}
                className="font-display font-bold text-lg sm:text-xl text-primary break-all hover:underline underline-offset-2 flex-1"
                data-testid="link-support-email"
              >
                {SUPPORT_EMAIL}
              </a>
              <Button
                variant="secondary"
                size="sm"
                onClick={handleCopy}
                className="font-bold"
                data-testid="button-copy-email"
              >
                {copied ? (
                  <>
                    <Check className="mr-1 h-4 w-4" /> Copied
                  </>
                ) : (
                  <>
                    <Copy className="mr-1 h-4 w-4" /> Copy
                  </>
                )}
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
            <div className="bg-muted/30 border border-card-border rounded-2xl p-4 text-center">
              <Bug className="h-6 w-6 mx-auto mb-2 text-destructive" />
              <p className="font-display font-bold text-sm">Report a Bug</p>
              <p className="text-xs text-muted-foreground mt-1">
                Tell us what broke and how to repeat it.
              </p>
            </div>
            <div className="bg-muted/30 border border-card-border rounded-2xl p-4 text-center">
              <Lightbulb className="h-6 w-6 mx-auto mb-2 text-primary" />
              <p className="font-display font-bold text-sm">Suggest a Level</p>
              <p className="text-xs text-muted-foreground mt-1">
                Got a wild level idea? We want it.
              </p>
            </div>
            <div className="bg-muted/30 border border-card-border rounded-2xl p-4 text-center">
              <MessageCircle className="h-6 w-6 mx-auto mb-2 text-secondary" />
              <p className="font-display font-bold text-sm">Just Say Hi</p>
              <p className="text-xs text-muted-foreground mt-1">
                Or send us a picture of your cat.
              </p>
            </div>
          </div>

          <p className="text-sm text-muted-foreground text-center pt-2">
            We usually reply within 2&ndash;3 business days.
          </p>

          <AdBanner slot="4567890123" testLabel="contact" />

          <div className="pt-2">
            <a href={`mailto:${SUPPORT_EMAIL}?subject=Cat%20Chase%20Feedback`}>
              <Button
                size="lg"
                className="w-full h-14 text-lg font-display font-bold shadow-lg game-button"
                onClick={() => sfx.click()}
                data-testid="button-open-mail"
              >
                <Mail className="mr-2 h-5 w-5" /> Open Email
              </Button>
            </a>
          </div>
        </motion.div>
      </div>
    </MenuShell>
  );
};
