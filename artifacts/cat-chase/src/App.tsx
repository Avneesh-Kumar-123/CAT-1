import { useEffect, useRef, useState, useCallback } from "react";
import { Switch, Route, Router as WouterRouter, useParams } from "wouter";
import { useHashLocation } from "wouter/use-hash-location";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import { Splash } from "@/pages/Splash";
import { Levels } from "@/pages/Levels";
import { HowToPlay } from "@/pages/HowToPlay";
import { Credits } from "@/pages/Credits";
import { Play } from "@/pages/Play";
import { PrivacyPolicy } from "@/pages/PrivacyPolicy";
import { AboutUs } from "@/pages/AboutUs";
import { ContactUs } from "@/pages/ContactUs";
import { Achievements } from "@/pages/Achievements";
import { MouseAlmanac } from "@/pages/MouseAlmanac";
import { Leaderboard } from "@/pages/Leaderboard";
import { ResetPassword } from "@/pages/ResetPassword";
import { TimeAttack } from "@/pages/TimeAttack";
import { Survival } from "@/pages/Survival";
import { Shop } from "@/pages/Shop";
import { LEVELS } from "@/game/levels";
import { loadSave } from "@/game/storage";
import { setAudioMuted } from "@/game/audio";
import type { SaveData } from "@/game/types";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";

const PlayRoute = ({ save, onSave }: { save: SaveData; onSave: (s: SaveData) => void }) => {
  const params = useParams<{ id: string }>();
  const id = Number(params.id ?? "1");
  const safeId = Number.isFinite(id) && id >= 1 && id <= LEVELS.length ? id : 1;
  return <Play levelId={safeId} save={save} onSave={onSave} />;
};

/**
 * Routes — rendered inside AuthProvider so it can call useAuth().
 */
function AppRoutes({
  save,
  setSave,
}: {
  save: SaveData;
  setSave: (s: SaveData) => void;
}) {
  const { syncSave, pendingMerge, clearPendingMerge } = useAuth();

  // When AuthContext merges a cloud save on login, apply it to local state
  useEffect(() => {
    if (!pendingMerge) return;
    setSave(pendingMerge);
    clearPendingMerge();
  }, [pendingMerge, clearPendingMerge, setSave]);

  useEffect(() => {
    setAudioMuted(!save.settings.sound);
  }, [save.settings.sound]);

  /** Drop-in replacement for bare setSave — also queues a cloud sync. */
  const handleSave = useCallback(
    (newSave: SaveData) => {
      setSave(newSave);
      syncSave(newSave);
    },
    [setSave, syncSave],
  );

  return (
    <TooltipProvider>
      <WouterRouter hook={useHashLocation}>
        <Switch>
          <Route path="/">
            <Splash save={save} onSave={handleSave} />
          </Route>
          <Route path="/play/:id">
            <PlayRoute save={save} onSave={handleSave} />
          </Route>
          <Route path="/play">
            <PlayRoute save={save} onSave={handleSave} />
          </Route>
          <Route path="/levels">
            <Levels save={save} />
          </Route>
          <Route path="/how-to-play">
            <HowToPlay />
          </Route>
          <Route path="/credits">
            <Credits />
          </Route>
          <Route path="/privacy">
            <PrivacyPolicy />
          </Route>
          <Route path="/about">
            <AboutUs />
          </Route>
          <Route path="/contact">
            <ContactUs />
          </Route>
          <Route path="/achievements">
            <Achievements save={save} />
          </Route>
          <Route path="/mouse-almanac">
            <MouseAlmanac save={save} />
          </Route>
          <Route path="/leaderboard">
            <Leaderboard />
          </Route>
          <Route path="/time-attack">
            <TimeAttack save={save} onSave={handleSave} />
          </Route>
          <Route path="/survival">
            <Survival save={save} onSave={handleSave} />
          </Route>
          <Route path="/shop">
            <Shop save={save} onSave={handleSave} />
          </Route>
          <Route path="/reset-password">
            <ResetPassword />
          </Route>
          <Route>
            <NotFound />
          </Route>
        </Switch>
        <Toaster />
      </WouterRouter>
    </TooltipProvider>
  );
}

function App() {
  const [save, setSave] = useState<SaveData>(() => loadSave());

  // Keep a ref so AuthProvider's getCurrentSave() always returns the latest
  // save without re-creating the closure on every render.
  const saveRef = useRef(save);

  const handleSetSave = useCallback((newSave: SaveData) => {
    setSave(newSave);
    saveRef.current = newSave;
  }, []);

  return (
    <AuthProvider getCurrentSave={() => saveRef.current}>
      <AppRoutes save={save} setSave={handleSetSave} />
    </AuthProvider>
  );
}

export default App;
