// Apply the saved colour theme before first paint so the page does not flash.
// Light is the default; only an explicit choice of dark is stored.
(function () {
  try {
    var theme = localStorage.getItem('fincalc-color-theme');
    if (theme === 'dark' || theme === 'light') {
      document.documentElement.setAttribute('data-theme', theme);
    }
  } catch (e) {
    // Storage blocked: keep the light default.
  }
})();
