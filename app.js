/* Päivystyskalenteri MVP: tarkoituksella palvelimeton demo. */
(function () {
  "use strict";
  var KEY = "paivystyskalenteri-mvp-v1";
  var USERS = {
    doctor: { id: "doctor", name: "Minna Laine", role: "doctor", roleLabel: "Päivystäjä", username: "lääkäri", password: "demo123" },
    doctor2: { id: "doctor2", name: "Mikko Virtanen", role: "doctor", roleLabel: "Päivystäjä", username: "mikko", password: "demo123" },
    doctor3: { id: "doctor3", name: "Laura Niemi", role: "doctor", roleLabel: "Päivystäjä", username: "laura", password: "demo123" },
    admin: { id: "admin", name: "Sari Esihenkilö", role: "admin", roleLabel: "Esihenkilö / käsittelijä", username: "esihenkilö", password: "demo123" }
  };
  var days = ["Su", "Ma", "Ti", "Ke", "To", "Pe", "La"];
  var DEMO_BASE_RATES = { weekday: 100, weekend: 150, holiday: 200 };
  var state = load(), weekOffset = 0, monthOffset = 0, calendarMode = "week", MAX_BOOKED_SHIFTS = 2;
  function currentUser() { return USERS[state.currentUserId] || null; }
  function isoDate(date) { return [date.getFullYear(), String(date.getMonth() + 1).padStart(2, "0"), String(date.getDate()).padStart(2, "0")].join("-"); }
  function localDate(iso) { var p = iso.split("-").map(Number); return new Date(p[0], p[1] - 1, p[2]); }
  function monthStart(offset) { var d = new Date(); d.setHours(0, 0, 0, 0); return new Date(d.getFullYear(), d.getMonth() + offset, 1); }
  function monthKey(date) { return date.getFullYear() + "-" + String(date.getMonth() + 1).padStart(2, "0"); }
  function horizonBounds() { var start = monthStart(0), end = new Date(start.getFullYear(), start.getMonth() + 4, 0); end.setHours(23, 59, 59, 999); return { start: start, end: end }; }
  function dateInHorizon(iso) { var d = localDate(iso), bounds = horizonBounds(); return d >= bounds.start && d <= bounds.end; }
  function bookedCount(userId, month) { return state.shifts.filter(function (s) { return s.bookedById === userId && (!month || monthKey(localDate(s.date)) === month); }).length; }
  function newestOpenMonthKey() { return monthKey(monthStart(3)); }
  function monthDates(offset) { var start = monthStart(offset), count = new Date(start.getFullYear(), start.getMonth() + 1, 0).getDate(); return Array.from({ length: count }, function (_, i) { var d = new Date(start); d.setDate(i + 1); return isoDate(d); }); }
  function dateLabel(iso) { return localDate(iso).toLocaleDateString("fi-FI", { day: "numeric", month: "numeric", year: "numeric" }); }
  function timePart(value) { return value && value.indexOf("T") !== -1 ? value.split("T")[1].slice(0, 5) : (value || ""); }
  function actualDateTime(date, time, overnight) {
    var d = localDate(date);
    if (overnight) d.setDate(d.getDate() + 1);
    return isoDate(d) + "T" + time;
  }
  function weekDates(offset) { var now = new Date(); now.setHours(0, 0, 0, 0); var monday = new Date(now); var day = (monday.getDay() + 6) % 7; monday.setDate(monday.getDate() - day + offset * 7); return Array.from({ length: 7 }, function (_, i) { var d = new Date(monday); d.setDate(d.getDate() + i); return isoDate(d); }); }
  function defaultState() {
    var shifts = [], ids = {};
    function addShift(shift) {
      if (ids[shift.id]) return;
      ids[shift.id] = true;
      shifts.push(shift);
    }
    var dates = weekDates(0);
    dates.forEach(function (date, i) {
      if ([5, 12, 19, 26].indexOf(localDate(date).getDate()) !== -1) return;
      if (i > 0 && i < 6) addShift({ id: "demo-" + date + "-a", date: date, start: "08:00", end: "16:00", location: "Keski-Suomen päivystys", bookedBy: null, bookedById: null, bookedAt: null });
      if (i === 2) addShift({ id: "demo-" + date + "-b", date: date, start: "16:00", end: "08:00", location: "Keski-Suomen päivystys", bookedBy: "Mikko Virtanen", bookedById: null, bookedAt: null });
      if (i === 4) addShift({ id: "demo-" + date + "-b", date: date, start: "16:00", end: "08:00", location: "Keski-Suomen päivystys", bookedBy: "Minna Laine", bookedById: "doctor", bookedAt: null });
    });
    for (var offset = 0; offset < 4; offset++) {
      [5, 12, 19, 26].forEach(function (day, index) {
        var date = isoDate(new Date(monthStart(offset).getFullYear(), monthStart(offset).getMonth(), day));
        ["00:00|08:00", "08:00|16:00", "16:00|24:00"].forEach(function (slot, slotIndex) {
          var times = slot.split("|"), owner = slotIndex === 2 && index === 1 ? "Mikko Virtanen" : slotIndex === 2 && index === 2 ? "Minna Laine" : null;
          addShift({ id: "demo-" + date + "-" + slotIndex, date: date, start: times[0], end: times[1], location: "Keski-Suomen päivystys", bookedBy: owner, bookedById: owner === "Minna Laine" ? "doctor" : owner === "Mikko Virtanen" ? "doctor2" : null, bookedAt: null });
        });
      });
    }
    return { shifts: shifts, notifications: [], bookingLog: [], cancellationRequests: [], audit: [{ at: new Date().toISOString(), text: "Demoaineisto ladattu" }], currentUserId: null, loginAt: null, userLoginAt: {} };
  }
  function load() {
    var saved;
    try { saved = JSON.parse(localStorage.getItem(KEY)); } catch (e) { saved = null; }
    var data = saved || defaultState();
    data.shifts = data.shifts || []; data.notifications = data.notifications || []; data.bookingLog = data.bookingLog || []; data.cancellationRequests = data.cancellationRequests || []; data.audit = data.audit || [];
    data.currentUserId = USERS[data.currentUserId] ? data.currentUserId : null; data.loginAt = data.loginAt || null; data.userLoginAt = data.userLoginAt || {};
    data.shifts.forEach(function (s) { s.bookedById = s.bookedById || (s.bookedBy === "Minna Laine" ? "doctor" : s.bookedBy === "Mikko Virtanen" ? "doctor2" : s.bookedBy === "Laura Niemi" ? "doctor3" : null); s.bookedAt = s.bookedAt || null; });
    var migratedShiftIds = migrateDemoCoverage(data);
    data.notifications.forEach(function (n) {
      n.shiftId = migratedShiftIds[n.shiftId] || n.shiftId;
      var shift = data.shifts.find(function (s) { return s.id === n.shiftId; });
      n.ownerId = n.ownerId || (shift && shift.bookedById) || "doctor"; n.ownerName = n.ownerName || (shift && shift.bookedBy) || "Minna Laine"; n.createdAt = n.createdAt || null;
      n.urgentCount = Number.isFinite(Number(n.urgentCount)) && Number(n.urgentCount) >= 0 ? Number(n.urgentCount) : 0;
      n.basicCount = Number.isFinite(Number(n.basicCount)) && Number(n.basicCount) >= 0 ? Number(n.basicCount) : 0;
      n.triageCount = Number.isFinite(Number(n.triageCount)) && Number(n.triageCount) >= 0 ? Number(n.triageCount) : 0;
      n.compensation = n.compensation === undefined ? "0" : n.compensation;
      n.crowdClearing = n.crowdClearing || "Ei";
      n.doctorSignature = n.doctorSignature || null;
      n.adminSignature = n.adminSignature || null;
    });
    return data;
  }
  function migrateDemoCoverage(data) {
    var migratedShiftIds = {};
    for (var offset = 0; offset < 4; offset++) [5, 12, 19, 26].forEach(function (day) {
      var date = isoDate(new Date(monthStart(offset).getFullYear(), monthStart(offset).getMonth(), day));
      var oldDay = data.shifts.find(function (s) { return s.id === "demo-" + date + "-day"; });
      var oldNight = data.shifts.find(function (s) { return s.id === "demo-" + date + "-night"; });
      var oldA = data.shifts.find(function (s) { return s.id === "demo-" + date + "-a"; }), oldB = data.shifts.find(function (s) { return s.id === "demo-" + date + "-b"; });
      var migrated = [{ source: oldDay || oldA, target: "demo-" + date + "-1" }, { source: oldNight || oldB, target: "demo-" + date + "-2" }];
      migrated.forEach(function (item) {
        if (item.source && data.notifications) data.notifications.forEach(function (n) {
          if (n.shiftId === item.source.id) n.shiftId = item.target;
        });
      });
      if (oldDay) migratedShiftIds[oldDay.id] = "demo-" + date + "-1";
      if (oldA) migratedShiftIds[oldA.id] = "demo-" + date + "-1";
      if (oldNight) migratedShiftIds[oldNight.id] = "demo-" + date + "-2";
      if (oldB) migratedShiftIds[oldB.id] = "demo-" + date + "-2";
      data.shifts = data.shifts.filter(function (s) { return s.id !== "demo-" + date + "-day" && s.id !== "demo-" + date + "-night" && s.id !== "demo-" + date + "-a" && s.id !== "demo-" + date + "-b"; });
      ["00:00|08:00", "08:00|16:00", "16:00|24:00"].forEach(function (slot, index) {
        var times = slot.split("|"), existing = data.shifts.find(function (s) { return s.id === "demo-" + date + "-" + index; }), source = index === 1 ? (oldDay || oldA) : index === 2 ? (oldNight || oldB) : null;
        if (!existing) data.shifts.push({ id: "demo-" + date + "-" + index, date: date, start: times[0], end: times[1], location: "Keski-Suomen päivystys", bookedBy: source ? source.bookedBy : null, bookedById: source ? source.bookedById : null, bookedAt: source ? source.bookedAt : null });
      });
    });
    return migratedShiftIds;
  }
  function save() { localStorage.setItem(KEY, JSON.stringify(state)); }
  function log(text) { state.audit.unshift({ at: new Date().toISOString(), text: text }); save(); }
  function bookingLog(type, shift, actor, previous) {
    state.bookingLog.unshift({ at: new Date().toISOString(), type: type, shiftId: shift.id, date: shift.date, start: shift.start, end: shift.end, booker: shift.bookedBy || null, bookerId: shift.bookedById || null, actor: actor ? actor.name : "Järjestelmä", previousBooker: previous || null });
  }
  function showToast(text) { var el = document.getElementById("toast"); el.textContent = text; el.classList.add("show"); setTimeout(function () { el.classList.remove("show"); }, 2800); }
  function statusLabel(s) { return { draft: "Luonnos", sent: "Lähetetty", correction: "Korjattava", approved: "Hyväksytty", delivered: "Toimitettu" }[s] || s; }
  function statusClass(s) { return s === "correction" ? "correction" : s; }
  function isAdmin() { return currentUser() && currentUser().role === "admin"; }
  function isDemoHoliday(iso) {
    var monthDay = iso.slice(5);
    return ["01-01", "01-06", "05-01", "12-06", "12-24", "12-25", "12-26"].indexOf(monthDay) !== -1;
  }
  function demoBaseCompensation(iso) {
    iso = iso || isoDate(new Date());
    if (isDemoHoliday(iso)) return DEMO_BASE_RATES.holiday;
    var day = localDate(iso).getDay();
    return day === 0 || day === 6 ? DEMO_BASE_RATES.weekend : DEMO_BASE_RATES.weekday;
  }
  function patientTotal(n) { return Number(n.urgentCount || 0) + Number(n.basicCount || 0) + Number(n.triageCount || 0); }
  function money(value) { return Number(value || 0).toFixed(2); }
  function signatureText(signature, label) {
    return signature ? '<div class="signature-status"><strong>' + label + ":</strong> " + signature.name + " (" + signature.username + ") · " + new Date(signature.at).toLocaleString("fi-FI") + "</div>" : '<div class="signature-status unsigned">' + label + ": Ei vielä allekirjoitettu</div>";
  }
  function signNotification(id, kind) {
    var user = currentUser(), n = state.notifications.find(function (x) { return x.id === id; });
    if (!user || !n || (kind === "doctor" && (isAdmin() || n.ownerId !== user.id)) || (kind === "admin" && !isAdmin())) return;
    n[kind === "doctor" ? "doctorSignature" : "adminSignature"] = { name: user.name, username: user.username, role: user.roleLabel, at: new Date().toISOString() };
    log((kind === "doctor" ? "Lääkäri" : "Esihenkilö") + " kuittasi ilmoituksen toteuman: " + dateLabel(n.shift));
    renderAll(); showToast("Demo-kuittaus tallennettu");
  }
  function shiftCard(s, user) {
    var mine = user && s.bookedById === user.id, booked = !!s.bookedBy;
    var request = state.cancellationRequests.filter(function (r) { return r.shiftId === s.id && r.doctorId === (user && user.id); }).sort(function (a, b) { return new Date(b.requestedAt) - new Date(a.requestedAt); })[0];
    var atLimit = user && !isAdmin() && bookedCount(user.id) >= MAX_BOOKED_SHIFTS;
    var canCancel = mine && s.bookedAt && Date.now() - new Date(s.bookedAt).getTime() <= 15 * 60 * 1000;
    var action = !booked && user && !isAdmin() && !atLimit && dateInHorizon(s.date) ? '<button class="button primary book" data-id="' + s.id + '">Varaa vuoro</button>' : "";
    if (!booked && atLimit && user && !isAdmin()) action = '<span class="shift-limit">Kahden vuoron enimmäismäärä täynnä</span>';
    if (mine) {
      action += canCancel ? '<button class="button danger cancel" data-id="' + s.id + '">Peru varaus</button>' : (request && request.status === "pending" ? '<span class="shift-limit">Peruutuspyyntö lähetetty ' + new Date(request.requestedAt).toLocaleString("fi-FI") + "</span>" : (request && request.status === "rejected" ? '<span class="shift-limit">Peruutuspyyntö hylätty</span><button class="button danger cancel-request" data-id="' + s.id + '">Lähetä uusi peruutuspyyntö</button>' : '<button class="button danger cancel-request" data-id="' + s.id + '">Lähetä peruutuspyyntö</button>'));
    }
    if (isAdmin() && booked) action += '<div class="admin-shift-actions"><label class="transfer-label">Siirrä varaajalle<select class="transfer-target" data-id="' + s.id + '">' + Object.keys(USERS).filter(function (id) { return USERS[id].role !== "admin"; }).map(function (id) { return '<option value="' + id + '"' + (id === s.bookedById ? " selected" : "") + ">" + USERS[id].name + "</option>"; }).join("") + '</select></label><button class="button secondary admin-transfer" data-id="' + s.id + '">Siirrä</button><button class="button danger admin-release" data-id="' + s.id + '">Tyhjennä varaus</button></div>';
    return '<article class="shift ' + (mine ? "mine" : booked ? "booked" : "") + '"><time>' + s.start + " – " + s.end + '</time><div class="location">' + s.location + '</div>' + (booked ? '<div class="booker">Varaaja: <strong>' + s.bookedBy + "</strong></div>" : "") + '<div class="shift-status ' + (mine ? "mine" : booked ? "booked" : "free") + '">' + (mine ? "Oma vuoro" : booked ? "Varattu" : "Vapaa") + "</div>" + action + "</article>";
  }
  function renderCalendar() {
    var grid = document.getElementById("calendar-grid"), user = currentUser(), dates, label;
    if (calendarMode === "month") {
      if (!isAdmin()) monthOffset = Math.max(0, Math.min(3, monthOffset));
      dates = monthDates(monthOffset);
      var month = monthStart(monthOffset), firstDay = month.getDay();
      label = month.toLocaleDateString("fi-FI", { month: "long", year: "numeric" });
      grid.classList.add("month-mode");
      grid.innerHTML = days.map(function (d) { return '<div class="month-weekday">' + d + "</div>"; }).join("") +
        Array.from({ length: firstDay }, function () { return '<div class="month-cell outside"></div>'; }).join("") +
        dates.map(function (date) {
          var shifts = state.shifts.filter(function (s) { return s.date === date && (isAdmin() || dateInHorizon(s.date)); });
          return '<div class="month-cell day-click ' + (date === isoDate(new Date()) ? "today" : "") + '" data-date="' + date + '"><div class="month-date">' + localDate(date).getDate() + "</div>" + (shifts.map(function (s) { return shiftCard(s, user); }).join("") || '<div class="month-empty">Ei vuoroja</div>') + "</div>";
        }).join("");
    } else {
      dates = weekDates(weekOffset);
      grid.classList.remove("month-mode");
      var start = localDate(dates[0]), end = localDate(dates[6]);
      label = start.toLocaleDateString("fi-FI", { day: "numeric", month: "long" }) + " – " + end.toLocaleDateString("fi-FI", { day: "numeric", month: "long", year: "numeric" });
      grid.innerHTML = dates.map(function (date, i) {
      var shifts = state.shifts.filter(function (s) { return s.date === date && (isAdmin() || dateInHorizon(s.date)); });
      return '<div class="day-column day-click ' + (date === isoDate(new Date()) ? "today" : "") + '" data-date="' + date + '"><div class="day-head">' + days[(i + 1) % 7] + '<strong>' + localDate(date).getDate() + "</strong></div>" + (shifts.map(function (s) { return shiftCard(s, user); }).join("") || '<div class="empty">Ei vuoroja</div>') + "</div>";
      }).join("");
    }
    document.getElementById("period-label").textContent = label;
    var adminMin = state.shifts.length ? Math.min.apply(null, state.shifts.map(function (s) { return localDate(s.date).getFullYear() * 12 + localDate(s.date).getMonth(); })) - (new Date().getFullYear() * 12 + new Date().getMonth()) : -12;
    document.getElementById("prev-period").disabled = isAdmin() ? (calendarMode === "month" ? monthOffset <= adminMin : weekOffset <= Math.floor(adminMin * 4.35)) : (calendarMode === "month" ? monthOffset <= 0 : !dateInHorizon(dates[0]));
    document.getElementById("next-period").disabled = isAdmin() ? (calendarMode === "month" ? monthOffset >= 12 : weekOffset >= 52) : (calendarMode === "month" ? monthOffset >= 3 : !dateInHorizon(dates[6]));
    document.getElementById("week-view").classList.toggle("primary", calendarMode === "week");
    document.getElementById("month-view").classList.toggle("primary", calendarMode === "month");
    grid.querySelectorAll(".book").forEach(function (b) { b.onclick = function () { bookShift(b.dataset.id); }; });
    grid.querySelectorAll(".cancel").forEach(function (b) { b.onclick = function () { cancelShift(b.dataset.id); }; });
    grid.querySelectorAll(".cancel-request").forEach(function (b) { b.onclick = function () { requestCancellation(b.dataset.id); }; });
    grid.querySelectorAll(".admin-release").forEach(function (b) { b.onclick = function () { adminReleaseShift(b.dataset.id); }; });
    grid.querySelectorAll(".admin-transfer").forEach(function (b) { b.onclick = function () { adminTransferShift(b.dataset.id); }; });
    if (isAdmin()) grid.querySelectorAll(".day-click").forEach(function (cell) { cell.onclick = function (event) { if (!event.target.closest("button,select")) openDayDetail(cell.dataset.date); }; });
    document.getElementById("free-count").textContent = state.shifts.filter(function (s) { return !s.bookedBy; }).length;
    document.getElementById("my-count").textContent = state.shifts.filter(function (s) { return user && s.bookedById === user.id; }).length;
    document.getElementById("pending-count").textContent = state.notifications.filter(function (n) { return n.status === "draft" || n.status === "correction"; }).length;
  }
  function bookShift(id) {
    var user = currentUser(), shift = state.shifts.find(function (s) { return s.id === id; });
    if (!user || isAdmin() || !shift || shift.bookedBy) return;
    if (!dateInHorizon(shift.date)) { showToast("Vuoro ei ole neljän kuukauden varausikkunassa"); return; }
    if (bookedCount(user.id) >= MAX_BOOKED_SHIFTS) { showToast("Voit varata enintään kaksi vuoroa. Peru ensin yksi varaus."); return; }
    shift.bookedBy = user.name; shift.bookedById = user.id; shift.bookedAt = new Date().toISOString();
    bookingLog("varaus", shift, user);
    state.notifications.push({ id: "ilmo-" + Date.now(), shiftId: id, shift: shift.date, start: shift.start, end: shift.end, location: shift.location, ownerId: user.id, ownerName: user.name, createdAt: shift.bookedAt, status: "draft", plannedStart: shift.start, plannedEnd: shift.end, actualStart: "", actualEnd: "", urgentCount: 0, basicCount: 0, triageCount: 0, compensation: "0", crowdClearing: "Ei", extra: "", correctionNote: "" });
    log("Vuoro varattu: " + dateLabel(shift.date) + " " + shift.start + "–" + shift.end); renderAll(); showToast("Vuoro varattu – ilmoitusluonnos luotu");
  }
  function cancelShift(id) {
    var user = currentUser(), shift = state.shifts.find(function (s) { return s.id === id; });
    if (!user || !shift || shift.bookedById !== user.id || !shift.bookedAt || Date.now() - new Date(shift.bookedAt).getTime() > 15 * 60 * 1000) { showToast("Varausta ei voi enää perua (15 min aikaraja)"); return; }
    shift.bookedBy = null; shift.bookedById = null; shift.bookedAt = null;
    bookingLog("peruutus", shift, user, user.name);
    state.notifications = state.notifications.filter(function (n) { return n.shiftId !== id; });
    log("Vuorovaraus peruttu: " + dateLabel(shift.date)); renderAll(); showToast("Varaus peruttu");
  }
  function requestCancellation(id) {
    var user = currentUser(), shift = state.shifts.find(function (s) { return s.id === id; });
    if (!user || isAdmin() || !shift || shift.bookedById !== user.id || state.cancellationRequests.some(function (r) { return r.shiftId === id && r.status === "pending"; })) return;
    var reason = prompt("Peruutuspyynnön syy (pakollinen):");
    if (!reason || !reason.trim()) { showToast("Peruutuspyynnön syy on pakollinen"); return; }
    var requestedAt = new Date().toISOString();
    state.cancellationRequests.unshift({ id: "cancel-" + Date.now(), shiftId: id, doctorId: user.id, doctorName: user.name, requestedAt: requestedAt, reason: reason.trim(), status: "pending", resolvedAt: null });
    bookingLog("peruutuspyyntö", shift, user, shift.bookedBy);
    log("Peruutuspyyntö lähetetty: " + dateLabel(shift.date) + " (" + user.name + ")");
    renderAll(); showToast("Peruutuspyyntö lähetetty esihenkilölle");
  }
  function adminReleaseShift(id) {
    if (!isAdmin()) return;
    var shift = state.shifts.find(function (s) { return s.id === id; });
    if (!shift || !shift.bookedBy) return;
    var previous = shift.bookedBy;
    shift.bookedBy = null; shift.bookedById = null; shift.bookedAt = null;
    bookingLog("vapautus", shift, currentUser(), previous);
    state.notifications = state.notifications.filter(function (n) { return n.shiftId !== id; });
    log("Esihenkilö vapautti vuoron " + dateLabel(shift.date) + " (varaaja: " + previous + ")");
    renderAll(); showToast("Varaus vapautettu");
  }
  function adminTransferShift(id) {
    if (!isAdmin()) return;
    var shift = state.shifts.find(function (s) { return s.id === id; });
    if (!shift || !shift.bookedBy) return;
    var target = document.querySelector('.transfer-target[data-id="' + id + '"]');
    var recipient = target && USERS[target.value];
    if (!recipient) return;
    if (recipient.id !== shift.bookedById && bookedCount(recipient.id) >= MAX_BOOKED_SHIFTS) { showToast("Valitulla päivystäjällä on jo kaksi varausta"); return; }
    var previous = shift.bookedBy, actor = currentUser();
    shift.bookedBy = recipient.name; shift.bookedById = recipient.id; shift.bookedAt = new Date().toISOString();
    state.notifications.forEach(function (n) {
      if (n.shiftId === id) { n.ownerId = recipient.id; n.ownerName = recipient.name; }
    });
    bookingLog("siirto", shift, actor, previous);
    log("Esihenkilö siirsi vuoron " + dateLabel(shift.date) + " varaajalta " + previous + " varaajalle " + recipient.name);
    renderAll(); showToast("Vuoro siirretty: " + recipient.name);
  }
  function renderNotifications() {
    var list = document.getElementById("notification-list"), user = currentUser();
    var visible = isAdmin() ? state.notifications : state.notifications.filter(function (n) { return n.ownerId === (user && user.id); });
    if (!visible.length) { list.innerHTML = '<div class="empty">Ei omia ilmoituksia. Varaa vuoro kalenterista aloittaaksesi.</div>'; return; }
    list.innerHTML = visible.map(function (n) {
      var editable = !isAdmin() && n.ownerId === user.id && (n.status === "draft" || n.status === "correction");
      var owner = USERS[n.ownerId] || user, overnight = n.plannedEnd === "08:00" && n.plannedStart !== "00:00";
      return '<article class="card"><div class="card-head"><div><h3>' + dateLabel(n.shift) + " · " + n.location + '</h3><div class="meta">Päivystäjä: ' + n.ownerName + " · Käyttäjätunnus: " + (owner.username || "—") + " · Rooli: " + (owner.roleLabel || "—") + " · Suunniteltu vuoro " + n.plannedStart + "–" + n.plannedEnd + "</div>" + signatureText(n.doctorSignature, "Lääkärin kuittaus") + signatureText(n.adminSignature, "Esihenkilön kuittaus") + "</div><span class=\"status " + statusClass(n.status) + '">' + statusLabel(n.status) + "</span></div>" + (n.correctionNote ? '<div class="notice correction"><strong>Palautteen syy:</strong> ' + n.correctionNote + "</div>" : "") + (editable ? '<form class="notification-form" data-id="' + n.id + '"><div class="form-grid"><div class="field"><label for="actual-date-' + n.id + '">Vuoropäivä</label><input id="actual-date-' + n.id + '" type="date" value="' + n.shift + '" readonly></div><div class="field"><label for="actual-user-' + n.id + '">Kirjautunut käyttäjä</label><input id="actual-user-' + n.id + '" value="' + (owner.name || n.ownerName) + " · " + (owner.username || "—") + " · " + (owner.roleLabel || "—") + '" readonly></div><div class="field"><label for="actual-start-' + n.id + '">Toteutunut aloitus (kellonaika) *</label><input id="actual-start-' + n.id + '" name="actualStartTime" type="time" required value="' + timePart(n.actualStart) + '"></div><div class="field"><label for="actual-end-' + n.id + '">Toteutunut lopetus (kellonaika) *</label><input id="actual-end-' + n.id + '" name="actualEndTime" type="time" required value="' + timePart(n.actualEnd) + '"></div><div class="field"><small class="muted">' + (overnight ? "Yövuoron lopetus kirjataan seuraavan päivän puolelle." : "Päivä määräytyy vuoron mukaan.") + '</small></div><div class="field"><label for="urgent-' + n.id + '">Kiireellinen (kpl)</label><input id="urgent-' + n.id + '" name="urgentCount" type="number" min="0" step="1" required value="' + n.urgentCount + '"></div><div class="field"><label for="basic-' + n.id + '">Perustaso (kpl)</label><input id="basic-' + n.id + '" name="basicCount" type="number" min="0" step="1" required value="' + n.basicCount + '"></div><div class="field"><label for="triage-' + n.id + '">Triage/Puhelinlääkäri (kpl)</label><input id="triage-' + n.id + '" name="triageCount" type="number" min="0" step="1" required value="' + n.triageCount + '"></div><div class="field"><label for="comp-' + n.id + '">Hälytyskorvaus (€), käsin</label><input id="comp-' + n.id + '" name="compensation" type="number" min="0" step=".01" required value="' + n.compensation + '"></div><div class="field"><label for="crowd-' + n.id + '">Ruuhkan purku *</label><select id="crowd-' + n.id + '" name="crowdClearing" required><option ' + (n.crowdClearing === "Ei" ? "selected" : "") + '>Ei</option><option ' + (n.crowdClearing === "Kyllä" ? "selected" : "") + '>Kyllä</option></select></div><div class="field full"><div class="calculation" data-summary="' + n.id + '"></div></div><div class="field full"><label for="extra-' + n.id + '">Lisätiedot</label><textarea id="extra-' + n.id + '" name="extra" maxlength="500">' + n.extra + "</textarea></div></div><div class=\"form-actions\"><button class=\"button primary\" type=\"submit\">Lähetä käsittelyyn</button></div></form>" : '<div class="meta detail-line">Toteutunut: ' + (n.actualStart || "—") + " – " + (n.actualEnd || "—") + " · Potilaat yhteensä: " + patientTotal(n) + " · Peruskorvaus (demo): " + money(demoBaseCompensation(n.shift)) + " € + Hälytyskorvaus: " + money(n.compensation) + " € · Ruuhkan purku: " + n.crowdClearing + "</div>") + "</article>";
    }).join("");
    list.querySelectorAll(".notification-form").forEach(function (form) { var sign = document.createElement("button"); sign.type = "button"; sign.className = "button secondary sign-doctor"; sign.textContent = "Allekirjoita toteuma"; sign.onclick = function () { signNotification(form.dataset.id, "doctor"); }; form.querySelector(".form-actions").insertBefore(sign, form.querySelector(".form-actions").firstChild); form.onsubmit = submitNotification; form.querySelectorAll("input[type=number]").forEach(function (input) { input.oninput = function () { updateNotificationSummary(form); }; }); updateNotificationSummary(form); });
  }
  function updateNotificationSummary(form) {
    var data = new FormData(form), urgent = Number(data.get("urgentCount") || 0), basic = Number(data.get("basicCount") || 0), triage = Number(data.get("triageCount") || 0), alarm = Number(data.get("compensation") || 0), n = state.notifications.find(function (x) { return x.id === form.dataset.id; });
    if (!n) return;
    form.querySelector("[data-summary]").innerHTML = "<strong>Yhteenveto</strong><br>Potilaita yhteensä: <strong>" + (urgent + basic + triage) + " kpl</strong> · Peruskorvaus (demo): <strong>" + money(demoBaseCompensation(n.shift)) + " €</strong> · Hälytyskorvaus: <strong>" + money(alarm) + " €</strong> · Demo-yhteensä: <strong>" + money(demoBaseCompensation(n.shift) + alarm) + " €</strong><small>Peruskorvaus on vain läpinäkyvä laskentaesimerkki (arki " + DEMO_BASE_RATES.weekday + " €, viikonloppu " + DEMO_BASE_RATES.weekend + " €, listattu pyhä " + DEMO_BASE_RATES.holiday + " €).</small>";
  }
  function submitNotification(event) {
    event.preventDefault(); var form = event.target, n = state.notifications.find(function (x) { return x.id === form.dataset.id; }), data = new FormData(form);
    if (!n || !currentUser() || n.ownerId !== currentUser().id || !n.doctorSignature) { showToast("Allekirjoita toteuma ennen lähettämistä"); return; }
    if (!form.checkValidity()) { form.reportValidity(); return; }
    var startTime = data.get("actualStartTime"), endTime = data.get("actualEndTime"), overnight = n.plannedEnd === "08:00" && n.plannedStart !== "00:00", start = actualDateTime(n.shift, startTime, false), end = actualDateTime(n.shift, endTime, overnight);
    if (new Date(end) <= new Date(start)) { showToast("Lopetusajan tulee olla aloituksen jälkeen"); return; }
    n.actualStart = start; n.actualEnd = end; n.urgentCount = Number(data.get("urgentCount") || 0); n.basicCount = Number(data.get("basicCount") || 0); n.triageCount = Number(data.get("triageCount") || 0); n.compensation = data.get("compensation") || "0"; n.crowdClearing = data.get("crowdClearing"); n.extra = data.get("extra"); n.status = "sent"; n.correctionNote = ""; n.updatedAt = new Date().toISOString();
    log("Ilmoitus lähetetty käsittelyyn: " + dateLabel(n.shift)); renderAll(); showToast("Ilmoitus lähetetty käsittelijälle");
  }
  function renderHandler() {
    var list = document.getElementById("handler-list"), pending = state.notifications.filter(function (n) { return n.status === "sent"; });
    if (!isAdmin()) { list.innerHTML = '<div class="empty">Käsittelyjono on vain esihenkilölle.</div>'; return; }
    if (!pending.length) { list.innerHTML = '<div class="empty">Käsittelyjonossa ei ole avoimia ilmoituksia.</div>'; return; }
    list.innerHTML = pending.map(function (n) { return '<article class="card handler-row"><div><h3>' + dateLabel(n.shift) + " · " + n.location + '</h3><div class="meta">Päivystäjä: ' + n.ownerName + " · Toteutunut " + n.actualStart + " – " + n.actualEnd + " · Potilaat " + patientTotal(n) + " kpl (" + n.urgentCount + " kiireellinen, " + n.basicCount + " perustaso, " + n.triageCount + " triage) · Peruskorvaus (demo) " + money(demoBaseCompensation(n.shift)) + " € + Hälytyskorvaus " + money(n.compensation) + " € · Ruuhkan purku " + n.crowdClearing + "</div>" + signatureText(n.doctorSignature, "Lääkärin kuittaus") + signatureText(n.adminSignature, "Esihenkilön kuittaus") + '</div><div class="handler-actions"><button class="button danger return" data-id="' + n.id + '">Palauta korjattavaksi</button><button class="button primary approve" data-id="' + n.id + '">Hyväksy</button></div></article>'; }).join("");
    list.querySelectorAll(".handler-row").forEach(function (row) { var button = document.createElement("button"), n = pending.find(function (item) { return item.id === row.querySelector(".approve").dataset.id; }); if (!n.adminSignature) { button.className = "button secondary"; button.textContent = "Allekirjoita"; button.type = "button"; button.onclick = function () { signNotification(n.id, "admin"); }; row.querySelector(".handler-actions").insertBefore(button, row.querySelector(".handler-actions").firstChild); } });
    list.querySelectorAll(".approve").forEach(function (b) { b.onclick = function () { updateHandler(b.dataset.id, "approved"); }; });
    list.querySelectorAll(".return").forEach(function (b) { b.onclick = function () { var reason = prompt("Mitä ilmoituksesta pitää korjata?"); if (reason && reason.trim()) updateHandler(b.dataset.id, "correction", reason.trim()); }; });
  }
  function renderCancellationRequests() {
    var list = document.getElementById("cancellation-list"), user = currentUser(), requests = isAdmin() ? state.cancellationRequests.filter(function (r) { return r.status === "pending"; }) : state.cancellationRequests.filter(function (r) { return r.doctorId === (user && user.id); });
    if (!requests.length) { list.innerHTML = '<div class="empty">Ei peruutuspyyntöjä.</div>'; return; }
    list.innerHTML = requests.map(function (r) {
      var shift = state.shifts.find(function (s) { return s.id === r.shiftId; });
      return '<article class="card cancellation-row"><div><h3>' + (shift ? dateLabel(shift.date) + " · " + shift.start + "–" + shift.end : "Vuoro poistunut") + '</h3><div class="meta">Varaaja: ' + r.doctorName + " · Pyyntö: " + new Date(r.requestedAt).toLocaleString("fi-FI") + " · Syy: " + r.reason + '</div><div class="status ' + r.status + '">' + ({ pending: "Avoin", approved: "Hyväksytty", rejected: "Hylätty" }[r.status] || r.status) + "</div></div>" + (isAdmin() && r.status === "pending" ? '<div class="handler-actions"><button class="button primary cancel-approve" data-id="' + r.id + '">Hyväksy</button><button class="button danger cancel-reject" data-id="' + r.id + '">Hylkää</button></div>' : "") + "</article>";
    }).join("");
    list.querySelectorAll(".cancel-approve").forEach(function (b) { b.onclick = function () { resolveCancellation(b.dataset.id, "approved"); }; });
    list.querySelectorAll(".cancel-reject").forEach(function (b) { b.onclick = function () { resolveCancellation(b.dataset.id, "rejected"); }; });
  }
  function resolveCancellation(id, status) {
    if (!isAdmin()) return;
    var request = state.cancellationRequests.find(function (r) { return r.id === id; }), shift = request && state.shifts.find(function (s) { return s.id === request.shiftId; });
    if (!request || request.status !== "pending") return;
    request.status = status; request.resolvedAt = new Date().toISOString();
    if (status === "approved" && shift) {
      var previous = shift.bookedBy; shift.bookedBy = null; shift.bookedById = null; shift.bookedAt = null;
      state.notifications = state.notifications.filter(function (n) { return n.shiftId !== shift.id; });
      bookingLog("peruutus hyväksytty", shift, currentUser(), previous);
      log("Esihenkilö hyväksyi peruutuspyynnön: " + dateLabel(shift.date) + " (" + previous + ")");
    } else {
      bookingLog("peruutus hylätty", shift || { id: request.shiftId, date: "", start: "", end: "" }, currentUser(), request.doctorName);
      log("Esihenkilö hylkäsi peruutuspyynnön: " + request.doctorName);
    }
    save(); renderAll(); showToast(status === "approved" ? "Peruutus hyväksytty" : "Peruutuspyyntö hylätty");
  }
  function updateHandler(id, status, reason) { if (!isAdmin()) return; var n = state.notifications.find(function (x) { return x.id === id; }); if (!n) return; n.status = status; n.correctionNote = reason || ""; n.updatedAt = new Date().toISOString(); log(status === "approved" ? "Ilmoitus hyväksytty: " + dateLabel(n.shift) : "Ilmoitus palautettu korjattavaksi: " + dateLabel(n.shift)); renderAll(); showToast(status === "approved" ? "Ilmoitus hyväksytty" : "Ilmoitus palautettu"); }
  function renderAudit() { document.getElementById("audit-list").innerHTML = state.audit.map(function (a) { return '<div class="audit-item"><time>' + new Date(a.at).toLocaleString("fi-FI") + "</time><span>" + a.text + "</span></div>"; }).join(""); }
  function openDayDetail(date) {
    if (!isAdmin()) return;
    document.querySelectorAll(".tab,.view").forEach(function (el) { el.classList.remove("active"); });
    document.querySelector('.tab[data-view="day-detail"]').classList.add("active");
    document.getElementById("view-day-detail").classList.add("active");
    document.getElementById("day-detail-title").textContent = dateLabel(date);
    var shifts = state.shifts.filter(function (s) { return s.date === date; });
    var records = state.bookingLog.filter(function (r) { return r.date === date; });
    document.getElementById("day-detail-shifts").innerHTML = shifts.length ? shifts.map(function (s) { return '<div class="card"><strong>' + s.start + "–" + s.end + '</strong> · ' + s.location + '<div class="meta">' + (s.bookedBy ? "Varaaja: " + s.bookedBy + " · Varattu " + (s.bookedAt ? new Date(s.bookedAt).toLocaleString("fi-FI") : "demoaineistossa") : "Vapaa") + "</div></div>"; }).join("") : '<div class="empty">Ei vuoroja tälle päivälle.</div>';
    document.getElementById("day-detail-log").innerHTML = records.length ? records.map(function (r) { var type = { varaus: "Varaus", peruutus: "Peruutus", vapautus: "Esihenkilö vapautti", siirto: "Siirto", "peruutuspyyntö": "Peruutuspyyntö", "peruutus hyväksytty": "Peruutus hyväksytty", "peruutus hylätty": "Peruutus hylätty" }[r.type] || r.type; return '<div class="audit-item"><time>' + new Date(r.at).toLocaleString("fi-FI") + '</time><span><strong>' + type + "</strong> · " + r.start + "–" + r.end + " · Varaaja: " + (r.booker || "—") + " · Tekijä: " + r.actor + (r.previousBooker ? " · Edellinen varaaja: " + r.previousBooker : "") + "</span></div>"; }).join("") : '<div class="empty">Ei varausmerkintöjä tälle päivälle.</div>';
  }
  function updateCounts() { document.getElementById("notification-count").textContent = state.notifications.filter(function (n) { return !isAdmin() && n.ownerId === state.currentUserId && n.status !== "approved" && n.status !== "delivered"; }).length; document.getElementById("queue-count").textContent = state.notifications.filter(function (n) { return n.status === "sent"; }).length; document.getElementById("cancellation-count").textContent = state.cancellationRequests.filter(function (r) { return r.status === "pending"; }).length; }
  function updateUserUi() {
    var user = currentUser(); document.getElementById("login-screen").classList.toggle("hidden", !!user);
    if (!user) return;
    document.getElementById("user-avatar").textContent = user.name.split(" ").map(function (x) { return x[0]; }).join("");
    document.getElementById("user-details").innerHTML = user.name + "<br><small>" + user.roleLabel + "</small>";
    document.querySelectorAll(".admin-only").forEach(function (el) { el.classList.toggle("hidden", !isAdmin()); });
    if (!isAdmin() && document.querySelector(".tab.active.admin-only")) document.querySelector('.tab[data-view="calendar"]').click();
  }
  function renderAll() { updateUserUi(); renderCalendar(); renderNotifications(); renderHandler(); renderCancellationRequests(); renderAudit(); updateCounts(); }
  function exportCsv() {
    if (!isAdmin()) return;
    var rows = state.notifications.filter(function (n) { return n.status === "approved" || n.status === "delivered"; }); if (!rows.length) { showToast("Ei hyväksyttyjä ilmoituksia vietäväksi"); return; }
    var headers = ["Päivä", "Päivystäjä", "Toimipiste", "Suunniteltu alku", "Suunniteltu loppu", "Toteutunut alku", "Toteutunut loppu", "Kiireellinen kpl", "Perustaso kpl", "Triage/Puhelinlääkäri kpl", "Potilaita yhteensä", "Peruskorvaus (demo) €", "Hälytyskorvaus €", "Ruuhkan purku", "Lisätiedot", "Tila"];
    var values = rows.map(function (n) { return [n.shift, n.ownerName, n.location, n.plannedStart, n.plannedEnd, n.actualStart, n.actualEnd, n.urgentCount, n.basicCount, n.triageCount, patientTotal(n), money(demoBaseCompensation(n.shift)), n.compensation, n.crowdClearing, n.extra, statusLabel(n.status)]; });
    var csv = [headers].concat(values).map(function (row) { return row.map(function (v) { return '"' + String(v || "").replace(/"/g, '""') + '"'; }).join(";"); }).join("\r\n");
    var link = document.createElement("a"); link.href = URL.createObjectURL(new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8" })); link.download = "paivystysilmoitukset.csv"; link.click(); URL.revokeObjectURL(link.href); rows.forEach(function (n) { n.status = "delivered"; }); log("Hyväksytyt ilmoitukset viety CSV-tiedostoon"); renderAll(); showToast("CSV-lataus aloitettu");
  }
  document.getElementById("login-user").innerHTML = Object.keys(USERS).map(function (id) { return '<option value="' + id + '">' + USERS[id].name + " (" + USERS[id].roleLabel + ")</option>"; }).join("");
  document.getElementById("login-form").onsubmit = function (event) { event.preventDefault(); var id = document.getElementById("login-user").value, password = document.getElementById("login-password").value; if (USERS[id].password !== password) { document.getElementById("login-error").textContent = "Tarkista salasana."; return; } state.currentUserId = id; state.loginAt = new Date().toISOString(); state.userLoginAt[id] = state.loginAt; save(); document.getElementById("login-password").value = ""; document.getElementById("login-error").textContent = ""; log("Kirjauduttu käyttäjänä: " + USERS[id].name); renderAll(); };
  document.getElementById("logout").onclick = function () { state.currentUserId = null; state.loginAt = null; save(); renderAll(); };
  document.querySelectorAll(".tab").forEach(function (tab) { tab.onclick = function () { if (tab.classList.contains("hidden")) return; document.querySelectorAll(".tab,.view").forEach(function (el) { el.classList.remove("active"); }); tab.classList.add("active"); document.getElementById("view-" + tab.dataset.view).classList.add("active"); }; });
  document.getElementById("prev-period").onclick = function () { var earliest = state.shifts.length ? Math.min.apply(null, state.shifts.map(function (s) { var d = localDate(s.date); return d.getFullYear() * 12 + d.getMonth(); })) - (new Date().getFullYear() * 12 + new Date().getMonth()) : -12; if (calendarMode === "month" && ((isAdmin() && monthOffset > earliest) || (!isAdmin() && monthOffset > 0))) monthOffset--; else if (calendarMode === "week" && ((isAdmin() && weekOffset > Math.floor(earliest * 4.35)) || (!isAdmin() && dateInHorizon(weekDates(weekOffset - 1)[0])))) weekOffset--; renderCalendar(); };
  document.getElementById("next-period").onclick = function () { if (calendarMode === "month" && ((isAdmin() && monthOffset < 12) || (!isAdmin() && monthOffset < 3))) monthOffset++; else if (calendarMode === "week" && ((isAdmin() && weekOffset < 52) || (!isAdmin() && dateInHorizon(weekDates(weekOffset + 1)[6])))) weekOffset++; renderCalendar(); };
  document.getElementById("today").onclick = function () { weekOffset = 0; monthOffset = 0; renderCalendar(); };
  document.getElementById("day-detail-back").onclick = function () { document.querySelector('.tab[data-view="calendar"]').click(); };
  document.getElementById("week-view").onclick = function () { calendarMode = "week"; renderCalendar(); };
  document.getElementById("month-view").onclick = function () { calendarMode = "month"; renderCalendar(); };
  document.getElementById("export-csv").onclick = exportCsv;
  document.getElementById("reset-demo").onclick = function () { if (confirm("Palautetaanko demoaineisto? Omat muutokset poistetaan.")) { var userId = state.currentUserId, loginAt = state.loginAt; state = defaultState(); state.currentUserId = userId; state.loginAt = loginAt; save(); renderAll(); showToast("Demoaineisto palautettu"); } };
  renderAll();
}());
