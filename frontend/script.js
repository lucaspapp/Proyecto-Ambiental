      const state = {
        user: null,
        users: [],
        adminUsersLoaded: false,
        classrooms: [],
        classroomMembers: {},
        selectedMembersClass: "",
        classroomsLoading: false,
        classroomsError: "",
        classroomsLoaded: false,
        measurements: [],
        measurementsLoading: false,
        measurementsError: "",
        measurementsLoaded: false,
      };
      const resolveApiBaseUrl = () => {
        if (window.ECOLAB_API_URL) return String(window.ECOLAB_API_URL).replace(/\/$/, "");
        const configuredUrl = localStorage.getItem("ecolab_api_url");
        if (configuredUrl) return configuredUrl.replace(/\/$/, "");
        const origin = window.location.origin;
        const isLocal = /localhost|127\.0\.0\.1/.test(window.location.host);
        if (isLocal) return "http://127.0.0.1:8003";

        const pathname = window.location.pathname.replace(/\/$/, "");
        if (pathname.endsWith("/api/public")) return `${origin}${pathname}`;
        return `${origin}/api/public`;
      };

      const API_CONFIG = {
        baseUrl: resolveApiBaseUrl(),
        timeoutMs: 5000,
      };
      const apiUrl = (path) =>
        `${API_CONFIG.baseUrl.replace(/\/$/, "")}/${path.replace(/^\//, "")}`;
      async function apiRequest(path, options = {}) {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), API_CONFIG.timeoutMs);
        const isFormData = options.body instanceof FormData;
        const headers = {
          Accept: "application/json",
          "X-Usuario-Local": state.user?.id || "",
          ...(options.body && !isFormData ? { "Content-Type": "application/json" } : {}),
          ...(options.headers || {}),
        };
        try {
          const response = await fetch(apiUrl(path), {
            ...options,
            headers,
            signal: controller.signal,
            credentials: "include",
          });
          const data = await response.json().catch(() => ({}));
          if (response.status === 401 && state.user && path !== "/auth/login") {
            state.user = null;
            resetAccountData();
            localStorage.removeItem("ecolab_user");
            location.hash = "login";
          }
          if (!response.ok) {
            const error = new Error(data.detail || `La API respondió ${response.status}.`);
            error.status = response.status;
            throw error;
          }
          return data;
        } finally {
          clearTimeout(timeout);
        }
      }
      const classroomFromApi = (classroom) => ({
        ...classroom,
        id: classroom.id ?? classroom.id_aula ?? classroom.id_proyecto,
        name: classroom.name ?? classroom.nombre ?? classroom.titulo ?? "Aula sin nombre",
        code: String(classroom.code ?? classroom.codigo ?? classroom.codigo_acceso ?? ""),
        memberCount: classroom.memberCount ?? classroom.cantidad_miembros ?? classroom.miembros_count ?? 0,
      });
      function resetAccountData() {
        state.users = [];
        state.adminUsersLoaded = false;
        state.classrooms = [];
        state.classroomMembers = {};
        state.selectedMembersClass = "";
        state.classroomsLoading = false;
        state.classroomsError = "";
        state.classroomsLoaded = false;
        state.measurements = [];
        state.measurementsLoading = false;
        state.measurementsError = "";
        state.measurementsLoaded = false;
      }
      const esc = (value) =>
        String(value ?? "").replace(
          /[&<>"']/g,
          (c) =>
            ({
              "&": "&amp;",
              "<": "&lt;",
              ">": "&gt;",
              '"': "&quot;",
              "'": "&#039;",
            })[c],
        );
      const go = (page) => {
        location.hash = page;
      };
      const initials = (name) =>
        (name || "Usuario")
          .split(/\s+/)
          .map((x) => x[0])
          .slice(0, 2)
          .join("")
          .toUpperCase();
      const roleName = (role) =>
        ({
          administrador: "Administrador",
          docente: "Profesor",
          estudiante: "Alumno",
          propietario: "Propietario",
          miembro: "Miembro",
          Miembro: "Miembro",
        })[role] || "Invitado";

      function toast(message, error = false) {
        const el = document.createElement("div");
        el.className = `fixed z-50 bottom-5 right-5 rounded-xl border px-4 py-3 text-sm shadow-2xl ${error ? "border-red-400/40 bg-red-950 text-red-200" : "border-leaf/40 bg-green-950 text-green-200"}`;
        el.textContent = message;
        document.body.append(el);
        setTimeout(() => el.remove(), 3500);
      }
      const icon = (name, cls = "h-5 w-5") =>
        `<svg class="${cls}" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">${{ home: "<path stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='m3 10 9-7 9 7v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V10Z'/>", chart: "<path stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M4 19V5m0 14h16M8 16v-4m4 4V8m4 8V4'/>", book: "<path stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M4 19.5A2.5 2.5 0 0 1 6.5 17H20M4 19.5V5a2 2 0 0 1 2-2h14v14H6.5A2.5 2.5 0 0 0 4 19.5Z'/>", sensor: "<path stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M12 3v18m-4-3h8M7 7h10M6 12h12'/>", users: "<path stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2m8-10a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm10 10v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75'/>", info: "<circle cx='12' cy='12' r='9' stroke-width='2'/><path stroke-linecap='round' stroke-width='2' d='M12 11v5m0-8h.01'/>", plus: "<path stroke-linecap='round' stroke-width='2' d='M12 5v14m-7-7h14'/>", logout: "<path stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M15 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10m4-5 3-3-3-3m3 3H9'/>" }[name] || ""}</svg>`;

      function navItem(page, label, ico) {
        return `<button data-nav="${page}" class="nav-item flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm text-slate-400 hover:bg-white/5 hover:text-white">${icon(ico)}<span>${label}</span></button>`;
      }

      function shell(content, active) {
        return `<div class="min-h-screen md:flex"><aside id="sidebar" class="fixed inset-y-0 z-40 w-72 -translate-x-full border-r border-white/10 bg-night p-5 transition-transform md:static md:translate-x-0">
        <div class="mb-9 flex items-center gap-3"><div class="grid h-11 w-11 place-items-center rounded-2xl bg-gradient-to-br from-cyan to-leaf text-xl font-bold text-night">E</div><div><div class="font-bold tracking-wide">Eco<span class="text-cyan">Lab</span></div><div class="text-xs text-slate-500">Aula ambiental</div></div></div>
        <div class="mb-3 px-3 text-[10px] font-semibold uppercase tracking-[.2em] text-slate-600">Plataforma</div>
        <nav class="space-y-1">${navItem("dashboard", "Dashboard", "home")}${navItem("clase", "Mi clase", "book")}${navItem("sensores", "Sensores", "sensor")}${state.user?.role === "administrador" ? navItem("admin", "Administración", "users") : ""}</nav>
        <div class="absolute bottom-5 left-5 right-5 border-t border-white/10 pt-4"><button data-nav="perfil" class="flex w-full items-center gap-3 text-left"><span class="grid h-9 w-9 place-items-center rounded-full bg-soil text-sm font-semibold text-night">${initials(state.user?.nombre)}</span><span class="min-w-0"><b class="block truncate text-sm">${esc(state.user?.nombre || "Usuario")}</b><small class="text-slate-500">${roleName(state.user?.role)}</small></span></button></div>
      </aside><div id="backdrop" class="fixed inset-0 z-30 hidden bg-black/60 md:hidden"></div><section class="min-w-0 flex-1">
        <header class="sticky top-0 z-20 flex h-20 items-center justify-between border-b border-white/10 bg-night/90 px-5 backdrop-blur md:px-10"><button id="menu" class="rounded-lg p-2 text-slate-400 hover:bg-white/5 md:hidden">${icon("home")}</button><div><p class="text-xs uppercase tracking-[.2em] text-slate-500">Espacio de aprendizaje</p><h1 class="font-semibold">${active}</h1></div><div class="flex items-center gap-3"><span class="hidden items-center gap-2 text-xs text-leaf sm:flex"><i class="pulse-dot h-2 w-2 rounded-full bg-leaf"></i>Sesión activa</span><button id="logout" title="Cerrar sesión" class="rounded-xl border border-white/10 p-2 text-slate-400 hover:text-white">${icon("logout")}</button></div></header><main class="page mx-auto max-w-7xl p-5 md:p-10">${content}</main><footer class="border-t border-white/10 px-5 py-8 md:px-10"><div class="mx-auto flex max-w-7xl flex-col justify-between gap-5 text-xs text-slate-500 md:flex-row"><div class="flex items-center gap-3"><span class="grid h-8 w-8 place-items-center rounded-lg bg-soil font-bold text-night">CO</span><span><b class="text-slate-300">Colegio Ambiental</b><br>Proyecto EcoLab</span></div><div class="flex flex-wrap items-center gap-5"><span>Ayuda</span><span>Preguntas frecuentes</span><span>Desarrolladores</span><span>◎ @colegioambiental</span></div></div></footer>
      </section></div>`;
      }

      function landing() {
        document.querySelector("#app").innerHTML = `
          <div class="min-h-screen overflow-hidden bg-night text-slate-100">
            <header class="relative z-10 mx-auto flex max-w-7xl items-center justify-between px-5 py-5 md:px-10">
              <a href="#inicio" class="flex items-center gap-3" aria-label="EcoLab, inicio">
                <span class="grid h-11 w-11 place-items-center rounded-2xl bg-gradient-to-br from-cyan to-leaf text-xl font-bold text-night">E</span>
                <span><b class="text-lg tracking-wide">Eco<span class="text-cyan">Lab</span></b><small class="block text-xs text-slate-500">Aula ambiental</small></span>
              </a>
              <nav class="hidden items-center gap-8 text-sm text-slate-400 md:flex" aria-label="Navegación principal">
                <button data-scroll="propuesta" class="transition hover:text-white">La propuesta</button>
                <button data-scroll="herramientas" class="transition hover:text-white">Herramientas</button>
                <button data-scroll="como-funciona" class="transition hover:text-white">Cómo funciona</button>
              </nav>
              <button data-entry class="rounded-xl border border-white/15 px-4 py-2.5 text-sm font-medium transition hover:border-cyan/60 hover:text-cyan">${state.user ? "Mi espacio" : "Ingresar"}</button>
            </header>

            <main>
              <section class="grid-bg relative mx-auto grid max-w-7xl items-center gap-12 px-5 pb-20 pt-12 md:px-10 md:pb-28 md:pt-20 lg:grid-cols-[1.05fr_.95fr]">
                <div class="relative z-10">
                  <div class="mb-6 inline-flex items-center gap-2 rounded-full border border-leaf/20 bg-leaf/5 px-3 py-1.5 text-xs font-medium text-leaf"><span class="pulse-dot h-2 w-2 rounded-full bg-leaf"></span>Exploración ambiental en comunidad</div>
                  <h1 class="max-w-3xl text-4xl font-semibold leading-[1.12] tracking-tight sm:text-5xl lg:text-6xl">El ambiente también se aprende <span class="text-cyan">midiéndolo.</span></h1>
                  <p class="mt-6 max-w-xl text-base leading-7 text-slate-400 md:text-lg">EcoLab conecta aulas, proyectos y sensores para que cada estudiante observe su entorno, descubra patrones y convierta datos en conocimiento.</p>
                  <div class="mt-9 flex flex-col gap-3 sm:flex-row">
                    <button data-entry class="group inline-flex items-center justify-center gap-3 rounded-xl bg-cyan px-6 py-3.5 font-semibold text-night transition hover:bg-white">${state.user ? "Ir a mi espacio" : "Comenzar a explorar"}<span aria-hidden="true" class="transition group-hover:translate-x-1">→</span></button>
                    <button data-scroll="propuesta" class="rounded-xl border border-white/10 px-6 py-3.5 font-medium text-slate-300 transition hover:border-white/25 hover:text-white">Conocé la propuesta</button>
                  </div>
                  <div class="mt-10 flex flex-wrap items-center gap-x-7 gap-y-3 text-xs text-slate-500"><span class="flex items-center gap-2"><span class="text-leaf">✓</span>Aprendizaje práctico</span><span class="flex items-center gap-2"><span class="text-leaf">✓</span>Datos del entorno</span><span class="flex items-center gap-2"><span class="text-leaf">✓</span>Trabajo colaborativo</span></div>
                </div>

                <div class="relative mx-auto w-full max-w-xl py-8" aria-label="Ilustración de monitoreo ambiental">
                  <div class="absolute left-1/2 top-1/2 h-72 w-72 -translate-x-1/2 -translate-y-1/2 rounded-full bg-cyan/10 blur-3xl md:h-96 md:w-96"></div>
                  <div class="grid-bg relative rounded-[2rem] border border-white/10 bg-[#13252c]/80 p-4 shadow-2xl shadow-black/30 backdrop-blur md:p-6">
                    <div class="flex items-center justify-between border-b border-white/10 pb-4"><div><p class="text-xs text-slate-500">ESTACIÓN AMBIENTAL</p><p class="mt-1 font-medium">Patio escolar <span class="ml-1 inline-block h-2 w-2 rounded-full bg-leaf"></span></p></div><span class="rounded-lg border border-white/10 px-3 py-1.5 text-xs text-slate-400">Últimas 24 h</span></div>
                    <div class="relative mt-5 flex h-52 items-end gap-2 overflow-hidden rounded-xl border border-white/5 bg-night/60 p-4 sm:h-60">
                      <div class="absolute inset-x-0 top-1/4 border-t border-dashed border-white/10"></div><div class="absolute inset-x-0 top-2/4 border-t border-dashed border-white/10"></div><div class="absolute inset-x-0 top-3/4 border-t border-dashed border-white/10"></div>
                      <svg class="absolute inset-0 h-full w-full" viewBox="0 0 500 220" preserveAspectRatio="none" aria-hidden="true"><defs><linearGradient id="chartFill" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stop-color="#69d4e5" stop-opacity=".25"/><stop offset="100%" stop-color="#69d4e5" stop-opacity="0"/></linearGradient></defs><path d="M0 148 C35 140 42 110 76 121 S120 159 154 126 S202 100 232 117 S273 146 308 104 S351 87 382 101 S427 123 455 76 S481 68 500 54 V220 H0Z" fill="url(#chartFill)"/><path d="M0 148 C35 140 42 110 76 121 S120 159 154 126 S202 100 232 117 S273 146 308 104 S351 87 382 101 S427 123 455 76 S481 68 500 54" fill="none" stroke="#69d4e5" stroke-width="3" vector-effect="non-scaling-stroke"/></svg>
                      <span class="absolute bottom-3 left-4 text-[10px] text-slate-600">08:00</span><span class="absolute bottom-3 right-4 text-[10px] text-slate-600">Ahora</span>
                    </div>
                    <div class="mt-4 grid grid-cols-3 gap-3"><div class="rounded-xl border border-white/5 bg-white/[.03] p-3"><p class="text-[10px] text-slate-500">TEMPERATURA</p><p class="mt-1 text-lg font-semibold">24.8°<span class="ml-1 text-xs font-normal text-slate-500">C</span></p></div><div class="rounded-xl border border-white/5 bg-white/[.03] p-3"><p class="text-[10px] text-slate-500">HUMEDAD</p><p class="mt-1 text-lg font-semibold">61<span class="ml-1 text-xs font-normal text-slate-500">%</span></p></div><div class="rounded-xl border border-white/5 bg-white/[.03] p-3"><p class="text-[10px] text-slate-500">ESTADO</p><p class="mt-2 flex items-center gap-1.5 text-xs font-medium text-leaf"><span class="h-1.5 w-1.5 rounded-full bg-leaf"></span>En línea</p></div></div>
                  </div>
                  <div class="float absolute -left-3 top-14 rounded-2xl border border-white/10 bg-panel/95 p-3 shadow-xl sm:-left-8"><span class="grid h-9 w-9 place-items-center rounded-xl bg-leaf/10 text-lg text-leaf">⌁</span><p class="mt-2 text-[10px] text-slate-500">MEDICIONES</p><p class="text-sm font-semibold">En tiempo real</p></div>
                  <div class="float absolute -bottom-2 right-0 rounded-2xl border border-white/10 bg-panel/95 p-3 shadow-xl sm:-right-5"><span class="text-xs text-cyan">AULA COLABORATIVA</span><p class="mt-1 text-sm font-semibold">Aprender en equipo</p></div>
                </div>
              </section>

              <section id="propuesta" class="border-y border-white/5 bg-[#121f26] px-5 py-16 md:px-10 md:py-20">
                <div class="mx-auto grid max-w-7xl gap-10 md:grid-cols-[.8fr_1.2fr] md:items-end"><div><p class="text-xs font-semibold uppercase tracking-[.24em] text-cyan">Una experiencia con propósito</p><h2 class="mt-4 text-3xl font-semibold leading-tight md:text-4xl">Del aula al entorno, y del dato a la acción.</h2></div><p class="max-w-2xl text-sm leading-7 text-slate-400 md:text-base">EcoLab es un espacio educativo para investigar el ambiente cercano. Docentes y estudiantes pueden organizar aulas, registrar mediciones y conversar sobre lo que los datos revelan de su comunidad.</p></div>
              </section>

              <section id="herramientas" class="mx-auto max-w-7xl px-5 py-16 md:px-10 md:py-24">
                <div class="max-w-2xl"><p class="text-xs font-semibold uppercase tracking-[.24em] text-leaf">Todo conectado</p><h2 class="mt-4 text-3xl font-semibold md:text-4xl">Una plataforma para explorar, colaborar y comprender.</h2><p class="mt-4 leading-7 text-slate-400">Herramientas sencillas para llevar la curiosidad científica a cada proyecto.</p></div>
                <div class="mt-10 grid gap-4 md:grid-cols-3">
                  <article class="glass rounded-2xl p-6"><span class="grid h-12 w-12 place-items-center rounded-2xl bg-cyan/10 text-cyan"><svg class="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><path d="M4 19V5m0 14h16M8 16v-4m4 4V8m4 8V4" stroke-linecap="round"/></svg></span><h3 class="mt-6 text-lg font-semibold">Observá los datos</h3><p class="mt-2 text-sm leading-6 text-slate-400">Visualizá mediciones ambientales y seguí cómo cambia el entorno a lo largo del tiempo.</p></article>
                  <article class="glass rounded-2xl p-6"><span class="grid h-12 w-12 place-items-center rounded-2xl bg-leaf/10 text-leaf"><svg class="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><path d="M12 21s8-4 8-11V5l-8-3-8 3v5c0 7 8 11 8 11Z"/><path d="m9 12 2 2 4-4" stroke-linecap="round" stroke-linejoin="round"/></svg></span><h3 class="mt-6 text-lg font-semibold">Organizá tu aula</h3><p class="mt-2 text-sm leading-6 text-slate-400">Creá espacios de trabajo, compartí un código de acceso y reuní a tu comunidad.</p></article>
                  <article class="glass rounded-2xl p-6"><span class="grid h-12 w-12 place-items-center rounded-2xl bg-soil/10 text-soil"><svg class="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><path d="M12 3v18m-4-3h8M7 7h10M6 12h12" stroke-linecap="round"/></svg></span><h3 class="mt-6 text-lg font-semibold">Conectá sensores</h3><p class="mt-2 text-sm leading-6 text-slate-400">Integrá dispositivos a tus proyectos y convertí observaciones en experiencias prácticas.</p></article>
                </div>
              </section>

              <section id="como-funciona" class="grid-bg border-y border-white/5 bg-[#121f26] px-5 py-16 md:px-10 md:py-20"><div class="mx-auto max-w-7xl"><div class="text-center"><p class="text-xs font-semibold uppercase tracking-[.24em] text-cyan">Empezá en tres pasos</p><h2 class="mt-4 text-3xl font-semibold md:text-4xl">La curiosidad es el punto de partida.</h2></div><div class="mt-12 grid gap-8 md:grid-cols-3"><div class="flex gap-4"><span class="text-3xl font-semibold text-cyan/70">01</span><div><h3 class="font-semibold">Ingresá a tu espacio</h3><p class="mt-2 text-sm leading-6 text-slate-400">Accedé con tu cuenta o registrate para participar de las actividades.</p></div></div><div class="flex gap-4"><span class="text-3xl font-semibold text-cyan/70">02</span><div><h3 class="font-semibold">Sumate a un proyecto</h3><p class="mt-2 text-sm leading-6 text-slate-400">Creá un aula o uní el grupo con el código que te compartió tu docente.</p></div></div><div class="flex gap-4"><span class="text-3xl font-semibold text-cyan/70">03</span><div><h3 class="font-semibold">Explorá lo que te rodea</h3><p class="mt-2 text-sm leading-6 text-slate-400">Registrá mediciones, compará resultados y compartí tus descubrimientos.</p></div></div></div></div></section>

              <section class="mx-auto max-w-7xl px-5 py-16 md:px-10 md:py-24"><div class="relative overflow-hidden rounded-3xl border border-cyan/20 bg-gradient-to-br from-[#173640] via-[#172b32] to-panel px-6 py-10 md:px-12 md:py-14"><div class="absolute -right-20 -top-32 h-72 w-72 rounded-full bg-cyan/10 blur-3xl"></div><div class="relative flex flex-col justify-between gap-7 md:flex-row md:items-center"><div><p class="text-sm font-medium text-leaf">El próximo descubrimiento puede empezar hoy</p><h2 class="mt-3 max-w-2xl text-3xl font-semibold md:text-4xl">Mirá tu entorno con otros ojos.</h2><p class="mt-3 max-w-xl text-sm leading-6 text-slate-400">Sumate a EcoLab y transformá preguntas ambientales en proyectos compartidos.</p></div><button data-entry class="shrink-0 rounded-xl bg-cyan px-6 py-3.5 font-semibold text-night transition hover:bg-white">${state.user ? "Ir a mi espacio" : "Ingresar a EcoLab"} <span aria-hidden="true">→</span></button></div></div></section>
            </main>

            <footer class="border-t border-white/10 px-5 py-7 md:px-10"><div class="mx-auto flex max-w-7xl flex-col justify-between gap-4 text-xs text-slate-500 sm:flex-row sm:items-center"><span>© ${new Date().getFullYear()} EcoLab · Proyecto Ambiental</span><span>Aprender haciendo, cuidar comprendiendo.</span></div></footer>
          </div>`;

        const illustration = document.querySelector('[aria-label="Ilustración de monitoreo ambiental"]');
        if (illustration) {
          const notice = document.createElement("p");
          notice.className = "mb-3 text-center text-xs text-slate-400";
          notice.textContent = "Ejemplo visual: las cifras no son mediciones reales.";
          illustration.prepend(notice);
        }
        document.querySelectorAll("[data-entry]").forEach((button) => {
          button.addEventListener("click", () => go(state.user ? "dashboard" : "login"));
        });
        document.querySelectorAll("[data-scroll]").forEach((button) => {
          button.addEventListener("click", () => {
            document.getElementById(button.dataset.scroll)?.scrollIntoView({ behavior: "smooth" });
          });
        });
      }

      function login() {
        document.querySelector("#app").innerHTML =
          `<div class="grid min-h-screen lg:grid-cols-2"><div class="grid-bg relative hidden overflow-hidden bg-gradient-to-br from-[#102f37] via-night to-night p-12 lg:flex lg:flex-col lg:justify-between"><div class="flex items-center gap-3"><div class="grid h-12 w-12 place-items-center rounded-2xl bg-cyan text-xl font-bold text-night">E</div><b class="text-xl">Eco<span class="text-cyan">Lab</span></b></div><div class="relative"><div class="absolute -left-24 -top-24 h-72 w-72 rounded-full bg-cyan/10 blur-3xl"></div><p class="mb-4 text-sm uppercase tracking-[.25em] text-cyan">Aprender haciendo</p><h1 class="max-w-xl text-5xl font-bold leading-tight">Medí, entendé y transformá tu entorno.</h1><p class="mt-6 max-w-lg text-slate-400">Una plataforma para que profesores y alumnos exploren datos ambientales en tiempo real.</p></div><p class="text-xs text-slate-600">Proyecto Ambiental · Plataforma educativa</p></div><div class="flex items-center justify-center p-6"><div class="w-full max-w-md"><div class="mb-10 lg:hidden"><b class="text-xl">Eco<span class="text-cyan">Lab</span></b></div><p class="mb-2 text-sm text-cyan">Bienvenido de nuevo</p><h2 class="text-3xl font-bold">Entrá a tu aula</h2><p class="mt-2 text-sm text-slate-400">Usá tus datos para continuar con tu proyecto.</p>          <form id="login-form" class="mt-8 space-y-5"><label class="block text-sm text-slate-300">Correo electrónico<input name="id" type="email" required placeholder="nombre@colegio.edu" class="mt-2 w-full rounded-xl border border-white/10 bg-panel px-4 py-3 outline-none focus:border-cyan"></label><label class="block text-sm text-slate-300">Contraseña<input name="password" type="password" required minlength="8" placeholder="••••••••" class="mt-2 w-full rounded-xl border border-white/10 bg-panel px-4 py-3 outline-none focus:border-cyan"></label><button class="w-full rounded-xl bg-cyan px-4 py-3 font-semibold text-night transition hover:bg-white">Ingresar al aula</button><p id="login-msg" class="min-h-5 text-center text-sm text-red-300"></p></form><div class="mt-8 border-t border-white/10 pt-6 text-center text-sm text-slate-400">¿Primera vez? <button id="register-link" class="text-cyan hover:underline">Crear una cuenta</button></div><p class="mt-8 text-center text-xs text-slate-600">La cuenta debe existir en la API y tener una contraseña válida.</p></div></div></div>`;
        document.querySelector("#login-form").insertAdjacentHTML("beforebegin", '<button id="back-to-home" type="button" class="mb-5 text-sm text-slate-400 transition hover:text-cyan">← Volver a la presentación</button>');
        document.querySelector("#back-to-home").onclick = () => go("inicio");
          document.querySelector("#login-form").onsubmit = async (e) => {
          e.preventDefault();
          const f = new FormData(e.target);
            const msg = document.querySelector("#login-msg");
            msg.textContent = "Verificando...";
            try {
              const data = await apiRequest("/auth/login", {
                method: "POST",
                body: JSON.stringify({
                  usuario: String(f.get("id")).trim().toLowerCase(),
                  contrasenia: String(f.get("password")),
                }),
              });
              resetAccountData();
              state.user = data.usuario;
              go("dashboard");
            } catch (error) {
              msg.textContent = error.name === "AbortError"
                ? "La API tardó demasiado en responder."
                : error.message === "Failed to fetch"
                  ? "No se pudo conectar con la API. Verificá que esté iniciada."
                  : error.message;
            }
          };
        document.querySelector("#register-link").onclick = () => register();
      }

      function register() {
        document.querySelector("#app").innerHTML = `
          <div class="grid min-h-screen place-items-center p-6">
            <div class="w-full max-w-lg">
              <button id="back-to-login" type="button" class="mb-8 text-sm text-cyan">← Volver al ingreso</button>
              <div class="glass rounded-3xl p-7 md:p-10">
                <p class="text-sm text-cyan">Nueva cuenta</p>
                <h1 class="mt-2 text-3xl font-bold">Creá tu perfil</h1>
                <p class="mt-2 text-sm text-slate-400">Registrate para participar de las clases ambientales.</p>
                <form id="register-form" class="mt-7 grid gap-4 sm:grid-cols-2">
                  <label class="text-sm text-slate-300">Nombre<input name="nombre" required maxlength="100" class="mt-2 w-full rounded-xl border border-white/10 bg-night px-3 py-3"></label>
                  <label class="text-sm text-slate-300">Apellido<input name="apellido" required maxlength="100" class="mt-2 w-full rounded-xl border border-white/10 bg-night px-3 py-3"></label>
                  <label class="text-sm text-slate-300 sm:col-span-2">Correo electrónico<input name="id" type="email" maxlength="100" required autocomplete="email" class="mt-2 w-full rounded-xl border border-white/10 bg-night px-3 py-3"></label>
                  <div class="text-sm text-slate-300">Rol<span class="mt-2 block rounded-xl border border-white/10 bg-night px-3 py-3 text-slate-400">Alumno</span><input name="rol" type="hidden" value="estudiante"></div>
                  <label class="text-sm text-slate-300">Contraseña<input name="contrasenia" type="password" minlength="12" maxlength="128" autocomplete="new-password" required class="mt-2 w-full rounded-xl border border-white/10 bg-night px-3 py-3"><small class="mt-1 block text-slate-500">Usá al menos 12 caracteres.</small></label>
                  <button class="rounded-xl bg-cyan px-4 py-3 font-semibold text-night sm:col-span-2">Crear cuenta</button>
                  <p id="register-msg" class="sm:col-span-2 text-sm"></p>
                </form>
              </div>
            </div>
          </div>`;
        document.querySelector("#back-to-login").onclick = login;
        document.querySelector("#register-form").onsubmit = async (e) => {
          e.preventDefault();
          const f = new FormData(e.target);
          const msg = document.querySelector("#register-msg");
          const id = String(f.get("id")).trim().toLowerCase();
          f.set("id", id);
          try {
            await apiRequest("/crearuser", {
              method: "POST",
              body: f,
            });
            toast("Cuenta creada. Ya podés ingresar.");
            login();
          } catch (error) {
            msg.textContent = error.message === "Failed to fetch"
              ? "No se pudo conectar con la API. Verificá que esté iniciada."
              : error.message;
            msg.className = "text-sm text-red-300 sm:col-span-2";
          }
        };
      }

      function dashboard() {
        const classroomCards = state.classrooms.map((classroom) =>
          `<article class="rounded-xl border border-white/10 p-4"><h4 class="font-medium">${esc(classroom.name)}</h4><p class="mt-1 text-xs text-slate-400">${Number(classroom.memberCount)} integrantes</p></article>`,
        ).join("");
        const classroomsContent = state.classroomsLoading
          ? `<p class="text-sm text-slate-400">Cargando tus aulas…</p>`
          : state.classroomsError
            ? `<p class="text-sm text-red-300">No se pudieron cargar las aulas: ${esc(state.classroomsError)}</p>`
            : classroomCards || `<p class="text-sm text-slate-400">Todavía no estás en ninguna aula. Podés crear una o unirte con un código.</p>`;
        const measurementsContent = state.measurementsLoading
          ? `<p class="text-sm text-slate-400">Cargando mediciones…</p>`
          : state.measurementsError
            ? `<p class="text-sm text-red-300">No se pudieron cargar las mediciones: ${esc(state.measurementsError)}</p>`
            : state.measurements.length
              ? `<div class="space-y-3">${state.measurements.slice(0, 5).map((measurement) =>
                  `<div class="flex items-center justify-between gap-3 rounded-xl border border-white/10 p-3"><div><p class="font-medium">${esc(measurement.sensor || "Sensor")}</p><p class="text-xs text-slate-500">${esc(measurement.proyecto || "Proyecto")} · ${esc(measurement.tiempo)}</p></div><b>${esc(measurement.valor)}</b></div>`,
                ).join("")}</div>`
              : `<p class="text-sm text-slate-400">Todavía no hay mediciones registradas en tus proyectos.</p>`;
        const measurementCount = state.measurementsLoaded ? state.measurements.length : "—";
        const content = `<div class="mb-8 flex flex-wrap items-end justify-between gap-4"><div><p class="text-sm text-slate-400">Buen día, ${esc(state.user?.nombre || "explorador")} 👋</p><h2 class="mt-1 text-3xl font-bold">Tu espacio ambiental</h2></div><button data-nav="clase" class="rounded-xl bg-cyan px-5 py-3 text-sm font-semibold text-night hover:bg-white">${icon("plus", "h-4 w-4 inline")} Crear o unirme a una clase</button></div><div class="grid gap-5 sm:grid-cols-2"><div>${stat(state.classroomsLoaded ? state.classrooms.length : "—", "Mis aulas", state.classroomsError ? "No disponibles" : "Datos sincronizados con la API", "cyan")}</div><div>${stat(measurementCount, "Mediciones recientes", "Registros reales de tus proyectos", "leaf")}</div></div><div class="mt-5 grid gap-5 lg:grid-cols-2"><section class="glass rounded-2xl p-6"><div class="mb-5 flex items-center justify-between"><h3 class="font-semibold">Mis aulas</h3><button data-nav="clase" class="text-xs text-cyan">Ver aulas</button></div><div class="space-y-3">${classroomsContent}</div></section><section class="glass rounded-2xl p-6"><div class="mb-5 flex items-center justify-between"><h3 class="font-semibold">Mediciones recientes</h3><button id="refresh-measurements" class="text-xs text-cyan">Actualizar</button></div>${measurementsContent}</section></div><section class="glass mt-5 rounded-2xl p-6"><h3 class="font-semibold">Recursos para aprender</h3><div class="mt-5 grid gap-4 md:grid-cols-3">${resource("01", "¿Qué es un ecosistema?", "Conceptos base para comenzar", "cyan")}${resource("02", "Leer una gráfica", "Interpretá tendencias y cambios", "leaf")}${resource("03", "Tu primera medición", "Guía rápida del sensor", "soil")}</div></section>`;
        mount(shell(content, "Dashboard"), "dashboard");
        document.querySelector("#refresh-measurements")?.addEventListener("click", cargarMediciones);
        if (!state.classroomsLoading && !state.classroomsLoaded) cargarAulas();
        if (!state.measurementsLoading && !state.measurementsLoaded) cargarMediciones();
      }

      function stat(value, title, note, color) {
        return `<div class="glass rounded-2xl p-5"><div class="mb-5 flex items-start justify-between"><span class="text-3xl font-bold">${value}</span><span class="rounded-lg bg-${color}/10 p-2 text-${color}">${icon("chart")}</span></div><p class="text-sm text-slate-300">${title}</p><p class="mt-1 text-xs text-${color}">${note}</p></div>`;
      }

      function resource(num, title, text, color) {
        return `<div class="group rounded-xl border border-white/10 bg-white/[.02] p-4"><span class="text-xs text-${color}">${num}</span><h4 class="mt-7 font-medium">${title}</h4><p class="mt-1 text-xs text-slate-500">${text}</p></div>`;
      }

      function proyecto() {
        const content = `<div class="mb-10 max-w-3xl"><p class="text-sm text-soil">Guía para tu clase</p><h2 class="mt-1 text-3xl font-bold">Conocé el proyecto</h2><p class="mt-4 text-slate-400">EcoLab convierte el patio, el laboratorio y la comunidad en un espacio de investigación. Usá estos recursos para explicar qué medimos, por qué importa y cómo leer los datos.</p></div><div class="grid gap-5 md:grid-cols-3">${resource("01", "Observar", "Todo proyecto comienza con una pregunta sobre nuestro entorno.", "cyan")}${resource("02", "Medir", "Los sensores convierten fenómenos en datos que podemos comparar.", "leaf")}${resource("03", "Actuar", "Interpretar evidencia nos ayuda a tomar mejores decisiones.", "soil")}</div><div class="glass mt-5 overflow-hidden rounded-2xl"><div class="grid md:grid-cols-2"><div class="grid min-h-64 place-items-center bg-gradient-to-br from-cyan/20 to-leaf/10 p-8 text-7xl">🌱</div><div class="p-8"><span class="text-xs uppercase tracking-widest text-cyan">Material para docentes</span><h3 class="mt-3 text-2xl font-semibold">De la pregunta a la evidencia</h3><p class="mt-4 text-sm leading-7 text-slate-400">Invitá a tus alumnos a formular hipótesis, observar los módulos en tiempo real y defender sus conclusiones con gráficas. Cada medición es una oportunidad para aprender.</p><button class="mt-6 rounded-xl border border-white/10 px-4 py-3 text-sm hover:border-cyan">Descargar guía de clase ↗</button></div></div></div><div class="mt-8 grid gap-5 md:grid-cols-2">${["¿Qué mide cada sensor?", "¿Cómo se construyó EcoLab?"].map((x, i) => `<details class="glass rounded-2xl p-5"><summary class="cursor-pointer font-semibold">${x}</summary><p class="mt-4 text-sm leading-6 text-slate-400">${i ? "El proyecto nació como una herramienta colaborativa: diseñamos la base de datos, conectamos la API y construimos una interfaz para que los datos sean comprensibles para todos." : "Los módulos pueden registrar temperatura, humedad y calidad del aire. El profesor decide qué variables observar y el intervalo de cada muestra."}</p></details>`).join("")}</div>`;
        mount(shell(content, "Sobre el proyecto"), "proyecto");
      }

      function admin() {
        const users = state.users;
        const content = `<div class="mb-8"><p class="text-sm text-soil">Gestión del espacio</p><h2 class="mt-1 text-3xl font-bold">Administración</h2><p class="mt-2 text-sm text-slate-400">Gestioná las cuentas de EcoLab.</p></div><div class="glass rounded-2xl p-6"><div class="flex flex-wrap items-center justify-between gap-3"><div><h3 class="font-semibold">Usuarios registrados</h3><p class="text-xs text-slate-500">${users.length} cuentas visibles</p></div></div><div class="mt-5 overflow-x-auto"><table class="w-full text-left text-sm"><thead class="border-b border-white/10 text-xs uppercase text-slate-500"><tr><th class="p-3">Usuario</th><th class="p-3">Institución</th><th class="p-3">Rol</th></tr></thead><tbody>${users.map((u) => `<tr class="border-b border-white/5"><td class="p-3"><b>${esc(u.Nombre)} ${esc(u.Apellido)}</b><small class="block text-xs text-slate-500">${esc(u.id_usuario)}</small></td><td class="p-3 text-slate-400">${esc(u.Institucion || "—")}</td><td class="p-3"><span class="rounded-full bg-cyan/10 px-2 py-1 text-xs text-cyan">${roleName(u.Rol)}</span></td></tr>`).join("") || `<tr><td colspan="3" class="p-8 text-center text-slate-500">Todavía no hay registros.</td></tr>`}</tbody></table></div></div>`;
        mount(shell(content, "Administración"), "admin");
        if (!state.adminUsersLoaded) {
          state.adminUsersLoaded = true;
          apiRequest("/veruser").then((data) => {
            state.users = Array.isArray(data.usuarios) ? data.usuarios : [];
            admin();
          }).catch((error) => toast(`No se pudieron cargar los usuarios: ${error.message}`, true));
        }
      }

      function perfil() {
        const content = `<div class="glass max-w-2xl rounded-2xl p-7"><p class="text-sm text-cyan">Mi cuenta</p><h2 class="mt-1 text-3xl font-bold">${esc(state.user?.nombre)} ${esc(state.user?.apellido)}</h2><p class="mt-2 text-slate-400">${esc(state.user?.id)}</p><div class="mt-8 grid gap-4 sm:grid-cols-2"><div class="rounded-xl bg-white/[.03] p-4"><small class="text-slate-500">Rol</small><p class="mt-1">${roleName(state.user?.role)}</p></div><div class="rounded-xl bg-white/[.03] p-4"><small class="text-slate-500">Institución</small><p class="mt-1">${esc(state.user?.institucion || "Sin institución")}</p></div></div></div>`;
        mount(shell(content, "Mi perfil"), "perfil");
      }

      function clase() {
        const canManage =
          state.user?.role === "docente" ||
          state.user?.role === "administrador";
        const cards = state.classrooms
          .map((classroom) => {
            return `<article class="glass rounded-2xl p-6"><span class="text-xs text-cyan">${esc(classroom.code || "Sin código")}</span><h3 class="mt-3 text-xl font-semibold">${esc(classroom.name)}</h3><p class="mt-2 text-sm text-slate-400">${esc(classroom.descripcion || "Sin descripción.")}</p><p class="mt-4 text-xs text-slate-500">${Number(classroom.memberCount)} integrantes</p><button data-members-class="${classroom.id}" class="mt-5 w-full rounded-xl border border-white/10 py-2 text-xs text-slate-400">Ver miembros</button></article>`;
          })
          .join("");
        const status = state.classroomsLoading
          ? `<p class="mt-3 text-xs text-cyan">Sincronizando aulas con la API...</p>`
          : state.classroomsError
            ? `<p class="mt-3 rounded-xl border border-soil/40 bg-soil/10 p-3 text-xs text-soil">No se pudieron cargar las aulas: ${esc(state.classroomsError)}</p>`
            : `<p class="mt-3 text-xs text-leaf">Aulas sincronizadas con la API.</p>`;
        const selectedMembers = state.classroomMembers[state.selectedMembersClass] || [];
        const membersPanel = state.selectedMembersClass
          ? `<div class="glass mt-5 rounded-2xl p-6"><h3 class="font-semibold">Miembros del aula</h3><div class="mt-4 grid gap-2 sm:grid-cols-2">${selectedMembers.map((member) => `<div class="rounded-xl bg-white/[.03] p-3 text-sm">${esc([member.Nombre, member.Apellido].filter(Boolean).join(" ") || member.nombre || member.name || member.id_usuario || "Usuario")}<span class="mt-1 block text-xs text-slate-500">${esc(roleName(member.Rol || member.rol_aula || member.rol || member.role || "Miembro"))}</span></div>`).join("") || `<p class="text-sm text-slate-500">Todavía no hay miembros.</p>`}</div></div>`
          : "";
        const emptyState = state.classroomsLoading || state.classroomsError || state.classrooms.length > 0
          ? ""
          : `<div class="glass rounded-2xl p-8 text-sm text-slate-400 md:col-span-2 xl:col-span-3">Todavía no pertenecés a ninguna aula. Podés crear una o unirte con un código.</div>`;
        const content = `<div class="mb-8 flex flex-wrap items-end justify-between gap-4"><div><p class="text-sm text-cyan">Aula colaborativa</p><h2 class="mt-1 text-3xl font-bold">Mis aulas</h2><p class="mt-2 text-sm text-slate-400">Aulas y miembros cargados desde la API.</p>${status}</div>${canManage ? `<button id="new-class" class="rounded-xl bg-cyan px-5 py-3 text-sm font-semibold text-night">+ Crear aula</button>` : ""}</div><div class="grid gap-5 md:grid-cols-2 xl:grid-cols-3">${cards}${emptyState}</div><div class="mt-5 flex flex-wrap gap-3"><button id="join-class" class="rounded-xl border border-cyan/30 px-4 py-2 text-sm text-cyan">+ Unirme con un código</button><button id="reload-classrooms" class="rounded-xl border border-white/10 px-4 py-2 text-sm text-slate-400">Actualizar</button></div>${membersPanel}`;
        mount(shell(content, "Mi clase"), "clase");
        document.querySelector("#new-class")?.addEventListener("click", async () => {
          const name = prompt("Nombre del aula");
          if (!name?.trim()) return;
          state.classroomsLoading = true;
          state.classroomsError = "";
          clase();
          try {
            const created = await apiRequest("/aulas", {
              method: "POST",
              body: JSON.stringify({
                nombre: name.trim(),
                descripcion: "",
              }),
            });
            toast(`Aula creada: ${created.codigo || name.trim()}`);
            state.classroomsLoaded = false;
            await cargarAulas();
          } catch (error) {
            state.classroomsError = error.name === "AbortError" ? "tiempo de espera agotado" : error.message;
            toast(`No se pudo crear el aula: ${error.message}`, true);
            state.classroomsLoading = false;
            clase();
          }
        });
        document.querySelector("#join-class")?.addEventListener("click", async () => {
          const code = prompt("Ingresá el código del aula");
          if (!code?.trim()) return;
          const normalizedCode = code.trim().toUpperCase();
          state.classroomsLoading = true;
          state.classroomsError = "";
          clase();
          try {
            const joined = await apiRequest("/aulas/unirse", {
              method: "POST",
              body: JSON.stringify({
                codigo: normalizedCode,
              }),
            });
            toast(`Te uniste a ${joined.nombre}`);
            state.classroomsLoaded = false;
            await cargarAulas();
          } catch (error) {
            state.classroomsError = error.name === "AbortError" ? "tiempo de espera agotado" : error.message;
            toast(`No se pudo unir al aula: ${error.message}`, true);
            state.classroomsLoading = false;
            clase();
          }
        });
        document.querySelector("#reload-classrooms")?.addEventListener("click", cargarAulas);
        document.querySelectorAll("[data-members-class]").forEach((button) => {
          button.onclick = () => cargarMiembros(button.dataset.membersClass);
        });
        if (!state.classroomsLoading && !state.classroomsLoaded) cargarAulas();
      }

      async function cargarAulas() {
        state.classroomsLoading = true;
        state.classroomsLoaded = false;
        state.classroomsError = "";
        render();
        try {
          const data = await apiRequest("/aulas");
          const aulas = data.aulas || data.classrooms || data;
          if (!Array.isArray(aulas)) throw new Error("Formato de aulas no válido.");
          state.classrooms = aulas.map(classroomFromApi);
        } catch (error) {
          state.classroomsError = error.name === "AbortError" ? "tiempo de espera agotado" : error.message;
        } finally {
          state.classroomsLoading = false;
          state.classroomsLoaded = true;
          render();
        }
      }

      async function cargarMediciones() {
        state.measurementsLoading = true;
        state.measurementsError = "";
        render();
        try {
          const data = await apiRequest("/sensores/actual");
          const measurements = data.mediciones || [];
          if (!Array.isArray(measurements)) throw new Error("Formato de mediciones no válido.");
          state.measurements = measurements;
        } catch (error) {
          state.measurementsError = error.name === "AbortError" ? "tiempo de espera agotado" : error.message;
        } finally {
          state.measurementsLoading = false;
          state.measurementsLoaded = true;
          render();
        }
      }

      async function cargarMiembros(classId) {
        try {
          const data = await apiRequest(`/aulas/${encodeURIComponent(classId)}/miembros`);
          const members = data.miembros || data.members || data;
          if (!Array.isArray(members)) throw new Error("Formato de miembros no válido.");
          state.classroomMembers[classId] = members;
          state.selectedMembersClass = classId;
          const names = state.classroomMembers[classId].map((member) =>
            [member.Nombre, member.Apellido].filter(Boolean).join(" ")
              || member.nombre
              || member.name
              || member.id_usuario
              || "Usuario",
          );
          toast(names.length ? `Miembros: ${names.join(", ")}` : "El aula todavía no tiene miembros.");
          clase();
        } catch (error) {
          toast(`No se pudieron cargar los miembros: ${error.message}`, true);
        }
      }
      function sensores() {
        const content = `<div class="mb-8 flex flex-wrap items-end justify-between gap-4"><div><p class="text-sm text-leaf">Laboratorio de datos</p><h2 class="mt-1 text-3xl font-bold">Mediciones</h2><p class="mt-2 text-sm text-slate-400">Últimos registros guardados en tus proyectos.</p></div><button id="refresh-measurements" class="rounded-xl border border-white/10 px-4 py-2 text-sm text-slate-300">Actualizar</button></div><section class="glass rounded-2xl p-6">${state.measurementsLoading ? `<p class="text-sm text-slate-400">Cargando mediciones…</p>` : state.measurementsError ? `<p class="text-sm text-red-300">No se pudieron cargar las mediciones: ${esc(state.measurementsError)}</p>` : state.measurements.length ? `<div class="overflow-x-auto"><table class="w-full text-left text-sm"><thead class="border-b border-white/10 text-xs uppercase text-slate-500"><tr><th class="p-3">Proyecto</th><th class="p-3">Sensor</th><th class="p-3">Valor</th><th class="p-3">Fecha</th></tr></thead><tbody>${state.measurements.map((measurement) => `<tr class="border-b border-white/5"><td class="p-3">${esc(measurement.proyecto)}</td><td class="p-3">${esc(measurement.sensor)}</td><td class="p-3">${esc(measurement.valor)}</td><td class="p-3 text-slate-400">${esc(measurement.tiempo)}</td></tr>`).join("")}</tbody></table></div>` : `<p class="text-sm text-slate-400">Todavía no hay mediciones en tus proyectos.</p>`}</section>`;
        mount(shell(content, "Sensores"), "sensores");
        document.querySelector("#refresh-measurements")?.addEventListener("click", cargarMediciones);
        if (!state.measurementsLoading && !state.measurementsLoaded) cargarMediciones();
      }

      function mount(html, active) {
        document.querySelector("#app").innerHTML = html;
        document.querySelectorAll("[data-nav]").forEach((b) => {
          b.classList.toggle("bg-cyan/10", b.dataset.nav === active);
          b.classList.toggle("text-cyan", b.dataset.nav === active);
          b.onclick = () => go(b.dataset.nav);
        });
        document.querySelector("#logout")?.addEventListener("click", async (event) => {
          const button = event.currentTarget;
          button.disabled = true;
          try {
            await apiRequest("/auth/logout", { method: "POST" });
          } catch (error) {
            button.disabled = false;
            toast(`No se pudo cerrar la sesión: ${error.message}`, true);
            return;
          }
          state.user = null;
          resetAccountData();
          go("inicio");
        });
        document.querySelector("#menu")?.addEventListener("click", () => {
          document
            .querySelector("#sidebar")
            .classList.toggle("-translate-x-full");
          document.querySelector("#backdrop").classList.toggle("hidden");
        });
        document
          .querySelector("#backdrop")
          ?.addEventListener("click", () =>
            document.querySelector("#menu").click(),
          );
      }

      function render() {
        if (!state.user) {
          if (location.hash === "#login") {
            login();
          } else {
            landing();
          }
          return;
        }
        const page = location.hash.slice(1) || "dashboard";
        (
          ({
            dashboard,
            clase,
            sensores,
            admin,
            perfil,
            proyecto,
          })[page] || dashboard
        )();
      }
      window.addEventListener("hashchange", render);
      ["ecolab_user", "ecolab_users", "ecolab_classrooms", "ecolab_class", "ecolab_sensors", "ecolab_devices", "ecolab_selected_class"].forEach((key) => localStorage.removeItem(key));
      apiRequest("/auth/me")
        .then((data) => { state.user = data.usuario; })
        .catch((error) => {
          state.user = null;
          if (error.status !== 401) {
            toast(`No se pudo verificar la sesión: ${error.message}`, true);
          }
        })
        .finally(render);
