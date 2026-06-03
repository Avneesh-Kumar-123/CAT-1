import { useEffect, useState } from "react";
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
import { TimeAttack } from "@/pages/TimeAttack";
import { Survival } from "@/pages/Survival";
import { LEVELS } from "@/game/levels";
import { loadSave } from "@/game/storage";
import { setAudioMuted } from "@/game/audio";
import type { SaveData } from "@/game/types";

const PlayRoute = ({ save, onSave }: { save: SaveData; onSave: (s: SaveData) => void }) => {
  const params = useParams<{ id: string }>();
  const id = Number(params.id ?? "1");
  const safeId = Number.isFinite(id) && id >= 1 && id <= LEVELS.length ? id : 1;
  return <Play levelId={safeId} save={save} onSave={onSave} />;
};

function App() {
  const [save, setSave] = useState<SaveData>(() => loadSave());

  useEffect(() => {
    setAudioMuted(!save.settings.sound);
  }, [save.settings.sound]);

  return (
    <TooltipProvider>
      <WouterRouter hook={useHashLocation}>
        <Switch>
          <Route path="/">
            <Splash save={save} onSave={setSave} />
          </Route>
          <Route path="/play/:id">
            <PlayRoute save={save} onSave={setSave} />
          </Route>
          <Route path="/play">
            <PlayRoute save={save} onSave={setSave} />
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
          <Route path="/time-attack">
            <TimeAttack save={save} onSave={setSave} />
          </Route>
          <Route path="/survival">
            <Survival save={save} onSave={setSave} />
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

export default App;
