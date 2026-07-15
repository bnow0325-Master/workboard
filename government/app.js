const STORAGE_KEY = "bnow.project-board.tasks";
const IMPORT_META_KEY = "bnow.project-board.googleSheetImport.2026h2";
const SEED_URL = "data/google-sheet-tasks.json";
const SUPABASE_URL = "https://lwwfzwdjaedrfckyduno.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_LGd8ijujuQtCRYQtlrgnqw_EWqvRW50";
const CLOUD_SYNC_PROJECT_TITLE = "__BNOW_GOVERNMENT_BOARD_SYNC__";
const CLOUD_SYNC_SCHEMA = "government-tasks-v1";
const CLOUD_POLL_INTERVAL = 3000;
const STATUS_OPTIONS = ["준비중", "검토중", "제출완료", "합격", "불합격", "지원못함", "보류"];
const MAIN_STATUS_OPTIONS = ["준비중", "검토중"];
const STATUS_VIEWS = ["main", "제출완료", "합격", "불합격", "지원못함", "보류"];

const taskForm = document.querySelector("#taskForm");
const taskNameInput = document.querySelector("#taskName");
const dueDateInput = document.querySelector("#dueDate");
const submittedDateInput = document.querySelector("#submittedDate");
const resultStatusInput = document.querySelector("#resultStatus");
const grantAmountInput = document.querySelector("#grantAmount");
const noticeUrlInput = document.querySelector("#noticeUrl");
const saveTaskButton = document.querySelector("#saveTaskButton");
const resetFormButton = document.querySelector("#resetFormButton");
const importSeedButton = document.querySelector("#sampleButton");
const exportButton = document.querySelector("#exportButton");
const sheetPaste = document.querySelector("#sheetPaste");
const importSheetButton = document.querySelector("#importSheetButton");
const importPasteButton = document.querySelector("#importPasteButton");
const importMessage = document.querySelector("#importMessage");
const syncStatus = document.querySelector("#syncStatus");
const searchInput = document.querySelector("#searchInput");
const statusTabs = document.querySelector("#statusTabs");
const pageSizeSelect = document.querySelector("#pageSizeSelect");
const prevPageButton = document.querySelector("#prevPageButton");
const nextPageButton = document.querySelector("#nextPageButton");
const pageInfo = document.querySelector("#pageInfo");
const taskTableBody = document.querySelector("#taskTableBody");
const emptyState = document.querySelector("#emptyState");

const totalCount = document.querySelector("#totalCount");
const pendingCount = document.querySelector("#pendingCount");
const dueSoonCount = document.querySelector("#dueSoonCount");
const passedCount = document.querySelector("#passedCount");
const passedAmountTotal = document.querySelector("#passedAmountTotal");

let tasks = loadTasks();
let editingId = null;
let currentPage = 1;
let currentStatusView = "main";
let cloudSync = {
  db: null,
  ready: false,
  recordId: null,
  userEmail: "",
  lastContent: "",
  lastRemoteRecordId: "",
  saveTimer: null,
  saving: false,
  applyingRemote: false,
  pollTimer: null,
  channel: null
};

function loadTasks() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved).map(cleanTask) : [];
  } catch {
    return [];
  }
}

function saveTasks({ cloud = true } = {}) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
  if (cloud) scheduleCloudSave();
}

function readImportMeta() {
  try {
    const saved = localStorage.getItem(IMPORT_META_KEY);
    return saved ? JSON.parse(saved) : null;
  } catch {
    return null;
  }
}

function saveImportMeta(payload) {
  localStorage.setItem(IMPORT_META_KEY, JSON.stringify({
    version: payload.version,
    importedAt: payload.importedAt,
    sourceUrl: payload.sourceUrl,
    sheetName: payload.sheetName,
    gid: payload.gid,
    rowCount: payload.rowCount
  }));
}

function cleanTask(task) {
  const legacyNotes = String(task.notes || "").trim();
  const managerNote = String(task.managerNote ?? task.assigneeNote ?? legacyNotes).trim();

  return {
    id: task.id || makeId(task.name || "task"),
    name: String(task.name || "이름 없는 과제").trim(),
    organizer: String(task.organizer || "").trim(),
    startDate: normalizeDate(task.startDate),
    dueDate: normalizeDate(task.dueDate),
    submittedDate: normalizeDate(task.submittedDate),
    announcementDate: normalizeDate(task.announcementDate),
    resultStatus: normalizeStatus(task.resultStatus),
    originalResult: String(task.originalResult || "").trim(),
    selectedStatus: String(task.selectedStatus || "").trim(),
    grantAmount: normalizeAmount(task.grantAmount),
    noticeUrl: String(task.noticeUrl || "").trim(),
    notes: legacyNotes || managerNote,
    ownerNote: String(task.ownerNote ?? task.myNote ?? "").trim(),
    managerNote,
    source: task.source || "manual",
    createdAt: task.createdAt || new Date().toISOString()
  };
}

function makeId(seed = "task") {
  if (crypto.randomUUID) return crypto.randomUUID();
  return `${Date.now()}-${Math.random()}-${seed}`;
}

function createTask(data) {
  return cleanTask({ ...data, id: makeId(data.name), createdAt: new Date().toISOString() });
}

function normalizeDate(value) {
  if (!value) return "";
  const source = String(value).trim().replace(/\s+/g, "");
  const full = source.match(/^(20\d{2})[-./년](\d{1,2})[-./월](\d{1,2})/);
  if (full) return `${full[1]}-${full[2].padStart(2, "0")}-${full[3].padStart(2, "0")}`;
  const short = source.match(/^(\d{1,2})[-./월](\d{1,2})/);
  if (short) return `2025-${short[1].padStart(2, "0")}-${short[2].padStart(2, "0")}`;
  return source;
}

function normalizeAmount(value) {
  if (value === null || value === undefined || value === "") return 0;
  const amount = Number(String(value).replaceAll(",", "").replace(/[^\d.-]/g, ""));
  return Number.isFinite(amount) && amount > 0 ? Math.round(amount) : 0;
}

function normalizeStatus(value) {
  const source = String(value || "").trim();
  if (STATUS_OPTIONS.includes(source)) return source;
  if (/지원못함|지원불가|지원 불가|신청불가|신청 불가|대상아님|대상 아님|미신청|입주불가/.test(source)) return "지원못함";
  if (/미합격|불합격|탈락|제외/.test(source)) return "불합격";
  if (/합격|선정|완료|채택/.test(source)) return "합격";
  if (/제출|신청|접수/.test(source)) return "제출완료";
  if (/준비|예정/.test(source)) return "준비중";
  return "검토중";
}

function formatDate(value) {
  if (!value) return "-";
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("ko-KR", { year: "2-digit", month: "2-digit", day: "2-digit", weekday: "short" }).format(date);
}

function formatAmount(value) {
  const amount = normalizeAmount(value);
  return amount ? `${amount.toLocaleString("ko-KR")}만원` : "-";
}

function daysUntil(value) {
  if (!value) return null;
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.ceil((date - today) / 86400000);
}

function isActionableTask(task) {
  const left = daysUntil(task.dueDate);
  return MAIN_STATUS_OPTIONS.includes(task.resultStatus) && !task.submittedDate && (left === null || left >= 0);
}

function getDueTime(task) {
  const date = new Date(`${task.dueDate}T00:00:00`);
  return Number.isNaN(date.getTime()) ? 0 : date.getTime();
}

function getDueLabel(task) {
  const left = daysUntil(task.dueDate);
  if (left === null) return "";
  if (left < 0) return "마감 지남";
  if (left === 0) return "오늘 마감";
  if (left <= 7) return `${left}일 남음`;
  return "";
}

function getUrgencyBadge(task) {
  const left = daysUntil(task.dueDate);
  if (left === null || left < 0 || task.submittedDate) return "";
  if (left > 7) return "";
  const level = left <= 3 ? "red" : left <= 5 ? "orange" : "green";
  const label = left === 0 ? "오늘 마감" : `${left}일 남음`;
  return `<span class="urgency-badge urgency-${level}">${escapeHtml(label)}</span>`;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function isUrl(value) {
  try {
    new URL(value);
    return true;
  } catch {
    return false;
  }
}

function getStatusClass(status) {
  return {
    준비중: "status-ready",
    검토중: "status-review",
    제출완료: "status-submitted",
    합격: "status-pass",
    불합격: "status-fail",
    지원못함: "status-unavailable",
    보류: "status-hold"
  }[status] || "status-review";
}

function resetPagination() {
  currentPage = 1;
}

function setSyncStatus(message, state = "local") {
  if (!syncStatus) return;
  syncStatus.textContent = message;
  syncStatus.className = `sync-status sync-${state}`;
}

function todayIsoDate() {
  return new Date().toISOString().slice(0, 10);
}

function ownCloudSyncTitle(userEmail = cloudSync.userEmail) {
  return `${CLOUD_SYNC_PROJECT_TITLE}:${String(userEmail || "").toLowerCase()}`;
}

function cloudPayload(contentTasks = tasks) {
  return {
    schema: CLOUD_SYNC_SCHEMA,
    savedAt: new Date().toISOString(),
    baselineVersion: readImportMeta()?.version || "",
    tasks: contentTasks.map(cleanTask)
  };
}

function stringifyCloudPayload(contentTasks = tasks) {
  return JSON.stringify(cloudPayload(contentTasks));
}

function parseCloudPayload(content) {
  try {
    const parsed = JSON.parse(content || "");
    if (Array.isArray(parsed)) return { tasks: parsed };
    if (parsed && Array.isArray(parsed.tasks)) return parsed;
  } catch {
    return null;
  }
  return null;
}

function getCloudSavedAt(record) {
  const parsed = parseCloudPayload(record?.content);
  const savedAt = Date.parse(parsed?.savedAt || "");
  return Number.isFinite(savedAt) ? savedAt : 0;
}

function pickLatestCloudRecord(records) {
  return [...records].sort((a, b) => getCloudSavedAt(b) - getCloudSavedAt(a))[0] || null;
}

async function findCloudSyncRecords() {
  const response = await cloudSync.db
    .from("projects")
    .select("*")
    .like("title", `${CLOUD_SYNC_PROJECT_TITLE}%`);

  if (response.error) throw response.error;
  return response.data || [];
}

async function createCloudSyncRecord(userEmail, content = stringifyCloudPayload()) {
  const response = await cloudSync.db
    .from("projects")
    .insert({
      title: ownCloudSyncTitle(userEmail),
      assignee_email: userEmail,
      created_by_email: userEmail,
      due_date: todayIsoDate(),
      status: "보관",
      content
    })
    .select("*")
    .single();

  if (response.error) throw response.error;
  cloudSync.lastContent = content;
  return response.data;
}

function applyCloudRecord(record) {
  const parsed = parseCloudPayload(record?.content);
  if (!parsed?.tasks?.length) return false;
  cloudSync.applyingRemote = true;
  tasks = parsed.tasks.map(cleanTask);
  saveTasks({ cloud: false });
  cloudSync.applyingRemote = false;
  cloudSync.lastContent = record.content || "";
  cloudSync.lastRemoteRecordId = record.id || "";
  render();
  return true;
}

function scheduleCloudSave() {
  if (!cloudSync.ready || cloudSync.applyingRemote) return;
  window.clearTimeout(cloudSync.saveTimer);
  setSyncStatus("저장 대기", "pending");
  cloudSync.saveTimer = window.setTimeout(() => {
    pushCloudTasks().catch((error) => {
      setSyncStatus("동기화 실패", "error");
      console.error(error);
    });
  }, 650);
}

async function pushCloudTasks() {
  if (!cloudSync.ready || !cloudSync.recordId || cloudSync.saving) return;
  cloudSync.saving = true;
  setSyncStatus("동기화 중", "pending");
  const content = stringifyCloudPayload();
  const response = await cloudSync.db
    .from("projects")
    .update({ content })
    .eq("id", cloudSync.recordId)
    .select("*")
    .single();

  cloudSync.saving = false;
  if (response.error) throw response.error;
  cloudSync.lastContent = response.data?.content || content;
  setSyncStatus("동기화됨", "ok");
}

async function pullCloudTasks() {
  if (!cloudSync.ready || cloudSync.saving) return;
  const records = await findCloudSyncRecords();
  const record = pickLatestCloudRecord(records);
  const nextContent = record?.content || "";
  if (!nextContent || nextContent === cloudSync.lastContent) return;
  applyCloudRecord(record);
  setSyncStatus("동기화됨", "ok");
}

function startRealtimeSync() {
  if (!cloudSync.db?.channel) return;
  try {
    cloudSync.channel?.unsubscribe?.();
    cloudSync.channel = cloudSync.db
      .channel("government-board-sync")
      .on("postgres_changes", { event: "*", schema: "public", table: "projects" }, (payload) => {
        const title = payload.new?.title || payload.old?.title || "";
        if (!String(title).startsWith(CLOUD_SYNC_PROJECT_TITLE)) return;
        pullCloudTasks().catch((error) => {
          setSyncStatus("동기화 확인 실패", "error");
          console.error(error);
        });
      })
      .subscribe();
  } catch (error) {
    console.error(error);
  }
}

async function initCloudSync() {
  if (!window.supabase?.createClient) {
    setSyncStatus("로컬 저장", "local");
    return;
  }

  try {
    cloudSync.db = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    const sessionResponse = await cloudSync.db.auth.getSession();
    const session = sessionResponse.data?.session;

    if (!session?.user?.email) {
      setSyncStatus("로그인 필요", "warn");
      return;
    }

    setSyncStatus("동기화 연결 중", "pending");
    cloudSync.userEmail = session.user.email.toLowerCase();
    const records = await findCloudSyncRecords();
    const latestRecord = pickLatestCloudRecord(records);
    let ownRecord = records.find((record) => record.title === ownCloudSyncTitle(cloudSync.userEmail));

    if (!ownRecord) {
      ownRecord = await createCloudSyncRecord(cloudSync.userEmail, latestRecord?.content || stringifyCloudPayload());
    }

    cloudSync.recordId = ownRecord.id;
    cloudSync.ready = true;

    if (latestRecord) {
      applyCloudRecord(latestRecord);
      setSyncStatus("동기화됨", "ok");
    } else {
      cloudSync.lastContent = ownRecord.content || "";
      await pushCloudTasks();
    }

    window.clearInterval(cloudSync.pollTimer);
    cloudSync.pollTimer = window.setInterval(() => {
      pullCloudTasks().catch((error) => {
        setSyncStatus("동기화 확인 실패", "error");
        console.error(error);
      });
    }, CLOUD_POLL_INTERVAL);
    startRealtimeSync();
  } catch (error) {
    setSyncStatus("로컬 저장", "error");
    console.error(error);
  }
}

function matchesStatusView(task, view) {
  if (view === "main") return MAIN_STATUS_OPTIONS.includes(task.resultStatus);
  return task.resultStatus === view;
}

function getStatusCounts() {
  const counts = Object.fromEntries(STATUS_VIEWS.map((view) => [view, 0]));
  for (const task of tasks) {
    if (MAIN_STATUS_OPTIONS.includes(task.resultStatus)) counts.main += 1;
    else if (Object.hasOwn(counts, task.resultStatus)) counts[task.resultStatus] += 1;
  }
  return counts;
}

function updateStatusTabs() {
  const counts = getStatusCounts();
  document.querySelectorAll("[data-status-view]").forEach((tab) => {
    const selected = tab.dataset.statusView === currentStatusView;
    tab.classList.toggle("is-active", selected);
    tab.setAttribute("aria-selected", String(selected));
  });
  document.querySelectorAll("[data-status-count]").forEach((counter) => {
    counter.textContent = counts[counter.dataset.statusCount] ?? 0;
  });
}

function renderStatusSelect(task) {
  const options = STATUS_OPTIONS.map((status) => {
    const selected = task.resultStatus === status ? " selected" : "";
    return `<option value="${escapeHtml(status)}"${selected}>${escapeHtml(status)}</option>`;
  }).join("");

  return `<select class="row-status-select ${getStatusClass(task.resultStatus)}" data-status-id="${escapeHtml(task.id)}" aria-label="${escapeHtml(task.name)} 상태 변경">${options}</select>`;
}

function render() {
  const query = searchInput.value.trim().toLowerCase();
  const status = currentStatusView;
  const filteredTasks = tasks
    .filter((task) => {
      const matchesStatus = matchesStatusView(task, status);
      const haystack = `${task.name} ${task.organizer} ${task.resultStatus} ${task.originalResult} ${task.selectedStatus} ${task.notes} ${task.ownerNote} ${task.managerNote} ${task.noticeUrl}`.toLowerCase();
      return matchesStatus && haystack.includes(query);
    })
    .sort((a, b) => getDueTime(b) - getDueTime(a));

  const pageSize = Number(pageSizeSelect?.value || 20);
  const totalPages = Math.max(1, Math.ceil(filteredTasks.length / pageSize));
  if (currentPage > totalPages) currentPage = totalPages;
  if (currentPage < 1) currentPage = 1;
  const startIndex = (currentPage - 1) * pageSize;
  const visibleTasks = filteredTasks.slice(startIndex, startIndex + pageSize);

  totalCount.textContent = tasks.length;
  pendingCount.textContent = tasks.filter(isActionableTask).length;
  dueSoonCount.textContent = tasks.filter((task) => {
    const left = daysUntil(task.dueDate);
    return left !== null && left >= 0 && left <= 7 && !task.submittedDate;
  }).length;
  passedCount.textContent = tasks.filter((task) => task.resultStatus === "합격").length;
  passedAmountTotal.textContent = tasks
    .filter((task) => task.resultStatus === "합격")
    .reduce((sum, task) => sum + normalizeAmount(task.grantAmount), 0)
    .toLocaleString("ko-KR");
  updateStatusTabs();

  if (pageInfo) pageInfo.textContent = `${currentPage} / ${totalPages} (${filteredTasks.length}개)`;
  if (prevPageButton) prevPageButton.disabled = currentPage <= 1;
  if (nextPageButton) nextPageButton.disabled = currentPage >= totalPages;

  taskTableBody.innerHTML = visibleTasks.map((task, index) => {
    const dueLabel = getDueLabel(task);
    const urgencyBadge = getUrgencyBadge(task);
    const memo = [task.organizer, task.originalResult, task.selectedStatus].filter(Boolean).join(" / ");
    const taskId = escapeHtml(task.id);
    const noticeCell = task.noticeUrl && isUrl(task.noticeUrl)
      ? `<a href="${escapeHtml(task.noticeUrl)}" target="_blank" rel="noreferrer">공고 열기</a>${memo ? `<small>${escapeHtml(memo)}</small>` : ""}`
      : (memo || task.noticeUrl ? `<span>${escapeHtml([task.noticeUrl, memo].filter(Boolean).join(" / "))}</span>` : "-");

    return `
      <tr>
        <td class="number-cell">${startIndex + index + 1}</td>
        <td>
          <div class="task-title-wrap">
            <div class="task-name-line"><strong>${escapeHtml(task.name)}</strong>${urgencyBadge}</div>
            <div class="task-note-grid">
              <label class="task-note task-note-owner"><span>나의 의견</span><textarea data-note-field="ownerNote" data-id="${taskId}" placeholder="내가 볼 내용">${escapeHtml(task.ownerNote)}</textarea></label>
              <label class="task-note task-note-manager"><span>담당자 의견</span><textarea data-note-field="managerNote" data-id="${taskId}" placeholder="담당자 내용">${escapeHtml(task.managerNote)}</textarea></label>
            </div>
          </div>
        </td>
        <td><span>${formatDate(task.dueDate)}</span>${dueLabel ? `<small class="due-label">${escapeHtml(dueLabel)}</small>` : ""}</td>
        <td>${formatDate(task.submittedDate)}</td>
        <td>${renderStatusSelect(task)}</td>
        <td class="amount-cell">${formatAmount(task.grantAmount)}</td>
        <td class="notice-cell">${noticeCell}</td>
        <td><div class="row-actions"><button type="button" data-action="edit" data-id="${taskId}">수정</button><button type="button" data-action="delete" data-id="${taskId}">삭제</button></div></td>
      </tr>`;
  }).join("");

  emptyState.hidden = filteredTasks.length > 0;
}

async function loadGoogleSheetSeed({ replace = false } = {}) {
  const response = await fetch(SEED_URL, { cache: "no-store" });
  if (!response.ok) throw new Error("저장된 구글시트 데이터를 읽지 못했습니다.");
  const payload = await response.json();
  const imported = getPayloadTasks(payload).map(cleanTask);

  if (replace) {
    tasks = imported;
  } else {
    const existing = new Map(tasks.map((task) => [task.id, task]));
    for (const task of imported) existing.set(task.id, { ...existing.get(task.id), ...task });
    tasks = Array.from(existing.values());
  }

  saveTasks();
  saveImportMeta(payload);
  if (importMessage) importMessage.textContent = `구글시트 ${payload.rowCount}개 과제를 반영했습니다.`;
  render();
}

async function autoLoadGoogleSheetSeed() {
  try {
    const response = await fetch(SEED_URL, { cache: "no-store" });
    if (!response.ok) throw new Error("저장된 구글시트 데이터를 읽지 못했습니다.");
    const payload = await response.json();
    const meta = readImportMeta();

    if (!meta || meta.version !== payload.version || tasks.length === 0) {
      tasks = getPayloadTasks(payload).map(cleanTask);
      saveTasks();
      saveImportMeta(payload);
      if (importMessage) importMessage.textContent = `기준 데이터 ${payload.rowCount}개 과제를 반영했습니다.`;
    }
    render();
  } catch (error) {
    if (importMessage) importMessage.textContent = error.message;
    render();
  }
}


function getPayloadTasks(payload) {
  if (Array.isArray(payload.tasks)) return payload.tasks;
  if (!Array.isArray(payload.rows)) return [];
  const columns = payload.columns || [];
  return payload.rows.map((row) => Object.fromEntries(columns.map((column, index) => [column, row[index] ?? ""])));
}

function resetForm() {
  taskForm.reset();
  resultStatusInput.value = "검토중";
  editingId = null;
  saveTaskButton.textContent = "과제 추가";
}

function readFormTask() {
  return {
    name: taskNameInput.value,
    dueDate: dueDateInput.value,
    submittedDate: submittedDateInput.value,
    resultStatus: resultStatusInput.value,
    grantAmount: grantAmountInput.value,
    noticeUrl: noticeUrlInput.value
  };
}

function fillForm(task) {
  taskNameInput.value = task.name;
  dueDateInput.value = task.dueDate;
  submittedDateInput.value = task.submittedDate;
  resultStatusInput.value = task.resultStatus;
  grantAmountInput.value = task.grantAmount || "";
  noticeUrlInput.value = task.noticeUrl;
  editingId = task.id;
  saveTaskButton.textContent = "수정 저장";
  taskNameInput.focus();
}

function parsePastedRows(text) {
  return text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean).map((line) => line.split("\t").map((cell) => cell.trim()));
}

function importFromPaste() {
  if (!sheetPaste) return;
  const rows = parsePastedRows(sheetPaste.value);
  if (!rows.length) {
    if (importMessage) importMessage.textContent = "붙여넣은 표가 없습니다.";
    return;
  }
  const headerWords = ["과제명", "마감", "제출", "상태", "지원금", "링크"];
  const dataRows = rows[0].some((cell) => headerWords.some((word) => cell.includes(word))) ? rows.slice(1) : rows;
  const imported = dataRows.map((cells) => {
    const withoutIndex = /^\d+$/.test(cells[0] || "") ? cells.slice(1) : cells;
    return createTask({ name: withoutIndex[0], dueDate: withoutIndex[1], submittedDate: withoutIndex[2], resultStatus: withoutIndex[3], grantAmount: withoutIndex[4], noticeUrl: withoutIndex[5] });
  });
  tasks = [...tasks, ...imported];
  saveTasks();
  sheetPaste.value = "";
  if (importMessage) importMessage.textContent = `${imported.length}개 과제를 추가했습니다.`;
  render();
}

function updateTaskNote(taskId, field, value) {
  if (!["ownerNote", "managerNote"].includes(field)) return;
  tasks = tasks.map((task) => {
    if (task.id !== taskId) return task;
    const updated = { ...task, [field]: value };
    if (field === "managerNote") updated.notes = value;
    return updated;
  });
  saveTasks();
}

function updateTaskStatus(taskId, value) {
  const resultStatus = normalizeStatus(value);
  tasks = tasks.map((task) => task.id === taskId ? { ...task, resultStatus } : task);
  saveTasks();
  resetPagination();
  render();
}

function exportCsv() {
  const header = ["순번", "과제명", "주관기관", "마감일", "제출일", "상태", "원본결과", "선정여부", "지원금(만원)", "공고/링크", "나의 의견", "담당자 의견"];
  const rows = tasks.map((task, index) => [index + 1, task.name, task.organizer, task.dueDate, task.submittedDate, task.resultStatus, task.originalResult, task.selectedStatus, task.grantAmount, task.noticeUrl, task.ownerNote, task.managerNote || task.notes]);
  const csv = [header, ...rows].map((row) => row.map((cell) => `"${String(cell ?? "").replaceAll('"', '""')}"`).join(",")).join("\n");
  const blob = new Blob([`\ufeff${csv}`], { type: "text/csv;charset=utf-8" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = "bnow-government-workboard.csv";
  link.click();
  URL.revokeObjectURL(link.href);
}

taskForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const formTask = readFormTask();
  if (editingId) tasks = tasks.map((task) => task.id === editingId ? { ...task, ...cleanTask({ ...task, ...formTask, id: task.id }) } : task);
  else tasks = [...tasks, createTask(formTask)];
  saveTasks();
  resetForm();
  render();
});

resetFormButton.addEventListener("click", resetForm);
importPasteButton?.addEventListener("click", importFromPaste);
importSeedButton?.addEventListener("click", () => loadGoogleSheetSeed({ replace: true }).catch((error) => { if (importMessage) importMessage.textContent = error.message; }));
importSheetButton?.addEventListener("click", () => loadGoogleSheetSeed({ replace: true }).catch((error) => { if (importMessage) importMessage.textContent = error.message; }));
exportButton.addEventListener("click", exportCsv);
searchInput.addEventListener("input", () => { resetPagination(); render(); });
statusTabs?.addEventListener("click", (event) => {
  const tab = event.target.closest("[data-status-view]");
  if (!tab) return;
  currentStatusView = STATUS_VIEWS.includes(tab.dataset.statusView) ? tab.dataset.statusView : "main";
  resetPagination();
  render();
});
pageSizeSelect?.addEventListener("change", () => { resetPagination(); render(); });
prevPageButton?.addEventListener("click", () => { currentPage -= 1; render(); });
nextPageButton?.addEventListener("click", () => { currentPage += 1; render(); });

taskTableBody.addEventListener("input", (event) => {
  const noteField = event.target.closest("[data-note-field]");
  if (!noteField) return;
  updateTaskNote(noteField.dataset.id, noteField.dataset.noteField, noteField.value);
});

taskTableBody.addEventListener("change", (event) => {
  const statusSelect = event.target.closest("[data-status-id]");
  if (!statusSelect) return;
  updateTaskStatus(statusSelect.dataset.statusId, statusSelect.value);
});

taskTableBody.addEventListener("click", (event) => {
  const button = event.target.closest("button");
  if (!button) return;
  const task = tasks.find((item) => item.id === button.dataset.id);
  if (!task) return;
  if (button.dataset.action === "edit") fillForm(task);
  if (button.dataset.action === "delete") {
    tasks = tasks.filter((item) => item.id !== task.id);
    saveTasks();
    render();
  }
});

async function startApp() {
  await autoLoadGoogleSheetSeed();
  await initCloudSync();
}

startApp();
