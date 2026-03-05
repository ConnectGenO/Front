// ================================
// LocalStorage (banco simples)
// ================================
const LS_KEY = "ilha_progresso_v1";

function loadProgress() {
  try { return JSON.parse(localStorage.getItem(LS_KEY) || "{}"); }
  catch { return {}; }
}
function saveProgress(p) { localStorage.setItem(LS_KEY, JSON.stringify(p)); }
function resetProgress() { localStorage.removeItem(LS_KEY); }

// ================================
// Estado global
// ================================
let DB = null;
let currentUser = null; // {id, name, role, sectorId}
let progress = loadProgress();

// ================================
// DOM
// ================================
const btnReset = document.getElementById("btnReset");

// Intern
const islandsEl = document.getElementById("islands");
const sectorPicker = document.getElementById("sectorPicker");
const courseList = document.getElementById("courseList");
const internHello = document.getElementById("internHello");
const internPill = document.getElementById("internPill");

// ================================
// Init
// ================================
async function init() {
  DB = await fetch("./data.json").then(r => r.json());

  // Set default intern user (first intern: Ana)
  const interns = DB.users.filter(u => u.role === "intern");
  currentUser = interns[0];

  // Initialize progress for the default user
  if (!progress[currentUser.id]) progress[currentUser.id] = {};
  saveProgress(progress);

  // picker de setores (intern)
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
    // Re-initialize progress for current user
    if (!progress[currentUser.id]) progress[currentUser.id] = {};
    saveProgress(progress);
    renderIntern();
  });

  sectorPicker.addEventListener("change", () => {
    renderCoursesForSector(sectorPicker.value);
    renderInternIslands();
  });
}

// ================================
// Render intern screen
// ================================
function renderIntern() {
  internHello.textContent = `Olá, ${currentUser.name} 👋`;
  internPill.textContent = `Perfil: Estagiário • Setor: ${sectorName(currentUser.sectorId)}`;

  sectorPicker.value = currentUser.sectorId;
  renderInternIslands();
  renderCoursesForSector(sectorPicker.value);
}

// ================================
// Regras de desbloqueio
// ================================
function isDone(userId, courseId) {
  const done = Boolean(progress?.[userId]?.[courseId]);
  console.log("isDone for", courseId, ":", done);
  return done;
}

function completeCourse(userId, courseId) {
  if (!progress[userId]) progress[userId] = {};
  progress[userId][courseId] = true;
  console.log("Set progress:", progress[userId]);
  saveProgress(progress);
}

function countDoneCourses(userId, sector) {
  const userProg = progress[userId] || {};
  return sector.courses.reduce((acc, c) => acc + (userProg[c.id] ? 1 : 0), 0);
}

function sectorName(sectorId) {
  const s = DB?.sectors?.find(x => x.id === sectorId);
  return s ? s.name : sectorId;
}

// ================================
// SVG base da ilha (reaproveitado)
// ================================
function islandSVG() {
  return `
    <svg class="island-svg" viewBox="0 0 100 60" preserveAspectRatio="none" aria-hidden="true">
      <path d="M0,45 C15,40 25,48 40,45 C55,42 65,50 80,46 C90,44 95,42 100,44 L100,60 L0,60 Z"
            fill="rgba(93,124,255,.18)"/>
      <path d="M0,48 C16,44 27,52 42,48 C57,45 67,54 82,49 C92,46 96,45 100,47 L100,60 L0,60 Z"
            fill="rgba(50,210,150,.10)"/>
      <path d="M18,44 C18,32 30,18 50,18 C70,18 82,32 82,44 C82,52 70,56 50,56 C30,56 18,52 18,44 Z"
            fill="rgba(255, 224, 170, .35)" stroke="rgba(255,255,255,.10)" stroke-width="0.6"/>
      <path d="M24,44 C24,35 34,24 50,24 C66,24 76,35 76,44 C76,49 66,52 50,52 C34,52 24,49 24,44 Z"
            fill="rgba(93,124,255,.06)"/>
      <path d="M30,40 C35,30 42,28 50,28 C58,28 65,30 70,40 C66,43 60,46 50,46 C40,46 34,43 30,40 Z"
            fill="rgba(50,210,150,.16)"/>
    </svg>
  `;
}

// ================================
// Render: Ilhas do ESTAGIÁRIO (todas)
// ================================
function renderInternIslands() {
  islandsEl.innerHTML = "";

  DB.sectors.forEach(sector => {
    const doneCount = countDoneCourses(currentUser.id, sector);
    const total = sector.courses.length;
    const pct = Math.round((doneCount / total) * 100);

    const island = document.createElement("div");
    island.className = "island";

    island.innerHTML = `
      <div class="island-head">
        <div>
          <div class="island-name">🏝️ ${sector.name}</div>
          <div class="island-mini">${doneCount}/${total} cursos concluídos • ${pct}%</div>
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
          if (unlocked) console.log("Adding show pin for", course.id, "on sector", sector.id);
          return `
            <div class="pin ${unlocked ? "show" : ""}"
                 style="left:${x}%; top:${y}%;"
                 title="${course.title}">
              <img src="${course.image}" alt="${course.title}" style="width:50px; height:50px; border-radius:50%; object-fit:cover;" />
            </div>
          `;
        }).join("")}
      </div>
    `;

    island.querySelector("[data-open]").addEventListener("click", (e) => {
      const sectorId = e.currentTarget.getAttribute("data-open");
      sectorPicker.value = sectorId;
      renderCoursesForSector(sectorId);
      courseList.scrollIntoView({ behavior: "smooth", block: "start" });
    });

    islandsEl.appendChild(island);
  });
}



// ================================
// Quiz Logic
// ================================
let currentCourseId = null;

const quizModal = document.getElementById("quizModal");
const quizTitle = document.getElementById("quizTitle");
const quizContent = document.getElementById("quizContent");
const prevQuestion = document.getElementById("prevQuestion");
const nextQuestion = document.getElementById("nextQuestion");
const finishQuiz = document.getElementById("finishQuiz");
const closeQuiz = document.getElementById("closeQuiz");

let currentQuiz = null;
let userAnswers = [];

function openQuiz(courseId) {
  const course = findCourse(courseId);
  if (!course || !course.quiz) return;

  currentCourseId = courseId;
  currentQuiz = course.quiz;
  userAnswers = new Array(currentQuiz.length).fill(null);

  quizTitle.textContent = `Quiz: ${course.title}`;
  renderQuiz();
  quizModal.classList.remove("hidden");
}

function findCourse(courseId) {
  for (let sector of DB.sectors) {
    const c = sector.courses.find(c => c.id === courseId);
    if (c) return c;
  }
  return null;
}

function renderQuiz() {
  quizContent.innerHTML = currentQuiz.map((q, i) => `
    <div class="quiz-question">
      <h4>${i+1}. ${q.question}</h4>
      <div class="quiz-options">
        ${q.options.map((opt, j) => `
          <label>
            <input type="radio" name="q${i}" value="${j}" ${userAnswers[i] === j ? 'checked' : ''}>
            ${opt}
          </label>
        `).join('')}
      </div>
    </div>
  `).join('');

  // Bind radio changes
  document.querySelectorAll('input[type="radio"]').forEach(radio => {
    radio.addEventListener('change', (e) => {
      const qIndex = parseInt(e.target.name.slice(1));
      userAnswers[qIndex] = parseInt(e.target.value);
    });
  });

  // Reset buttons
  nextQuestion.textContent = "Finalizar Quiz";
  nextQuestion.classList.remove("hidden");
  finishQuiz.classList.add("hidden");
  prevQuestion.disabled = true;
}

function calculateScore() {
  let correct = 0;
  currentQuiz.forEach((q, i) => {
    if (userAnswers[i] === q.answer) correct++;
  });
  return correct;
}

function closeModal() {
  quizModal.classList.add("hidden");
  currentQuiz = null;
  userAnswers = [];
  currentCourseId = null;
}

function handleFinishQuiz() {
  const score = calculateScore();
  const passed = score >= 2; // At least 2/3 correct (66.7%, close to 70%)

  console.log("Quiz score:", score, "passed:", passed);

  quizContent.innerHTML = `
    <div class="result-message ${passed ? 'success' : 'fail'}">
      <h3>${passed ? 'Parabéns!' : 'Tente novamente'}</h3>
      <p>Você acertou ${score}/${currentQuiz.length} perguntas.</p>
      ${passed ? '<p>Seu conhecimento foi verificado. Curso concluído!</p>' : '<p>Você precisa acertar pelo menos 70% para concluir o curso.</p>'}
    </div>
  `;

  nextQuestion.textContent = "Fechar";
  nextQuestion.onclick = () => {
    if (passed) {
      // Find the sector of the completed course and switch to it
      let completedSectorId = null;
      for (let sector of DB.sectors) {
        if (sector.courses.some(c => c.id === currentCourseId)) {
          completedSectorId = sector.id;
          break;
        }
      }
      if (completedSectorId) {
        sectorPicker.value = completedSectorId;
        console.log("Switched to sector:", completedSectorId);
      }

      console.log("Completing course:", currentCourseId);
      completeCourse(currentUser.id, currentCourseId);
      console.log("Progress after complete:", progress);
      renderCoursesForSector(sectorPicker.value);
      renderInternIslands();
      console.log("Re-rendered");
    }
    closeModal();
  };
  prevQuestion.disabled = true;
  finishQuiz.classList.add("hidden");
}

// Bind modal events
closeQuiz.addEventListener("click", closeModal);
nextQuestion.addEventListener("click", handleFinishQuiz);
prevQuestion.addEventListener("click", () => {
  // If implementing one-by-one, prev logic here
});

// ================================
// Modify complete button to open quiz
// ================================
function renderCoursesForSector(sectorId) {
  const sector = DB.sectors.find(s => s.id === sectorId);
  if (!sector) return;

  courseList.innerHTML = "";

  sector.courses.forEach(course => {
    const done = isDone(currentUser.id, course.id);

    const row = document.createElement("div");
    row.className = "course";
    row.innerHTML = `
      <div style="display:flex; align-items:center; gap:8px;">
        <img src="${course.image}" alt="${course.title}" style="width:20px; height:20px; border-radius:50%; object-fit:cover;">
        <div>
          <div class="course-title">${course.title}</div>
          <div class="muted" style="font-size:12px">Curso: <b>${course.id}</b></div>
        </div>
      </div>

      <div style="display:flex; align-items:center; gap:10px;">
        <span class="badge ${done ? "done" : ""}">${done ? "Concluído" : "Pendente"}</span>
        <button class="btn ${done ? "btn-ghost" : "btn-primary"}" ${done ? "disabled" : ""}>
          ${done ? "OK" : "Fazer Quiz"}
        </button>
      </div>
    `;

    row.querySelector("button").addEventListener("click", () => {
      if (!done) {
        openQuiz(course.id);
      }
    });

    courseList.appendChild(row);
  });
}



init();
