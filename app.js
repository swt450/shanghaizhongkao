const data = window.ADMISSION_DATA;

const PAGE_GROUPS = {
  history: [
    { key: "quotaDistrict", label: "名额到区" },
    { key: "quotaSchool", label: "名额到校" },
    { key: "parallel", label: "平行志愿" },
  ],
  choice: [
    { key: "compare", label: "名额分配" },
    { key: "parallelHistory", label: "平行志愿" },
    { key: "advice", label: "择校建议" },
  ],
};

const SECTION_TITLES = {
  history: "历年录取最低分数查询",
  choice: "高中学校选择建议",
};

const PAGE_META = {
  quotaDistrict: {
    title: "名额到区",
    intro: "按所在区查看名额到区历年录取最低分数线，英语分数已单独列出，方便同分排序参考。",
  },
  quotaSchool: {
    title: "名额到校",
    intro: "名额到校和初中强相关。可以先选所在初中，再看对应高中的历年录取最低分数线。",
  },
  parallel: {
    title: "平行志愿",
    intro: "按所在区查看平行志愿录取最低分数线，适合快速定位同区可报学校和同分参考。",
  },
  compare: {
    title: "各渠道录取最低分数线对比",
    intro: "把同一所高中近三年的名额到区、名额到校、平行志愿录取最低分数线放在一起，先判断名额路径有没有机会。",
  },
  parallelHistory: {
    title: "1-15平行志愿录取最低分数线对比",
    intro: "如果名额路径优势不明显，再看1-15平行志愿近三年录取最低分数线走势，判断冲稳保梯度。",
  },
  advice: {
    title: "择校建议",
    intro: "按所选区的名额到区录取最低分数线，结合预估分给出不同分数段的冲、稳、保参考。",
  },
};

const SCHOOL_TYPE_ORDER = ["委属高中", "市重点", "区重点", "普通高中", "外区市重点", "民办高中", "国际/双语", "其他"];
const PUBLIC_SCHOOL_TYPES = new Set(["市重点", "区重点", "普通高中"]);
const ASCENDING_YEARS = [...data.summary.years].sort();

const state = {
  district: "",
  section: "home",
  page: "",
  query: "",
  year: "2025",
  minScore: "",
  juniorSchool: "",
};

const els = {
  gate: document.querySelector("#districtGate"),
  shell: document.querySelector("#appShell"),
  gateDistrict: document.querySelector("#gateDistrictSelect"),
  enter: document.querySelector("#enterButton"),
  back: document.querySelector("#backButton"),
  changeDistrict: document.querySelector("#changeDistrictButton"),
  headerEyebrow: document.querySelector("#headerEyebrow"),
  headerTitle: document.querySelector("#headerTitle"),
  selectedDistrict: document.querySelector("#selectedDistrictName"),
  homeView: document.querySelector("#homeView"),
  workView: document.querySelector("#workView"),
  subTabs: document.querySelector("#subTabs"),
  search: document.querySelector("#searchInput"),
  year: document.querySelector("#yearSelect"),
  yearField: document.querySelector("#yearSelect").closest("label"),
  score: document.querySelector("#scoreInput"),
  scoreField: document.querySelector("#scoreInput").closest("label"),
  scoreLabel: document.querySelector("#scoreInput").closest("label").querySelector("span"),
  juniorField: document.querySelector("#juniorField"),
  junior: document.querySelector("#juniorInput"),
  juniorOptions: document.querySelector("#juniorOptions"),
  pageIntro: document.querySelector("#pageIntro"),
  listTitle: document.querySelector("#listTitle"),
  resultCount: document.querySelector("#resultCount"),
  resultList: document.querySelector("#resultList"),
};

const fmt = (value) => {
  if (value === null || value === undefined || value === "") return "-";
  return Number.isInteger(value) ? String(value) : String(value);
};

const escapeHtml = (value) =>
  String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");

const scoreValue = (value) => {
  if (value === null || value === undefined || String(value).trim() === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

function setup() {
  for (const district of data.summary.districts) {
    const option = document.createElement("option");
    option.value = district;
    option.textContent = district;
    els.gateDistrict.appendChild(option);
  }

  for (const year of data.summary.years) {
    const option = document.createElement("option");
    option.value = year;
    option.textContent = year;
    els.year.appendChild(option);
  }

  els.gateDistrict.addEventListener("change", () => {
    els.enter.disabled = !els.gateDistrict.value;
  });

  els.enter.addEventListener("click", () => {
    if (!els.gateDistrict.value) return;
    state.district = els.gateDistrict.value;
    openHome();
  });

  els.changeDistrict.addEventListener("click", () => {
    els.gate.classList.remove("is-hidden");
    els.shell.classList.add("is-hidden");
  });

  els.back.addEventListener("click", () => {
    if (state.section === "home") {
      els.gate.classList.remove("is-hidden");
      els.shell.classList.add("is-hidden");
      return;
    }
    openHome();
  });

  document.querySelectorAll(".entry-card").forEach((button) => {
    button.addEventListener("click", () => openSection(button.dataset.section));
  });

  els.search.addEventListener("input", () => {
    state.query = els.search.value;
    renderPage();
  });
  els.year.addEventListener("change", () => {
    state.year = els.year.value;
    renderPage();
  });
  els.score.addEventListener("input", () => {
    state.minScore = els.score.value;
    renderPage();
  });
  els.junior.addEventListener("input", () => {
    state.juniorSchool = els.junior.value;
    renderPage();
  });
}

function openHome() {
  state.section = "home";
  state.page = "";
  resetFilters();
  populateJuniorSchools();
  els.gate.classList.add("is-hidden");
  els.shell.classList.remove("is-hidden");
  els.homeView.classList.add("is-active");
  els.workView.classList.remove("is-active");
  if (els.selectedDistrict) els.selectedDistrict.textContent = state.district;
  els.headerEyebrow.textContent = "考生所在区";
  els.headerTitle.textContent = state.district;
  els.headerTitle.classList.add("district-title");
}

function openSection(section) {
  state.section = section;
  state.page = PAGE_GROUPS[section][0].key;
  resetFilters();
  els.homeView.classList.remove("is-active");
  els.workView.classList.add("is-active");
  els.headerTitle.classList.remove("district-title");
  els.headerEyebrow.textContent = state.district;
  renderTabs();
  renderPage();
}

function resetFilters() {
  state.query = "";
  state.year = "2025";
  state.minScore = "";
  state.juniorSchool = "";
  els.search.value = "";
  els.year.value = "2025";
  els.score.value = "";
  els.junior.value = "";
}

function renderTabs() {
  els.subTabs.innerHTML = PAGE_GROUPS[state.section]
    .map(
      (page) =>
        `<button class="tab ${page.key === state.page ? "is-active" : ""}" type="button" data-page="${page.key}">${page.label}</button>`
    )
    .join("");

  els.subTabs.querySelectorAll(".tab").forEach((button) => {
    button.addEventListener("click", () => {
      state.page = button.dataset.page;
      state.year = state.page === "parallelHistory" || state.page === "compare" ? "all" : "2025";
      els.year.value = state.year === "all" ? "2025" : state.year;
      renderTabs();
      renderPage();
    });
  });
}

function populateJuniorSchools() {
  const schools = data.summary.juniorSchoolsByDistrict[state.district] || [];
  els.juniorOptions.innerHTML = "";
  for (const school of schools) {
    const option = document.createElement("option");
    option.value = school;
    els.juniorOptions.appendChild(option);
  }
}

function renderPage() {
  populateJuniorSchools();
  els.junior.value = state.juniorSchool;
  const meta = PAGE_META[state.page];
  els.headerTitle.textContent = SECTION_TITLES[state.section] || meta.title;
  els.pageIntro.textContent = "";
  els.pageIntro.classList.add("is-hidden");
  els.listTitle.textContent = meta.title;
  els.yearField.classList.toggle("is-hidden", ["compare", "parallelHistory"].includes(state.page));
  els.scoreField.classList.toggle("is-hidden", ["compare", "parallelHistory"].includes(state.page));
  els.scoreLabel.textContent = state.page === "advice" ? "预估分" : "最低分";
  els.score.placeholder = state.page === "advice" ? "输入分数" : "不限";
  els.juniorField.classList.toggle("is-hidden", !["quotaSchool", "compare", "advice"].includes(state.page));

  if (state.page === "quotaDistrict") renderPathList("quotaDistrict");
  if (state.page === "quotaSchool") renderPathList("quotaSchool");
  if (state.page === "parallel") renderPathList("parallel");
  if (state.page === "compare") renderCompare();
  if (state.page === "parallelHistory") renderParallelHistory();
  if (state.page === "advice") renderAdvice();
}

function baseMatches(row, options = {}) {
  if (row.district !== state.district) return false;
  if (!options.allYears && row.year !== state.year) return false;
  if (state.query && !row.school.includes(state.query.trim())) return false;
  if (state.minScore && (row.score === null || row.score < Number(state.minScore))) return false;
  if (options.junior && state.juniorSchool && !String(row.juniorSchool || "").includes(state.juniorSchool.trim())) return false;
  return true;
}

function renderPathList(path) {
  const rows = data[path]
    .filter((row) => baseMatches(row, { junior: path === "quotaSchool" }))
    .sort((a, b) => (b.score || 0) - (a.score || 0));
  els.resultCount.textContent = `${rows.length} 条`;
  els.resultList.innerHTML = rows.length
    ? groupBySchoolType(rows).map((group) => scoreTable(path, group.rows, group.type)).join("")
    : emptyHtml();
}

function scoreTable(path, rows, title) {
  const isQuotaSchool = path === "quotaSchool";
  const displayTitle = title === "市重点" ? "本区市重点" : title;
  return `
    <section class="table-section score-table-section">
      <div class="group-title">
        <h3>${escapeHtml(displayTitle)}</h3>
        <span>${rows.length} 条</span>
      </div>
      <div class="score-table-wrap">
        <table class="score-table ${isQuotaSchool ? "is-quota-school" : ""}">
          <colgroup>
            <col class="school-column" />
            <col class="total-column" />
            <col class="core-column" />
            <col class="subject-column" />
            <col class="subject-column" />
            <col class="subject-column" />
            <col class="test-column" />
          </colgroup>
          <thead>
            <tr>
              <th>学校</th>
              <th>总分</th>
              <th>语数外</th>
              <th>语文</th>
              <th>数学</th>
              <th>英语</th>
              <th>综合测试</th>
            </tr>
          </thead>
          <tbody>${rows.map((row) => scoreTableRow(row, isQuotaSchool)).join("")}</tbody>
        </table>
      </div>
    </section>
  `;
}

function scoreTableRow(row, isQuotaSchool) {
  return `
    <tr>
      <td class="school-col">
        <strong>${escapeHtml(row.school)}</strong>
        ${isQuotaSchool ? `<span class="junior-under">${escapeHtml(row.juniorSchool || "-")}</span>` : ""}
      </td>
      <td class="total-col">${fmt(row.score)}</td>
      <td class="small-score">${fmt(row.core)}</td>
      <td class="small-score">${fmt(row.chinese)}</td>
      <td class="small-score">${fmt(row.math)}</td>
      <td class="small-score">${fmt(row.english)}</td>
      <td class="small-score">${fmt(row.comprehensive)}</td>
    </tr>
  `;
}

function renderCompare() {
  const rows = buildCompareRows();
  const groups = groupCompareRows(rows);
  els.resultCount.textContent = `${rows.length} 所`;
  els.resultList.innerHTML = groups.length
    ? groups.map(compareGroupTable).join("")
    : emptyHtml();
}

function buildCompareRows() {
  const schools = new Map();
  for (const path of ["quotaDistrict", "quotaSchool", "parallel"]) {
    data[path].forEach((row) => {
      if (row.district === state.district && (!state.query || row.school.includes(state.query.trim()))) {
        const current = schools.get(row.school) || {};
        schools.set(row.school, {
          schoolType: current.schoolType || row.schoolType || "其他",
          schoolDistrict: current.schoolDistrict || row.schoolDistrict || "",
        });
      }
    });
  }

  return Array.from(schools)
    .map(([school, meta]) => {
      const years = {};
      for (const year of data.summary.years) {
        const quota = findScore("quotaDistrict", school, year);
        const parallel = findScore("parallel", school, year, compareParallelDistrict(meta));
        const schoolQuota = findSchoolQuota(school, year);
        years[year] = {
          quota,
          schoolQuota,
          parallel,
          delta: quota !== null && parallel !== null ? round1(quota - parallel) : null,
          schoolDelta: schoolQuota !== null && parallel !== null ? round1(schoolQuota - parallel) : null,
        };
      }
      const latest = years["2025"] || {};
      const category = compareCategory(meta);
      return {
        school,
        schoolType: meta.schoolType,
        schoolDistrict: meta.schoolDistrict,
        category,
        years,
        latest,
        sortScore: latest.parallel || latest.quota || latest.schoolQuota || 0,
      };
    })
    .filter((item) => item.category)
    .sort((a, b) => b.sortScore - a.sortScore || a.school.localeCompare(b.school, "zh-Hans-CN"));
}

function compareCategory(meta) {
  if (meta.schoolType === "委属高中") return "委属高中";
  if (meta.schoolType !== "市重点") return "";
  return meta.schoolDistrict === state.district || !meta.schoolDistrict ? "本区市重点" : "外区市重点";
}

function compareParallelDistrict(meta) {
  return meta.schoolDistrict && meta.schoolDistrict !== state.district ? meta.schoolDistrict : state.district;
}

function groupCompareRows(rows) {
  return ["委属高中", "本区市重点", "外区市重点"]
    .map((type) => ({ type, rows: rows.filter((row) => row.category === type) }))
    .filter((group) => group.rows.length);
}

function compareGroupTable(group) {
  const schoolQuotaHeader = state.juniorSchool ? "到校" : "到校最低";
  return `
    <section class="table-section compare-table-section">
      <div class="group-title">
        <h3>${escapeHtml(group.type)}</h3>
        <span>${group.rows.length} 所</span>
      </div>
      <div class="compare-table-wrap">
        <table class="compare-table">
          <colgroup>
            <col class="school-column" />
            <col class="year-column" />
            <col class="score-column" />
            <col class="score-column" />
            <col class="parallel-column" />
          </colgroup>
          <thead>
            <tr>
              <th>学校</th>
              <th>年份</th>
              <th>到区</th>
              <th>${schoolQuotaHeader}</th>
              <th>平行</th>
            </tr>
          </thead>
          <tbody>
            ${group.rows.map(compareSchoolRows).join("")}
          </tbody>
        </table>
      </div>
    </section>
  `;
}

function compareSchoolRows(item) {
  return data.summary.years
    .map((year, index) => compareSchoolYearRow(item, year, index === 0))
    .join("");
}

function compareSchoolYearRow(item, year, showSchool) {
  const values = item.years[year];
  const lower = values.delta !== null && values.delta < 0;
  const districtLabel = item.schoolDistrict || state.district;
  return `
    <tr>
      ${
        showSchool
          ? `<td class="school-col" rowspan="${data.summary.years.length}">
              <strong>${escapeHtml(item.school)}</strong>
              <span>${escapeHtml(districtLabel)}</span>
            </td>`
          : ""
      }
      <td class="year-cell">${year}</td>
      <td class="num ${lower ? "lower-cell" : ""}">${scoreWithDelta(values.quota, values.delta)}</td>
      <td class="num">${scoreWithDelta(values.schoolQuota, values.schoolDelta)}</td>
      <td class="num">${fmt(values.parallel)}</td>
    </tr>
  `;
}

function compareCard(item) {
  const judgement = compareJudgement(item);
  return `
    <article class="school-card compare-card">
      <div class="card-top">
        <div>
          <div class="school-name">${escapeHtml(item.school)}</div>
          <div class="meta">
            <span class="pill">${escapeHtml(state.district)}</span>
            <span class="pill ${judgement.level}">${judgement.label}</span>
          </div>
        </div>
        <div class="score">
          <strong>${fmt(item.latest.delta)}</strong>
          <span>到区-平行</span>
        </div>
      </div>
      ${compareTable(item)}
      <div class="judgement ${judgement.level}">
        <strong>${judgement.title}</strong>
        <p>${judgement.text}</p>
      </div>
    </article>
  `;
}

function compareTable(item) {
  const schoolQuotaHeader = state.juniorSchool ? "到校" : "到校最低";
  return `
    <div class="compare-mini-wrap">
      <table class="compare-mini-table">
        <thead>
          <tr>
            <th>年份</th>
            <th>到区</th>
            <th>${schoolQuotaHeader}</th>
            <th>平行</th>
          </tr>
        </thead>
        <tbody>
          ${data.summary.years.map((year) => compareRow(year, item.years[year])).join("")}
        </tbody>
      </table>
    </div>
  `;
}

function compareRow(year, values) {
  const lower = values.delta !== null && values.delta < 0;
  return `
    <tr>
      <td class="year-cell">${year}</td>
      <td class="num ${lower ? "lower-cell" : ""}">${scoreWithDelta(values.quota, values.delta)}</td>
      <td class="num">${scoreWithDelta(values.schoolQuota, values.schoolDelta)}</td>
      <td class="num">${fmt(values.parallel)}</td>
    </tr>
  `;
}

function scoreWithDelta(score, delta) {
  const deltaClass = delta === null ? "" : delta < 0 ? "negative" : "positive";
  const deltaText = delta === null ? "" : `<small class="score-delta ${deltaClass}">${delta > 0 ? "+" : ""}${fmt(delta)}</small>`;
  return `<strong>${fmt(score)}</strong>${deltaText}`;
}

function compareJudgement(item) {
  const deltas = Object.values(item.years)
    .map((year) => year.delta)
    .filter((value) => value !== null);
  const lowerYears = deltas.filter((value) => value < 0).length;
  const bestGap = deltas.length ? Math.min(...deltas) : null;
  if (bestGap !== null && bestGap <= -10 && lowerYears >= 2) {
    return {
      level: "good",
      label: "名额优先看",
      title: "名额到区有连续优势",
      text: "近三年里不止一年到区低于平行，适合先研究名额路径，再决定平行志愿梯度。",
    };
  }
  if (bestGap !== null && bestGap < 0) {
    return {
      level: "watch",
      label: "可以关注",
      title: "名额到区出现过低分机会",
      text: "到区曾低于平行，但稳定性还要继续看年份和学校热度，适合作为冲一冲线索。",
    };
  }
  return {
    level: "care",
    label: "回看平行",
    title: "名额优势不明显",
    text: "目前没有看到到区低于平行的明确优势，建议重点回到平行志愿录取最低分数线排序。",
  };
}

function renderParallelHistory() {
  const schools = new Map();
  data.parallel.forEach((row) => {
    if (row.district !== state.district) return;
    if (state.query && !row.school.includes(state.query.trim())) return;
    if (!schools.has(row.school)) {
      schools.set(row.school, {
        school: row.school,
        schoolType: row.schoolType || "其他",
        schoolDistrict: row.schoolDistrict || "",
        years: {},
        sortScore: 0,
      });
    }
    const item = schools.get(row.school);
    if (!item.schoolDistrict && row.schoolDistrict) item.schoolDistrict = row.schoolDistrict;
    item.years[row.year] = row;
    if (row.year === "2025") item.sortScore = row.score || 0;
  });

  const rows = Array.from(schools.values()).sort((a, b) => {
    const aScore = a.sortScore || a.years["2024"]?.score || a.years["2023"]?.score || 0;
    const bScore = b.sortScore || b.years["2024"]?.score || b.years["2023"]?.score || 0;
    return bScore - aScore || a.school.localeCompare(b.school, "zh-Hans-CN");
  });
  els.resultCount.textContent = `${rows.length} 所`;
  els.resultList.innerHTML = rows.length
    ? groupBySchoolType(rows).map((group) => parallelHistoryTable(group.rows, group.type)).join("")
    : emptyHtml();
}

function parallelHistoryTable(rows, title) {
  return `
    <section class="table-section history-table-section">
      <div class="group-title">
        <h3>${escapeHtml(title)}</h3>
        <span>${rows.length} 所</span>
      </div>
      <div class="history-table-wrap">
        <table class="history-table">
          <colgroup>
            <col class="school-column" />
            <col class="year-score-column" />
            <col class="year-score-column" />
            <col class="year-score-column" />
          </colgroup>
          <thead>
            <tr>
              <th>学校</th>
              ${ASCENDING_YEARS.map((year) => `<th>${year}</th>`).join("")}
            </tr>
          </thead>
          <tbody>${rows.map(parallelHistoryRow).join("")}</tbody>
        </table>
      </div>
    </section>
  `;
}

function parallelHistoryRow(item) {
  return `
    <tr>
      <td class="school-col">${escapeHtml(item.school)}</td>
      ${ASCENDING_YEARS.map((year) => `<td class="score-col">${fmt(item.years[year]?.score)}</td>`).join("")}
    </tr>
  `;
}

function trendLabel(values) {
  if (values.length < 2) return { level: "care", text: "数据不足" };
  const newest = values[0];
  const oldest = values[values.length - 1];
  const delta = round1(newest - oldest);
  if (delta >= 5) return { level: "watch", text: `三年升 ${fmt(delta)}` };
  if (delta <= -5) return { level: "good", text: `三年降 ${fmt(Math.abs(delta))}` };
  return { level: "blue", text: "整体平稳" };
}

function groupBySchoolType(rows) {
  const groups = new Map(SCHOOL_TYPE_ORDER.map((type) => [type, []]));
  rows.forEach((row) => {
    const type = displaySchoolType(row);
    groups.get(type).push(row);
  });
  return SCHOOL_TYPE_ORDER.map((type) => ({ type, rows: groups.get(type) })).filter((group) => group.rows.length);
}

function displaySchoolType(row) {
  if (
    row.schoolDistrict &&
    row.schoolDistrict !== state.district &&
    row.schoolType !== "委属高中" &&
    PUBLIC_SCHOOL_TYPES.has(row.schoolType)
  ) {
    return "外区市重点";
  }
  if (row.schoolType === "国际高中") return "国际/双语";
  return SCHOOL_TYPE_ORDER.includes(row.schoolType) ? row.schoolType : "其他";
}

function renderAdvice() {
  const target = scoreValue(state.minScore);
  const districtRows = quotaDistrictAdviceRows();
  const schoolRows = quotaSchoolAdviceRows();
  const parallelRows = parallelAdviceRows();
  if (target === null) {
    els.resultCount.textContent = `${districtRows.length + schoolRows.length + parallelRows.length} 所`;
    els.resultList.innerHTML = `
      ${adviceOverview(districtRows)}
      <div class="empty">
        在“预估分”里输入分数，这里会按${escapeHtml(state.district)}名额到区、所在初中的名额到校和平行志愿录取线给出冲、稳、保建议。
      </div>
      ${adviceSchoolPrompt(schoolRows)}
    `;
    return;
  }

  const districtBuckets = adviceBuckets(districtRows, "到区线", target);
  const schoolBuckets = adviceBuckets(schoolRows, "到校线", target);
  const parallelBuckets = adviceBuckets(parallelRows, "平行线", target);
  const districtCount = districtBuckets.reduce((sum, bucket) => sum + bucket.rows.length, 0);
  const schoolCount = schoolBuckets.reduce((sum, bucket) => sum + bucket.rows.length, 0);
  const parallelCount = parallelBuckets.reduce((sum, bucket) => sum + bucket.rows.length, 0);

  els.resultCount.textContent = `${districtCount + schoolCount + parallelCount} 所`;
  els.resultList.innerHTML = `
    ${adviceSummary(districtRows, target)}
    ${adviceGroup("名额到区建议", "按考生所在区名额到区录取最低分数线判断，全区竞争。", districtBuckets, target, "名额到区")}
    ${adviceSchoolGroup(schoolRows, schoolBuckets, target)}
    ${adviceGroup("平行志愿建议", "按考生所在区1-15平行志愿录取最低分数线判断，用来拉开冲、稳、保梯度。", parallelBuckets, target, "平行志愿")}
    ${adviceOverview(districtRows)}
  `;
}

function quotaDistrictAdviceRows() {
  return data.quotaDistrict
    .filter((row) => row.district === state.district && row.year === state.year)
    .filter((row) => row.score !== null)
    .filter((row) => !state.query || row.school.includes(state.query.trim()))
    .sort((a, b) => b.score - a.score || a.school.localeCompare(b.school, "zh-Hans-CN"));
}

function quotaSchoolAdviceRows() {
  const junior = state.juniorSchool.trim();
  if (!junior) return [];
  return data.quotaSchool
    .filter((row) => row.district === state.district && row.year === state.year)
    .filter((row) => row.score !== null)
    .filter((row) => String(row.juniorSchool || "").includes(junior))
    .filter((row) => !state.query || row.school.includes(state.query.trim()))
    .sort((a, b) => b.score - a.score || a.school.localeCompare(b.school, "zh-Hans-CN"));
}

function parallelAdviceRows() {
  return data.parallel
    .filter((row) => row.district === state.district && row.year === state.year)
    .filter((row) => row.score !== null)
    .filter((row) => !state.query || row.school.includes(state.query.trim()))
    .sort((a, b) => b.score - a.score || a.school.localeCompare(b.school, "zh-Hans-CN"));
}

function adviceBuckets(rows, lineLabel, target) {
  return [
    { title: "冲一冲", note: `${lineLabel}高于预估分 0-12 分，适合少量放在前面试机会。`, rows: closestRows(rows.filter((row) => row.score > target && row.score <= target + 12), target) },
    { title: "稳一稳", note: `${lineLabel}低于或接近预估分 0-10 分，适合作为主要关注层。`, rows: closestRows(rows.filter((row) => row.score <= target && row.score >= target - 10), target) },
    { title: "保一保", note: `${lineLabel}低于预估分 10-30 分，用来补足安全梯度。`, rows: closestRows(rows.filter((row) => row.score < target - 10 && row.score >= target - 30), target) },
  ];
}

function closestRows(rows, target) {
  return rows
    .slice()
    .sort((a, b) => Math.abs(a.score - target) - Math.abs(b.score - target) || b.score - a.score || a.school.localeCompare(b.school, "zh-Hans-CN"))
    .slice(0, 8);
}

function adviceSummary(rows, target) {
  if (!rows.length) {
    return '<div class="empty">当前区和年份暂无名额到区数据。</div>';
  }
  const reachable = rows.filter((row) => row.score <= target);
  const nearest = rows.reduce((best, row) => {
    if (!best) return row;
    return Math.abs(row.score - target) < Math.abs(best.score - target) ? row : best;
  }, null);
  const topScore = rows[0].score;
  const lowScore = rows[rows.length - 1].score;
  let level = "低位";
  let suggestion = "先稳住低于预估分的学校，冲刺学校数量要控制，避免名额到区占用过多不确定性。";
  if (target >= topScore) {
    level = "高位";
    suggestion = "本区名额到区空间较大，可以优先看委属高中和本区、市重点高位学校，再保留少量稳妥梯度。";
  } else if (reachable.length >= Math.ceil(rows.length * 0.6)) {
    level = "中高位";
    suggestion = "可选面比较宽，建议冲稳保都放，但重点比较学校热度和近三年波动。";
  } else if (reachable.length >= Math.ceil(rows.length * 0.3)) {
    level = "中位";
    suggestion = "重点放在接近预估分和低 10 分以内的学校，冲刺学校控制在少数。";
  } else if (target < lowScore) {
    level = "低于当前到区线";
    suggestion = "这个分数低于当前筛选结果中的名额到区线，建议回到平行志愿和名额到校一起看。";
  }
  return `
    <section class="table-section advice-section">
      <div class="group-title">
        <h3>${escapeHtml(state.district)}${fmt(state.year)} 到区判断</h3>
        <span>${level}</span>
      </div>
      <div class="advice-list">
        <article class="advice-row">
          <strong>预估分 ${fmt(target)}</strong>
          <span>当前筛选下共有 ${rows.length} 所，到区线不高于预估分的有 ${reachable.length} 所；最近的是 ${escapeHtml(nearest.school)}，到区线 ${fmt(nearest.score)}。</span>
          <span>${suggestion}</span>
        </article>
      </div>
    </section>
  `;
}

function adviceOverview(rows) {
  const bands = buildScoreBands(rows);
  if (!bands.length) return "";
  return `
    <section class="table-section advice-section">
      <div class="group-title">
        <h3>本区分数段参考</h3>
        <span>${bands.length} 段</span>
      </div>
      <div class="advice-list">
        ${bands.map((band) => `<article class="advice-row"><strong>${band.title}</strong><span>${band.text}</span></article>`).join("")}
      </div>
    </section>
  `;
}

function buildScoreBands(rows) {
  if (!rows.length) return [];
  const bands = [
    { title: "高分段", rows: rows.slice(0, Math.ceil(rows.length / 3)) },
    { title: "中分段", rows: rows.slice(Math.ceil(rows.length / 3), Math.ceil((rows.length * 2) / 3)) },
    { title: "稳妥段", rows: rows.slice(Math.ceil((rows.length * 2) / 3)) },
  ].filter((band) => band.rows.length);

  return bands.map((band) => {
    const first = band.rows[0];
    const last = band.rows[band.rows.length - 1];
    const sample = band.rows.slice(0, 3).map((row) => row.school).join("、");
    return {
      title: `${band.title} ${fmt(last.score)}-${fmt(first.score)} 分`,
      text: `${band.rows.length} 所，代表学校：${escapeHtml(sample)}。`,
    };
  });
}

function adviceSchoolPrompt(rows) {
  if (state.juniorSchool.trim()) return "";
  return `
    <section class="table-section advice-section">
      <div class="group-title">
        <h3>名额到校建议</h3>
        <span>需填初中</span>
      </div>
      <div class="advice-list">
        <div class="empty inline">输入考生所在初中后，会按该初中的名额到校录取最低分数线给出冲、稳、保建议。</div>
      </div>
    </section>
  `;
}

function adviceSchoolGroup(rows, buckets, target) {
  if (!state.juniorSchool.trim()) return adviceSchoolPrompt(rows);
  if (!rows.length) {
    return `
      <section class="table-section advice-section">
        <div class="group-title">
          <h3>名额到校建议</h3>
          <span>0 所</span>
        </div>
        <div class="advice-list">
          <div class="empty inline">当前初中没有匹配到名额到校录取最低分数线，可检查初中名称或切换参考年份。</div>
        </div>
      </section>
    `;
  }
  return adviceGroup(
    "名额到校建议",
    `按“${escapeHtml(state.juniorSchool.trim())}”对应的名额到校录取最低分数线判断，主要看校内竞争。`,
    buckets,
    target,
    "名额到校"
  );
}

function adviceGroup(title, note, buckets, target, scoreLabel) {
  return `
    <section class="advice-group">
      <div class="advice-group-title">
        <h3>${title}</h3>
        <p>${note}</p>
      </div>
      ${buckets.map((bucket) => adviceBucket(bucket, target, scoreLabel)).join("")}
    </section>
  `;
}

function adviceBucket(bucket, target, scoreLabel) {
  return `
    <section class="table-section advice-section">
      <div class="group-title">
        <h3>${bucket.title}</h3>
        <span>${bucket.rows.length} 所</span>
      </div>
      <div class="advice-list">
        <article class="advice-row advice-note"><span>${bucket.note}</span></article>
        ${
          bucket.rows.length
            ? bucket.rows.map((row) => {
                const gap = round1(row.score - target);
                return `<article class="advice-row"><strong>${escapeHtml(row.school)}</strong><span>${scoreLabel} ${fmt(row.score)}，${gapText(gap)}</span></article>`;
              }).join("")
            : '<div class="empty inline">暂无匹配学校</div>'
        }
      </div>
    </section>
  `;
}

function findScore(path, school, year, district = state.district) {
  const row = data[path].find((item) => item.district === district && item.school === school && item.year === year);
  return row ? row.score : null;
}

function findSchoolQuota(school, year) {
  const rows = data.quotaSchool.filter((row) => {
    if (row.district !== state.district || row.school !== school || row.year !== year) return false;
    return !state.juniorSchool || String(row.juniorSchool || "").includes(state.juniorSchool.trim());
  });
  const validScores = rows.map((row) => row.score).filter((score) => score !== null);
  if (!validScores.length) return null;
  return Math.min(...validScores);
}

function pathLabel(path) {
  if (path === "quotaDistrict") return "名额到区";
  if (path === "quotaSchool") return "名额到校";
  return "平行志愿";
}

function round1(value) {
  return Math.round(value * 10) / 10;
}

function gapText(gap) {
  if (gap === 0) return "与预估分相同";
  return `比预估分 ${gap > 0 ? "高" : "低"} ${fmt(Math.abs(gap))}`;
}

function emptyHtml() {
  return '<div class="empty">没有符合当前筛选的学校</div>';
}

setup();
