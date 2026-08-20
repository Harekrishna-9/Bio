(() => {
  const isStandalone =
    window.matchMedia("(display-mode: standalone)").matches ||
    window.navigator.standalone === true;

  const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);

  if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => {
      navigator.serviceWorker.register("./sw.js").catch(console.error);
    });
  }

  const btn = document.getElementById("installAppBtn");
  const box = document.getElementById("installGuide");
  const close = document.getElementById("closeInstallGuide");

  if (btn) {
    if (isStandalone) {
      btn.style.display = "none";
    } else {
      btn.addEventListener("click", () => {
        if (isIOS) {
          box?.classList.add("open");
        } else if (window.__hkInstallPrompt) {
          window.__hkInstallPrompt.prompt();
        } else {
          box?.classList.add("open");
        }
      });
    }
  }

  window.addEventListener("beforeinstallprompt", e => {
    e.preventDefault();
    window.__hkInstallPrompt = e;
  });

  close?.addEventListener("click", () => box?.classList.remove("open"));
  box?.addEventListener("click", e => {
    if (e.target === box) box.classList.remove("open");
  });
})();