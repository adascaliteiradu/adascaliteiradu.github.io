(function () {
  "use strict";

  var root = document.documentElement;
  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var finePointer = window.matchMedia("(hover: hover) and (pointer: fine)").matches;

  // ---------------------------------------------------------------------------
  // Dates: durations and "years of" counters stay current without edits.
  // ---------------------------------------------------------------------------
  var now = new Date();
  var today = { y: now.getFullYear(), m: now.getMonth() };

  function parseMonth(value) {
    var parts = value.split("-");
    return { y: Number(parts[0]), m: Number(parts[1]) - 1 };
  }

  function monthsBetween(from, to) {
    return (to.y - from.y) * 12 + (to.m - from.m);
  }

  function formatDuration(months) {
    var years = Math.floor(months / 12);
    var rest = months % 12;
    var parts = [];
    if (years) parts.push(years + (years === 1 ? " yr" : " yrs"));
    if (rest) parts.push(rest + (rest === 1 ? " mo" : " mos"));
    return parts.join(" ") || "< 1 mo";
  }

  document.querySelectorAll(".job[data-start]").forEach(function (job) {
    var start = parseMonth(job.dataset.start);
    var end = job.dataset.end ? parseMonth(job.dataset.end) : today;
    var target = job.querySelector("[data-duration]");
    if (target) target.textContent = formatDuration(Math.max(0, monthsBetween(start, end)));
  });

  document.querySelectorAll("[data-since]").forEach(function (el) {
    var years = Math.floor(monthsBetween(parseMonth(el.dataset.since), today) / 12);
    el.setAttribute("data-count", String(years));
  });

  var year = document.getElementById("year");
  if (year) year.textContent = String(today.y);

  // ---------------------------------------------------------------------------
  // Count-up numbers
  // ---------------------------------------------------------------------------
  function countUp(el) {
    var target = Number(el.getAttribute("data-count")) || 0;
    if (reduceMotion) {
      el.textContent = String(target);
      return;
    }
    var duration = 1400;
    var startTime = null;
    function frame(time) {
      if (startTime === null) startTime = time;
      var t = Math.min(1, (time - startTime) / duration);
      var eased = 1 - Math.pow(1 - t, 3);
      el.textContent = String(Math.round(eased * target));
      if (t < 1) requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  }

  // ---------------------------------------------------------------------------
  // Reveal on scroll
  // ---------------------------------------------------------------------------
  document.querySelectorAll(".job__list").forEach(function (list) {
    Array.prototype.forEach.call(list.children, function (item, index) {
      item.style.setProperty("--i", index);
    });
  });

  function onVisible(el) {
    el.classList.add("is-visible");
    el.querySelectorAll("[data-count]").forEach(countUp);
  }

  var revealEls = document.querySelectorAll(".reveal");
  if ("IntersectionObserver" in window) {
    var revealObserver = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          onVisible(entry.target);
          revealObserver.unobserve(entry.target);
        });
      },
      { threshold: 0.15, rootMargin: "0px 0px -8% 0px" }
    );
    revealEls.forEach(function (el) {
      revealObserver.observe(el);
    });
  } else {
    revealEls.forEach(onVisible);
  }

  // ---------------------------------------------------------------------------
  // Typewriter
  // ---------------------------------------------------------------------------
  var typed = document.getElementById("typed");
  if (typed && !reduceMotion) {
    var words = [];
    try {
      words = JSON.parse(typed.getAttribute("data-words")) || [];
    } catch (e) {}

    if (words.length > 1) {
      var wordIndex = 0;
      var charIndex = words[0].length;
      var deleting = true;

      var tick = function () {
        var word = words[wordIndex];
        if (deleting) {
          charIndex--;
          typed.textContent = word.slice(0, charIndex);
          if (charIndex === 0) {
            deleting = false;
            wordIndex = (wordIndex + 1) % words.length;
            return setTimeout(tick, 350);
          }
          return setTimeout(tick, 38);
        }
        word = words[wordIndex];
        charIndex++;
        typed.textContent = word.slice(0, charIndex);
        if (charIndex === word.length) {
          deleting = true;
          return setTimeout(tick, 2200);
        }
        setTimeout(tick, 75);
      };

      setTimeout(tick, 2600);
    }
  }

  // ---------------------------------------------------------------------------
  // Scroll-linked effects: progress bar, nav, timeline fill
  // ---------------------------------------------------------------------------
  var progressBar = document.querySelector(".scroll-progress");
  var nav = document.getElementById("nav");
  var timeline = document.getElementById("timeline");
  var jobs = timeline ? timeline.querySelectorAll(".job") : [];
  var navLinks = document.querySelectorAll(".nav__links a[data-section]");
  var sections = document.querySelectorAll("main section[id]");
  var lastY = window.scrollY;
  var ticking = false;

  function updateOnScroll() {
    ticking = false;
    var y = window.scrollY;
    var vh = window.innerHeight;
    var max = document.documentElement.scrollHeight - vh;

    if (progressBar) progressBar.style.setProperty("--p", max > 0 ? Math.min(1, y / max) : 0);

    if (nav) {
      nav.classList.toggle("is-scrolled", y > 10);
      if (y > 160 && y > lastY + 4) nav.classList.add("is-hidden");
      else if (y < lastY - 4 || y <= 160) nav.classList.remove("is-hidden");
    }
    lastY = y;

    // Highlight the nav link of the section crossing the upper middle of the viewport.
    var active = null;
    var line = vh * 0.45;
    sections.forEach(function (section) {
      var r = section.getBoundingClientRect();
      if (r.top <= line && r.bottom > line) active = section.id;
    });
    if (max > 0 && y >= max - 2 && sections.length) active = sections[sections.length - 1].id;
    navLinks.forEach(function (link) {
      if (link.dataset.section === active) link.setAttribute("aria-current", "true");
      else link.removeAttribute("aria-current");
    });

    if (timeline) {
      var rect = timeline.getBoundingClientRect();
      var anchor = vh * 0.62;
      var progress = Math.max(0, Math.min(1, (anchor - rect.top) / rect.height));
      timeline.style.setProperty("--progress", progress.toFixed(4));
      timeline.style.setProperty("--head", progress > 0 && progress < 1 ? 1 : 0);

      jobs.forEach(function (job) {
        var node = job.querySelector(".job__node");
        if (!node) return;
        var nodeTop = node.getBoundingClientRect().top + node.offsetHeight / 2;
        job.classList.toggle("is-reached", nodeTop <= anchor);
      });
    }
  }

  function requestScrollUpdate() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(updateOnScroll);
  }

  window.addEventListener("scroll", requestScrollUpdate, { passive: true });
  window.addEventListener("resize", requestScrollUpdate);
  updateOnScroll();

  // ---------------------------------------------------------------------------
  // Pointer effects (desktop only): background spotlight, card tilt, magnetic buttons
  // ---------------------------------------------------------------------------
  if (finePointer) {
    var spotlight = document.querySelector(".spotlight");
    var pointer = null;
    var spotPending = false;

    window.addEventListener(
      "pointermove",
      function (event) {
        pointer = event;
        if (spotPending || !spotlight) return;
        spotPending = true;
        requestAnimationFrame(function () {
          spotPending = false;
          spotlight.style.setProperty("--sx", pointer.clientX + "px");
          spotlight.style.setProperty("--sy", pointer.clientY + "px");
        });
      },
      { passive: true }
    );

    document.querySelectorAll("[data-tilt]").forEach(function (card) {
      card.addEventListener("pointermove", function (event) {
        var rect = card.getBoundingClientRect();
        var x = event.clientX - rect.left;
        var y = event.clientY - rect.top;
        card.style.setProperty("--mx", x + "px");
        card.style.setProperty("--my", y + "px");
        if (reduceMotion) return;
        card.classList.add("is-tilting");
        card.style.setProperty("--rx", ((0.5 - y / rect.height) * 5).toFixed(2) + "deg");
        card.style.setProperty("--ry", ((x / rect.width - 0.5) * 5).toFixed(2) + "deg");
      });
      card.addEventListener("pointerleave", function () {
        card.classList.remove("is-tilting");
        card.style.setProperty("--rx", "0deg");
        card.style.setProperty("--ry", "0deg");
      });
    });

    if (!reduceMotion) {
      document.querySelectorAll(".btn").forEach(function (btn) {
        btn.addEventListener("pointermove", function (event) {
          var rect = btn.getBoundingClientRect();
          var dx = event.clientX - (rect.left + rect.width / 2);
          var dy = event.clientY - (rect.top + rect.height / 2);
          btn.style.transform = "translate(" + dx * 0.18 + "px, " + (dy * 0.3 - 2) + "px)";
        });
        btn.addEventListener("pointerleave", function () {
          btn.style.transform = "";
        });
      });
    }
  }

  // ---------------------------------------------------------------------------
  // Theme toggle
  // ---------------------------------------------------------------------------
  var themeBtn = document.getElementById("theme-btn");
  var systemDark = window.matchMedia("(prefers-color-scheme: dark)");

  function currentTheme() {
    return root.getAttribute("data-theme") || (systemDark.matches ? "dark" : "light");
  }

  function syncThemeColor() {
    var bg = getComputedStyle(document.body).backgroundColor;
    document.querySelectorAll('meta[name="theme-color"]').forEach(function (meta) {
      meta.setAttribute("content", bg);
    });
  }

  if (themeBtn) {
    themeBtn.addEventListener("click", function () {
      var next = currentTheme() === "dark" ? "light" : "dark";
      root.setAttribute("data-theme", next);
      try {
        localStorage.setItem("theme", next);
      } catch (e) {}
      // Wait for the body background transition before reading its color.
      setTimeout(syncThemeColor, 550);
    });
  }

  // ---------------------------------------------------------------------------
  // Print, copy-to-clipboard and toast
  // ---------------------------------------------------------------------------
  var printBtn = document.getElementById("print-btn");
  if (printBtn) {
    printBtn.addEventListener("click", function () {
      window.print();
    });
  }

  var toast = document.getElementById("toast");
  var toastTimer;

  function showToast(message) {
    if (!toast) return;
    toast.textContent = message;
    toast.classList.add("is-visible");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () {
      toast.classList.remove("is-visible");
    }, 2200);
  }

  function copyText(text) {
    if (navigator.clipboard && window.isSecureContext) {
      return navigator.clipboard.writeText(text);
    }
    return new Promise(function (resolve, reject) {
      var area = document.createElement("textarea");
      area.value = text;
      area.setAttribute("readonly", "");
      area.style.position = "fixed";
      area.style.opacity = "0";
      document.body.appendChild(area);
      area.select();
      var ok = false;
      try {
        ok = document.execCommand("copy");
      } catch (e) {}
      document.body.removeChild(area);
      if (ok) resolve();
      else reject(new Error("copy failed"));
    });
  }

  document.querySelectorAll("[data-copy]").forEach(function (btn) {
    btn.addEventListener("click", function () {
      copyText(btn.getAttribute("data-copy")).then(
        function () {
          btn.classList.add("is-copied");
          showToast("Email copied to clipboard");
          setTimeout(function () {
            btn.classList.remove("is-copied");
          }, 1800);
        },
        function () {
          showToast("Couldn't copy – please select the address manually");
        }
      );
    });
  });
})();
