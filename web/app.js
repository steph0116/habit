(function () {
  var config = window.HABIT_WEB_CONFIG || {};
  var params = new URLSearchParams(location.search);
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
          event_callback: go,
          event_timeout: 800
        });
        setTimeout(go, 900);
      }
    });
  });
})();
