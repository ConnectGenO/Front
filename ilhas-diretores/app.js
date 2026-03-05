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
// Dados estáticos
// ================================
const DB = {
  "sectors": [
    {
      "id": "finance",
      "name": "OnBoarding",
      "theme": "finance",
      "image": "imgs/island-preto.png",
      "courses": [
        { "id": "fin-1", "title": "Contabilidade", "image": "imgs/on-1.png", "pos": { "x": 50, "y": 50 } },
        { "id": "fin-2", "title": "Orçamento", "image": "imgs/on-2.png", "pos": { "x": 54, "y": 35 } },
        { "id": "fin-3", "title": "Custos", "image": "imgs/on-3.png", "pos": { "x": 30, "y": 40 } },
        { "id": "fin-4", "title": "KPIs", "image": "imgs/on-4.png", "pos": { "x": 70, "y": 40 } },
        { "id": "fin-5", "title": "Compliance", "image": "imgs/on-5.png", "pos": { "x": 40, "y": 28 } }
      ]
    },
    {
      "id": "beneficios",
      "name": "Cerficações",
      "theme": "beneficios",
      "image": "imgs/island-azulescuro.png",
      "courses": [
        { "id": "bene-1", "title": "Segurança", "image": "imgs/bene-1.png", "pos": { "x": 50, "y": 50 } },
        { "id": "bene-2", "title": "Git ", "image": "imgs/bene-2.png", "pos": { "x": 50, "y": 30 } },
        { "id": "bene-4", "title": "APIs ", "image": "imgs/bene-4.png", "pos": { "x": 70, "y": 40 } },
        { "id": "bene-5", "title": "Cloud ", "image": "imgs/bene-5.png", "pos": { "x": 30, "y": 40 } }
      ]
    },
    {
      "id": "it",
      "name": "Benefícios",
      "theme": "it",
      "image": "imgs/island-verde.png",
      "courses": [
        { "id": "it-1", "title": "Vale Alimentação", "image": "imgs/it-1.png", "pos": { "x": 50, "y": 50 } },
        { "id": "it-2", "title": "Plano de Saúde", "image": "imgs/it-2.png", "pos": { "x": 54, "y": 35 } },
        { "id": "it-3", "title": "Auxílio Educação", "image": "imgs/it-3.png", "pos": { "x": 30, "y": 40 } },
        { "id": "it-4", "title": "Previdência Privada", "image": "imgs/it-4.png", "pos": { "x": 70, "y": 40 } },
        { "id": "bene-3", "title": "Vale Transporte", "image": "imgs/bene-3.png", "pos": { "x": 40, "y": 30 } }
      ]
    }
  ],
  "users": [
    { "id": "u-ana", "name": "Ana", "role": "intern", "sectorId": "finance" },
    { "id": "u-bruno", "name": "Bruno", "role": "intern", "sectorId": "finance" },
    { "id": "u-carla", "name": "Carla", "role": "intern", "sectorId": "beneficios" },
    { "id": "u-diego", "name": "Diego", "role": "intern", "sectorId": "it" },

    { "id": "a-fin", "name": "Admin Finanças", "role": "admin", "sectorId": "finance" },
    { "id": "a-hr", "name": "Admin RH", "role": "admin", "sectorId": "beneficios" },
    { "id": "a-it", "name": "Admin TI", "role": "admin", "sectorId": "it" }
  ]
};

// ================================
// Estado global
// ================================
let currentUser = null; // {id, name, role, sectorId}
let progress = loadProgress();

// Carrossel Admin
let adminCarouselIndex = 0;
let adminCarouselInternId = null;

// ================================
// DOM
// ================================
const screenAdmin = document.getElementById("screenAdmin");

const btnReset = document.getElementById("btnReset");

// Admin
const adminHello = document.getElementById("adminHello");
const adminPill = document.getElementById("adminPill");
const adminUserList = document.getElementById("adminUserList");
const adminInternPicker = document.getElementById("adminInternPicker");
const adminInternIslands = document.getElementById("adminInternIslands");

const sectorPickerAdmin = document.getElementById("sectorPickerAdmin");

// Carousel buttons
const carouselPrev = document.getElementById("carouselPrev");
const carouselNext = document.getElementById("carouselNext");

// ================================
// Init
// ================================
function init() {
  // picker de setores (admin)
  sectorPickerAdmin.innerHTML = DB.sectors.map(s =>
    `<option value="${s.id}">${s.name}</option>`
  ).join("");

  // default to first sector
  const defaultSectorId = DB.sectors[0].id;
  const defaultAdmin = DB.users.find(u => u.role === "admin" && u.sectorId === defaultSectorId);
  currentUser = defaultAdmin;

  sectorPickerAdmin.value = defaultSectorId;

  bindEvents();
  renderAdminScreen();
}

function bindEvents() {
  btnReset.addEventListener("click", () => {
    resetProgress();
    progress = loadProgress();
    renderAdminScreen();
  });

  sectorPickerAdmin.addEventListener("change", () => {
    const selectedSectorId = sectorPickerAdmin.value;
    const admin = DB.users.find(u => u.role === "admin" && u.sectorId === selectedSectorId);
    currentUser = admin;
    renderAdminScreen();
  });

  adminInternPicker.addEventListener("change", () => {
    adminCarouselIndex = 0; // volta pro início ao trocar estagiário
    renderAdminInternIslands(adminInternPicker.value);
  });

  carouselPrev.addEventListener("click", () => {
    if (!adminCarouselInternId) return;
    adminCarouselIndex--;
    renderAdminInternIslands(adminCarouselInternId);
  });

  carouselNext.addEventListener("click", () => {
    if (!adminCarouselInternId) return;
    adminCarouselIndex++;
    renderAdminInternIslands(adminCarouselInternId);
  });
}

// ================================
// Render states
// ================================
function renderAdminScreen() {
  screenAdmin.classList.remove("hidden");

  adminHello.textContent = `Diretor: ${currentUser.name} 👋`;
  adminPill.textContent = `Perfil: Diretor • Setor: ${sectorName(currentUser.sectorId)}`;

  renderAdmin();
}

// ================================
// Regras de desbloqueio
// ================================
function isDone(userId, courseId) {
  return Boolean(progress?.[userId]?.[courseId]);
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
// Render: ADMIN (lista + carrossel)
// ================================
function renderAdmin() {
  const sector = DB.sectors.find(s => s.id === currentUser.sectorId);
  if (!sector) return;

  const interns = DB.users.filter(u => u.role === "intern" && u.sectorId === currentUser.sectorId);

  adminUserList.innerHTML = "";
  interns.forEach(u => {
    const doneCount = sector.courses.length; // All courses completed
    const total = sector.courses.length;
    const pct = 100; // 100% completed

    const row = document.createElement("div");
    row.className = "user-row";
    row.innerHTML = `
      <div class="name">${u.name}</div>
      <div class="meta">ID: <b>${u.id}</b> • Setor: <b>${sector.name}</b></div>
      <div class="pct">Progresso no setor: ${doneCount}/${total} (${pct}%)</div>
      <div class="progressbar"><div style="width:${pct}%"></div></div>
    `;
    adminUserList.appendChild(row);
  });

  if (interns.length === 0) {
    adminUserList.innerHTML = `<div class="muted">Nenhum estagiário neste setor.</div>`;
    adminInternPicker.innerHTML = "";
    adminInternIslands.innerHTML = "";
    adminCarouselInternId = null;
    return;
  }

  adminInternPicker.innerHTML = interns.map(u =>
    `<option value="${u.id}">${u.name} (${u.id})</option>`
  ).join("");

  // padrão: primeiro estagiário + carrossel início
  adminInternPicker.value = interns[0].id;
  adminCarouselIndex = 0;
  renderAdminInternIslands(interns[0].id);
}

// ================================
// Render: carrossel (1 ilha por vez)
// ================================
function renderAdminInternIslands(internId) {
  const intern = DB.users.find(u => u.id === internId && u.role === "intern");
  if (!intern) {
    adminInternIslands.innerHTML = `<div class="muted">Selecione um estagiário.</div>`;
    adminCarouselInternId = null;
    return;
  }

  adminCarouselInternId = internId;

  const sectors = DB.sectors;

  if (adminCarouselIndex < 0) adminCarouselIndex = sectors.length - 1;
  if (adminCarouselIndex >= sectors.length) adminCarouselIndex = 0;

  const sector = sectors[adminCarouselIndex];

  const doneCount = sector.courses.length; // All courses completed
  const total = sector.courses.length;
  const pct = 100; // 100% completed

  adminInternIslands.innerHTML = `
    <div class="island" style="max-width:420px; width:100%;">
      <div class="island-head">
        <div>
          <div class="island-name">🏝️ ${sector.name}</div>
          <div class="island-mini">${intern.name}: ${doneCount}/${total} • ${pct}%</div>
        </div>
        <span class="badge">Somente leitura</span>
      </div>

      <div class="progressbar"><div style="width:${pct}%"></div></div>

      <div class="island-map" data-theme="${sector.theme || sector.id}">
        <img src="${sector.image}" class="island-img" alt="${sector.name} ilha" />
        <div class="island-tag">${sector.name} • ${adminCarouselIndex + 1}/${sectors.length}</div>

        ${sector.courses.map(course => {
          const unlocked = true; // Always show pins as completed
          const x = course.pos?.x ?? 50;
          const y = course.pos?.y ?? 45;
          return `
            <div class="pin ${unlocked ? "show" : ""}"
                 style="left:${x}%; top:${y}%;"
                 title="${course.title}">
              <img src="${course.image}" alt="${course.title}" style="width:40px; height:40px; border-radius:50%; object-fit:cover;" />
            </div>
          `;
        }).join("")}
      </div>
    </div>
  `;
}

init();