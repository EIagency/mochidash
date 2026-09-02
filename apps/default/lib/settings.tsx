import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { ColourwayKey } from "./theme";

export interface Settings {
  colourway: ColourwayKey;
  muted: boolean;
  cameraWarnings: boolean;
  debugHud: boolean;
  playInSilentMode: boolean;
  flipLateral: boolean;
  flipLongitudinal: boolean;
}

export const DEFAULT_SETTINGS: Settings = {
  colourway: "coral",
  muted: false,
  cameraWarnings: true,
  debugHud: false,
  playInSilentMode: false,
  flipLateral: false,
  flipLongitudinal: false,
};

interface SettingsContextValue {
  settings: Settings;
  update: (patch: Partial<Settings>) => void;
  relevelToken: number;
  requestRelevel: () => void;
}

const SettingsContext = createContext<SettingsContextValue | null>(null);

const STORAGE_KEY = "mochidash.settings.v1";

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [relevelToken, setRelevelToken] = useState(0);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((raw) => {
        if (!raw) return;
        try {
          const parsed = JSON.parse(raw) as Partial<Settings>;
          setSettings((prev) => ({ ...prev, ...parsed }));
        } catch {
          // corrupt blob -- keep defaults
        }
      })
      .catch(() => {});
  }, []);

  const update = useCallback((patch: Partial<Settings>) => {
    setSettings((prev) => {
      const next = { ...prev, ...patch };
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next)).catch(() => {});
      return next;
    });
  }, []);

  const requestRelevel = useCallback(() => setRelevelToken((t) => t + 1), []);

  const value = useMemo(
    () => ({ settings, update, relevelToken, requestRelevel }),
    [settings, update, relevelToken, requestRelevel],
  );

  return (
    <SettingsContext.Provider value={value}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings(): SettingsContextValue {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error("useSettings must be used within SettingsProvider");
  return ctx;
}
