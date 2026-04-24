const STORAGE_KEY = "todos.v2";

const DURATION_LABELS = {
  cepat: "Cepat (<30m)",
  sedang: "Sedang (30m–2j)",
  lama: "Lama (>2j)",
  harian: "Harian",
  mingguan: "Mingguan",
  bulanan: "Bulanan",
};

const MONTH_NAMES = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember",
];

const form = document.getElementById("todo-form");
const input = document.getElementById("todo-input");
const dateInput = document.getElementById("todo-date");
const assigneeInput = document.getElementById("todo-assignee");
const durationInput = document.getElementById("todo-duration");
const searchInput = document.getElementById("search-input");
const list = document.getElementById("todo-list");
const itemsCount = document.getElementById("items-count");
const clearCompletedBtn = document.getElementById("clear-completed");
const filterBtns = document.querySelectorAll(".filter-btn");
const tabBtns = document.querySelectorAll(".tab-btn");
const tabPanels = document.querySelectorAll(".tab-panel");
const historyMonthSelect = document.getElementById("history-month");
const historyList = document.getElementById("history-list");
const historySummary = document.getElementById("history-summary");
const printListBtn = document.getElementById("print-list-btn");
const printHistoryBtn = document.getElementById("print-history-btn");
const printRoot = document.getElementById("print-root");

let todos = loadTodos();
let currentFilter = "all";
let searchQuery = "";
let selectedMonth = "";

function loadTodos() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveTodos() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(todos));
}

function addTodo({ text, date, assignee, duration }) {
  const trimmed = text.trim();
  if (!trimmed) return;
  todos.unshift({
    id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
    text: trimmed,
    date: date || "",
    assignee: assignee.trim(),
    duration: duration || "",
    completed: false,
    createdAt: Date.now(),
  });
  saveTodos();
  renderAll();
}

function toggleTodo(id) {
  const todo = todos.find((t) => t.id === id);
  if (todo) {
    todo.completed = !todo.completed;
    saveTodos();
    renderAll();
  }
}

function deleteTodo(id) {
  todos = todos.filter((t) => t.id !== id);
  saveTodos();
  renderAll();
}

function clearCompleted() {
  todos = todos.filter((t) => !t.completed);
  saveTodos();
  renderAll();
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

function highlight(text, query) {
  const safe = escapeHtml(text);
  if (!query) return safe;
  const escapedQuery = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const regex = new RegExp(`(${escapedQuery})`, "gi");
  return safe.replace(regex, "<mark>$1</mark>");
}

function formatDate(iso) {
  if (!iso) return "";
  const d = new Date(iso + "T00:00:00");
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function getMonthKey(todo) {
  const iso = todo.date || new Date(todo.createdAt).toISOString().slice(0, 10);
  return iso.slice(0, 7);
}

function formatMonthKey(key) {
  const [y, m] = key.split("-");
  return `${MONTH_NAMES[parseInt(m, 10) - 1]} ${y}`;
}

function getFilteredTodos() {
  const query = searchQuery.trim().toLowerCase();
  return todos.filter((todo) => {
    if (currentFilter === "active" && todo.completed) return false;
    if (currentFilter === "completed" && !todo.completed) return false;
    if (query) {
      const haystack = [
        todo.text,
        todo.assignee || "",
        todo.date || "",
        DURATION_LABELS[todo.duration] || "",
      ]
        .join(" ")
        .toLowerCase();
      if (!haystack.includes(query)) return false;
    }
    return true;
  });
}

function renderMeta(todo, query) {
  const parts = [];
  if (todo.date) {
    parts.push(
      `<span class="meta-chip meta-date">📅 ${escapeHtml(formatDate(todo.date))}</span>`,
    );
  }
  if (todo.assignee) {
    parts.push(
      `<span class="meta-chip meta-assignee">👤 ${highlight(todo.assignee, query)}</span>`,
    );
  }
  if (todo.duration && DURATION_LABELS[todo.duration]) {
    parts.push(
      `<span class="meta-chip meta-duration meta-${todo.duration}">⏱️ ${escapeHtml(DURATION_LABELS[todo.duration])}</span>`,
    );
  }
  return parts.length
    ? `<div class="todo-meta">${parts.join("")}</div>`
    : "";
}

function renderTodoItem(todo, query) {
  const li = document.createElement("li");
  li.className = "todo-item" + (todo.completed ? " completed" : "");
  li.dataset.id = todo.id;

  const checkbox = document.createElement("input");
  checkbox.type = "checkbox";
  checkbox.checked = todo.completed;
  checkbox.addEventListener("change", () => toggleTodo(todo.id));

  const body = document.createElement("div");
  body.className = "todo-body";
  body.innerHTML = `
    <span class="todo-text">${highlight(todo.text, query)}</span>
    ${renderMeta(todo, query)}
  `;

  const deleteBtn = document.createElement("button");
  deleteBtn.className = "btn-delete";
  deleteBtn.setAttribute("aria-label", "Hapus tugas");
  deleteBtn.textContent = "✕";
  deleteBtn.addEventListener("click", () => deleteTodo(todo.id));

  li.append(checkbox, body, deleteBtn);
  return li;
}

function render() {
  const filtered = getFilteredTodos();
  list.innerHTML = "";

  if (filtered.length === 0) {
    const empty = document.createElement("li");
    empty.className = "empty-state";
    if (todos.length === 0) {
      empty.textContent = "Belum ada tugas. Tambahkan tugas pertamamu! 🚀";
    } else if (searchQuery) {
      empty.textContent = `Tidak ada tugas yang cocok dengan "${searchQuery}"`;
    } else {
      empty.textContent = "Tidak ada tugas pada filter ini.";
    }
    list.appendChild(empty);
  } else {
    const query = searchQuery.trim();
    filtered.forEach((todo) => list.appendChild(renderTodoItem(todo, query)));
  }

  const active = todos.filter((t) => !t.completed).length;
  itemsCount.textContent = `${active} tugas aktif · ${todos.length} total`;
}

function getAvailableMonths() {
  const set = new Set(todos.map(getMonthKey));
  return [...set].sort().reverse();
}

function renderHistory() {
  const months = getAvailableMonths();
  historyMonthSelect.innerHTML = "";

  if (months.length === 0) {
    const opt = document.createElement("option");
    opt.textContent = "Tidak ada data";
    historyMonthSelect.appendChild(opt);
    historyList.innerHTML =
      '<li class="empty-state">Belum ada tugas untuk ditampilkan di histori.</li>';
    historySummary.innerHTML = "";
    return;
  }

  if (!months.includes(selectedMonth)) {
    selectedMonth = months[0];
  }

  months.forEach((key) => {
    const opt = document.createElement("option");
    opt.value = key;
    opt.textContent = formatMonthKey(key);
    if (key === selectedMonth) opt.selected = true;
    historyMonthSelect.appendChild(opt);
  });

  const monthTodos = todos
    .filter((t) => getMonthKey(t) === selectedMonth)
    .sort((a, b) => (a.date || "").localeCompare(b.date || ""));

  const done = monthTodos.filter((t) => t.completed).length;
  const active = monthTodos.length - done;
  const percent = monthTodos.length
    ? Math.round((done / monthTodos.length) * 100)
    : 0;

  historySummary.innerHTML = `
    <div class="stat-card">
      <div class="stat-value">${monthTodos.length}</div>
      <div class="stat-label">Total Tugas</div>
    </div>
    <div class="stat-card stat-done">
      <div class="stat-value">${done}</div>
      <div class="stat-label">Selesai</div>
    </div>
    <div class="stat-card stat-active">
      <div class="stat-value">${active}</div>
      <div class="stat-label">Belum Selesai</div>
    </div>
    <div class="stat-card stat-percent">
      <div class="stat-value">${percent}%</div>
      <div class="stat-label">Progress</div>
    </div>
  `;

  historyList.innerHTML = "";
  if (monthTodos.length === 0) {
    historyList.innerHTML =
      '<li class="empty-state">Tidak ada tugas di bulan ini.</li>';
    return;
  }
  monthTodos.forEach((todo) => historyList.appendChild(renderTodoItem(todo, "")));
}

function renderAll() {
  render();
  renderHistory();
}

function buildPrintTable(items, title) {
  const rows = items
    .map(
      (t, i) => `
      <tr class="${t.completed ? "print-done" : ""}">
        <td>${i + 1}</td>
        <td>${t.completed ? "☑" : "☐"}</td>
        <td>${escapeHtml(t.text)}</td>
        <td>${escapeHtml(t.date ? formatDate(t.date) : "-")}</td>
        <td>${escapeHtml(t.assignee || "-")}</td>
        <td>${escapeHtml(DURATION_LABELS[t.duration] || "-")}</td>
      </tr>`,
    )
    .join("");

  const done = items.filter((t) => t.completed).length;
  const today = new Date().toLocaleDateString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return `
    <div class="print-sheet">
      <h1>${escapeHtml(title)}</h1>
      <p class="print-meta">
        Total: <strong>${items.length}</strong> tugas ·
        Selesai: <strong>${done}</strong> ·
        Belum: <strong>${items.length - done}</strong><br>
        Dicetak: ${today}
      </p>
      <table class="print-table">
        <thead>
          <tr>
            <th>No</th>
            <th>Status</th>
            <th>Tugas</th>
            <th>Tanggal</th>
            <th>Pelaksana</th>
            <th>Kategori Waktu</th>
          </tr>
        </thead>
        <tbody>
          ${rows || '<tr><td colspan="6" style="text-align:center">Tidak ada data</td></tr>'}
        </tbody>
      </table>
    </div>
  `;
}

function printItems(items, title) {
  printRoot.innerHTML = buildPrintTable(items, title);
  document.body.classList.add("printing");
  const cleanup = () => {
    document.body.classList.remove("printing");
    printRoot.innerHTML = "";
    window.removeEventListener("afterprint", cleanup);
  };
  window.addEventListener("afterprint", cleanup);
  setTimeout(() => window.print(), 50);
}

form.addEventListener("submit", (e) => {
  e.preventDefault();
  addTodo({
    text: input.value,
    date: dateInput.value,
    assignee: assigneeInput.value,
    duration: durationInput.value,
  });
  input.value = "";
  dateInput.value = "";
  assigneeInput.value = "";
  durationInput.value = "";
  input.focus();
});

searchInput.addEventListener("input", (e) => {
  searchQuery = e.target.value;
  render();
});

filterBtns.forEach((btn) => {
  btn.addEventListener("click", () => {
    filterBtns.forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    currentFilter = btn.dataset.filter;
    render();
  });
});

clearCompletedBtn.addEventListener("click", clearCompleted);

tabBtns.forEach((btn) => {
  btn.addEventListener("click", () => {
    tabBtns.forEach((b) => b.classList.remove("active"));
    tabPanels.forEach((p) => p.classList.remove("active"));
    btn.classList.add("active");
    document.getElementById("tab-" + btn.dataset.tab).classList.add("active");
    if (btn.dataset.tab === "history") renderHistory();
  });
});

historyMonthSelect.addEventListener("change", (e) => {
  selectedMonth = e.target.value;
  renderHistory();
});

printListBtn.addEventListener("click", () => {
  printItems(getFilteredTodos(), "Daftar Tugas");
});

printHistoryBtn.addEventListener("click", () => {
  const monthTodos = todos
    .filter((t) => getMonthKey(t) === selectedMonth)
    .sort((a, b) => (a.date || "").localeCompare(b.date || ""));
  printItems(
    monthTodos,
    selectedMonth
      ? `Histori Tugas — ${formatMonthKey(selectedMonth)}`
      : "Histori Tugas",
  );
});

renderAll();
