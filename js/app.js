/* App Router, Theme Toggle, Glossary Search & Initialization */
(function () {
  window.openPane = function (id, pushHash = true) {
    const target = document.getElementById(id);
    if (!target) return;
    document.querySelectorAll(".pane").forEach(p => p.classList.remove("active"));
    document.querySelectorAll(".nav-btn").forEach(b => b.classList.remove("active"));
    target.classList.add("active");
    const btn = document.querySelector(`.nav-btn[data-pane="${id}"]`);
    if (btn) btn.classList.add("active");
    if (pushHash) history.replaceState(null, "", "#" + id);
  };

  window.toggleTheme = function () {
    document.body.classList.toggle("light");
    const isLight = document.body.classList.contains("light");
    localStorage.setItem("kmi-theme", isLight ? "light" : "dark");
    const btn = document.getElementById("theme-btn");
    if (btn) btn.textContent = isLight ? "🌙 Темна тема" : "☀️ Світла тема";
  };

  window.filterGlossary = function () {
    const q = (document.getElementById("gloss-search")?.value || "").toLowerCase().trim();
    document.querySelectorAll("#gloss-body tr").forEach(tr => {
      tr.style.display = tr.textContent.toLowerCase().includes(q) ? "" : "none";
    });
  };

  document.addEventListener("DOMContentLoaded", () => {
    if (localStorage.getItem("kmi-theme") === "light") window.toggleTheme();
    if (typeof window.initSim1 === "function") window.initSim1();
    if (typeof window.initSim2 === "function") window.initSim2();
    if (typeof window.initSim3 === "function") window.initSim3();

    const hash = (location.hash || "").replace("#", "");
    if (hash && document.getElementById(hash)) window.openPane(hash, false);
    else window.openPane("pane-guide", false);
  });
})();
