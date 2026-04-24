const STORAGE_KEY = "todos.v2";

const DURATION_LABELS = {
  cepat: "Cepat (<30m)",
  sedang: "Sedang (30m–2j)",
  lama: "Lama (>2j)",
  harian: "Harian",
  mingguan: "Mingguan",
  bulanan: "Bulanan",
};

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

let todos = loadTodos();
let currentFilter = "all";
let searchQuery = "";

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
  render();
}

function toggleTodo(id) {
  const todo = todos.find((t) => t.id === id);
  if (todo) {
    todo.completed = !todo.completed;
    saveTodos();
    render();
  }
}

function deleteTodo(id) {
  todos = todos.filter((t) => t.id !== id);
  saveTodos();
  render();
}

function clearCompleted() {
  todos = todos.filter((t) => !t.completed);
  saveTodos();
  render();
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
    filtered.forEach((todo) => {
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
      list.appendChild(li);
    });
  }

  const active = todos.filter((t) => !t.completed).length;
  itemsCount.textContent = `${active} tugas aktif · ${todos.length} total`;
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

render();
