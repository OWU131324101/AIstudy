
let tasks = [];
let selectedStatus = "まだ";
let editingId = null;

// ステータスの切り替え
const statusButtons = document.querySelectorAll(".status-btn");

statusButtons.forEach(button => {
  button.addEventListener("click", function() {
    statusButtons.forEach(btn => {
      btn.classList.remove("active");
    });

    this.classList.add("active");
    selectedStatus = this.dataset.status;
  });
});

// 課題の登録・編集
document.getElementById("taskForm")
  .addEventListener("submit", function(event) {
    event.preventDefault();

    const name = document.getElementById("taskName").value;
    const subject = document.getElementById("subject").value;
    const deadline = document.getElementById("deadline").value;
    const time = document.getElementById("time").value;

    if (editingId === null) {
      const task = {
        id: Date.now(),
        name,
        subject,
        deadline,
        time,
        status: selectedStatus
      };

      tasks.push(task);
      alert("課題を登録しました！");
    } else {
      const task = tasks.find(t => t.id === editingId);

      task.name = name;
      task.subject = subject;
      task.deadline = deadline;
      task.time = time;
      task.status = selectedStatus;

      alert("課題を編集しました！");
    }

    displayTasks();
    resetForm();
  });

// 課題一覧を表示
function displayTasks() {
  const taskList = document.getElementById("taskList");
  taskList.innerHTML = "";

  tasks.forEach(task => {
    const div = document.createElement("div");
    div.className = "task-item";

    const title = document.createElement("strong");
    title.textContent = task.name;

    const details = document.createElement("p");
    details.textContent =
      "科目：" + task.subject +
      " / 締切：" + task.deadline +
      " / 時間：" + task.time +
      " / 状態：" + task.status;

    const editButton = document.createElement("button");
    editButton.textContent = "編集";
    editButton.addEventListener("click", () => editTask(task.id));

    const deleteButton = document.createElement("button");
    deleteButton.textContent = "削除";
    deleteButton.className = "delete";
    deleteButton.addEventListener("click", () => deleteTask(task.id));

    div.appendChild(title);
    div.appendChild(details);
    div.appendChild(editButton);
    div.appendChild(deleteButton);

    taskList.appendChild(div);
  });
}

// 課題を編集
function editTask(id) {
  const task = tasks.find(t => t.id === id);

  document.getElementById("taskName").value = task.name;
  document.getElementById("subject").value = task.subject;
  document.getElementById("deadline").value = task.deadline;
  document.getElementById("time").value = task.time;

  selectedStatus = task.status;
  editingId = id;

  statusButtons.forEach(button => {
    button.classList.toggle(
      "active",
      button.dataset.status === selectedStatus
    );
  });

  document.getElementById("formTitle").textContent = "課題を編集";
  document.getElementById("submitBtn").textContent = "更新";
}

// 課題を削除
function deleteTask(id) {
  if (confirm("この課題を削除しますか？")) {
    tasks = tasks.filter(task => task.id !== id);
    displayTasks();
    alert("課題を削除しました！");
  }
}

// フォームを初期状態に戻す
function resetForm() {
  document.getElementById("taskForm").reset();

  editingId = null;
  selectedStatus = "まだ";

  statusButtons.forEach(button => {
    button.classList.toggle(
      "active",
      button.dataset.status === "まだ"
    );
  });

  document.getElementById("formTitle").textContent = "課題を追加";
  document.getElementById("submitBtn").textContent = "登録";
}
