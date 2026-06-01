import { useEffect, useState } from "react";
import { Download, X, Share, Plus, Smartphone } from "lucide-react";

const DISMISS_KEY = "meditrack:install-dismissed";

function isStandalone() {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    window.navigator.standalone === true
  );
}

function isIos() {
  const ua = window.navigator.userAgent || "";
  return /iPad|iPhone|iPod/.test(ua) && !window.MSStream;
}

export default function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [show, setShow] = useState(false);
  const [iosMode, setIosMode] = useState(false);
  const [installing, setInstalling] = useState(false);

  useEffect(() => {
    if (isStandalone()) return;
    if (localStorage.getItem(DISMISS_KEY)) return;

    const onBeforeInstall = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShow(true);
    };
    window.addEventListener("beforeinstallprompt", onBeforeInstall);

    const onInstalled = () => {
      setShow(false);
      setDeferredPrompt(null);
      localStorage.setItem(DISMISS_KEY, "installed");
    };
    window.addEventListener("appinstalled", onInstalled);

    // iOS fallback (Safari does not fire beforeinstallprompt)
    if (isIos()) {
      const t = setTimeout(() => {
        setIosMode(true);
        setShow(true);
      }, 4000);
      return () => {
        clearTimeout(t);
        window.removeEventListener("beforeinstallprompt", onBeforeInstall);
        window.removeEventListener("appinstalled", onInstalled);
      };
    }

    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstall);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  const dismiss = () => {
    setShow(false);
    localStorage.setItem(DISMISS_KEY, String(Date.now()));
  };

  const install = async () => {
    if (!deferredPrompt) return;
    setInstalling(true);
    try {
      await deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      if (choice.outcome === "accepted") {
        localStorage.setItem(DISMISS_KEY, "installed");
      }
      setDeferredPrompt(null);
      setShow(false);
    } finally {
      setInstalling(false);
    }
  };

  if (!show) return null;

  return (
    <div
      className="fixed inset-x-4 bottom-4 md:left-auto md:right-6 md:bottom-6 md:w-[380px] z-[60] fade-up"
      data-testid="install-prompt"
    >
      <div className="bg-slate-900/95 backdrop-blur-2xl border border-emerald-400/30 rounded-3xl p-5 shadow-[0_20px_60px_rgba(0,0,0,0.6)] glow-emerald">
        <div className="flex items-start gap-4">
          <div className="w-11 h-11 rounded-2xl bg-emerald-400/15 border border-emerald-400/30 flex items-center justify-center shrink-0">
            {iosMode ? (
              <Smartphone className="w-5 h-5 text-emerald-400" strokeWidth={1.5} />
            ) : (
              <Download className="w-5 h-5 text-emerald-400" strokeWidth={1.5} />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[10px] uppercase tracking-[0.2em] text-emerald-400 mb-1">
              {iosMode ? "Install on iPhone" : "Install MediTrack"}
            </div>
            <h3 className="font-display text-base font-medium text-white tracking-tight">
              {iosMode ? "Add to Home Screen" : "Faster, full-screen, offline-ready"}
            </h3>
            {iosMode ? (
              <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
                Tap{" "}
                <span className="inline-flex items-center gap-1 text-slate-200">
                  <Share className="w-3 h-3" strokeWidth={2} />
                  Share
                </span>{" "}
                in Safari, then choose{" "}
                <span className="inline-flex items-center gap-1 text-slate-200">
                  <Plus className="w-3 h-3" strokeWidth={2} />
                  Add to Home Screen
                </span>
                .
              </p>
            ) : (
              <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
                Install MediTrack as an app for quick access to today's doses.
              </p>
            )}
          </div>
          <button
            onClick={dismiss}
            data-testid="install-prompt-dismiss"
            className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-slate-400 hover:text-white shrink-0"
            aria-label="Dismiss"
          >
            <X className="w-3.5 h-3.5" strokeWidth={1.5} />
          </button>
        </div>

        {!iosMode && (
          <div className="flex gap-2 mt-4">
            <button
              onClick={dismiss}
              className="flex-1 h-10 rounded-full bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-medium border border-white/10"
              data-testid="install-prompt-later"
            >
              Not now
            </button>
            <button
              onClick={install}
              disabled={installing}
              data-testid="install-prompt-install"
              className="flex-[2] h-10 rounded-full bg-emerald-400 hover:bg-emerald-300 text-slate-950 text-xs font-semibold disabled:opacity-60 flex items-center justify-center gap-2"
            >
              <Download className="w-3.5 h-3.5" strokeWidth={2} />
              {installing ? "Installing…" : "Install app"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
