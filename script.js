
document.addEventListener("DOMContentLoaded", function() {

    const calendarEl = document.getElementById("calendar");

    // 保存した予定を読み込む
    let savedEvents = JSON.parse(
        localStorage.getItem("calendarEvents") || "null"
    );

    if (!savedEvents) {
        savedEvents = [
            {
                id: "1",
                title: "英語のレポート",
                start: "2026-11-18",
                allDay: true
            }
        ];
    }

    // 編集中の予定
    let selectedEvent = null;

    // 編集画面の要素
    const modal = document.getElementById("edit-modal");
    const editTitle = document.getElementById("edit-title");
    const editDate = document.getElementById("edit-date");

    const calendar = new FullCalendar.Calendar(calendarEl, {
        initialView: "dayGridWeek",
        locale: "ja",
        firstDay: 1,
        height: "auto",

        editable: true,
        events: savedEvents,

        // 予定をタップしたとき
        eventClick: function(info) {
            selectedEvent = info.event;

            editTitle.value = selectedEvent.title;
            editDate.value = selectedEvent.startStr.slice(0, 10);

            modal.style.display = "flex";
        },

        // ドラッグで日付変更
        eventDrop: function() {
            saveCalendarEvents();
        },

        headerToolbar: {
            left: "prev,next",
            center: "title",
            right: "today"
        },
        
        buttonText: {
            today: "今日"
        },
        
        dayMaxEvents: 2,
    });

    calendar.render();

    // 編集画面を閉じる
    document.getElementById("close-modal")
        .addEventListener("click", function() {
            modal.style.display = "none";
        });

    // 変更を保存
    document.getElementById("save-event")
        .addEventListener("click", function() {
            if (!selectedEvent) return;
            if (!editTitle.value.trim() || !editDate.value) return;

            selectedEvent.setProp("title", editTitle.value.trim());
            selectedEvent.setStart(editDate.value);

            saveCalendarEvents();
            modal.style.display = "none";
        });

    // 予定を削除
    document.getElementById("delete-event")
        .addEventListener("click", function() {
            if (!selectedEvent) return;

            selectedEvent.remove();

            saveCalendarEvents();
            modal.style.display = "none";
        });

    // 予定を保存
    function saveCalendarEvents() {
        const events = calendar.getEvents().map(function(event) {
            return {
                id: event.id,
                title: event.title,
                start: event.startStr,
                allDay: event.allDay
            };
        });

        localStorage.setItem(
            "calendarEvents",
            JSON.stringify(events)
        );
    }

    // 保存済みの課題を読み込む
let tasks = JSON.parse(localStorage.getItem("tasks") || "[]");

// 課題一覧のHTML要素
const taskList = document.getElementById("task-list");

// 課題を保存
function saveTasks() {
    localStorage.setItem("tasks", JSON.stringify(tasks));
}

// 課題一覧を表示
function renderTasks() {
    taskList.replaceChildren();

    tasks.forEach(function(task) {
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
        });

        statusCell.appendChild(statusSelect);

        const deleteCell = document.createElement("td");
        const deleteButton = document.createElement("button");
        deleteButton.textContent = "削除";

        deleteButton.addEventListener("click", function() {
            tasks = tasks.filter(t => t.id !== task.id);
            saveTasks();
            renderTasks();
        });

        deleteCell.appendChild(deleteButton);

        row.append(titleCell, deadlineCell, statusCell, deleteCell);
        taskList.appendChild(row);
    });
}

// ページを開いたときに一覧を表示
renderTasks();
});

