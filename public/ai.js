// 1. HTML要素の取得

const beforeAnalysis =
  document.getElementById("beforeAnalysis");

const afterAnalysis =
  document.getElementById("afterAnalysis");

const unfinishedList =
  document.getElementById("unfinishedList");

const todayList =// 1. HTML要素の取得

const beforeAnalysis =
  document.getElementById("beforeAnalysis");

const afterAnalysis =
  document.getElementById("afterAnalysis");

const unfinishedList =
  document.getElementById("unfinishedList");

const todayList =
  document.getElementById("todayList");

const allPlanList =
  document.getElementById("allPlanList");

const registerList =
  document.getElementById("registerList");

const message =
  document.getElementById("message");



// 2. localStorageからデータ取得

const tasksData = JSON.parse(
  localStorage.getItem("tasks") || "[]"
);

// setting.html が保存する得意・苦手
let plannerSkills = [];

try {
  const parsed = JSON.parse(
    localStorage.getItem("plannerSkills") || "[]"
  );

  if (Array.isArray(parsed)) {
    plannerSkills = parsed;
  }
} catch (e) {}



// 3. 日付の処理

// YYYY-MM-DD形式に変換
function formatDate(date) {
  const year = date.getFullYear();

  const month = String(
    date.getMonth() + 1
  ).padStart(2, "0");

  const day = String(
    date.getDate()
  ).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

// 今日の日付
const today = formatDate(new Date());

// 指定日までの日数
function daysUntil(dateString) {
  if (!dateString) return 999;

  const deadline = new Date(
    dateString + "T00:00:00"
  );

  const current = new Date(
    today + "T00:00:00"
  );

  if (isNaN(deadline.getTime())) {
    return 999;
  }

  return Math.round(
    (deadline - current) / 86400000
  );
}

// 今日から指定日数後の日付
function addDays(days) {
  const date = new Date(
    today + "T00:00:00"
  );

  date.setDate(date.getDate() + days);

  return formatDate(date);
}

// 日付を見やすく表示
function displayDate(dateString) {
  if (!dateString) return "未設定";

  const date = new Date(
    dateString + "T00:00:00"
  );

  if (isNaN(date.getTime())) {
    return dateString;
  }

  return date.toLocaleDateString("ja-JP", {
    month: "long",
    day: "numeric",
    weekday: "short"
  });
}



// 4. 得意・苦手の取得

const LEVEL_LABELS = {
  good: "得意",
  normal: "ふつう",
  bad: "苦手"
};

function getSkill(category) {
  const item = plannerSkills.find(
    skill => skill.name === category
  );

  return LEVEL_LABELS[item?.level] || "ふつう";
}


// 5. 未着手の課題を取得

const unfinishedTasks = (
  Array.isArray(tasksData) ? tasksData : []
)
.filter(task =>
  task.status !== "完了"
)
.map((task, index) => ({
  id: String(task.id ?? `task_${index}`),

  title:
    task.title || task.name || "名称未設定",

  category:
    task.category || "その他",

  deadline:
    task.deadline || task.dueDate || "",

  estimatedTime:
    Number(task.estimatedTime) > 0
      ? Number(task.estimatedTime)
      : 60
}));



// 6. 未着手の課題を表示

function showUnfinishedTasks() {
  unfinishedList.replaceChildren();

  if (unfinishedTasks.length === 0) {
    const empty = document.createElement("p");
    empty.className = "empty-message";

    empty.textContent =
      "未完了の課題はありません。ホーム画面から課題を登録してください。";

    unfinishedList.appendChild(empty);

    document.getElementById(
      "startBtn"
    ).disabled = true;

    return;
  }

  unfinishedTasks.forEach(task => {
    const card = document.createElement("div");
    card.className = "task-card";

    const title = document.createElement("div");
    title.className = "task-title";
    title.textContent = task.title;

    const detail = document.createElement("div");
    detail.className = "task-detail";

    detail.textContent =
      `締切：${displayDate(task.deadline)} ／ ` +
      `分類：${task.category}`;

    card.append(title, detail);
    unfinishedList.appendChild(card);
  });
}


// 7. 優先順位の計算

function calculatePriority(task) {
  let score = 0;

  const days = daysUntil(task.deadline);
  const skill = getSkill(task.category);

  // 締切が近いほど高くする
  if (days <= 1) {
    score += 100;
  } else if (days <= 3) {
    score += 80;
  } else if (days <= 7) {
    score += 50;
  } else if (days <= 14) {
    score += 20;
  }

  // 苦手な課題を優先
  if (skill === "苦手") {
    score += 25;
  } else if (skill === "ふつう") {
    score += 10;
  }

  // 作業時間も考慮
  if (task.estimatedTime >= 120) {
    score += 15;
  } else if (task.estimatedTime >= 60) {
    score += 5;
  }

  return score;
}


// 8. 学習日を自動提案
// 各日に割り当てた学習時間
const dailyLoad = {};

// 原則として1日120分以内を目安にする
const DAILY_LIMIT = 120;

function suggestStudyDate(task, minutes) {
  const remainingDays =
    daysUntil(task.deadline);

  // 締切前日までに取り組む
  // 今日締切・締切超過なら今日
  const maxOffset =
    remainingDays === 999
      ? 7
      : Math.max(0, remainingDays - 1);

  // 直近14日間から探す
  const searchLimit = Math.min(
    maxOffset, 13
  );

  let bestDate = today;
  let lowestLoad = Infinity;

  for (
    let i = 0;
    i <= searchLimit;
    i++
  ) {
    const candidate = addDays(i);
    const load = dailyLoad[candidate] || 0;

    // 1日の目安時間以内に収まる日
    if (load + minutes <= DAILY_LIMIT) {
      return candidate;
    }

    // 収まらない場合に備え、
    // 最も負担が少ない日を記憶
    if (load < lowestLoad) {
      lowestLoad = load;
      bestDate = candidate;
    }
  }

  return bestDate;
}


// 9. 分析結果の作成

let suggestions = [];

// AI(gpt-6-luna)に優先順位と学習日を提案してもらう
async function requestAiPlan() {
  const res = await fetch("/api/plan", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      today: today,
      dailyLimit: DAILY_LIMIT,
      tasks: unfinishedTasks.map(task => ({
        id: task.id,
        title: task.title,
        category: task.category,
        deadline: task.deadline || "未設定",
        daysLeft: daysUntil(task.deadline),
        estimatedTime: task.estimatedTime,
        skill: getSkill(task.category)
      }))
    })
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(data.error || "AIの提案に失敗しました。");
  }

  const taskById = new Map(
    unfinishedTasks.map(task => [task.id, task])
  );

  const used = new Set();
  const result = [];

  // AIの返答を検証してから採用する
  (data.plans || []).forEach(item => {
    const task = taskById.get(String(item.id));
    if (!task || used.has(task.id)) return;
    used.add(task.id);

    let studyDate = /^\d{4}-\d{2}-\d{2}$/.test(item.studyDate)
      ? item.studyDate
      : today;

    // 過去の日付は今日にする
    if (studyDate < today) studyDate = today;

    const minutes =
      Math.max(15, Math.round(Number(item.minutes) / 15) * 15) ||
      task.estimatedTime;

    result.push({
      ...task,
      studyDate: studyDate,
      minutes: minutes,
      reason:
        String(item.reason || "").slice(0, 60) ||
        "AIが優先度を判断",
      selected: true
    });
  });

  // AIの返答に含まれなかった課題は最後に追加
  unfinishedTasks.forEach(task => {
    if (used.has(task.id)) return;

    result.push({
      ...task,
      studyDate: today,
      minutes: task.estimatedTime,
      reason: "ほかの課題との優先順位を考慮",
      selected: true
    });
  });

  return {
    suggestions: result,
    summary: String(data.summary || "")
  };
}

// AIにつながらないときの予備:従来のルールで計算
function buildLocalSuggestions() {
  // 再分析時に負担計算をリセット
  Object.keys(dailyLoad).forEach(key => {
    delete dailyLoad[key];
  });

  // 優先順位順に並び替え
  const sortedTasks = [
    ...unfinishedTasks
  ].sort((a, b) => {
    const scoreDiff =
      calculatePriority(b) -
      calculatePriority(a);

    if (scoreDiff !== 0) return scoreDiff;

    return daysUntil(a.deadline) -
           daysUntil(b.deadline);
  });

  return sortedTasks.map(task => {
    const skill = getSkill(task.category);

    // 得意・苦手による時間の補正
    let multiplier = 1;

    if (skill === "苦手") {
      multiplier = 1.3;
    } else if (skill === "得意") {
      multiplier = 0.9;
    }

    // 15分単位にする
    const minutes = Math.max(
      15,
      Math.ceil(
        task.estimatedTime * multiplier / 15
      ) * 15
    );

    // 学習日を決める
    const studyDate = suggestStudyDate(
      task, minutes
    );

    dailyLoad[studyDate] =
      (dailyLoad[studyDate] || 0) + minutes;

    // 提案理由を作成
    const reasons = [];
    const days = daysUntil(task.deadline);

    if (days <= 3) {
      reasons.push("締切が近い");
    }

    if (skill === "苦手") {
      reasons.push("苦手な分野");
    }

    if (minutes >= 120) {
      reasons.push("作業時間が長い");
    }

    if (reasons.length === 0) {
      reasons.push(
        "ほかの課題との優先順位を考慮"
      );
    }

    return {
      ...task,
      studyDate: studyDate,
      minutes: minutes,
      reason: reasons.join("・"),
      selected: true
    };
  });
}

function showResults(reasonText) {
  showTodayPlan();
  showAllPlan();
  showRegisterList();

  document.getElementById(
    "analysisReason"
  ).textContent = reasonText;

  beforeAnalysis.hidden = true;
  afterAnalysis.hidden = false;
}

async function analyzeTasks() {
  const startBtn = document.getElementById("startBtn");

  startBtn.disabled = true;
  startBtn.textContent = "AIが分析中…";
  message.textContent = "";

  try {
    const result = await requestAiPlan();
    suggestions = result.suggestions;

    showResults(
      result.summary ||
      "締切までの日数、得意・苦手、作業時間をもとに、" +
      "AIが取り組む順番と学習予定日を提案しました。"
    );
  } catch (error) {
    console.error(error);

    suggestions = buildLocalSuggestions();

    showResults(
      "AIにつながらなかったため、締切・得意・苦手・作業時間から" +
      "簡易的に計算した提案を表示しています。"
    );
  } finally {
    startBtn.disabled = false;
    startBtn.textContent = "✧ 分析スタート";
  }
}


// 10. 学習計画のカード作成

function createPlanCard(plan, rank) {
  const card = document.createElement("div");

  card.className =
    `plan-card rank-${Math.min(rank, 3)}`;

  const number = document.createElement("div");
  number.className = "rank-number";
  number.textContent = rank;

  const info = document.createElement("div");
  info.className = "plan-info";

  const title = document.createElement("div");
  title.className = "task-title";
  title.textContent = plan.title;

  const detail = document.createElement("div");
  detail.className = "task-detail";

  detail.textContent =
    `学習予定：${displayDate(plan.studyDate)} ／ ` +
    `${plan.minutes}分`;

  const reason = document.createElement("p");
  reason.className = "plan-reason";
  reason.textContent =
    `✧ ${plan.reason}`;

  info.append(title, detail, reason);
  card.append(number, info);

  return card;
}



// 11. 今日やること

function showTodayPlan() {
  todayList.replaceChildren();

  const todayPlans = suggestions.filter(
    plan => plan.studyDate === today
  );

  if (todayPlans.length === 0) {
    const empty = document.createElement("p");
    empty.className = "empty-message";
    empty.textContent =
      "今日に割り当てられた学習予定はありません。";

    todayList.appendChild(empty);
    return;
  }

  todayPlans.forEach(plan => {
    const rank =
      suggestions.indexOf(plan) + 1;

    todayList.appendChild(
      createPlanCard(plan, rank)
    );
  });
}


// 12. 全体の計画

function showAllPlan() {
  allPlanList.replaceChildren();

  suggestions.forEach((plan, index) => {
    allPlanList.appendChild(
      createPlanCard(plan, index + 1)
    );
  });
}


// 13. カレンダー登録の選択

function showRegisterList() {
  registerList.replaceChildren();

  suggestions.forEach(plan => {
    const card = document.createElement("div");
    card.className = "register-card";

    const label = document.createElement("label");

    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.checked = plan.selected;

    // チェック状態を記録
    checkbox.addEventListener("change", () => {
      plan.selected = checkbox.checked;
    });

    const info = document.createElement("div");
    info.className = "register-info";

    const title = document.createElement("div");
    title.className = "task-title";
    title.textContent = plan.title;

    const date = document.createElement("div");
    date.className = "register-date";

    date.textContent =
      `${displayDate(plan.studyDate)}・${plan.minutes}分`;

    info.append(title, date);
    label.append(checkbox, info);
    card.appendChild(label);

    registerList.appendChild(card);
  });
}


// 14. カレンダーに登録する

function savePlans() {
  const selectedPlans = suggestions.filter(
    plan => plan.selected
  );

  // 登録対象がないとき
  if (selectedPlans.length === 0) {
    message.textContent =
      "登録したい予定を1つ以上選んでください。";
    return;
  }

  // ホームのカレンダーが読む予定を取得
  let saved = [];

  try {
    const parsed = JSON.parse(
      localStorage.getItem("calendarEvents") || "[]"
    );

    if (Array.isArray(parsed)) {
      saved = parsed;
    }
  } catch (e) {}

  // 今回の課題について以前AI登録した予定だけを
  // 取り除く(ほかの予定は残す)
  const analyzedIds = new Set(
    suggestions.map(plan => `ai_${plan.id}`)
  );

  const remainingEvents = saved.filter(
    event => !analyzedIds.has(String(event.id))
  );

  // チェックした予定だけ、カレンダーの形式で登録
  const newSchedules = selectedPlans.map(plan => ({
    id: `ai_${plan.id}`,
    title: plan.title,
    start: plan.studyDate,
    allDay: true
  }));

  localStorage.setItem(
    "calendarEvents",
    JSON.stringify([
      ...remainingEvents,
      ...newSchedules
    ])
  );

  message.textContent =
    `${newSchedules.length}件の学習予定を登録しました！`;

  // 保存後、ホーム画面へ移動
  window.location.href = "index.html";
}


// 15. タブ切り替え

document.querySelectorAll(".tab").forEach(
  button => {
    button.addEventListener("click", () => {
      document.querySelectorAll(".tab").forEach(
        tab => tab.classList.remove("active")
      );

      button.classList.add("active");

      const selectedTab = button.dataset.tab;

      document.getElementById(
        "todayContent"
      ).hidden = selectedTab !== "today";

      document.getElementById(
        "allContent"
      ).hidden = selectedTab !== "all";
    });
  }
);


// 16. ボタンのイベント

// 分析スタート
document.getElementById(
  "startBtn"
).addEventListener("click", analyzeTasks);

// 登録ボタン
document.getElementById(
  "saveBtn"
).addEventListener("click", savePlans);

// 課題一覧に戻る
document.getElementById(
  "backBtn"
).addEventListener("click", () => {
  afterAnalysis.hidden = true;
  beforeAnalysis.hidden = false;
  message.textContent = "";
});


// 17. 最初に表示

showUnfinishedTasks();
  document.getElementById("todayList");

const allPlanList =
  document.getElementById("allPlanList");

const registerList =
  document.getElementById("registerList");

const message =
  document.getElementById("message");



// 2. localStorageからデータ取得

const tasksData = JSON.parse(
  localStorage.getItem("tasks") || "[]"
);

// setting.html が保存する得意・苦手
let plannerSkills = [];

try {
  const parsed = JSON.parse(
    localStorage.getItem("plannerSkills") || "[]"
  );

  if (Array.isArray(parsed)) {
    plannerSkills = parsed;
  }
} catch (e) {}



// 3. 日付の処理

// YYYY-MM-DD形式に変換
function formatDate(date) {
  const year = date.getFullYear();

  const month = String(
    date.getMonth() + 1
  ).padStart(2, "0");

  const day = String(
    date.getDate()
  ).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

// 今日の日付
const today = formatDate(new Date());

// 指定日までの日数
function daysUntil(dateString) {
  if (!dateString) return 999;

  const deadline = new Date(
    dateString + "T00:00:00"
  );

  const current = new Date(
    today + "T00:00:00"
  );

  if (isNaN(deadline.getTime())) {
    return 999;
  }

  return Math.round(
    (deadline - current) / 86400000
  );
}

// 今日から指定日数後の日付
function addDays(days) {
  const date = new Date(
    today + "T00:00:00"
  );

  date.setDate(date.getDate() + days);

  return formatDate(date);
}

// 日付を見やすく表示
function displayDate(dateString) {
  if (!dateString) return "未設定";

  const date = new Date(
    dateString + "T00:00:00"
  );

  if (isNaN(date.getTime())) {
    return dateString;
  }

  return date.toLocaleDateString("ja-JP", {
    month: "long",
    day: "numeric",
    weekday: "short"
  });
}



// 4. 得意・苦手の取得

const LEVEL_LABELS = {
  good: "得意",
  normal: "ふつう",
  bad: "苦手"
};

function getSkill(category) {
  const item = plannerSkills.find(
    skill => skill.name === category
  );

  return LEVEL_LABELS[item?.level] || "ふつう";
}


// 5. 未着手の課題を取得

const unfinishedTasks = (
  Array.isArray(tasksData) ? tasksData : []
)
.filter(task =>
  task.status !== "完了"
)
.map((task, index) => ({
  id: String(task.id ?? `task_${index}`),

  title:
    task.title || task.name || "名称未設定",

  category:
    task.category || "その他",

  deadline:
    task.deadline || task.dueDate || "",

  estimatedTime:
    Number(task.estimatedTime) > 0
      ? Number(task.estimatedTime)
      : 60
}));



// 6. 未着手の課題を表示

function showUnfinishedTasks() {
  unfinishedList.replaceChildren();

  if (unfinishedTasks.length === 0) {
    const empty = document.createElement("p");
    empty.className = "empty-message";

    empty.textContent =
      "未完了の課題はありません。ホーム画面から課題を登録してください。";

    unfinishedList.appendChild(empty);

    document.getElementById(
      "startBtn"
    ).disabled = true;

    return;
  }

  unfinishedTasks.forEach(task => {
    const card = document.createElement("div");
    card.className = "task-card";

    const title = document.createElement("div");
    title.className = "task-title";
    title.textContent = task.title;

    const detail = document.createElement("div");
    detail.className = "task-detail";

    detail.textContent =
      `締切：${displayDate(task.deadline)} ／ ` +
      `分類：${task.category}`;

    card.append(title, detail);
    unfinishedList.appendChild(card);
  });
}


// 7. 優先順位の計算

function calculatePriority(task) {
  let score = 0;

  const days = daysUntil(task.deadline);
  const skill = getSkill(task.category);

  // 締切が近いほど高くする
  if (days <= 1) {
    score += 100;
  } else if (days <= 3) {
    score += 80;
  } else if (days <= 7) {
    score += 50;
  } else if (days <= 14) {
    score += 20;
  }

  // 苦手な課題を優先
  if (skill === "苦手") {
    score += 25;
  } else if (skill === "ふつう") {
    score += 10;
  }

  // 作業時間も考慮
  if (task.estimatedTime >= 120) {
    score += 15;
  } else if (task.estimatedTime >= 60) {
    score += 5;
  }

  return score;
}


// 8. 学習日を自動提案
// 各日に割り当てた学習時間
const dailyLoad = {};

// 原則として1日120分以内を目安にする
const DAILY_LIMIT = 120;

function suggestStudyDate(task, minutes) {
  const remainingDays =
    daysUntil(task.deadline);

  // 締切前日までに取り組む
  // 今日締切・締切超過なら今日
  const maxOffset =
    remainingDays === 999
      ? 7
      : Math.max(0, remainingDays - 1);

  // 直近14日間から探す
  const searchLimit = Math.min(
    maxOffset, 13
  );

  let bestDate = today;
  let lowestLoad = Infinity;

  for (
    let i = 0;
    i <= searchLimit;
    i++
  ) {
    const candidate = addDays(i);
    const load = dailyLoad[candidate] || 0;

    // 1日の目安時間以内に収まる日
    if (load + minutes <= DAILY_LIMIT) {
      return candidate;
    }

    // 収まらない場合に備え、
    // 最も負担が少ない日を記憶
    if (load < lowestLoad) {
      lowestLoad = load;
      bestDate = candidate;
    }
  }

  return bestDate;
}


// 9. 分析結果の作成

let suggestions = [];

function analyzeTasks() {
  // 再分析時に負担計算をリセット
  Object.keys(dailyLoad).forEach(key => {
    delete dailyLoad[key];
  });

  // 優先順位順に並び替え
  const sortedTasks = [
    ...unfinishedTasks
  ].sort((a, b) => {
    const scoreDiff =
      calculatePriority(b) -
      calculatePriority(a);

    if (scoreDiff !== 0) return scoreDiff;

    return daysUntil(a.deadline) -
           daysUntil(b.deadline);
  });

  suggestions = sortedTasks.map(task => {
    const skill = getSkill(task.category);

    // 得意・苦手による時間の補正
    let multiplier = 1;

    if (skill === "苦手") {
      multiplier = 1.3;
    } else if (skill === "得意") {
      multiplier = 0.9;
    }

    // 15分単位にする
    const minutes = Math.max(
      15,
      Math.ceil(
        task.estimatedTime * multiplier / 15
      ) * 15
    );

    // 学習日を決める
    const studyDate = suggestStudyDate(
      task, minutes
    );

    dailyLoad[studyDate] =
      (dailyLoad[studyDate] || 0) + minutes;

    // 提案理由を作成
    const reasons = [];
    const days = daysUntil(task.deadline);

    if (days <= 3) {
      reasons.push("締切が近い");
    }

    if (skill === "苦手") {
      reasons.push("苦手な分野");
    }

    if (minutes >= 120) {
      reasons.push("作業時間が長い");
    }

    if (reasons.length === 0) {
      reasons.push(
        "ほかの課題との優先順位を考慮"
      );
    }

    return {
      ...task,
      studyDate: studyDate,
      minutes: minutes,
      reason: reasons.join("・"),
      selected: true
    };
  });

  showTodayPlan();
  showAllPlan();
  showRegisterList();

  document.getElementById(
    "analysisReason"
  ).textContent =
    "締切までの日数、得意・苦手、作業時間をもとに、" +
    "取り組む順番と学習予定日を提案しました。";

  beforeAnalysis.hidden = true;
  afterAnalysis.hidden = false;

  message.textContent = "";
}


// 10. 学習計画のカード作成

function createPlanCard(plan, rank) {
  const card = document.createElement("div");

  card.className =
    `plan-card rank-${Math.min(rank, 3)}`;

  const number = document.createElement("div");
  number.className = "rank-number";
  number.textContent = rank;

  const info = document.createElement("div");
  info.className = "plan-info";

  const title = document.createElement("div");
  title.className = "task-title";
  title.textContent = plan.title;

  const detail = document.createElement("div");
  detail.className = "task-detail";

  detail.textContent =
    `学習予定：${displayDate(plan.studyDate)} ／ ` +
    `${plan.minutes}分`;

  const reason = document.createElement("p");
  reason.className = "plan-reason";
  reason.textContent =
    `✧ ${plan.reason}`;

  info.append(title, detail, reason);
  card.append(number, info);

  return card;
}



// 11. 今日やること

function showTodayPlan() {
  todayList.replaceChildren();

  const todayPlans = suggestions.filter(
    plan => plan.studyDate === today
  );

  if (todayPlans.length === 0) {
    const empty = document.createElement("p");
    empty.className = "empty-message";
    empty.textContent =
      "今日に割り当てられた学習予定はありません。";

    todayList.appendChild(empty);
    return;
  }

  todayPlans.forEach(plan => {
    const rank =
      suggestions.indexOf(plan) + 1;

    todayList.appendChild(
      createPlanCard(plan, rank)
    );
  });
}


// 12. 全体の計画

function showAllPlan() {
  allPlanList.replaceChildren();

  suggestions.forEach((plan, index) => {
    allPlanList.appendChild(
      createPlanCard(plan, index + 1)
    );
  });
}


// 13. カレンダー登録の選択

function showRegisterList() {
  registerList.replaceChildren();

  suggestions.forEach(plan => {
    const card = document.createElement("div");
    card.className = "register-card";

    const label = document.createElement("label");

    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.checked = plan.selected;

    // チェック状態を記録
    checkbox.addEventListener("change", () => {
      plan.selected = checkbox.checked;
    });

    const info = document.createElement("div");
    info.className = "register-info";

    const title = document.createElement("div");
    title.className = "task-title";
    title.textContent = plan.title;

    const date = document.createElement("div");
    date.className = "register-date";

    date.textContent =
      `${displayDate(plan.studyDate)}・${plan.minutes}分`;

    info.append(title, date);
    label.append(checkbox, info);
    card.appendChild(label);

    registerList.appendChild(card);
  });
}


// 14. カレンダーに登録する

function savePlans() {
  const selectedPlans = suggestions.filter(
    plan => plan.selected
  );

  // 登録対象がないとき
  if (selectedPlans.length === 0) {
    message.textContent =
      "登録したい予定を1つ以上選んでください。";
    return;
  }

  // ホームのカレンダーが読む予定を取得
  let saved = [];

  try {
    const parsed = JSON.parse(
      localStorage.getItem("calendarEvents") || "[]"
    );

    if (Array.isArray(parsed)) {
      saved = parsed;
    }
  } catch (e) {}

  // 今回の課題について以前AI登録した予定だけを
  // 取り除く(ほかの予定は残す)
  const analyzedIds = new Set(
    suggestions.map(plan => `ai_${plan.id}`)
  );

  const remainingEvents = saved.filter(
    event => !analyzedIds.has(String(event.id))
  );

  // チェックした予定だけ、カレンダーの形式で登録
  const newSchedules = selectedPlans.map(plan => ({
    id: `ai_${plan.id}`,
    title: plan.title,
    start: plan.studyDate,
    allDay: true
  }));

  localStorage.setItem(
    "calendarEvents",
    JSON.stringify([
      ...remainingEvents,
      ...newSchedules
    ])
  );

  message.textContent =
    `${newSchedules.length}件の学習予定を登録しました！`;

  // 保存後、ホーム画面へ移動
  window.location.href = "index.html";
}


// 15. タブ切り替え

document.querySelectorAll(".tab").forEach(
  button => {
    button.addEventListener("click", () => {
      document.querySelectorAll(".tab").forEach(
        tab => tab.classList.remove("active")
      );

      button.classList.add("active");

      const selectedTab = button.dataset.tab;

      document.getElementById(
        "todayContent"
      ).hidden = selectedTab !== "today";

      document.getElementById(
        "allContent"
      ).hidden = selectedTab !== "all";
    });
  }
);


// 16. ボタンのイベント

// 分析スタート
document.getElementById(
  "startBtn"
).addEventListener("click", analyzeTasks);

// 登録ボタン
document.getElementById(
  "saveBtn"
).addEventListener("click", savePlans);

// 課題一覧に戻る
document.getElementById(
  "backBtn"
).addEventListener("click", () => {
  afterAnalysis.hidden = true;
  beforeAnalysis.hidden = false;
  message.textContent = "";
});


// 17. 最初に表示

showUnfinishedTasks();
