(function () {
  var config = window.HABIT_CONFIG || {};
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

  var pixelId = config.metaPixelId || "";
  if (pixelId) {
    !(function (f, b, e, v, n, t, s) {
      if (f.fbq) return;
      n = f.fbq = function () {
        n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments);
      };
      if (!f._fbq) f._fbq = n;
      n.push = n;
      n.loaded = !0;
      n.version = "2.0";
      n.queue = [];
      t = b.createElement(e);
      t.async = !0;
      t.src = v;
      s = b.getElementsByTagName(e)[0];
      s.parentNode.insertBefore(t, s);
    })(window, document, "script", "https://connect.facebook.net/en_US/fbevents.js");
    window.fbq("init", pixelId);
    window.fbq("track", "PageView");
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
    if (window.fbq && event === "cta_click") {
      window.fbq("track", "Lead", { content_name: detail || "download" });
    }
  }

  send("landing_view", "landing");
  document.querySelectorAll("[data-download]").forEach(function (link) {
    link.addEventListener("click", function () {
      send("cta_click", link.getAttribute("data-download"));
    });
  });
})();
