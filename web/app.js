(function () {
  var config = window.HABIT_WEB_CONFIG || {};
  var params = new URLSearchParams(location.search);
  var debugMode = params.get("gads_debug") === "1";
  var utm = {};
  ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term"].forEach(function (key) {
    if (params.get(key)) utm[key] = params.get(key);
  });
  try {
    if (Object.keys(utm).length) localStorage.setItem("habit_utm", JSON.stringify(utm));
  } catch (e) {}

  var endpoint = config.trackingEndpoint;
  if (endpoint === undefined) {
    endpoint = /(^|\.)github\.io$/.test(location.hostname) ? "" : "/api/landing/event";
  }

  var googleAdsId = config.googleAdsId || "";
  var conversionLabel = config.conversionLabel || "";
  if (googleAdsId) {
    window.dataLayer = window.dataLayer || [];
    window.gtag = function () { window.dataLayer.push(arguments); };
    window.gtag("js", new Date());
    window.gtag("config", googleAdsId);
    var tag = document.createElement("script");
    tag.async = true;
    tag.src = "https://www.googletagmanager.com/gtag/js?id=" + encodeURIComponent(googleAdsId);
    document.head.appendChild(tag);
  }

  function send(event, detail) {
    var payload = {
      event: event,
      detail: detail || "",
      utm: utm,
      path: location.pathname + location.search,
      referrer: document.referrer || "",
      ua: navigator.userAgent
    };
    try {
      var log = JSON.parse(localStorage.getItem("habit_events") || "[]");
      log.push({ ts: new Date().toISOString(), event: event, detail: detail || "", utm: utm });
      localStorage.setItem("habit_events", JSON.stringify(log.slice(-200)));
    } catch (e) {}
    if (endpoint) {
      try {
        if (navigator.sendBeacon) {
          navigator.sendBeacon(endpoint, new Blob([JSON.stringify(payload)], { type: "application/json" }));
        } else {
          fetch(endpoint, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
            keepalive: true
          });
        }
      } catch (e) {}
    }
  }

  function showDebugBanner() {
    var old = document.getElementById("gads-debug-banner");
    if (old) old.remove();
    var box = document.createElement("div");
    box.id = "gads-debug-banner";
    box.textContent = "Google Ads conversion fired: " + googleAdsId + "/" + conversionLabel;
    box.style.cssText = [
      "position:fixed", "left:16px", "right:16px", "bottom:16px", "z-index:99999",
      "padding:14px 16px", "border-radius:12px", "background:#0c1914", "color:#c8f45a",
      "font:700 13px/1.4 system-ui,sans-serif", "box-shadow:0 12px 40px rgba(0,0,0,.35)"
    ].join(";");
    document.body.appendChild(box);
  }

  send("landing_view", "landing");
  document.querySelectorAll("[data-web-app]").forEach(function (link) {
    link.addEventListener("click", function (event) {
      var detail = link.getAttribute("data-web-app");
      var target = link.href;
      var navigated = false;
      function go() {
        if (navigated) return;
        navigated = true;
        location.href = target;
      }
      send("web_app_click", detail);
      if (window.gtag && googleAdsId && conversionLabel) {
        event.preventDefault();
        window.gtag("event", "conversion", {
          send_to: googleAdsId + "/" + conversionLabel,
          event_callback: function () { if (!debugMode) go(); },
          event_timeout: 800
        });
        if (debugMode) {
          showDebugBanner();
          return;
        }
        setTimeout(go, 900);
      }
    });
  });
  document.querySelectorAll("[data-app-download]").forEach(function (link) {
    link.addEventListener("click", function () {
      send("app_download_click", link.getAttribute("data-app-download"));
    });
  });
})();
