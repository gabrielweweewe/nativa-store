import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export type FontScale = "normal" | "large" | "xlarge";

type AccessibilityState = {
  highContrast: boolean;
  fontScale: FontScale;
  underlineLinks: boolean;
};

type AccessibilityContextType = AccessibilityState & {
  toggleHighContrast: () => void;
  setFontScale: (scale: FontScale) => void;
  cycleFontScale: () => void;
  toggleUnderlineLinks: () => void;
  resetPreferences: () => void;
};

const STORAGE_KEY = "nativa-a11y";

const DEFAULT_STATE: AccessibilityState = {
  highContrast: false,
  fontScale: "normal",
  underlineLinks: false,
};

const FONT_CYCLE: FontScale[] = ["normal", "large", "xlarge"];

const AccessibilityContext = createContext<AccessibilityContextType | undefined>(
  undefined
);

function readStoredState(): AccessibilityState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      if (typeof window !== "undefined" && window.matchMedia("(prefers-contrast: more)").matches) {
        return { ...DEFAULT_STATE, highContrast: true };
      }
      return DEFAULT_STATE;
    }
    const parsed = JSON.parse(raw) as Partial<AccessibilityState>;
    return {
      highContrast: Boolean(parsed.highContrast),
      fontScale: FONT_CYCLE.includes(parsed.fontScale as FontScale)
        ? (parsed.fontScale as FontScale)
        : "normal",
      underlineLinks: Boolean(parsed.underlineLinks),
    };
  } catch {
    return DEFAULT_STATE;
  }
}

function applyDomClasses(state: AccessibilityState) {
  const root = document.documentElement;
  root.classList.toggle("a11y-high-contrast", state.highContrast);
  root.classList.toggle("a11y-underline-links", state.underlineLinks);
  root.classList.remove("a11y-font-large", "a11y-font-xlarge");
  if (state.fontScale === "large") root.classList.add("a11y-font-large");
  if (state.fontScale === "xlarge") root.classList.add("a11y-font-xlarge");
}

export function AccessibilityProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AccessibilityState>(DEFAULT_STATE);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const initial = readStoredState();
    setState(initial);
    applyDomClasses(initial);
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    applyDomClasses(state);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state, ready]);

  const toggleHighContrast = useCallback(() => {
    setState((prev) => ({ ...prev, highContrast: !prev.highContrast }));
  }, []);

  const setFontScale = useCallback((fontScale: FontScale) => {
    setState((prev) => ({ ...prev, fontScale }));
  }, []);

  const cycleFontScale = useCallback(() => {
    setState((prev) => {
      const idx = FONT_CYCLE.indexOf(prev.fontScale);
      const next = FONT_CYCLE[(idx + 1) % FONT_CYCLE.length] ?? "normal";
      return { ...prev, fontScale: next };
    });
  }, []);

  const toggleUnderlineLinks = useCallback(() => {
    setState((prev) => ({ ...prev, underlineLinks: !prev.underlineLinks }));
  }, []);

  const resetPreferences = useCallback(() => {
    setState(DEFAULT_STATE);
  }, []);

  const value = useMemo(
    () => ({
      ...state,
      toggleHighContrast,
      setFontScale,
      cycleFontScale,
      toggleUnderlineLinks,
      resetPreferences,
    }),
    [
      state,
      toggleHighContrast,
      setFontScale,
      cycleFontScale,
      toggleUnderlineLinks,
      resetPreferences,
    ]
  );

  return (
    <AccessibilityContext.Provider value={value}>
      {children}
    </AccessibilityContext.Provider>
  );
}

export function useAccessibility() {
  const context = useContext(AccessibilityContext);
  if (!context) {
    throw new Error("useAccessibility must be used within AccessibilityProvider");
  }
  return context;
}
