async function initCoursePage() {
  const params = new URLSearchParams(window.location.search);
  const sectorId = params.get("sectorId");
  const courseId = params.get("courseId");

  const detailEl = document.getElementById("courseDetail");

  if (!sectorId || !courseId) {
    detailEl.innerHTML = `<p>Parâmetros da página não encontrados.</p>`;
    return;
  }

  const DB = await fetch("data.json").then(r => r.json());

  const sector = DB.sectors.find(s => s.id === sectorId);
  if (!sector) {
    detailEl.innerHTML = `<p>Ilha não encontrada.</p>`;
    return;
  }

  const course = sector.courses.find(c => c.id === courseId);
  if (!course) {
    detailEl.innerHTML = `<p>Curso não encontrado.</p>`;
    return;
  }

  const supportCourses = sector.courses.filter(c => c.id !== courseId);
  const type = getCourseType(course);

  detailEl.innerHTML = `
    <div style="display:flex; gap:20px; flex-wrap:wrap; align-items:flex-start;">
      <img
        src="${course.image}"
        alt="${escapeHTML(course.title)}"
        style="width:110px; height:110px; border-radius:16px; object-fit:cover; border:1px solid rgba(0,0,0,.1);"
      />

      <div style="flex:1; min-width:280px;">
        <div class="muted" style="margin-bottom:8px;">Ilha: <b>${escapeHTML(sector.name)}</b></div>
        <h1 style="margin:0 0 10px 0;">${escapeHTML(course.title)}</h1>
        <div class="muted" style="margin-bottom:8px;">Código: <b>${escapeHTML(course.id)}</b></div>
        <div class="muted" style="margin-bottom:16px;">Tipo: <b>${type === "upload" ? "Upload" : "Quiz"}</b></div>

        ${course.description ? `<p>${escapeHTML(course.description)}</p>` : `<p class="muted">Sem descrição cadastrada.</p>`}
      </div>
    </div>

    <hr style="margin:24px 0; border:none; border-top:1px solid rgba(0,0,0,.1);">

    <section>
      <h3>Etapa atual</h3>
      ${renderCurrentCourse(course)}
    </section>

    <section style="margin-top:24px;">
      <h3>Material de apoio</h3>
      <p class="muted">Cursos relacionados da mesma ilha.</p>
      ${renderSupportCourses(sector, supportCourses)}
    </section>
  `;
}

function renderCurrentCourse(course) {
  const type = getCourseType(course);

  if (type === "upload") {
    return `
      <div class="panel">
        <p><b>Envio:</b> ${escapeHTML(course.uploadHint || "Envie o certificado para concluir esta etapa.")}</p>
        ${course.description ? `<p class="muted">${escapeHTML(course.description)}</p>` : ""}
      </div>
    `;
  }

  if (!course.quiz?.length) {
    return `<p class="muted">Nenhuma pergunta cadastrada.</p>`;
  }

  return `
    <div class="course-list">
      ${course.quiz.map((q, index) => `
        <div class="course">
          <div>
            <div class="course-title">${index + 1}. ${escapeHTML(q.question)}</div>
            <div class="muted" style="margin-top:8px;">
              ${q.options.map(option => `<div>• ${escapeHTML(option)}</div>`).join("")}
            </div>
          </div>
        </div>
      `).join("")}
    </div>
  `;
}

function renderSupportCourses(sector, courses) {
  if (!courses.length) {
    return `<p class="muted">Nenhum outro curso nesta ilha.</p>`;
  }

  return `
    <div class="course-list">
      ${courses.map(course => `
        <a
          href="curso.html?sectorId=${encodeURIComponent(sector.id)}&courseId=${encodeURIComponent(course.id)}"
          class="course"
          style="text-decoration:none; color:inherit;"
        >
          <div class="course-main">
            <div style="display:flex; align-items:flex-start; gap:10px;">
              <img
                src="${course.image}"
                alt="${escapeHTML(course.title)}"
                style="width:40px; height:40px; border-radius:50%; object-fit:cover;"
              />
              <div>
                <div class="course-title">${escapeHTML(course.title)}</div>
                <div class="muted" style="font-size:12px; margin-top:4px;">
                  Código: <b>${escapeHTML(course.id)}</b> • Tipo: <b>${getCourseType(course) === "upload" ? "Upload" : "Quiz"}</b>
                </div>
                ${course.description ? `<div class="muted" style="margin-top:6px;">${escapeHTML(course.description)}</div>` : ""}
              </div>
            </div>
          </div>
        </a>
      `).join("")}
    </div>
  `;
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

initCoursePage();