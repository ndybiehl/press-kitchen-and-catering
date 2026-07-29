(function () {
  var toggle = document.getElementById("nav-toggle");
  var mobile = document.getElementById("nav-m");
  if (toggle && mobile) {
    toggle.addEventListener("click", function () {
      var open = mobile.classList.toggle("open");
      toggle.setAttribute("aria-expanded", open ? "true" : "false");
    });
    mobile.querySelectorAll("a").forEach(function (a) {
      a.addEventListener("click", function () {
        mobile.classList.remove("open");
        toggle.setAttribute("aria-expanded", "false");
      });
    });
  }

  var tabs = Array.prototype.slice.call(document.querySelectorAll(".tab"));
  var panels = Array.prototype.slice.call(document.querySelectorAll(".panel"));
  tabs.forEach(function (tab) {
    tab.addEventListener("click", function () {
      var id = tab.getAttribute("aria-controls");
      tabs.forEach(function (t) {
        t.setAttribute("aria-selected", t === tab ? "true" : "false");
      });
      panels.forEach(function (p) {
        var on = p.id === id;
        p.classList.toggle("on", on);
        if (on) p.removeAttribute("hidden");
        else p.setAttribute("hidden", "");
      });
    });
  });

  if (location.search.indexOf("sent=1") !== -1) {
    var st = document.getElementById("form-status");
    if (st) {
      st.className = "form-status ok";
      st.textContent = "Thanks! Your request was sent.";
    }
  }

  /* Schedule (optional API — graceful if static-only host) */
  var sched = {
    stops: [],
    viewYear: null,
    viewMonth: null,
    selectedDate: null,
    today: null,
  };

  function pad(n) {
    return String(n).padStart(2, "0");
  }
  function todayISO() {
    var d = new Date();
    return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate());
  }
  function fmtDate(iso) {
    if (!iso) return "";
    var p = iso.split("-").map(Number);
    return new Date(p[0], p[1] - 1, p[2]).toLocaleDateString(undefined, {
      weekday: "short",
      month: "short",
      day: "numeric",
    });
  }
  function fmtDateLong(iso) {
    if (!iso) return "";
    var p = iso.split("-").map(Number);
    return new Date(p[0], p[1] - 1, p[2]).toLocaleDateString(undefined, {
      weekday: "long",
      month: "long",
      day: "numeric",
    });
  }
  function fmtTime(t) {
    if (!t) return "";
    var parts = t.split(":").map(Number);
    var h = parts[0],
      min = parts[1];
    var ampm = h >= 12 ? "PM" : "AM";
    var h12 = ((h + 11) % 12) + 1;
    return h12 + ":" + pad(min) + " " + ampm;
  }
  function timeRange(s) {
    if (s.startTime && s.endTime) return fmtTime(s.startTime) + " – " + fmtTime(s.endTime);
    if (s.startTime) return "From " + fmtTime(s.startTime);
    return "";
  }
  function esc(str) {
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }
  function mapsHref(s) {
    if (s.lat != null && s.lng != null) {
      return (
        "https://www.google.com/maps/dir/?api=1&destination=" +
        encodeURIComponent(s.lat + "," + s.lng)
      );
    }
    if (s.address) {
      return (
        "https://www.google.com/maps/dir/?api=1&destination=" +
        encodeURIComponent(s.address)
      );
    }
    return null;
  }
  function stopCard(s) {
    var g = mapsHref(s);
    var place = s.address
      ? esc(s.address)
      : s.lat != null
        ? esc(s.lat + ", " + s.lng)
        : "Location TBA";
    var when = fmtDate(s.date) + (timeRange(s) ? " · " + timeRange(s) : "");
    var btn = g
      ? '<div class="acts"><a class="btn btn-sm" href="' +
        g +
        '" target="_blank" rel="noopener">Directions</a></div>'
      : "";
    return (
      '<article class="stop"><div class="when">' +
      esc(when) +
      "</div><h4>" +
      esc(s.title || "Press stop") +
      '</h4><p class="place">' +
      place +
      "</p>" +
      (s.notes ? '<p class="notes">' + esc(s.notes) + "</p>" : "") +
      btn +
      "</article>"
    );
  }
  function stopsOn(iso) {
    return sched.stops.filter(function (s) {
      return s.date === iso;
    });
  }

  function renderList() {
    var listEl = document.getElementById("stop-list");
    var titleEl = document.getElementById("day-title");
    if (!listEl) return;
    var list;
    if (sched.selectedDate) {
      list = stopsOn(sched.selectedDate);
      titleEl.textContent = fmtDateLong(sched.selectedDate);
      if (!list.length) {
        listEl.innerHTML =
          '<p class="empty">No stop this day.</p>' +
          (function () {
            var up = sched.stops
              .filter(function (s) {
                return s.date >= (sched.today || todayISO());
              })
              .slice(0, 10);
            return up.length
              ? up.map(stopCard).join("")
              : "";
          })();
        return;
      }
      listEl.innerHTML = list.map(stopCard).join("");
      return;
    }
    titleEl.textContent = "Upcoming stops";
    list = sched.stops
      .filter(function (s) {
        return s.date >= (sched.today || todayISO());
      })
      .slice(0, 20);
    if (!list.length) {
      listEl.innerHTML =
        '<p class="empty">No upcoming stops posted yet. Email <a href="mailto:press.catering406@gmail.com">press.catering406@gmail.com</a>.</p>';
      return;
    }
    listEl.innerHTML = list.map(stopCard).join("");
  }

  function renderCal() {
    var y = sched.viewYear,
      m = sched.viewMonth;
    var label = document.getElementById("month-label");
    var daysEl = document.getElementById("days");
    var dowsEl = document.getElementById("dows");
    if (!label || !daysEl) return;
    label.textContent = new Date(y, m, 1).toLocaleDateString(undefined, {
      month: "long",
      year: "numeric",
    });
    var dows = ["S", "M", "T", "W", "T", "F", "S"];
    dowsEl.innerHTML = dows
      .map(function (d) {
        return '<div class="dow">' + d + "</div>";
      })
      .join("");
    var first = new Date(y, m, 1);
    var startPad = first.getDay();
    var daysInMonth = new Date(y, m + 1, 0).getDate();
    var prevDays = new Date(y, m, 0).getDate();
    var today = sched.today || todayISO();
    var cells = [];
    var i, day, iso, pm, py, nm, ny;
    for (i = 0; i < startPad; i++) {
      day = prevDays - startPad + i + 1;
      pm = m === 0 ? 11 : m - 1;
      py = m === 0 ? y - 1 : y;
      iso = py + "-" + pad(pm + 1) + "-" + pad(day);
      cells.push({ iso: iso, day: day, muted: true });
    }
    for (day = 1; day <= daysInMonth; day++) {
      iso = y + "-" + pad(m + 1) + "-" + pad(day);
      cells.push({ iso: iso, day: day, muted: false });
    }
    while (cells.length % 7 !== 0) {
      day = cells.length - (startPad + daysInMonth) + 1;
      nm = m === 11 ? 0 : m + 1;
      ny = m === 11 ? y + 1 : y;
      iso = ny + "-" + pad(nm + 1) + "-" + pad(day);
      cells.push({ iso: iso, day: day, muted: true });
    }
    daysEl.innerHTML = cells
      .map(function (c) {
        var n = stopsOn(c.iso).length;
        var cls = ["day"];
        if (c.muted) cls.push("muted");
        if (c.iso === today) cls.push("today");
        if (c.iso === sched.selectedDate) cls.push("sel");
        if (n) cls.push("has");
        return (
          '<button type="button" class="' +
          cls.join(" ") +
          '" data-date="' +
          c.iso +
          '"><span class="n">' +
          c.day +
          "</span>" +
          (n ? '<span class="pip"></span>' : "") +
          "</button>"
        );
      })
      .join("");
    daysEl.querySelectorAll("[data-date]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        sched.selectedDate = btn.getAttribute("data-date");
        renderCal();
        renderList();
      });
    });
  }

  function loadSchedule() {
    fetch("/api/locations")
      .then(function (r) {
        if (!r.ok) throw new Error("no api");
        return r.json();
      })
      .then(function (data) {
        sched.stops = data.stops || [];
        sched.today = data.today || todayISO();
        var t = sched.today.split("-").map(Number);
        if (sched.viewYear == null) {
          sched.viewYear = t[0];
          sched.viewMonth = t[1] - 1;
        }
        var note = document.getElementById("sched-note");
        if (note && data.updatedAt) {
          note.textContent =
            "Schedule updated " + new Date(data.updatedAt).toLocaleString();
        }
        renderCal();
        renderList();
      })
      .catch(function () {
        var listEl = document.getElementById("stop-list");
        if (listEl) {
          listEl.innerHTML =
            '<p class="empty">Schedule coming soon. Email <a href="mailto:press.catering406@gmail.com">press.catering406@gmail.com</a> for today’s location.</p>';
        }
        sched.today = todayISO();
        var t = sched.today.split("-").map(Number);
        sched.viewYear = t[0];
        sched.viewMonth = t[1] - 1;
        renderCal();
      });
  }

  var prev = document.getElementById("prev-m");
  var next = document.getElementById("next-m");
  if (prev) {
    prev.addEventListener("click", function () {
      if (sched.viewMonth === 0) {
        sched.viewMonth = 11;
        sched.viewYear--;
      } else sched.viewMonth--;
      renderCal();
    });
  }
  if (next) {
    next.addEventListener("click", function () {
      if (sched.viewMonth === 11) {
        sched.viewMonth = 0;
        sched.viewYear++;
      } else sched.viewMonth++;
      renderCal();
    });
  }
  loadSchedule();
})();
