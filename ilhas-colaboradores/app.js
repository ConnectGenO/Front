// ================================
// LocalStorage (banco simples)
// ================================
const LS_KEY = "ilha_progresso_v2";

function loadProgress() {
  try {
    return JSON.parse(localStorage.getItem(LS_KEY) || "{}");
  } catch {
    return {};
  }
}
function saveProgress(p) { localStorage.setItem(LS_KEY, JSON.stringify(p)); }
function resetProgress() { localStorage.removeItem(LS_KEY); }

// ================================
// Estado global
// ================================
let DB = null;
let currentUser = null; // {id, name, role, sectorId}
let progress = loadProgress();

let currentQuiz = null;
let currentCourseId = null;
let userAnswers = [];
let quizFinished = false;
let lastQuizPassed = false;

let currentUploadCourseId = null;

// ================================
// DOM
// ================================
const btnReset = document.getElementById("btnReset");
const islandsEl = document.getElementById("islands");
const sectorPicker = document.getElementById("sectorPicker");
const courseList = document.getElementById("courseList");
const internHello = document.getElementById("internHello");
const internPill = document.getElementById("internPill");

const quizModal = document.getElementById("quizModal");
const quizTitle = document.getElementById("quizTitle");
const quizContent = document.getElementById("quizContent");
const quizPrimary = document.getElementById("quizPrimary");
const closeQuiz = document.getElementById("closeQuiz");

const uploadModal = document.getElementById("uploadModal");
const uploadTitle = document.getElementById("uploadTitle");
const uploadCourseName = document.getElementById("uploadCourseName");
const uploadHint = document.getElementById("uploadHint");
const uploadHistory = document.getElementById("uploadHistory");
const certificateFile = document.getElementById("certificateFile");
const certificateNote = document.getElementById("certificateNote");
const saveUploadBtn = document.getElementById("saveUpload");
const closeUpload = document.getElementById("closeUpload");

// ================================
// Init
// ================================
async function init() {
  DB = await fetch("./data.json").then(r => r.json());

  const interns = DB.users.filter(u => u.role === "intern");
  currentUser = interns[0];

  ensureUserProgress(currentUser.id);
  saveProgress(progress);

  sectorPicker.innerHTML = DB.sectors.map(s =>
    `<option value="${s.id}">${s.name}</option>`
  ).join("");

  bindEvents();
  renderIntern();
}

function bindEvents() {
  btnReset.addEventListener("click", () => {
    resetProgress();
    progress = loadProgress();
    ensureUserProgress(currentUser.id);
    saveProgress(progress);
    renderIntern();
  });

  sectorPicker.addEventListener("change", () => {
    renderCoursesForSector(sectorPicker.value);
    renderInternIslands();
  });

  closeQuiz.addEventListener("click", closeQuizModal);
  quizPrimary.addEventListener("click", handleQuizPrimaryAction);

  closeUpload.addEventListener("click", closeUploadModal);
  saveUploadBtn.addEventListener("click", handleUploadSubmit);
}

// ================================
// Helpers
// ================================
function ensureUserProgress(userId) {
  if (!progress[userId]) progress[userId] = {};
}

function getCourseRecord(userId, courseId) {
  return progress?.[userId]?.[courseId] ?? null;
}

function isDone(userId, courseId) {
  const record = getCourseRecord(userId, courseId);
  if (record === true) return true;
  return Boolean(record?.done);
}

function completeCourse(userId, courseId, payload = {}) {
  ensureUserProgress(userId);
  progress[userId][courseId] = {
    done: true,
    completedAt: payload.completedAt || new Date().toISOString(),
    ...payload
  };
  saveProgress(progress);
}

function countDoneCourses(userId, sector) {
  return sector.courses.reduce((acc, course) => acc + (isDone(userId, course.id) ? 1 : 0), 0);
}

function sectorName(sectorId) {
  const sector = DB?.sectors?.find(x => x.id === sectorId);
  return sector ? sector.name : sectorId;
}

function findCourse(courseId) {
  for (const sector of DB.sectors) {
    const course = sector.courses.find(c => c.id === courseId);
    if (course) return course;
  }
  return null;
}

function findSectorByCourse(courseId) {
  return DB.sectors.find(sector => sector.courses.some(c => c.id === courseId)) || null;
}

function getCourseType(course) {
  if (course.type) return course.type;
  if (course.quiz) return "quiz";
  return "upload";
}

function escapeHTML(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function formatDateTime(value) {
  if (!value) return "";
  try {
    return new Date(value).toLocaleString("pt-BR", {
      dateStyle: "short",
      timeStyle: "short"
    });
  } catch {
    return value;
  }
}

function badgeText(course, done) {
  const type = getCourseType(course);
  if (done && type === "upload") return "Enviado";
  if (done) return "Concluído";
  return type === "upload" ? "Aguardando envio" : "Pendente";
}

function actionLabel(course, done) {
  const type = getCourseType(course);
  if (type === "upload") return done ? "Ver envio" : "Enviar certificado";
  return done ? "OK" : "Fazer Quiz";
}

function buildRecordSummary(course, record) {
  if (!record || record === true) return "";

  if (record.type === "quiz") {
    const scoreText = typeof record.score === "number" && typeof record.total === "number"
      ? `Pontuação: ${record.score}/${record.total}`
      : "Quiz concluído";
    return `<div class="course-meta">${scoreText}${record.completedAt ? ` • ${formatDateTime(record.completedAt)}` : ""}</div>`;
  }

  if (record.type === "upload") {
    return `
      <div class="course-meta">
        Arquivo: <b>${escapeHTML(record.fileName || "não informado")}</b>
        ${record.uploadedAt ? ` • Enviado em ${formatDateTime(record.uploadedAt)}` : ""}
      </div>
    `;
  }

  return "";
}

// ================================
// Render intern screen
// ================================
function renderIntern() {
  internHello.textContent = `Olá, ${currentUser.name} 👋`;
  internPill.textContent = `Perfil: Estagiário • Setor inicial: ${sectorName(currentUser.sectorId)}`;

  sectorPicker.value = currentUser.sectorId;
  renderInternIslands();
  renderCoursesForSector(sectorPicker.value);
}

function renderInternIslands() {
  islandsEl.innerHTML = "";

  DB.sectors.forEach(sector => {
    const doneCount = countDoneCourses(currentUser.id, sector);
    const total = sector.courses.length;
    const pct = total ? Math.round((doneCount / total) * 100) : 0;

    const island = document.createElement("div");
    island.className = "island";

    island.innerHTML = `
      <div class="island-head">
        <div>
          <div class="island-name">🏝️ ${sector.name}</div>
          <div class="island-mini">${doneCount}/${total} etapas concluídas • ${pct}%</div>
        </div>
        <button class="btn btn-ghost" data-open="${sector.id}">Ver cursos</button>
      </div>

      <div class="progressbar"><div style="width:${pct}%"></div></div>

      <div class="island-map" data-theme="${sector.theme || sector.id}">
        <img src="${sector.image}" class="island-img" alt="${sector.name} ilha" />
        <div class="island-tag">${sector.name} • Ilha</div>

        ${sector.courses.map(course => {
          const unlocked = isDone(currentUser.id, course.id);
          const x = course.pos?.x ?? 50;
          const y = course.pos?.y ?? 45;
          return `
            <div class="pin ${unlocked ? "show" : ""}"
                 style="left:${x}%; top:${y}%;"
                 title="${escapeHTML(course.title)}">
              <img src="${course.image}" alt="${escapeHTML(course.title)}" style="width:50px; height:50px; border-radius:50%; object-fit:cover;" />
            </div>
          `;
        }).join("")}
      </div>
    `;

    island.querySelector("[data-open]").addEventListener("click", e => {
      const sectorId = e.currentTarget.getAttribute("data-open");
      sectorPicker.value = sectorId;
      renderCoursesForSector(sectorId);
      courseList.scrollIntoView({ behavior: "smooth", block: "start" });
    });

    islandsEl.appendChild(island);
  });
}

function renderCoursesForSector(sectorId) {
  const sector = DB.sectors.find(s => s.id === sectorId);
  if (!sector) return;

  courseList.innerHTML = "";

  sector.courses.forEach(course => {
    const type = getCourseType(course);
    const done = isDone(currentUser.id, course.id);
    const record = getCourseRecord(currentUser.id, course.id);

    const row = document.createElement("div");
    row.className = "course";
    row.innerHTML = `
      <div class="course-main">
        <div style="display:flex; align-items:flex-start; gap:10px;">
          <img src="${course.image}" alt="${escapeHTML(course.title)}" style="width:28px; height:28px; border-radius:50%; object-fit:cover; margin-top:2px;">
          <div>
            <div class="course-title">${course.title}</div>
            <div class="muted" style="font-size:12px">Código: <b>${course.id}</b> • Tipo: <b>${type === "upload" ? "Upload" : "Quiz"}</b></div>
            ${course.description ? `<div class="course-desc">${course.description}</div>` : ""}
            ${buildRecordSummary(course, record)}
            ${Array.isArray(course.recommendedCourses) && course.recommendedCourses.length ? `
              <ul class="helper-list">
                ${course.recommendedCourses.map(item => `<li>${item}</li>`).join("")}
              </ul>
            ` : ""}
          </div>
        </div>
      </div>

      <div class="course-actions">
        <span class="badge ${done ? "done" : ""}">${badgeText(course, done)}</span>
        ${course.coursePageUrl ? `<a class="btn btn-ghost" href="${course.coursePageUrl}" target="_blank" rel="noopener">Cursos online</a>` : ""}
        <button class="btn ${done && type !== "upload" ? "btn-ghost" : "btn-primary"}" ${done && type !== "upload" ? "disabled" : ""}>
          ${actionLabel(course, done)}
        </button>
      </div>
    `;

    const actionButton = row.querySelector("button");
    actionButton.addEventListener("click", () => {
      if (type === "upload") {
        openUploadModal(course.id);
        return;
      }
      if (!done) openQuiz(course.id);
    });

    courseList.appendChild(row);
  });
}

// ================================
// Quiz modal
// ================================
function openQuiz(courseId) {
  const course = findCourse(courseId);
  if (!course || !course.quiz) return;

  currentCourseId = courseId;
  currentQuiz = course.quiz;
  userAnswers = new Array(currentQuiz.length).fill(null);
  quizFinished = false;
  lastQuizPassed = false;

  quizTitle.textContent = `Quiz: ${course.title}`;
  renderQuiz();
  quizModal.classList.remove("hidden");
}

function renderQuiz() {
  quizContent.innerHTML = currentQuiz.map((q, i) => `
    <div class="quiz-question">
      <h4>${i + 1}. ${q.question}</h4>
      <div class="quiz-options">
        ${q.options.map((option, j) => `
          <label>
            <input type="radio" name="q${i}" value="${j}" ${userAnswers[i] === j ? "checked" : ""}>
            ${option}
          </label>
        `).join("")}
      </div>
    </div>
  `).join("");

  document.querySelectorAll('#quizContent input[type="radio"]').forEach(radio => {
    radio.addEventListener("change", event => {
      const qIndex = Number(event.target.name.slice(1));
      userAnswers[qIndex] = Number(event.target.value);
    });
  });

  quizPrimary.textContent = "Finalizar Quiz";
}

function calculateScore() {
  let correct = 0;
  currentQuiz.forEach((question, index) => {
    if (userAnswers[index] === question.answer) correct += 1;
  });
  return correct;
}

function handleQuizPrimaryAction() {
  if (quizFinished) {
    if (lastQuizPassed) {
      const sector = findSectorByCourse(currentCourseId);
      if (sector) sectorPicker.value = sector.id;
      renderCoursesForSector(sectorPicker.value);
      renderInternIslands();
    }
    closeQuizModal();
    return;
  }

  const score = calculateScore();
  const total = currentQuiz.length;
  const passed = score / total >= 0.7;
  quizFinished = true;
  lastQuizPassed = passed;

  if (passed) {
    completeCourse(currentUser.id, currentCourseId, {
      type: "quiz",
      score,
      total,
      completedAt: new Date().toISOString()
    });
  }

  quizContent.innerHTML = `
    <div class="result-message ${passed ? "success" : "fail"}">
      <h3>${passed ? "Parabéns!" : "Tente novamente"}</h3>
      <p>Você acertou <b>${score}/${total}</b> perguntas.</p>
      <p>${passed ? "Seu conhecimento foi validado e a etapa foi concluída." : "Você precisa acertar pelo menos 70% para concluir esta etapa."}</p>
    </div>
  `;

  quizPrimary.textContent = "Fechar";
}

function closeQuizModal() {
  quizModal.classList.add("hidden");
  currentQuiz = null;
  currentCourseId = null;
  userAnswers = [];
  quizFinished = false;
  lastQuizPassed = false;
  quizPrimary.textContent = "Finalizar Quiz";
}

// ================================
// Upload modal
// ================================
function openUploadModal(courseId) {
  const course = findCourse(courseId);
  if (!course) return;

  currentUploadCourseId = courseId;
  const record = getCourseRecord(currentUser.id, courseId);

  uploadTitle.textContent = `Upload: ${course.title}`;
  uploadCourseName.textContent = course.title;
  uploadHint.textContent = course.uploadHint || "Envie o certificado concluído para registrar sua evolução nesta trilha.";
  certificateFile.value = "";
  certificateNote.value = record?.note || "";

  if (record?.fileName) {
    uploadHistory.innerHTML = `
      <div class="upload-history-card">
        <div><b>Último envio:</b> ${escapeHTML(record.fileName)}</div>
        <div><b>Data:</b> ${formatDateTime(record.uploadedAt)}</div>
        ${record.note ? `<div><b>Observação:</b> ${escapeHTML(record.note)}</div>` : ""}
      </div>
    `;
  } else {
    uploadHistory.innerHTML = `<div class="muted">Nenhum certificado enviado ainda.</div>`;
  }

  uploadModal.classList.remove("hidden");
}

function handleUploadSubmit() {
  const course = findCourse(currentUploadCourseId);
  if (!course) return;

  const file = certificateFile.files?.[0];
  if (!file) {
    uploadHistory.innerHTML = `<div class="result-message fail"><p>Selecione um arquivo antes de enviar.</p></div>`;
    return;
  }

  const uploadedAt = new Date().toISOString();
  completeCourse(currentUser.id, currentUploadCourseId, {
    type: "upload",
    fileName: file.name,
    fileSize: file.size,
    mimeType: file.type,
    note: certificateNote.value.trim(),
    uploadedAt,
    completedAt: uploadedAt
  });

  uploadHistory.innerHTML = `
    <div class="result-message success">
      <h3>Certificado enviado!</h3>
      <p><b>${escapeHTML(file.name)}</b></p>
      <p>Envio registrado em ${formatDateTime(uploadedAt)}.</p>
      <p class="muted">Nesta versão estática, o navegador salva o status do envio e os metadados do arquivo.</p>
    </div>
  `;

  renderCoursesForSector(sectorPicker.value);
  renderInternIslands();
}

function closeUploadModal() {
  uploadModal.classList.add("hidden");
  currentUploadCourseId = null;
  certificateFile.value = "";
  certificateNote.value = "";
}

init();
