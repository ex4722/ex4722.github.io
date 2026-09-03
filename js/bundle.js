(function () {
  function apply(theme) {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("theme", theme);
  }

  function toggle() {
    var current = document.documentElement.getAttribute("data-theme") === "light" ? "light" : "dark";
    apply(current === "dark" ? "light" : "dark");
  }

  window.__theme = { apply: apply, toggle: toggle };
})();

;
(function () {
  var palette = document.getElementById("cmd-palette");
  if (!palette) return;

  var input = document.getElementById("palette-input");
  var results = document.getElementById("palette-results");
  var backdrop = document.querySelector("[data-palette-backdrop]");
  var staticRows = Array.prototype.slice.call(results.querySelectorAll(".palette-row"));
  var commands = staticRows.map(function (el) {
    return {
      cmd: el.getAttribute("data-cmd"),
      desc: el.getAttribute("data-desc"),
      href: el.getAttribute("href"),
      action: el.getAttribute("data-action"),
      color: el.style.color,
    };
  });

  var searchIndex = null;
  var selected = -1;
  var lastTrigger = null;

  function statusModeEl() {
    var buf = document.querySelector(".buf");
    return buf ? buf.querySelector(".statusline .mode") : null;
  }

  var savedMode = null;

  function isOpen() {
    return document.body.getAttribute("data-palette-open") === "true";
  }

  function render(rows) {
    results.innerHTML = "";
    rows.forEach(function (r, i) {
      var a = document.createElement(r.href ? "a" : "div");
      a.className = "palette-row";
      a.setAttribute("role", "option");
      a.style.color = r.color || "";
      if (r.href) a.href = r.href;
      if (r.action) a.setAttribute("data-action", r.action);
      var cmd = document.createElement("span");
      cmd.className = "cmd";
      cmd.style.width = "76px";
      cmd.style.flex = "none";
      cmd.textContent = r.cmd;
      var desc = document.createElement("span");
      desc.className = "desc";
      desc.textContent = r.desc;
      a.appendChild(cmd);
      a.appendChild(desc);
      a.addEventListener("click", function (e) {
        onSelectRow(e, r);
      });
      results.appendChild(a);
    });
    selected = rows.length ? 0 : -1;
    updateSelection();
  }

  function updateSelection() {
    var rows = results.querySelectorAll(".palette-row");
    rows.forEach(function (el, i) {
      el.classList.toggle("is-selected", i === selected);
    });
    if (selected >= 0 && rows[selected]) {
      rows[selected].scrollIntoView({ block: "nearest" });
    }
  }

  function onSelectRow(e, r) {
    if (e) e.preventDefault();
    if (r.action === "theme") {
      if (window.__theme) window.__theme.toggle();
      close();
    } else if (r.href) {
      close();
      window.location.assign(r.href);
    } else {
      close();
    }
  }

  function fuzzyScore(needle, haystack) {
    needle = needle.toLowerCase();
    haystack = haystack.toLowerCase();
    var hi = 0;
    for (var ni = 0; ni < needle.length; ni++) {
      hi = haystack.indexOf(needle[ni], hi);
      if (hi === -1) return -1;
      hi++;
    }
    return 1;
  }

  function loadSearchIndex(cb) {
    if (searchIndex) return cb(searchIndex);
    fetch("/search.json")
      .then(function (r) {
        return r.json();
      })
      .then(function (data) {
        searchIndex = data;
        cb(data);
      })
      .catch(function () {
        cb([]);
      });
  }

  function filter(query) {
    if (query.indexOf("search ") === 0 || query.indexOf("/") === 0) {
      var term = query.replace(/^search /, "").replace(/^\//, "");
      if (!term) {
        render([]);
        return;
      }
      loadSearchIndex(function (data) {
        var matches = data
          .filter(function (d) {
            return fuzzyScore(term, d.title + " " + d.excerpt) !== -1;
          })
          .slice(0, 12)
          .map(function (d) {
            return { cmd: d.category, desc: d.title, href: d.url, color: "" };
          });
        render(matches);
      });
      return;
    }
    var q = query.trim().replace(/^:/, "").toLowerCase();
    var matches = commands.filter(function (c) {
      return !q || c.cmd.toLowerCase().indexOf(q) !== -1 || c.desc.toLowerCase().indexOf(q) !== -1;
    });
    render(matches);
  }

  function open(prefill, trigger) {
    lastTrigger = trigger || document.activeElement;
    document.body.setAttribute("data-palette-open", "true");
    input.value = prefill || "";
    filter(input.value);
    var mode = statusModeEl();
    if (mode && !savedMode) {
      savedMode = { text: mode.textContent, style: mode.getAttribute("style") };
    }
    if (mode) {
      mode.textContent = "COMMAND";
      mode.style.setProperty("--mode", "var(--mode-command)");
    }
    requestAnimationFrame(function () {
      input.focus();
      input.setSelectionRange(input.value.length, input.value.length);
    });
  }

  function close() {
    document.body.setAttribute("data-palette-open", "false");
    var mode = statusModeEl();
    if (mode && savedMode) {
      mode.textContent = savedMode.text;
      if (savedMode.style) mode.setAttribute("style", savedMode.style);
      else mode.removeAttribute("style");
    }
    savedMode = null;
    if (lastTrigger && lastTrigger.focus) lastTrigger.focus();
  }

  document.querySelectorAll(".js-palette-open").forEach(function (btn) {
    btn.addEventListener("click", function () {
      open("", btn);
    });
  });

  if (backdrop) {
    backdrop.addEventListener("click", close);
  }

  document.addEventListener("keydown", function (e) {
    var tag = (document.activeElement && document.activeElement.tagName) || "";
    var typing = tag === "INPUT" || tag === "TEXTAREA" || document.activeElement.isContentEditable;

    if (!isOpen()) {
      if (e.key === ":" && !typing) {
        e.preventDefault();
        open("");
      } else if (e.key === "/" && !typing) {
        e.preventDefault();
        open("search ");
      }
      return;
    }

    if (e.key === "Escape") {
      close();
    } else if (e.key === "ArrowDown" || (e.ctrlKey && e.key === "n")) {
      e.preventDefault();
      var rows = results.querySelectorAll(".palette-row");
      if (rows.length) {
        selected = (selected + 1) % rows.length;
        updateSelection();
      }
    } else if (e.key === "ArrowUp" || (e.ctrlKey && e.key === "p")) {
      e.preventDefault();
      var rows2 = results.querySelectorAll(".palette-row");
      if (rows2.length) {
        selected = (selected - 1 + rows2.length) % rows2.length;
        updateSelection();
      }
    } else if (e.key === "Enter") {
      e.preventDefault();
      var rows3 = results.querySelectorAll(".palette-row");
      if (selected >= 0 && rows3[selected]) rows3[selected].click();
    } else if (e.key === "Tab") {
      var rows4 = results.querySelectorAll(".palette-row");
      if (rows4.length) {
        e.preventDefault();
        if (rows4.length === 1) {
          selected = 0;
        } else {
          selected = (selected + (e.shiftKey ? -1 : 1) + rows4.length) % rows4.length;
        }
        updateSelection();
        var cmdText = rows4[selected].querySelector(".cmd");
        if (cmdText) {
          input.value = cmdText.textContent + " ";
          filter(input.value);
          input.focus();
          input.setSelectionRange(input.value.length, input.value.length);
        }
      }
    }
  });

  input.addEventListener("input", function () {
    filter(input.value);
  });

  // mobile swipe-down to close
  var touchStartY = null;
  palette.addEventListener(
    "touchstart",
    function (e) {
      touchStartY = e.touches[0].clientY;
    },
    { passive: true }
  );
  palette.addEventListener(
    "touchend",
    function (e) {
      if (touchStartY === null) return;
      var dy = e.changedTouches[0].clientY - touchStartY;
      if (dy > 60) close();
      touchStartY = null;
    },
    { passive: true }
  );

  window.__palette = { open: open, close: close };
})();

;
(function () {
  var lightbox = document.getElementById("lightbox");
  if (!lightbox) return;

  var imgEl = document.getElementById("lightbox-img");
  var capEl = document.getElementById("lightbox-cap");
  var countEl = document.getElementById("lightbox-count");
  var triggers = Array.prototype.slice.call(document.querySelectorAll("[data-lightbox-src]"));
  var current = -1;
  var lastFocus = null;

  function captionFor(el) {
    var fig = el.closest("figure");
    var text = "";
    if (fig) {
      var cap = fig.querySelector("figcaption");
      if (cap) text = cap.textContent.trim();
    }
    return text || el.alt || "";
  }

  function show(index) {
    if (index < 0 || index >= triggers.length) return;
    current = index;
    var el = triggers[index];
    imgEl.classList.remove("is-shown");
    imgEl.src = el.getAttribute("data-lightbox-src");
    imgEl.alt = el.alt || "";
    imgEl.onload = function () {
      imgEl.classList.add("is-shown");
    };
    capEl.textContent = captionFor(el) + (triggers.length > 1 ? " · " + (index + 1) + " of " + triggers.length : "");
    countEl.textContent = index + 1 + "/" + triggers.length;
  }

  function open(index, trigger) {
    lastFocus = trigger || document.activeElement;
    show(index);
    lightbox.classList.add("is-open");
    lightbox.setAttribute("aria-hidden", "false");
    lightbox.setAttribute("tabindex", "-1");
    lightbox.focus();
    document.body.style.overflow = "hidden";
  }

  function close() {
    lightbox.classList.remove("is-open");
    lightbox.setAttribute("aria-hidden", "true");
    document.body.style.overflow = "";
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }

  function next() {
    show((current + 1) % triggers.length);
  }

  function prev() {
    show((current - 1 + triggers.length) % triggers.length);
  }

  triggers.forEach(function (el, i) {
    el.addEventListener("click", function () {
      open(i, el);
    });
    el.addEventListener("keydown", function (e) {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        open(i, el);
      }
    });
  });

  lightbox.addEventListener("click", function (e) {
    if (e.target === lightbox || e.target.classList.contains("lightbox-body")) close();
  });

  lightbox.addEventListener("keydown", function (e) {
    if (e.key === "Escape" || e.key === "q") close();
    else if (e.key === "h" || e.key === "ArrowLeft") prev();
    else if (e.key === "l" || e.key === "ArrowRight") next();
  });

  var touchStartX = null;
  lightbox.addEventListener(
    "touchstart",
    function (e) {
      touchStartX = e.touches[0].clientX;
    },
    { passive: true }
  );
  lightbox.addEventListener(
    "touchend",
    function (e) {
      if (touchStartX === null) return;
      var dx = e.changedTouches[0].clientX - touchStartX;
      if (dx > 50) prev();
      else if (dx < -50) next();
      touchStartX = null;
    },
    { passive: true }
  );
})();

;
(function () {
  // measure the real statusline height (fixed-positioned, so it's out of
  // flow) and publish it as a CSS var everything else reads from, instead
  // of guessing a hardcoded px offset. Recomputed on resize and via
  // ResizeObserver so it stays correct across breakpoint/orientation changes.
  function trackHeight(el, varName) {
    if (!el) return;
    function update() {
      var h = el.getBoundingClientRect().height;
      document.documentElement.style.setProperty(varName, h + "px");
    }
    update();
    window.addEventListener("resize", update);
    if (window.ResizeObserver) new ResizeObserver(update).observe(el);
  }

  trackHeight(document.querySelector(".statusline"), "--statusline-h");

  // scroll progress + ln/pct on post pages, plus TOC scroll-spy
  var isPost = document.querySelector(".page-post");
  if (isPost) {
    var fill = document.getElementById("progress-fill");
    var lnCell = document.getElementById("status-ln");
    var pctCell = document.getElementById("status-pct");
    var totalMatch = lnCell && lnCell.textContent.match(/\/(\d+)/);
    var total = totalMatch ? parseInt(totalMatch[1], 10) : 0;

    var headings = Array.prototype.slice.call(document.querySelectorAll(".post-body h2[id]"));
    var tocLinks = Array.prototype.slice.call(document.querySelectorAll(".toc a[href^='#']"));

    function updateTocSpy() {
      if (!headings.length || !tocLinks.length) return;
      var current = null;
      for (var i = 0; i < headings.length; i++) {
        if (headings[i].getBoundingClientRect().top <= 96) current = headings[i];
      }
      tocLinks.forEach(function (a) {
        var match = current && a.getAttribute("href") === "#" + current.id;
        a.classList.toggle("is-current", !!match);
      });
    }

    function onScroll() {
      var doc = document.documentElement;
      var scrollable = doc.scrollHeight - doc.clientHeight;
      var pct = scrollable > 0 ? Math.min(1, Math.max(0, doc.scrollTop / scrollable)) : 0;
      if (fill) fill.style.width = pct * 100 + "%";
      if (pctCell) pctCell.textContent = Math.round(pct * 100) + "%";
      if (lnCell && total) lnCell.textContent = "ln " + Math.max(1, Math.round(pct * total)) + "/" + total;
      updateTocSpy();
    }

    document.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
  }

  // netrw-style cursor on the /posts/ listing: j/k move a highlighted row
  // instead of scrolling the page, Enter opens it. Desktop only — on mobile
  // there's no keyboard driving this, so plain touch-scroll stays untouched.
  var netrwList = document.querySelector(".netrw-list");
  var netrwEntries = netrwList ? Array.prototype.slice.call(netrwList.querySelectorAll(".netrw-entry")) : [];
  var netrwIndex = 0;
  var isDesktop = window.matchMedia("(min-width: 900px)").matches;

  function netrwActive() {
    return netrwEntries.length > 0 && window.matchMedia("(min-width: 900px)").matches;
  }

  function setNetrwCursor(i) {
    netrwIndex = Math.max(0, Math.min(netrwEntries.length - 1, i));
    netrwEntries.forEach(function (el, idx) {
      el.classList.toggle("is-cursor", idx === netrwIndex);
    });
    netrwEntries[netrwIndex].scrollIntoView({ block: "nearest" });
  }

  if (netrwEntries.length && isDesktop) {
    setNetrwCursor(0);
  }

  // neovim-style buffer navigation: h/j/k/l scroll, gg/G jump to top/bottom,
  // Ctrl-U/Ctrl-D half-page scroll. Skipped while typing or while the
  // command palette is open.
  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var STEP = 90;

  // rAF-driven smooth scroll: repeated taps add to one running target
  // instead of each keydown starting its own competing native smooth-scroll
  // animation (which is what made rapid j/j/j presses feel choppy/janky).
  var scrollTarget = { x: window.scrollX, y: window.scrollY };
  var scrollRaf = null;

  function stepScroll() {
    var dx = scrollTarget.x - window.scrollX;
    var dy = scrollTarget.y - window.scrollY;
    if (Math.abs(dx) < 0.5 && Math.abs(dy) < 0.5) {
      window.scrollTo(scrollTarget.x, scrollTarget.y);
      scrollRaf = null;
      return;
    }
    window.scrollBy(dx * 0.22, dy * 0.22);
    scrollRaf = requestAnimationFrame(stepScroll);
  }

  function maxScroll() {
    var doc = document.documentElement;
    return { x: doc.scrollWidth - doc.clientWidth, y: doc.scrollHeight - doc.clientHeight };
  }

  function smoothScrollBy(dx, dy) {
    if (reduceMotion) {
      window.scrollBy(dx, dy);
      scrollTarget.x = window.scrollX;
      scrollTarget.y = window.scrollY;
      return;
    }
    var bounds = maxScroll();
    scrollTarget.x = Math.max(0, Math.min(bounds.x, scrollTarget.x + dx));
    scrollTarget.y = Math.max(0, Math.min(bounds.y, scrollTarget.y + dy));
    if (!scrollRaf) scrollRaf = requestAnimationFrame(stepScroll);
  }

  function smoothScrollTo(x, y) {
    scrollTarget.x = x;
    scrollTarget.y = y;
    if (reduceMotion) {
      window.scrollTo(x, y);
    } else if (!scrollRaf) {
      scrollRaf = requestAnimationFrame(stepScroll);
    }
  }

  // a manual wheel/touch scroll should reset the target under the cursor's
  // fingers, not fight the in-flight animation on the next keypress
  window.addEventListener(
    "wheel",
    function () {
      scrollTarget.x = window.scrollX;
      scrollTarget.y = window.scrollY;
    },
    { passive: true }
  );

  var lastG = 0;

  document.addEventListener("keydown", function (e) {
    var tag = (document.activeElement && document.activeElement.tagName) || "";
    var typing = tag === "INPUT" || tag === "TEXTAREA" || document.activeElement.isContentEditable;
    if (typing) return;
    if (document.body.getAttribute("data-palette-open") === "true") return;

    if (netrwActive() && (e.key === "j" || e.key === "k")) {
      e.preventDefault();
      setNetrwCursor(netrwIndex + (e.key === "j" ? 1 : -1));
      return;
    }
    if (netrwActive() && e.key === "Enter") {
      e.preventDefault();
      window.location.assign(netrwEntries[netrwIndex].getAttribute("href"));
      return;
    }
    if (netrwActive() && e.key === "G") {
      setNetrwCursor(netrwEntries.length - 1);
      return;
    }

    if (e.ctrlKey && (e.key === "d" || e.key === "D")) {
      e.preventDefault();
      smoothScrollBy(0, window.innerHeight / 2);
    } else if (e.ctrlKey && (e.key === "u" || e.key === "U")) {
      e.preventDefault();
      smoothScrollBy(0, -window.innerHeight / 2);
    } else if (e.ctrlKey || e.metaKey || e.altKey) {
      return;
    } else if (e.key === "j") {
      smoothScrollBy(0, STEP);
    } else if (e.key === "k") {
      smoothScrollBy(0, -STEP);
    } else if (e.key === "h") {
      smoothScrollBy(-STEP, 0);
    } else if (e.key === "l") {
      smoothScrollBy(STEP, 0);
    } else if (e.key === "G") {
      smoothScrollTo(scrollTarget.x, maxScroll().y);
    } else if (e.key === "g") {
      var now = Date.now();
      if (now - lastG < 500) {
        if (netrwActive()) setNetrwCursor(0);
        else smoothScrollTo(scrollTarget.x, 0);
        lastG = 0;
      } else {
        lastG = now;
      }
    }
  });
})();
