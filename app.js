// expense tracker - main js file
// data is stored in localstorage

const STORAGE_KEY = "expenses_data";

// category colors for chart
const categoryColors = {
  Food:          "#f97316",
  Transport:     "#06b6d4",
  Entertainment: "#a855f7",
  Health:        "#22c55e",
  Education:     "#3b82f6",
  Shopping:      "#ec4899",
  Bills:         "#f59e0b",
  Other:         "#94a3b8"
};

// load expenses from localstorage
function loadExpenses() {
  const data = localStorage.getItem(STORAGE_KEY);
  if (!data) return [];
  return JSON.parse(data);
}

// save to localstorage
function saveExpenses(expenses) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(expenses));
}

// simple id generator
function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

// add new expense
function addExpense(expense) {
  const expenses = loadExpenses();
  expense.id = generateId();
  expenses.push(expense);
  saveExpenses(expenses);
}

// delete by id
function deleteExpense(id) {
  let expenses = loadExpenses();
  expenses = expenses.filter(e => e.id !== id);
  saveExpenses(expenses);
}

// update existing expense
function updateExpense(id, updatedData) {
  let expenses = loadExpenses();
  const idx = expenses.findIndex(e => e.id === id);
  if (idx !== -1) {
    expenses[idx] = { ...expenses[idx], ...updatedData };
    saveExpenses(expenses);
  }
}

// get expenses with optional filters
function getFilteredExpenses(category, month, year) {
  let expenses = loadExpenses();

  if (category && category !== "all") {
    expenses = expenses.filter(e => e.category === category);
  }

  if (month && month !== "all") {
    expenses = expenses.filter(e => {
      const d = new Date(e.date);
      return (d.getMonth() + 1) === parseInt(month);
    });
  }

  if (year && year !== "all") {
    expenses = expenses.filter(e => {
      const d = new Date(e.date);
      return d.getFullYear() === parseInt(year);
    });
  }

  // sort by date descending
  expenses.sort((a, b) => new Date(b.date) - new Date(a.date));
  return expenses;
}

// ---- DOM stuff ----

const expenseList   = document.getElementById("expenseList");
const totalAmount   = document.getElementById("totalAmount");
const expenseCount  = document.getElementById("expenseCount");
const filterCat     = document.getElementById("filterCategory");
const filterMonth   = document.getElementById("filterMonth");
const filterYear    = document.getElementById("filterYear");

const modal         = document.getElementById("modal");
const openModalBtn  = document.getElementById("openModalBtn");
const closeModalBtn = document.getElementById("closeModalBtn");
const cancelBtn     = document.getElementById("cancelBtn");
const modalTitle    = document.getElementById("modalTitle");
const expenseForm   = document.getElementById("expenseForm");

const inputTitle    = document.getElementById("inputTitle");
const inputAmount   = document.getElementById("inputAmount");
const inputCategory = document.getElementById("inputCategory");
const inputDate     = document.getElementById("inputDate");
const inputNote     = document.getElementById("inputNote");

const summaryMonth  = document.getElementById("summaryMonth");
const summaryYear   = document.getElementById("summaryYear");
const summaryStats  = document.getElementById("summaryStats");

let editingId = null; // track which expense is being edited
let pieChartInstance = null;
let barChartInstance = null;

// render the expense list
function renderExpenses() {
  const cat   = filterCat.value;
  const month = filterMonth.value;
  const year  = filterYear.value;

  const expenses = getFilteredExpenses(cat, month, year);

  if (expenses.length === 0) {
    expenseList.innerHTML = '<p class="empty-msg">No expenses found.</p>';
    totalAmount.textContent = "$0.00";
    expenseCount.textContent = "0 expenses";
    return;
  }

  let total = 0;
  expenses.forEach(e => total += parseFloat(e.amount));

  totalAmount.textContent = "$" + total.toFixed(2);
  expenseCount.textContent = expenses.length + (expenses.length === 1 ? " expense" : " expenses");

  expenseList.innerHTML = "";
  expenses.forEach(exp => {
    const card = document.createElement("div");
    card.className = "expense-card";

    const dot = document.createElement("div");
    dot.className = "category-dot color-" + exp.category;

    const info = document.createElement("div");
    info.className = "expense-info";

    const title = document.createElement("div");
    title.className = "expense-title";
    title.textContent = exp.title;

    const meta = document.createElement("div");
    meta.className = "expense-meta";

    const catLabel = document.createElement("span");
    catLabel.className = "cat-label bg-" + exp.category;
    catLabel.textContent = exp.category;

    // format date
    const dateStr = formatDate(exp.date);

    meta.appendChild(catLabel);
    meta.appendChild(document.createTextNode(dateStr + (exp.note ? " · " + exp.note : "")));

    info.appendChild(title);
    info.appendChild(meta);

    const amount = document.createElement("div");
    amount.className = "expense-amount";
    amount.textContent = "-$" + parseFloat(exp.amount).toFixed(2);

    const actions = document.createElement("div");
    actions.className = "expense-actions";

    const editBtn = document.createElement("button");
    editBtn.className = "btn-edit";
    editBtn.textContent = "Edit";
    editBtn.onclick = () => openEditModal(exp.id);

    const delBtn = document.createElement("button");
    delBtn.className = "btn-delete";
    delBtn.textContent = "Delete";
    delBtn.onclick = () => {
      if (confirm("Delete this expense?")) {
        deleteExpense(exp.id);
        renderExpenses();
        updateSummary();
      }
    };

    actions.appendChild(editBtn);
    actions.appendChild(delBtn);

    card.appendChild(dot);
    card.appendChild(info);
    card.appendChild(amount);
    card.appendChild(actions);

    expenseList.appendChild(card);
  });
}

function formatDate(dateStr) {
  // converts yyyy-mm-dd to something readable
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

// populate year dropdowns from existing data + current year
function populateYearSelects() {
  const expenses = loadExpenses();
  const currentYear = new Date().getFullYear();

  const yearsSet = new Set([currentYear]);
  expenses.forEach(e => {
    const y = new Date(e.date).getFullYear();
    yearsSet.add(y);
  });

  const years = Array.from(yearsSet).sort((a, b) => b - a);

  // main filter year
  filterYear.innerHTML = '<option value="all">All Years</option>';
  years.forEach(y => {
    const opt = document.createElement("option");
    opt.value = y;
    opt.textContent = y;
    filterYear.appendChild(opt);
  });

  // summary year
  summaryYear.innerHTML = "";
  years.forEach(y => {
    const opt = document.createElement("option");
    opt.value = y;
    opt.textContent = y;
    summaryYear.appendChild(opt);
  });

  // set summary to current month/year by default
  summaryMonth.value = new Date().getMonth() + 1;
  summaryYear.value = currentYear;
}

// modal open/close
function openAddModal() {
  editingId = null;
  modalTitle.textContent = "Add Expense";
  expenseForm.reset();
  // set today as default date
  inputDate.value = new Date().toISOString().split("T")[0];
  modal.classList.remove("hidden");
}

function openEditModal(id) {
  const expenses = loadExpenses();
  const exp = expenses.find(e => e.id === id);
  if (!exp) return;

  editingId = id;
  modalTitle.textContent = "Edit Expense";

  inputTitle.value    = exp.title;
  inputAmount.value   = exp.amount;
  inputCategory.value = exp.category;
  inputDate.value     = exp.date;
  inputNote.value     = exp.note || "";

  modal.classList.remove("hidden");
}

function closeModal() {
  modal.classList.add("hidden");
  editingId = null;
}

// form submit
expenseForm.addEventListener("submit", function(e) {
  e.preventDefault();

  const expenseData = {
    title:    inputTitle.value.trim(),
    amount:   parseFloat(inputAmount.value),
    category: inputCategory.value,
    date:     inputDate.value,
    note:     inputNote.value.trim()
  };

  if (!expenseData.title || isNaN(expenseData.amount) || expenseData.amount <= 0) {
    // basic validation, might improve later
    alert("please fill in title and a valid amount");
    return;
  }

  if (editingId) {
    updateExpense(editingId, expenseData);
  } else {
    addExpense(expenseData);
  }

  closeModal();
  populateYearSelects();
  renderExpenses();
  updateSummary();
});

// event listeners for modal buttons
openModalBtn.addEventListener("click", openAddModal);
closeModalBtn.addEventListener("click", closeModal);
cancelBtn.addEventListener("click", closeModal);

// close modal if clicked outside
modal.addEventListener("click", function(e) {
  if (e.target === modal) closeModal();
});

// filter change
filterCat.addEventListener("change", renderExpenses);
filterMonth.addEventListener("change", renderExpenses);
filterYear.addEventListener("change", renderExpenses);

// ---- monthly summary / charts ----

function getMonthlyData(month, year) {
  const expenses = loadExpenses();
  const filtered = expenses.filter(e => {
    const d = new Date(e.date);
    return (d.getMonth() + 1) === parseInt(month) && d.getFullYear() === parseInt(year);
  });

  // group by category
  const byCategory = {};
  let totalSpent = 0;

  filtered.forEach(e => {
    if (!byCategory[e.category]) byCategory[e.category] = 0;
    byCategory[e.category] += parseFloat(e.amount);
    totalSpent += parseFloat(e.amount);
  });

  return { byCategory, totalSpent, count: filtered.length };
}

function updateSummary() {
  const month = summaryMonth.value;
  const year  = summaryYear.value;

  if (!month || !year) return;

  const { byCategory, totalSpent, count } = getMonthlyData(month, year);

  const labels  = Object.keys(byCategory);
  const values  = Object.values(byCategory);
  const colors  = labels.map(l => categoryColors[l] || "#94a3b8");

  // pie chart
  if (pieChartInstance) pieChartInstance.destroy();

  const pieCtx = document.getElementById("pieChart").getContext("2d");

  if (labels.length === 0) {
    pieChartInstance = null;
    // just show empty message in chart area - canvas stays blank
  } else {
    pieChartInstance = new Chart(pieCtx, {
      type: "doughnut",
      data: {
        labels: labels,
        datasets: [{
          data: values,
          backgroundColor: colors,
          borderWidth: 2,
          borderColor: "#fff"
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        plugins: {
          legend: {
            position: "bottom",
            labels: { font: { size: 11 }, padding: 10 }
          },
          tooltip: {
            callbacks: {
              label: function(ctx) {
                const val = ctx.parsed;
                const pct = totalSpent > 0 ? ((val / totalSpent) * 100).toFixed(1) : 0;
                return ctx.label + ": $" + val.toFixed(2) + " (" + pct + "%)";
              }
            }
          }
        }
      }
    });
  }

  // bar chart
  if (barChartInstance) barChartInstance.destroy();

  const barCtx = document.getElementById("barChart").getContext("2d");

  if (labels.length === 0) {
    barChartInstance = null;
  } else {
    barChartInstance = new Chart(barCtx, {
      type: "bar",
      data: {
        labels: labels,
        datasets: [{
          label: "Amount ($)",
          data: values,
          backgroundColor: colors.map(c => c + "cc"), // slight transparency
          borderColor: colors,
          borderWidth: 1,
          borderRadius: 5
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        plugins: {
          legend: { display: false }
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: {
              callback: val => "$" + val
            }
          }
        }
      }
    });
  }

  // stats cards
  summaryStats.innerHTML = "";

  const totalCard = createStatCard("Total Spent", "$" + totalSpent.toFixed(2));
  const countCard = createStatCard("Transactions", count);
  summaryStats.appendChild(totalCard);
  summaryStats.appendChild(countCard);

  if (count > 0) {
    const avg = totalSpent / count;
    summaryStats.appendChild(createStatCard("Avg per expense", "$" + avg.toFixed(2)));

    // top category
    let topCat = "";
    let topVal = 0;
    labels.forEach((l, i) => {
      if (values[i] > topVal) {
        topVal = values[i];
        topCat = l;
      }
    });
    summaryStats.appendChild(createStatCard("Highest category", topCat));
  }
}

function createStatCard(label, value) {
  const card = document.createElement("div");
  card.className = "stat-card";

  const labelEl = document.createElement("div");
  labelEl.className = "stat-label";
  labelEl.textContent = label;

  const valueEl = document.createElement("div");
  valueEl.className = "stat-value";
  valueEl.textContent = value;

  card.appendChild(labelEl);
  card.appendChild(valueEl);
  return card;
}

summaryMonth.addEventListener("change", updateSummary);
summaryYear.addEventListener("change", updateSummary);

// init
populateYearSelects();
renderExpenses();
updateSummary();