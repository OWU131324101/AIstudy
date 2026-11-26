document.addEventListener("DOMContentLoaded", function() {

    // データの読み込み
    function readArray(key) {
        try {
            const value = JSON.parse(localStorage.getItem(key) || "[]");
            return Array.isArray(value) ? value : [];
        } catch (e) {
            return [];
        }
    }

    let tasks = readArray("tasks");

    // 手動・AIで登録した予定(締切は課題から自動で作るので保存しない)
    const savedEvents = readArray("calendarEvents");

    function formatDate(date) {
        const y = date.getFullYear();
        const m = String(date.getMonth() + 1).padStart(2, "0");
        const d = String(date.getDate()).padStart(2, "0");
        return y + "-" + m + "-" + d;
    }

    function isDeadlineEvent(event) {
        return String(event.id).indexOf("deadline_") === 0;
    }

    // 未完了の課題の提出期限をカレンダー用の予定にする
    function buildDeadlineEvents() {
        return tasks
            .filter(function(t) { return t.status !== "完了" && t.deadline; })
            .map(function(t) {
                return {
                    id: "deadline_" + t.id,
                    title: "【締切】" + t.title,
                    start: t.deadline,
                    allDay: true,
                    editable: false,
                    backgroundColor: "#d9769a",
                    borderColor: "#d9769a"
                };
            });
    }

    // 編集中の予定
    let selectedEvent = null;

    // 編集画面の要素
    const modal = document.getElementById("edit-modal");
    const editTitle = document.getElementById("edit-title");
    const editDate = document.getElementById("edit-date");

    // カレンダー
    const calendar = new FullCalendar.Calendar(document.getElementById("calendar"), {
        initialView: "dayGridWeek",
        locale: "ja",
        firstDay: 1,
        height: "auto",
        editable: true,

        eventSources: [
            { id: "saved", events: savedEvents },
            {
                id: "deadlines",
                events: function(info, success) {
                    success(buildDeadlineEvents());
                }
            }
        ],

        // 予定をタップしたとき(締切は編集できない)
        eventClick: function(info) {
            if (isDeadlineEvent(info.event)) return;

            selectedEvent = info.event;
            editTitle.value = selectedEvent.title;
            editDate.value = selectedEvent.startStr.slice(0, 10);
            modal.style.display = "flex";
        },

        // ドラッグで日付変更
        eventDrop: function() {
            saveCalendarEvents();
            updateToday();
        },

        headerToolbar: {
            left: "prev,next",
            center: "title",
            right: "today"
        },

        buttonText: { today: "今日" },
        dayMaxEvents: 2
    });

    calendar.render();

    function saveCalendarEvents() {
        const events = calendar.getEvents()
            .filter(function(event) { return !isDeadlineEvent(event); })
            .map(function(event) {
                return {
                    id: event.id,
                    title: event.title,
                    start: event.startStr,
                    allDay: event.allDay
                };
            });

        localStorage.setItem("calendarEvents", JSON.stringify(events));
    }

    // 今日やること
    function updateToday() {
        const today = formatDate(new Date());
        const titles = [];

        // カレンダーの予定(AIが提案した学習予定も含む)
        calendar.getEvents().forEach(function(event) {
            if (isDeadlineEvent(event)) return;
            if (event.startStr.slice(0, 10) !== today) return;
            if (titles.indexOf(event.title) === -1) titles.push(event.title);
        });

        // 今日が締切の未完了の課題
        tasks.forEach(function(t) {
            if (t.status === "完了" || t.deadline !== today) return;
            if (titles.indexOf(t.title) === -1) {
                titles.push(t.title + "(今日が締切)");
            }
        });

        const taskEl = document.getElementById("today-task");
        const endEl = document.getElementById("today-end");

        if (titles.length) {
            taskEl.textContent = titles.join("、");
            endEl.textContent = "です！";
        } else {
            taskEl.textContent = "今日の予定はありません";
            endEl.textContent = "AIの学習提案で計画を立てると、ここに表示されます。";
        }
    }

    // 編集画面
    document.getElementById("close-modal")
        .addEventListener("click", function() {
            modal.style.display = "none";
        });

    document.getElementById("save-event")
        .addEventListener("click", function() {
            if (!selectedEvent) return;
            if (!editTitle.value.trim() || !editDate.value) return;

            selectedEvent.setProp("title", editTitle.value.trim());
            selectedEvent.setStart(editDate.value);

            saveCalendarEvents();
            updateToday();
            modal.style.display = "none";
        });

    document.getElementById("delete-event")
        .addEventListener("click", function() {
            if (!selectedEvent) return;

            selectedEvent.remove();

            saveCalendarEvents();
            updateToday();
            modal.style.display = "none";
        });

    // やることリスト(完了した課題は表示しない)
    const taskList = document.getElementById("task-list");

    function saveTasks() {
        localStorage.setItem("tasks", JSON.stringify(tasks));
    }

    // 課題が変わったとき、締切表示と今日やることを更新
    function refreshAfterTaskChange() {
        calendar.getEventSourceById("deadlines").refetch();
        updateToday();
    }

    // その課題のAI予定をカレンダーから消す
    function removeAiEvent(taskId) {
        const event = calendar.getEventById("ai_" + taskId);
        if (event) {
            event.remove();
            saveCalendarEvents();
        }
    }

    function renderTasks() {
        taskList.replaceChildren();

        const visibleTasks = tasks.filter(function(t) {
            return t.status !== "完了";
        });

        if (visibleTasks.length === 0) {
            const row = document.createElement("tr");
            const cell = document.createElement("td");
            cell.colSpan = 4;
            cell.textContent = "やることはありません。課題を登録しましょう。";
            row.appendChild(cell);
            taskList.appendChild(row);
            return;
        }

        visibleTasks.forEach(function(task) {
            const row = document.createElement("tr");

            const titleCell = document.createElement("td");
            titleCell.textContent = task.title;

            const deadlineCell = document.createElement("td");
            deadlineCell.textContent = task.deadline;

            const statusCell = document.createElement("td");
            const statusSelect = document.createElement("select");

            ["まだ", "途中", "完了"].forEach(function(status) {
                const option = document.createElement("option");
                option.value = status;
                option.textContent = status;
                statusSelect.appendChild(option);
            });

            statusSelect.value = task.status;

            statusSelect.addEventListener("change", function() {
                task.status = statusSelect.value;
                saveTasks();

                // 完了にしたら、リストとAI予定から消す
                if (task.status === "完了") {
                    removeAiEvent(task.id);
                }

                refreshAfterTaskChange();
                renderTasks();
            });

            statusCell.appendChild(statusSelect);

            const deleteCell = document.createElement("td");
            const deleteButton = document.createElement("button");
            deleteButton.textContent = "削除";

            deleteButton.addEventListener("click", function() {
                tasks = tasks.filter(function(t) { return t.id !== task.id; });
                saveTasks();
                removeAiEvent(task.id);
                refreshAfterTaskChange();
                renderTasks();
            });

            deleteCell.appendChild(deleteButton);

            row.append(titleCell, deadlineCell, statusCell, deleteCell);
            taskList.appendChild(row);
        });
    }

    renderTasks();
    updateToday();
});
