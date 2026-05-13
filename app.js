const TABLE_NAME = "concerts";
const POSTER_BUCKET = "concert-posters";
const SAVE_TIMEOUT_MS = 15000;
const POSTER_UPLOAD_TIMEOUT_MS = 20000;
const POSTER_MAX_WIDTH = 700;
const POSTER_MAX_HEIGHT = 980;
const POSTER_QUALITY = 0.72;

const seedConcerts = [
  {
    artist: "NewJeans",
    tour: "BUNNIES CAMP 2025 TOKYO DOME",
    date: "2025-01-11",
    venue: "Inspire Arena",
    city: "仁川",
    country: "韩国",
    price: 143000,
    currency: "KRW",
    memory: "OMG 开场炸裂，Hanni solo 部分太惊艳。整体编舞和舞台设计都非常精致，比预期好太多。",
    poster: "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=900&q=85"
  },
  {
    artist: "IU（李知恩）",
    tour: "H.E.R. WORLD TOUR",
    date: "2024-11-03",
    venue: "奥林匹克体操馆",
    city: "首尔",
    country: "韩国",
    price: 132000,
    currency: "KRW",
    memory: "安可时大家举起灯，声音很轻，但特别满。",
    poster: "https://images.unsplash.com/photo-1501386761578-eac5c94b800a?auto=format&fit=crop&w=900&q=85"
  },
  {
    artist: "BLACKPINK",
    tour: "WORLD TOUR [BORN PINK]",
    date: "2024-09-15",
    venue: "首尔世界杯体育场",
    city: "首尔",
    country: "韩国",
    price: 165000,
    currency: "KRW",
    memory: "烟火和鼓点一起落下来的那一秒，完全不想眨眼。",
    poster: "https://images.unsplash.com/photo-1506157786151-b8491531f063?auto=format&fit=crop&w=900&q=85"
  },
  {
    artist: "Coldplay",
    tour: "Music of the Spheres World Tour",
    date: "2024-07-20",
    venue: "国家体育场（鸟巢）",
    city: "北京",
    country: "中国",
    price: 1380,
    currency: "CNY",
    memory: "腕带一起亮起，像把星空搬进了体育场。",
    poster: "https://images.unsplash.com/photo-1540039155733-5bb30b53aa14?auto=format&fit=crop&w=900&q=85"
  },
  {
    artist: "Taylor Swift",
    tour: "The Eras Tour",
    date: "2024-06-22",
    venue: "国立竞技场",
    city: "东京",
    country: "日本",
    price: 19800,
    currency: "JPY",
    memory: "交换手链交换到散场，像和陌生人共享了一整个夏天。",
    poster: "https://images.unsplash.com/photo-1524368535928-5b5e00ddc76b?auto=format&fit=crop&w=900&q=85"
  }
];

const config = window.CONCERT_SUPABASE || {};
const isConfigured = Boolean(config.url && config.anonKey && window.supabase);
const db = isConfigured ? window.supabase.createClient(config.url, config.anonKey) : null;

const state = {
  user: null,
  concerts: [],
  filters: { search: "", sort: "newest", year: "全部", artist: "全部" },
  screen: "concerts",
  calendarDate: new Date(2025, 0, 1),
  calendarMode: "month",
  wrappedYear: "2025",
  wrapSlide: 0,
  wrapQuizChoice: {},
  posterBlob: null,
  posterFile: null,
  isPreparingPoster: false,
  isSaving: false
};

const el = {
  authShell: document.querySelector("#authShell"),
  authForm: document.querySelector("#authForm"),
  signupButton: document.querySelector("#signupButton"),
  authMessage: document.querySelector("#authMessage"),
  setupWarning: document.querySelector("#setupWarning"),
  app: document.querySelector(".phone-shell"),
  accountEmail: document.querySelector("#accountEmail"),
  logoutButton: document.querySelector("#logoutButton"),
  screens: document.querySelectorAll("[data-screen]"),
  nav: document.querySelectorAll("[data-nav]"),
  bottomNav: document.querySelectorAll(".bottom-nav [data-nav]"),
  concertCount: document.querySelector("#concertCount"),
  calendarCount: document.querySelector("#calendarCount"),
  summaryCount: document.querySelector("#summaryCount"),
  grid: document.querySelector("#concertGrid"),
  search: document.querySelector("#searchInput"),
  filterToggle: document.querySelector("#filterToggle"),
  filterPanel: document.querySelector("#filterPanel"),
  yearChips: document.querySelector("#yearChips"),
  artistChips: document.querySelector("#artistChips"),
  monthTitle: document.querySelector("#monthTitle"),
  calendarCard: document.querySelector(".calendar-card"),
  calendarGrid: document.querySelector("#calendarGrid"),
  yearCalendar: document.querySelector("#yearCalendar"),
  dayEvents: document.querySelector("#dayEvents"),
  insightGrid: document.querySelector("#insightGrid"),
  totalShows: document.querySelector("#totalShows"),
  spendStats: document.querySelector("#spendStats"),
  rankingStats: document.querySelector("#rankingStats"),
  countryStats: document.querySelector("#countryStats"),
  monthStats: document.querySelector("#monthStats"),
  yearStats: document.querySelector("#yearStats"),
  wrapYears: document.querySelector("#wrapYears"),
  wrappedCard: document.querySelector("#wrappedCard"),
  formTitle: document.querySelector("#formTitle"),
  form: document.querySelector("#concertForm"),
  saveActions: document.querySelectorAll("[data-save-action]"),
  pasteCard: document.querySelector("#pasteCard"),
  pasteText: document.querySelector("#pasteText"),
  posterInput: document.querySelector("#posterInput"),
  posterPreview: document.querySelector("#posterPreview"),
  posterPlaceholder: document.querySelector("#posterPlaceholder"),
  dialog: document.querySelector("#detailDialog"),
  detail: document.querySelector("#detailContent"),
  toast: document.querySelector("#toast")
};

init();

async function init() {
  bindAuth();
  bindNavigation();
  bindFilters();
  bindCalendar();
  bindForm();
  bindEmptyActions();

  if (!isConfigured) {
    el.setupWarning.hidden = false;
    el.app.hidden = true;
    return;
  }

  const { data } = await db.auth.getSession();
  await applySession(data.session);
  db.auth.onAuthStateChange((_event, session) => applySession(session));
}

function bindAuth() {
  el.authForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!isConfigured) return;
    const data = new FormData(el.authForm);
    setAuthBusy(true, "正在登录…");
    try {
      const { data: authData, error } = await db.auth.signInWithPassword({
        email: clean(data.get("email")),
        password: String(data.get("password") || "")
      });
      if (error) throw error;
      showAuthMessage("登录成功，正在打开你的记忆库…", "success");
      if (authData.session) await applySession(authData.session);
    } catch (error) {
      showAuthMessage(authErrorMessage(error), "error");
    } finally {
      setAuthBusy(false);
    }
  });

  el.signupButton.addEventListener("click", async () => {
    if (!isConfigured) return;
    const data = new FormData(el.authForm);
    setAuthBusy(true, "正在注册…");
    try {
      const { error } = await db.auth.signUp({
        email: clean(data.get("email")),
        password: String(data.get("password") || "")
      });
      if (error) throw error;
      showAuthMessage("注册成功，请检查邮箱或直接登录。", "success");
    } catch (error) {
      showAuthMessage(authErrorMessage(error), "error");
    } finally {
      setAuthBusy(false);
    }
  });

  el.logoutButton.addEventListener("click", async () => {
    await db.auth.signOut();
  });
}

function setAuthBusy(isBusy, message = "") {
  el.authForm.querySelectorAll("button").forEach((button) => {
    button.disabled = isBusy;
    button.setAttribute("aria-busy", String(isBusy));
  });
  if (message) showAuthMessage(message);
}

function showAuthMessage(message, type = "") {
  el.authMessage.hidden = false;
  el.authMessage.textContent = message;
  el.authMessage.className = `auth-message ${type}`.trim();
}

function authErrorMessage(error) {
  const message = error?.message || "登录失败，请再试一次";
  if (/invalid login credentials/i.test(message)) return "邮箱或密码不正确，请检查后再试。";
  if (/email not confirmed/i.test(message)) return "邮箱还没有完成验证，请先查看邮箱里的确认邮件。";
  return message;
}

async function applySession(session) {
  state.user = session?.user || null;
  el.authShell.hidden = Boolean(state.user);
  el.app.hidden = !state.user;
  el.accountEmail.textContent = state.user?.email || "";
  if (!state.user) return;
  await loadConcerts();
  renderStaticControls();
  render();
}

async function loadConcerts() {
  const { data, error } = await db
    .from(TABLE_NAME)
    .select("*")
    .eq("user_id", state.user.id)
    .order("date", { ascending: false });

  if (error) {
    showToast(error.message);
    state.concerts = [];
    return;
  }

  if (!data.length) {
    await seedCurrentUser();
    return loadConcerts();
  }

  state.concerts = data;
}

async function seedCurrentUser() {
  const rows = seedConcerts.map((item) => ({ ...item, user_id: state.user.id }));
  const { error } = await db.from(TABLE_NAME).insert(rows);
  if (error) showToast(error.message);
}

function bindNavigation() {
  el.nav.forEach((button) => button.addEventListener("click", () => {
    if (button.dataset.nav === "add") resetForm();
    setScreen(button.dataset.nav);
  }));
}

function bindEmptyActions() {
  document.addEventListener("click", (event) => {
    const button = event.target.closest("[data-empty-add]");
    if (!button) return;
    resetForm();
    setScreen("add");
  });
}

function setScreen(screen) {
  state.screen = screen;
  el.screens.forEach((item) => item.classList.toggle("active", item.dataset.screen === screen));
  el.bottomNav.forEach((button) => {
    const isActive = button.dataset.nav === screen || (screen === "wrapped" && button.dataset.nav === "summary");
    button.classList.toggle("active", isActive);
  });
  window.scrollTo({ top: 0, behavior: "smooth" });
  render();
}

function bindFilters() {
  el.filterToggle.addEventListener("click", () => {
    el.filterPanel.hidden = !el.filterPanel.hidden;
  });
  el.search.addEventListener("input", (event) => {
    state.filters.search = event.target.value.trim().toLowerCase();
    renderConcerts();
  });
  document.querySelectorAll("[data-sort]").forEach((button) => {
    button.addEventListener("click", () => {
      state.filters.sort = button.dataset.sort;
      document.querySelectorAll("[data-sort]").forEach((item) => item.classList.toggle("active", item === button));
      renderConcerts();
    });
  });
}

function bindCalendar() {
  document.querySelector("#prevMonth").addEventListener("click", () => {
    const step = state.calendarMode === "year" ? 12 : 1;
    state.calendarDate.setMonth(state.calendarDate.getMonth() - step);
    renderCalendar();
  });
  document.querySelector("#nextMonth").addEventListener("click", () => {
    const step = state.calendarMode === "year" ? 12 : 1;
    state.calendarDate.setMonth(state.calendarDate.getMonth() + step);
    renderCalendar();
  });
  document.querySelectorAll("[data-calendar-mode]").forEach((button) => {
    button.addEventListener("click", () => {
      state.calendarMode = button.dataset.calendarMode;
      document.querySelectorAll("[data-calendar-mode]").forEach((item) => item.classList.toggle("active", item === button));
      renderCalendar();
    });
  });
}

function bindForm() {
  document.querySelectorAll("[data-form-mode]").forEach((button) => {
    button.addEventListener("click", () => {
      document.querySelectorAll("[data-form-mode]").forEach((item) => item.classList.toggle("active", item === button));
      el.pasteCard.hidden = button.dataset.formMode !== "paste";
    });
  });

  document.querySelector("#parsePaste").addEventListener("click", parsePastedText);
  el.posterInput.addEventListener("change", handlePosterUpload);
  el.form.country.addEventListener("input", () => {
    const currency = inferCurrency(el.form.country.value);
    if (currency) el.form.currency.value = currency;
  });

  el.form.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (state.isSaving) return;
    if (state.isPreparingPoster) {
      showToast("海报还在处理中，等预览出现后再保存");
      return;
    }
    if (!state.user) {
      showToast("请先登录再保存");
      return;
    }

    const data = new FormData(el.form);
    const editingId = clean(data.get("editingId"));
    const existing = state.concerts.find((item) => item.id === editingId);
    const memory = clean(data.get("memory"));
    const payload = {
      user_id: state.user.id,
      artist: clean(data.get("artist")),
      tour: clean(data.get("tour")) || "Untitled Tour",
      date: data.get("date"),
      venue: clean(data.get("venue")) || "待补充",
      city: clean(data.get("city")) || "待补充",
      country: clean(data.get("country")) || "待补充",
      price: Number(data.get("price")) || 0,
      currency: data.get("currency") || "KRW",
      memory: memory || null,
      poster: existing?.poster || posterFallback(clean(data.get("artist")))
    };

    if (!payload.artist || !payload.date) {
      showToast("先填艺人和日期就可以保存");
      return;
    }

    setSavingState(true);
    showToast(existing ? "正在更新记录…" : "正在保存记录…");

    try {
      let savedConcert;
      const recordId = existing?.id || createId();
      payload.poster = await resolvePoster(recordId, payload.artist, existing);
      if (existing) {
        const { error } = await withTimeout(
          db.from(TABLE_NAME).update(payload).eq("id", existing.id).eq("user_id", state.user.id),
          SAVE_TIMEOUT_MS
        );
        if (error) throw error;
        savedConcert = { ...existing, ...payload };
      } else {
        const now = new Date().toISOString();
        const newConcert = {
          id: recordId,
          ...payload,
          created_at: now,
          updated_at: now
        };
        const { error } = await withTimeout(
          db.from(TABLE_NAME).insert(newConcert),
          SAVE_TIMEOUT_MS
        );
        if (error) throw error;
        savedConcert = newConcert;
      }

      syncConcertInState(savedConcert);
      renderStaticControls();
      resetForm();
      setScreen("concerts");
      showToast(existing ? "已更新，卡片内容已保存" : "已保存，新卡片已加入");
    } catch (error) {
      showToast(saveErrorMessage(error));
    } finally {
      setSavingState(false);
    }
  });

  el.dialog.addEventListener("click", (event) => {
    if (event.target === el.dialog) el.dialog.close();
  });
}

function renderStaticControls() {
  renderChips(el.yearChips, ["全部", ...unique(state.concerts.map((item) => yearOf(item.date))).sort((a, b) => b - a)], "year");
  renderChips(el.artistChips, ["全部", ...unique(state.concerts.map((item) => item.artist)).sort()], "artist");
  updateFormAffordance();
}

function syncConcertInState(concert) {
  const index = state.concerts.findIndex((item) => item.id === concert.id);
  if (index >= 0) state.concerts.splice(index, 1, concert);
  else state.concerts.unshift(concert);
  state.concerts.sort((a, b) => new Date(b.date) - new Date(a.date));
}

function setSavingState(isSaving) {
  state.isSaving = isSaving;
  el.form.classList.toggle("is-saving", isSaving);
  updateSaveActions();
}

function updateFormAffordance() {
  const isEditing = Boolean(el.form.editingId.value);
  el.formTitle.textContent = isEditing ? "编辑演唱会" : "记录演唱会";
  el.saveActions.forEach((button) => {
    const text = button.classList.contains("submit-wide")
      ? (isEditing ? "保存修改并关闭" : "保存这场演唱会")
      : (isEditing ? "更新" : "保存");
    button.dataset.defaultText = text;
  });
  updateSaveActions();
}

function updateSaveActions() {
  el.saveActions.forEach((button) => {
    const disabled = state.isSaving || state.isPreparingPoster;
    button.disabled = disabled;
    button.setAttribute("aria-busy", String(disabled));
    if (state.isSaving) button.textContent = "保存中…";
    else if (state.isPreparingPoster) button.textContent = "处理海报中…";
    else button.textContent = button.dataset.defaultText;
  });
}

function renderChips(container, values, key) {
  container.querySelectorAll("button").forEach((button) => button.remove());
  values.forEach((value) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `chip ${state.filters[key] === String(value) ? "active" : ""}`;
    button.textContent = value;
    button.addEventListener("click", () => {
      state.filters[key] = String(value);
      renderChips(container, values, key);
      renderConcerts();
    });
    container.append(button);
  });
}

function render() {
  renderCounts();
  if (state.screen === "concerts") renderConcerts();
  if (state.screen === "calendar") renderCalendar();
  if (state.screen === "summary") renderSummary();
  if (state.screen === "wrapped") renderWrapped();
}

function renderCounts() {
  if (el.concertCount) el.concertCount.textContent = state.concerts.length;
  el.calendarCount.textContent = state.concerts.length;
  el.summaryCount.textContent = state.concerts.length;
}

function renderConcerts() {
  const concerts = filteredConcerts();
  el.grid.innerHTML = "";
  if (!concerts.length) {
    el.grid.innerHTML = state.concerts.length
      ? `<div class="empty">没有匹配的演唱会</div>`
      : makeEmptyState("还没有演唱会记录", "先记下第一场现场，之后这里会变成你的私人票根墙。", "记录你的第一场演唱会");
    return;
  }
  concerts.forEach((concert) => {
    const button = document.createElement("button");
    button.className = "concert-card";
    button.type = "button";
    button.setAttribute("aria-label", `${concert.artist}，${concert.tour}，${formatDateLong(concert.date)}，${concert.venue}`);
    button.innerHTML = `
      <div class="poster">
        <img src="${concert.poster}" alt="${concert.artist}" />
        <div class="date-badge">
          <small>${monthOf(concert.date)}月</small>
          <strong>${dayOf(concert.date)}</strong>
          <span>${yearOf(concert.date)}</span>
        </div>
      </div>
      <div class="card-body">
        <h3>${concert.artist}</h3>
        <p class="tour">${concert.tour}</p>
        <p class="venue"><span>${concert.city}</span><span class="venue-extra"> · ${concert.venue}</span></p>
        <p class="date-count">${relativeDateLabel(concert.date)}</p>
        ${isIncomplete(concert) ? `<span class="incomplete-badge">待补充</span>` : ""}
      </div>
    `;
    button.addEventListener("click", () => openDetail(concert));
    el.grid.append(button);
  });
}

function filteredConcerts() {
  const query = state.filters.search;
  return state.concerts
    .filter((concert) => {
      const haystack = [concert.artist, concert.tour, concert.venue, concert.city, concert.country].join(" ").toLowerCase();
      return (!query || haystack.includes(query))
        && (state.filters.year === "全部" || String(yearOf(concert.date)) === state.filters.year)
        && (state.filters.artist === "全部" || concert.artist === state.filters.artist);
    })
    .sort((a, b) => {
      if (state.filters.sort === "oldest") return new Date(a.date) - new Date(b.date);
      if (state.filters.sort === "artist") return a.artist.localeCompare(b.artist, "zh-CN");
      return new Date(b.date) - new Date(a.date);
    });
}

function renderCalendar() {
  const year = state.calendarDate.getFullYear();
  const month = state.calendarDate.getMonth();
  el.monthTitle.textContent = state.calendarMode === "year" ? `${year}年` : `${year}年 ${monthNames()[month]}`;
  el.calendarCard.hidden = state.calendarMode === "year";
  el.yearCalendar.hidden = state.calendarMode !== "year";
  el.dayEvents.innerHTML = "";
  if (state.calendarMode === "year") renderYearCalendar(year);
  else renderMonthCalendar(year, month);
  if (!state.concerts.length) {
    el.dayEvents.innerHTML = makeEmptyState("日历正在等第一张票", "添加演唱会后，每个日期都会亮起你的现场记忆。", "记录你的第一场演唱会");
  }
}

function renderMonthCalendar(year, month) {
  el.calendarGrid.innerHTML = "";
  const first = new Date(year, month, 1);
  const days = new Date(year, month + 1, 0).getDate();
  for (let i = 0; i < first.getDay(); i += 1) el.calendarGrid.append(document.createElement("span"));
  for (let day = 1; day <= days; day += 1) {
    const key = dateKey(year, month, day);
    const events = state.concerts.filter((item) => item.date === key);
    const button = document.createElement("button");
    button.className = `day-cell ${isToday(year, month, day) ? "today" : ""} ${events.length ? "poster-day" : ""}`;
    button.type = "button";
    button.innerHTML = events.length
      ? `<img src="${events[0].poster}" alt="${events[0].artist}" /><span>${day}</span>`
      : `${day}`;
    button.addEventListener("click", () => renderDayEvents(events, key));
    el.calendarGrid.append(button);
  }
}

function renderYearCalendar(year) {
  el.yearCalendar.innerHTML = "";
  monthNames().forEach((monthName, monthIndex) => {
    const monthEvents = state.concerts.filter((item) => yearOf(item.date) === year && monthOf(item.date) === monthIndex + 1);
    const card = document.createElement("button");
    card.type = "button";
    card.className = `year-month-card ${monthEvents.length ? "has-events" : ""}`;
    card.innerHTML = monthEvents.length
      ? `<img src="${monthEvents[0].poster}" alt="${monthName}" /><strong>${monthName}</strong><span>${monthEvents.length} 场</span>`
      : `<strong>${monthName}</strong><span>暂无</span>`;
    card.addEventListener("click", () => {
      state.calendarMode = "month";
      state.calendarDate = new Date(year, monthIndex, 1);
      document.querySelectorAll("[data-calendar-mode]").forEach((item) => item.classList.toggle("active", item.dataset.calendarMode === "month"));
      renderCalendar();
    });
    el.yearCalendar.append(card);
  });
}

function renderDayEvents(events, key) {
  el.dayEvents.innerHTML = "";
  events.forEach((event) => {
    const item = document.createElement("button");
    item.type = "button";
    item.className = "event-pill";
    item.textContent = `${key} · ${event.artist} · ${event.venue}`;
    item.addEventListener("click", () => openDetail(event));
    el.dayEvents.append(item);
  });
}

function renderSummary() {
  if (!state.concerts.length) {
    el.insightGrid.innerHTML = makeChartUnlock();
    el.totalShows.textContent = "0";
    el.spendStats.innerHTML = makeEmptyState("消费图表待解锁", "添加 3 场演唱会后，这里会显示年度花费、平均票价和开销趋势。", "记录你的第一场演唱会");
    el.rankingStats.innerHTML = makeEmptyState("排行还没有主角", "艺人、城市、国家排行会随着你的记录自动生成。", "添加演唱会");
    el.countryStats.innerHTML = "";
    el.monthStats.innerHTML = "";
    el.yearStats.innerHTML = "";
    return;
  }
  const byArtist = countBy(state.concerts, "artist");
  const byCity = countBy(state.concerts, "city");
  const countries = unique(state.concerts.map((item) => item.country)).length;
  const busiest = topEntries(countBy(state.concerts, (item) => `${monthOf(item.date)}月`))[0];

  el.insightGrid.innerHTML = `
    ${insight("♪", "最爱艺人", topEntries(byArtist)[0]?.[0] || "暂无", `看了 ${topEntries(byArtist)[0]?.[1] || 0} 场`, true)}
    ${insight("CAL", "最忙的月份", busiest?.[0] || "暂无", `${busiest?.[1] || 0} 场演出`)}
    ${insight("PIN", "最常去城市", topEntries(byCity)[0]?.[0] || "暂无", `${topEntries(byCity)[0]?.[1] || 0} 场`)}
    ${insight("MAP", "足迹范围", `${countries || 0} 个国家/地区`, `${unique(state.concerts.map((item) => item.city)).length || 0} 座城市`)}
  `;
  el.totalShows.textContent = state.concerts.length;
  renderSpendStats();
  renderRankingStats(byArtist);
  renderSimpleCount(el.countryStats, "足迹分布", countBy(state.concerts, "country"));
  renderMonthStats();
  renderSimpleCount(el.yearStats, "逐年记录", countBy(state.concerts, (item) => yearOf(item.date)));
}

function insight(icon, label, value, detail, featured = false) {
  return `<article class="insight ${featured ? "featured" : ""}">
    <div class="icon">${icon}</div><span>${label}</span><strong>${value}</strong><small>${detail}</small>
  </article>`;
}

function renderSpendStats() {
  const priced = state.concerts.filter((item) => item.price);
  const total = priced.reduce((sum, item) => sum + convertToDisplayCurrency(item), 0);
  const avg = priced.length ? Math.round(total / priced.length) : 0;
  el.spendStats.innerHTML = `
    <h2>消费统计</h2>
    <div class="stat-row"><span>总价（折合人民币）</span><strong>CNY ${formatNumber(total)}</strong></div>
    <div class="stat-row"><span>平均票价</span><strong>CNY ${formatNumber(avg)}</strong></div>
  `;
}

function renderRankingStats(byArtist) {
  el.rankingStats.innerHTML = `<h2>艺人排行</h2>`;
  topEntries(byArtist).forEach(([artist, count], index) => {
    el.rankingStats.insertAdjacentHTML("beforeend", `<div class="stat-row"><span><b class="rank-num">${index + 1}</b>${artist}</span><strong>${count} 场</strong></div>`);
  });
}

function renderSimpleCount(container, title, counts) {
  container.innerHTML = `<h2>${title}</h2>`;
  topEntries(counts).forEach(([name, count]) => {
    container.insertAdjacentHTML("beforeend", `<div class="stat-row"><span>${name}</span><strong>${count}</strong></div>`);
  });
}

function renderMonthStats() {
  const counts = countBy(state.concerts, (item) => `${monthOf(item.date)}月`);
  el.monthStats.innerHTML = `<h2>月份分布</h2>`;
  topEntries(counts).forEach(([name, count]) => {
    el.monthStats.insertAdjacentHTML("beforeend", `<div class="stat-row"><span>${name}</span><strong>${count}</strong></div>`);
  });
}

function renderWrapped() {
  const years = unique(state.concerts.map((item) => String(yearOf(item.date)))).sort((a, b) => b - a);
  if (!years.includes(state.wrappedYear)) state.wrappedYear = years[0] || String(new Date().getFullYear());
  el.wrapYears.innerHTML = "";
  years.forEach((year) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = state.wrappedYear === year ? "active" : "";
    button.textContent = year;
    button.addEventListener("click", () => {
      state.wrappedYear = year;
      state.wrapSlide = 0;
      renderWrapped();
    });
    el.wrapYears.append(button);
  });

  const items = state.concerts.filter((item) => String(yearOf(item.date)) === state.wrappedYear);
  if (items.length < 5) {
    el.wrappedCard.innerHTML = makeWrappedLock(state.wrappedYear, items.length);
    return;
  }

  const slides = makeWrappedSlides(items, state.wrappedYear);
  state.wrapSlide = Math.min(state.wrapSlide, slides.length - 1);
  const slide = slides[state.wrapSlide];
  el.wrappedCard.innerHTML = `
    <div class="wrap-dots">${slides.map((_, index) => `<span class="${index === state.wrapSlide ? "active" : ""}"></span>`).join("")}</div>
    <article class="wrapped-story ${slide.type === "quiz" ? "quiz-story" : ""}">
      <span class="ghost-icon">${slide.ghost || "♪"}</span>
      <p class="wrap-kicker">${slide.kicker}</p>
      <div class="wrap-icon">${slide.icon}</div>
      <h2>${slide.title}</h2>
      <p class="wrap-body">${slide.body}</p>
      ${slide.extra || ""}
    </article>
    <div class="wrap-controls">
      <button type="button" ${state.wrapSlide === 0 ? "disabled" : ""} data-wrap-prev>‹ 上一页</button>
      <span>${state.wrapSlide + 1} / ${slides.length}</span>
      <button type="button" ${state.wrapSlide === slides.length - 1 ? "disabled" : ""} data-wrap-next>下一页 ›</button>
    </div>
  `;
  document.querySelector("[data-wrap-prev]").addEventListener("click", () => {
    state.wrapSlide -= 1;
    renderWrapped();
  });
  document.querySelector("[data-wrap-next]").addEventListener("click", () => {
    state.wrapSlide += 1;
    renderWrapped();
  });
  document.querySelectorAll("[data-quiz-choice]").forEach((button) => {
    button.addEventListener("click", () => {
      state.wrapQuizChoice[state.wrappedYear] = button.dataset.quizChoice;
      renderWrapped();
    });
  });
}

function makeWrappedSlides(items, year) {
  const byArtist = topEntries(countBy(items, "artist"))[0];
  const month = topEntries(countBy(items, (item) => `${monthOf(item.date)}月`))[0];
  const pricedItems = items
    .filter((item) => convertToDisplayCurrency(item) > 0)
    .sort((a, b) => convertToDisplayCurrency(b) - convertToDisplayCurrency(a));
  const bestValue = pricedItems[0] || items[0];
  const cities = unique(items.map((item) => item.city).filter((value) => value !== "待补充")).length;
  const countries = unique(items.map((item) => item.country).filter((value) => value !== "待补充")).length;
  const spend = items.reduce((sum, item) => sum + convertToDisplayCurrency(item), 0);
  const avg = Math.round(spend / items.length);
  const venueTop = topEntries(countBy(items, "venue"))[0];
  const memoryDigest = makeMemoryDigest(items);
  const quiz = makeSpendQuiz(items, year);
  return [
    { kicker: `${year} · 年度回顾`, icon: "", title: String(items.length), body: `场现场演唱会`, extra: `<b class="wrap-pill">你去了 ${cities} 座城市 · ${countries} 个国家</b>`, ghost: "♫" },
    { kicker: "你的年度艺人", icon: "♪", title: byArtist[0], body: `你看了 Ta ${byArtist[1]} 场 演唱会`, ghost: "TOP" },
    { kicker: "记忆碎片生成的你", icon: "MEM", title: memoryDigest.title, body: memoryDigest.body, extra: `<b class="wrap-pill">${memoryDigest.badge}</b>`, ghost: "✦" },
    { kicker: "你最忙的月份", icon: "CAL", title: month[0], body: `这个月你看了 ${month[1]} 场 演唱会`, ghost: "•" },
    { kicker: "这一年你花在票上的钱", icon: "CNY", title: `CNY ${formatNumber(spend)}`, body: `平均票价 CNY ${formatNumber(avg)}`, ghost: "◇" },
    quiz,
    { kicker: "最舍得花钱的一票", icon: "$", title: `CNY ${formatNumber(convertToDisplayCurrency(bestValue))}`, body: `${bestValue.artist} · ${bestValue.venue}`, extra: `<img class="wrap-thumb" src="${bestValue.poster}" alt="${bestValue.artist}" />`, ghost: "◇" },
    { kicker: "年度开销 Top 5", icon: "#5", title: "票价榜", body: "这些现场负责了钱包的心跳声", extra: makeSpendTopList(pricedItems), ghost: "5" },
    { kicker: "年度去最多的场馆", icon: "PIN", title: venueTop[0], body: `${venueTop[1]} 场现场都在这里发生`, ghost: "TOP" },
    { kicker: "你最常去的城市", icon: "MAP", title: topEntries(countBy(items, "city"))[0][0], body: `${topEntries(countBy(items, "city"))[0][1]} 场现场`, ghost: "CITY" },
    { kicker: `${year} · 谢谢你热爱音乐`, icon: "🎁", title: `${items.length}场现场`, body: `${cities} 座城市 · ${countries} 个国家`, extra: `<b class="wrap-pill">年度艺人<br>${byArtist[0]}</b><small>私密演唱会记忆库 · Concert Memory</small>`, ghost: "🎁" }
  ];
}

function makeMemoryDigest(items) {
  const memories = items.map((item) => clean(item.memory)).filter(Boolean);
  if (!memories.length) {
    return {
      title: "留白型观众",
      body: "你把尖叫和心跳先存在脑内硬盘，文字还没来得及追上现场。",
      badge: "今年的记忆碎片：待解锁"
    };
  }

  const text = memories.join(" ");
  const vibes = [
    { name: "舞台爆破观察员", words: ["炸", "烟火", "鼓点", "开场", "惊艳"], line: "你很会捕捉现场爆发的一秒，喜欢把舞台的高光写成电影预告片。" },
    { name: "灯海收藏家", words: ["灯", "亮", "星空", "腕带", "光"], line: "你对会发光的瞬间毫无抵抗力，年度关键词大概是：全场一起亮起来。" },
    { name: "安可柔软派", words: ["安可", "轻", "声音", "特别", "满"], line: "你写到安静处反而最有力量，像把散场前那口舍不得呼出去的气保存了下来。" },
    { name: "社交型快乐扩散器", words: ["交换", "陌生人", "大家", "一起", "共享"], line: "你记住的不只是台上，也有台下那些突然变熟的陌生人。" },
    { name: "细节控鉴赏家", words: ["编舞", "舞台", "设计", "精致", "solo"], line: "你不是只看热闹的人，编舞、设计、solo 点位都逃不过你的年度审美审计。" }
  ];
  const best = vibes
    .map((vibe) => ({
      ...vibe,
      score: vibe.words.reduce((total, word) => total + (text.includes(word) ? 1 : 0), 0)
    }))
    .sort((a, b) => b.score - a.score)[0];
  const mostEmotional = memories.reduce((bestMemory, memory) => memory.length > bestMemory.length ? memory : bestMemory, "");
  const quote = mostEmotional.length > 28 ? `${mostEmotional.slice(0, 28)}…` : mostEmotional;

  return {
    title: best.score ? best.name : "现场氛围捕手",
    body: best.score ? best.line : "你的文字偏向画面感和情绪留存，像给每场演出贴了一张只有自己懂的便利贴。",
    badge: `代表碎片：“${quote}”`
  };
}

function makeSpendQuiz(items, year) {
  const choices = makeQuizChoices(items, year);
  const answer = choices[0];
  const picked = state.wrapQuizChoice[year];
  const shuffled = deterministicShuffle(choices, year);
  const answered = Boolean(picked);
  const options = shuffled.map((item) => {
    const isPicked = picked === item.id;
    const isAnswer = item.id === answer.id;
    const className = ["quiz-option", answered && isAnswer ? "correct" : "", answered && isPicked && !isAnswer ? "wrong" : ""].filter(Boolean).join(" ");
    return `<button class="${className}" type="button" data-quiz-choice="${item.id}" ${answered ? "disabled" : ""}>
      <span>${item.artist}</span>
      <small>${item.venue}</small>
    </button>`;
  }).join("");
  const result = answered
    ? `<b class="quiz-result">${picked === answer.id ? "猜对了！钱包本人表示被看穿。" : `正确答案是 ${answer.artist}，这一票赢得很有重量。`}</b>`
    : "";

  return {
    type: "quiz",
    kicker: "年度小 Quiz",
    icon: "?",
    title: "猜一猜",
    body: "今年开销最大的演唱会是哪一场？",
    extra: `<div class="quiz-options">${options}</div>${result}`,
    ghost: "?"
  };
}

function makeQuizChoices(items, year) {
  const ranked = [...items].sort((a, b) => convertToDisplayCurrency(b) - convertToDisplayCurrency(a));
  const uniqueChoices = [];
  ranked.forEach((item) => {
    if (!uniqueChoices.some((choice) => choice.id === item.id)) uniqueChoices.push(item);
  });
  return uniqueChoices.slice(0, Math.min(4, uniqueChoices.length || 1));
}

function deterministicShuffle(items, seed) {
  return [...items].sort((a, b) => seededScore(a.artist + a.date + seed) - seededScore(b.artist + b.date + seed));
}

function seededScore(value) {
  return String(value).split("").reduce((score, char) => ((score * 31) + char.charCodeAt(0)) % 9973, 7);
}

function makeSpendTopList(items) {
  if (!items.length) return `<b class="wrap-pill">还没有票价记录</b>`;
  const rows = items.slice(0, 5).map((item, index) => `
    <div class="wrap-rank-row">
      <span>${index + 1}</span>
      <strong>${item.artist}</strong>
      <small>CNY ${formatNumber(convertToDisplayCurrency(item))}</small>
    </div>
  `).join("");
  return `<div class="wrap-rank-list">${rows}</div>`;
}

function openDetail(concert) {
  el.detail.innerHTML = `
    <article class="detail-sheet">
      <button class="detail-x" type="button" data-detail-close>×</button>
      <img class="detail-cover" src="${concert.poster}" alt="${concert.artist}" />
      <header class="detail-title">
        <div>
          <h2>${concert.artist}</h2>
          <p>${concert.tour}</p>
        </div>
      </header>
      <p class="detail-date">${formatDateLong(concert.date)}</p>
      <div class="detail-divider"></div>
      <dl class="detail-list">
        <div><dt>场馆</dt><dd>${formatLocation(concert)}</dd></div>
        <div><dt>票价</dt><dd>${concert.currency} ${formatNumber(concert.price)}</dd></div>
      </dl>
      <div class="detail-divider"></div>
      <section class="memory-box">
        <h3>记忆碎片</h3>
        <p>${concert.memory || "还没有写下记忆碎片。"}</p>
      </section>
      <div class="detail-actions">
        <button type="button" data-detail-edit>编辑</button>
        <button type="button" data-detail-delete>删除</button>
      </div>
    </article>
  `;
  el.detail.querySelector("[data-detail-close]").addEventListener("click", () => el.dialog.close());
  el.detail.querySelector("[data-detail-edit]").addEventListener("click", () => editConcert(concert.id));
  el.detail.querySelector("[data-detail-delete]").addEventListener("click", () => deleteConcert(concert.id));
  el.dialog.showModal();
}

function editConcert(id) {
  const concert = state.concerts.find((item) => item.id === id);
  if (!concert) return;
  el.dialog.close();
  el.form.editingId.value = concert.id;
  el.form.poster.value = concert.poster || "";
  updatePosterPreview(concert.poster || "");
  el.form.artist.value = concert.artist || "";
  el.form.tour.value = concert.tour || "";
  el.form.date.value = concert.date || "";
  el.form.venue.value = concert.venue === "待补充" ? "" : concert.venue || "";
  el.form.city.value = concert.city === "待补充" ? "" : concert.city || "";
  el.form.country.value = concert.country === "待补充" ? "" : concert.country || "";
  el.form.price.value = concert.price || "";
  el.form.currency.value = concert.currency || "KRW";
  el.form.memory.value = concert.memory || "";
  state.posterBlob = null;
  state.posterFile = null;
  state.isPreparingPoster = false;
  el.posterInput.value = "";
  updateFormAffordance();
  setScreen("add");
}

async function deleteConcert(id) {
  const { error } = await db.from(TABLE_NAME).delete().eq("id", id).eq("user_id", state.user.id);
  if (error) {
    showToast(error.message);
    return;
  }
  await loadConcerts();
  renderStaticControls();
  el.dialog.close();
  render();
  showToast("已删除记录");
}

function resetForm() {
  el.form.reset();
  el.form.editingId.value = "";
  el.form.poster.value = "";
  state.posterBlob = null;
  state.posterFile = null;
  state.isPreparingPoster = false;
  el.posterInput.value = "";
  updatePosterPreview("");
  updateFormAffordance();
}

async function handlePosterUpload(event) {
  const [file] = event.target.files;
  if (!file) {
    updatePosterPreview("");
    el.form.poster.value = "";
    state.posterBlob = null;
    state.posterFile = null;
    state.isPreparingPoster = false;
    updateSaveActions();
    return;
  }
  if (!file.type.startsWith("image/")) {
    showToast("请选择图片文件");
    event.target.value = "";
    return;
  }
  state.isPreparingPoster = true;
  updateSaveActions();
  showToast("正在压缩海报…");
  try {
    const poster = await compressPoster(file);
    state.posterBlob = poster.blob;
    state.posterFile = {
      name: file.name,
      type: poster.blob.type || "image/jpeg"
    };
    el.form.poster.value = "";
    updatePosterPreview(poster.dataUrl);
    event.target.value = "";
    showToast("海报已准备好");
  } catch (error) {
    event.target.value = "";
    el.form.poster.value = "";
    state.posterBlob = null;
    state.posterFile = null;
    updatePosterPreview("");
    showToast(error.message || "图片读取失败，请换一张试试");
  } finally {
    state.isPreparingPoster = false;
    updateSaveActions();
  }
}

function compressPoster(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.addEventListener("error", () => reject(new Error("图片读取失败，请换一张试试")));
    reader.addEventListener("load", () => {
      const image = new Image();
      image.addEventListener("error", () => reject(new Error("图片无法识别，请换一张试试")));
      image.addEventListener("load", () => {
        const scale = Math.min(1, POSTER_MAX_WIDTH / image.width, POSTER_MAX_HEIGHT / image.height);
        const width = Math.max(1, Math.round(image.width * scale));
        const height = Math.max(1, Math.round(image.height * scale));
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const context = canvas.getContext("2d");
        if (!context) {
          reject(new Error("图片处理失败，请再试一次"));
          return;
        }
        context.drawImage(image, 0, 0, width, height);
        canvas.toBlob((blob) => {
          if (!blob) {
            reject(new Error("图片处理失败，请再试一次"));
            return;
          }
          resolve({
            blob,
            dataUrl: canvas.toDataURL("image/jpeg", POSTER_QUALITY)
          });
        }, "image/jpeg", POSTER_QUALITY);
      });
      image.src = String(reader.result || "");
    });
    reader.readAsDataURL(file);
  });
}

async function resolvePoster(recordId, artist, existing) {
  if (!state.posterBlob) return existing?.poster || posterFallback(artist);
  showToast("正在上传海报…");
  return uploadPoster(recordId, state.posterBlob);
}

async function uploadPoster(recordId, blob) {
  const extension = fileExtension(blob.type, state.posterFile?.name);
  const path = `${state.user.id}/${recordId}-${uploadNonce()}.${extension}`;
  const { data, error } = await withTimeout(
    db.storage.from(POSTER_BUCKET).upload(path, blob, {
      cacheControl: "3600",
      contentType: blob.type || state.posterFile?.type || "image/jpeg"
    }),
    POSTER_UPLOAD_TIMEOUT_MS
  );
  if (error) throw error;
  const publicPath = data?.path || path;
  const { data: publicData } = db.storage.from(POSTER_BUCKET).getPublicUrl(publicPath);
  if (!publicData?.publicUrl) throw new Error("海报地址生成失败");
  return publicData.publicUrl;
}

function updatePosterPreview(src) {
  el.posterPreview.hidden = !src;
  el.posterPlaceholder.hidden = Boolean(src);
  if (src) el.posterPreview.src = src;
  else el.posterPreview.removeAttribute("src");
}

function parsePastedText() {
  const text = el.pasteText.value;
  if (!text.trim()) {
    showToast("先粘贴一点票务信息");
    return;
  }
  const lines = text.split(/\n|,|，/).map((line) => line.trim()).filter(Boolean);
  const joined = lines.join(" ");
  if (lines[0]) el.form.artist.value = lines[0];
  if (lines[1]) el.form.tour.value = lines[1];
  const date = joined.match(/\d{4}[-/.]\d{1,2}[-/.]\d{1,2}/);
  if (date) el.form.date.value = date[0].replaceAll("/", "-").replaceAll(".", "-");
  const price = joined.match(/(KRW|JPY|CNY|USD|EUR|TWD|HKD|GBP)\s*([\d,]+)/i);
  if (price) {
    el.form.currency.value = price[1].toUpperCase();
    el.form.price.value = price[2].replaceAll(",", "");
  }
  showToast("已尝试填入表单");
}

function makeEmptyState(title, body, action) {
  return `<article class="empty-state">
    <div class="empty-illustration" aria-hidden="true">
      <span></span><span></span><span></span>
    </div>
    <h3>${title}</h3>
    <p>${body}</p>
    <button type="button" data-empty-add>${action}</button>
  </article>`;
}

function makeChartUnlock() {
  return `<article class="insight chart-unlock">
    <div class="mini-chart" aria-hidden="true"><span></span><span></span><span></span><span></span></div>
    <span>图表预告</span>
    <strong>添加 3 场后解锁</strong>
    <small>消费趋势、艺人排行、城市足迹都会在这里长出来。</small>
  </article>
  <article class="insight chart-unlock">
    <div class="mini-chart soft" aria-hidden="true"><span></span><span></span><span></span><span></span></div>
    <span>年度回顾</span>
    <strong>5 场生成 Wrapped</strong>
    <small>攒够记录后，会生成可以翻页的音乐年终总结。</small>
  </article>`;
}

function makeWrappedLock(year, count) {
  const needed = Math.max(0, 5 - count);
  const progress = Math.min(100, Math.round((count / 5) * 100));
  return `<article class="wrapped-lock">
    <div class="lock-art" aria-hidden="true">
      <span></span>
    </div>
    <p class="wrap-kicker">${year} · 年度回顾</p>
    <h2>再记录 ${needed} 场</h2>
    <p>你的 Wrapped 会在 5 场演唱会后生成。现在已经收集 ${count} / 5 场。</p>
    <div class="progress-track" aria-label="年度回顾生成进度"><span style="width: ${progress}%"></span></div>
    <button type="button" data-empty-add>继续添加演唱会</button>
  </article>`;
}

function isIncomplete(concert) {
  return [concert.venue, concert.city, concert.country].some((value) => !value || value === "待补充");
}

function formatLocation(concert) {
  const parts = [concert.venue, concert.city, concert.country].filter((value) => value && value !== "待补充");
  return parts.length ? parts.join("，") : "待补充";
}

function inferCurrency(country) {
  const value = clean(country).toLowerCase();
  const matches = [
    { currency: "CNY", words: ["中国", "大陆", "china", "cn"] },
    { currency: "HKD", words: ["香港", "hong kong", "hk"] },
    { currency: "TWD", words: ["台湾", "台灣", "taiwan", "tw"] },
    { currency: "JPY", words: ["日本", "japan", "jp"] },
    { currency: "KRW", words: ["韩国", "韓國", "korea", "kr"] },
    { currency: "USD", words: ["美国", "美國", "usa", "us", "america"] },
    { currency: "GBP", words: ["英国", "英國", "uk", "britain"] },
    { currency: "EUR", words: ["法国", "法國", "德国", "德國", "意大利", "西班牙", "欧洲", "europe", "france", "germany", "italy", "spain"] }
  ];
  return matches.find((item) => item.words.some((word) => value.includes(word)))?.currency || "";
}

function fileExtension(mimeType, name) {
  const byType = {
    "image/png": "png",
    "image/webp": "webp",
    "image/jpeg": "jpg"
  };
  if (byType[mimeType]) return byType[mimeType];
  const fromName = clean(name).split(".").pop()?.toLowerCase();
  if (["jpg", "jpeg", "png", "webp"].includes(fromName)) return fromName === "jpeg" ? "jpg" : fromName;
  return "jpg";
}

function uploadNonce() {
  if (window.crypto?.randomUUID) return window.crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function saveErrorMessage(error) {
  const message = error?.message || "保存失败，请再试一次";
  if (state.posterBlob) return `海报上传失败：${message}`;
  return message;
}

function clean(value) {
  return String(value || "").trim();
}

function yearOf(date) {
  return new Date(`${date}T00:00:00`).getFullYear();
}

function monthOf(date) {
  return new Date(`${date}T00:00:00`).getMonth() + 1;
}

function dayOf(date) {
  return new Date(`${date}T00:00:00`).getDate();
}

function dateKey(year, month, day) {
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function isToday(year, month, day) {
  const now = new Date();
  return now.getFullYear() === year && now.getMonth() === month && now.getDate() === day;
}

function monthNames() {
  return ["一月", "二月", "三月", "四月", "五月", "六月", "七月", "八月", "九月", "十月", "十一月", "十二月"];
}

function formatDateLong(date) {
  return new Date(`${date}T00:00:00`).toLocaleDateString("zh-CN", {
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "short"
  });
}

function relativeDateLabel(date) {
  const target = new Date(`${date}T00:00:00`);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diff = Math.round((target - today) / 86400000);
  if (diff === 0) return "今天";
  return diff > 0 ? `${diff} 天后` : `${Math.abs(diff)} 天前`;
}

function withTimeout(promise, timeoutMs) {
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = window.setTimeout(() => reject(new Error("保存超时，请检查网络后再试")), timeoutMs);
  });
  return Promise.race([promise, timeout]).finally(() => window.clearTimeout(timer));
}

function createId() {
  if (window.crypto?.randomUUID) return window.crypto.randomUUID();
  return "10000000-1000-4000-8000-100000000000".replace(/[018]/g, (char) => {
    const value = Number(char) ^ (window.crypto.getRandomValues(new Uint8Array(1))[0] & (15 >> (Number(char) / 4)));
    return value.toString(16);
  });
}

function formatNumber(value) {
  return Number(value || 0).toLocaleString("zh-CN");
}

function unique(values) {
  return [...new Set(values.filter(Boolean).map(String))];
}

function countBy(items, key) {
  return items.reduce((acc, item) => {
    const name = typeof key === "function" ? key(item) : item[key];
    acc[name] = (acc[name] || 0) + 1;
    return acc;
  }, {});
}

function topEntries(counts) {
  return Object.entries(counts).sort((a, b) => b[1] - a[1] || String(a[0]).localeCompare(String(b[0]), "zh-CN"));
}

function convertToDisplayCurrency(item) {
  const rates = { KRW: 0.0053, JPY: 0.048, CNY: 1, USD: 7.1, EUR: 7.75, TWD: 0.22, HKD: 0.91, GBP: 9 };
  return Math.round((item.price || 0) * (rates[item.currency] || 1));
}

function posterFallback(name) {
  const encoded = encodeURIComponent(name || "concert");
  return `https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?auto=format&fit=crop&w=900&q=85&${encoded}`;
}

function showToast(message) {
  el.toast.textContent = message;
  el.toast.classList.add("show");
  window.setTimeout(() => el.toast.classList.remove("show"), 2200);
}
