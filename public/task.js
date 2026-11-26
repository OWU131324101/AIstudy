let tasks = loadTasks();
let selectedStatus = "まだ";
let editingId = null;

let messageTimer;

// 完了メッセージを表示する
function showMessage(text) {
    const message = document.getElementById("taskMessage");

    message.textContent = text;

    clearTimeout(messageTimer);

    // 3秒後にメッセージを消す
    messageTimer = setTimeout(() => {
        message.textContent = "";
    }, 3000);
}

const categorySelect = document.getElementById("category");
const timeSelect = document.getElementById("time");
const statusButtons = document.querySelectorAll(".status-btn");


// 保存・読み込み 
function loadTasks() {
  try {
    const saved = JSON.parse(
      localStorage.getItem("tasks") || "[]"
    );

    return Array.isArray(saved) ? saved : [];
  } catch (e) {
    return [];
  }
}

function saveTasks() {
  localStorage.setItem("tasks", JSON.stringify(tasks));
}


// 分類の選択肢(設定ページの項目)
function loadCategories() {
  let skills = [];

  try {
    const saved = JSON.parse(
      localStorage.getItem("plannerSkills") || "[]"
    );

    if (Array.isArray(saved)) skills = saved;
  } catch (e) {}

  const names = skills.length
    ? skills.map(skill => skill.name)
    : ["レポート作成", "プログラミング", "デザイン制作"];

  names.push("その他");

  categorySelect.replaceChildren();

  names.forEach(name => {
    const option = document.createElement("option");
    option.value = name;
    option.textContent = name;
    categorySelect.appendChild(option);
  });
}

// 所要時間の表示用(分 → 文字)
function timeLabel(minutes) {
  const option = Array.from(timeSelect.options).find(
    opt => Number(opt.value) === Number(minutes)
  );

  return option ? option.textContent : `${minutes}分`;
}


// ステータスの切り替え

function setStatus(status) {
  selectedStatus = status;

  statusButtons.forEach(button => {
    button.classList.toggle(
      "active",
      button.dataset.status === status
    );
  });
}

statusButtons.forEach(button => {
  button.addEventListener("click", function() {
    setStatus(this.dataset.status);
  });
});


// 課題の登録・編集
document.getElementById("taskForm")
  .addEventListener("submit", function(event) {
    event.preventDefault();

    const title = document.getElementById("taskName").value.trim();
    const category = categorySelect.value;
    const deadline = document.getElementById("deadline").value;
    const estimatedTime = Number(timeSelect.value);

    if (!title || !deadline) return;

    let messageText;

if (editingId === null) {
    tasks.push({
        id: Date.now(),
        title,
        category,
        deadline,
        estimatedTime,
        status: selectedStatus
    });

    messageText = "課題を登録しました！";

} else {
    const task = tasks.find(t => t.id === editingId);

    if (!task) return;

    task.title = title;
    task.category = category;
    task.deadline = deadline;
    task.estimatedTime = estimatedTime;
    task.status = selectedStatus;

    messageText = "課題を編集しました！";
}

saveTasks();
displayTasks();
resetForm();
showMessage(messageText);
  });


// 課題一覧

function displayTasks() {
  const taskList = document.getElementById("taskList");
  taskList.replaceChildren();

  if (tasks.length === 0) {
    const empty = document.createElement("p");
    empty.className = "muted";
    empty.textContent = "まだ課題が登録されていません。";
    taskList.appendChild(empty);
    return;
  }

  tasks.forEach(task => {
    const div = document.createElement("div");
    div.className = "task-item";

    const title = document.createElement("strong");
    title.textContent = task.title;

    const details = document.createElement("p");
    details.textContent =
      "分類：" + (task.category || "その他") +
      " / 締切：" + task.deadline +
      " / 時間：" + timeLabel(task.estimatedTime) +
      " / 状態：" + task.status;

    const editButton = document.createElement("button");
    editButton.type = "button";
    editButton.textContent = "編集";
    editButton.addEventListener("click", () => editTask(task.id));

    const deleteButton = document.createElement("button");
    deleteButton.type = "button";
    deleteButton.textContent = "削除";
    deleteButton.className = "delete";
    deleteButton.addEventListener("click", () => deleteTask(task.id));

    div.append(title, details, editButton, deleteButton);
    taskList.appendChild(div);
  });
}


// 編集・削除・リセット
function editTask(id) {
  const task = tasks.find(t => t.id === id);
  if (!task) return;

  document.getElementById("taskName").value = task.title;
  categorySelect.value = task.category;
  document.getElementById("deadline").value = task.deadline;
  timeSelect.value = String(task.estimatedTime);

  editingId = id;
  setStatus(task.status);

  document.getElementById("formTitle").textContent = "課題を編集";
  document.getElementById("submitBtn").textContent = "更新";

  window.scrollTo({ top: 0, behavior: "smooth" });
}

function deleteTask(id) {
  if (confirm("この課題を削除しますか？")) {
    tasks = tasks.filter(task => task.id !== id);
    saveTasks();
    displayTasks();

    if (editingId === id) resetForm();
  }
}

function resetForm() {
  document.getElementById("taskForm").reset();

  editingId = null;
  setStatus("まだ");

  document.getElementById("formTitle").textContent = "課題を追加";
  document.getElementById("submitBtn").textContent = "登録";
}


// 最初に表示

loadCategories();
displayTasks();
