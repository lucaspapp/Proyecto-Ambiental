      const state = {
        user: null,
        users: [],
        adminUsersLoaded: false,
        classrooms: [],
        devices: [],
        sensors: [],
        selectedClassId: null,
        classCode: "",
        chart: null,
        classroomMembers: {},
        selectedMembersClass: "",
        classroomsLoading: false,
        classroomsError: "",
        classroomsLoaded: false,
      };
      const resolveApiBaseUrl = () => {
        if (window.ECOLAB_API_URL) return String(window.ECOLAB_API_URL).replace(/\/$/, "");
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
          });
          const data = await response.json().catch(() => ({}));
          if (response.status === 401 && state.user && path !== "/auth/login") {
            state.user = null;
            localStorage.removeItem("ecolab_user");
            location.hash = "login";
          }
          if (!response.ok)
            throw new Error(data.detail || `La API respondió ${response.status}.`);
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
        devices: classroom.devices ?? classroom.dispositivos ?? [],
        memberCount: classroom.memberCount ?? classroom.cantidad_miembros ?? classroom.miembros_count ?? 0,
      });
      const localUserPayload = () => ({
        id: state.user?.id || "",
        nombre: state.user?.nombre || "",
        apellido: state.user?.apellido || "",
        rol: state.user?.role || "estudiante",
      });
      function saveClassrooms() {
        // Server data stays in memory; the API is the persistence source.
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
        <header class="sticky top-0 z-20 flex h-20 items-center justify-between border-b border-white/10 bg-night/90 px-5 backdrop-blur md:px-10"><button id="menu" class="rounded-lg p-2 text-slate-400 hover:bg-white/5 md:hidden">${icon("home")}</button><div><p class="text-xs uppercase tracking-[.2em] text-slate-500">Espacio de aprendizaje</p><h1 class="font-semibold">${active}</h1></div><div class="flex items-center gap-3"><span class="hidden items-center gap-2 text-xs text-leaf sm:flex"><i class="pulse-dot h-2 w-2 rounded-full bg-leaf"></i>Modo local</span><button id="logout" title="Cerrar sesión" class="rounded-xl border border-white/10 p-2 text-slate-400 hover:text-white">${icon("logout")}</button></div></header><main class="page mx-auto max-w-7xl p-5 md:p-10">${content}</main><footer class="border-t border-white/10 px-5 py-8 md:px-10"><div class="mx-auto flex max-w-7xl flex-col justify-between gap-5 text-xs text-slate-500 md:flex-row"><div class="flex items-center gap-3"><span class="grid h-8 w-8 place-items-center rounded-lg bg-soil font-bold text-night">CO</span><span><b class="text-slate-300">Colegio Ambiental</b><br>Proyecto EcoLab</span></div><div class="flex flex-wrap items-center gap-5"><a href="#" class="hover:text-cyan">Ayuda</a><a href="#" class="hover:text-cyan">Preguntas frecuentes</a><a href="#" class="hover:text-cyan">Desarrolladores</a><span>◎ @colegioambiental</span></div></div></footer>
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
        document.querySelector("#app").innerHTML =
          `<div class="grid min-h-screen place-items-center p-6"><div class="w-full max-w-lg"><button onclick="login()" class="mb-8 text-sm text-cyan">← Volver al ingreso</button><div class="glass rounded-3xl p-7 md:p-10"><p class="text-sm text-cyan">Nueva cuenta</p><h1 class="mt-2 text-3xl font-bold">Creá tu perfil</h1><p class="mt-2 text-sm text-slate-400">Registrate para participar de las clases ambientales.</p><form id="register-form" class="mt-7 grid gap-4 sm:grid-cols-2"><label class="text-sm text-slate-300">Nombre<input name="nombre" required maxlength="100" class="mt-2 w-full rounded-xl border border-white/10 bg-night px-3 py-3"></label><label class="text-sm text-slate-300">Apellido<input name="apellido" required maxlength="100" class="mt-2 w-full rounded-xl border border-white/10 bg-night px-3 py-3"></label><label class="text-sm text-slate-300 sm:col-span-2">Correo electrónico<input name="id" type="email" maxlength="100" required autocomplete="email" class="mt-2 w-full rounded-xl border border-white/10 bg-night px-3 py-3"></label><div class="text-sm text-slate-300">Rol<span class="mt-2 block rounded-xl border border-white/10 bg-night px-3 py-3 text-slate-400">Alumno</span><input name="rol" type="hidden" value="estudiante"></div><label class="text-sm text-slate-300">Contraseña<input name="contrasenia" type="password" minlength="12" maxlength="128" autocomplete="new-password" required class="mt-2 w-full rounded-xl border border-white/10 bg-night px-3 py-3"><small class="mt-1 block text-slate-500">Usá al menos 12 caracteres.</small></label><button class="rounded-xl bg-cyan px-4 py-3 font-semibold text-night sm:col-span-2">Crear cuenta</button><p id="register-msg" class="sm:col-span-2 text-sm"></p></form></div></div></div>`;
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
        const content = `<div class="mb-8 flex flex-wrap items-end justify-between gap-4"><div><p class="text-sm text-slate-400">Buen día, ${esc(state.user?.nombre || "explorador")} 👋</p><h2 class="mt-1 text-3xl font-bold">Tu espacio ambiental</h2></div><button data-nav="clase" class="rounded-xl bg-cyan px-5 py-3 text-sm font-semibold text-night hover:bg-white">${icon("plus", "h-4 w-4 inline")} Crear o unirme a una clase</button></div><div class="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">${stat("24.8 °C", "Temperatura promedio", "En rango saludable", "cyan")}${stat("61 %", "Humedad relativa", "+4.2% esta semana", "leaf")}${stat("03", "Sensores activos", "Todo funcionando", "soil")}${stat("07", "Clases realizadas", "Este mes", "cyan")}</div><div class="mt-5 grid gap-5 xl:grid-cols-[1.5fr_1fr]"><div class="glass rounded-2xl p-5"><div class="mb-5 flex items-center justify-between"><div><h3 class="font-semibold">Datos ambientales</h3><p class="text-xs text-slate-500">Últimas 24 horas · Estación patio</p></div><span class="rounded-lg bg-white/5 px-3 py-2 text-xs text-slate-400">En vivo ▾</span></div><div class="h-72"><canvas id="main-chart"></canvas></div></div><div class="glass rounded-2xl p-5"><div class="flex items-center justify-between"><h3 class="font-semibold">Actividad reciente</h3><button data-nav="clase" class="text-xs text-cyan">Ver todo</button></div><div class="mt-5 space-y-5">${activity("Nueva medición registrada", "Hace 2 minutos", "sensor")}${activity("Clase «Calidad del aire» iniciada", "Hace 1 hora", "book")}${activity("Módulo actualizado por Prof. García", "Ayer, 14:32", "info")}${activity("Te uniste a EcoLab", "Ayer, 09:10", "users")}</div></div></div><div class="glass mt-5 rounded-2xl p-5"><div class="flex items-center justify-between"><div><h3 class="font-semibold">Continuá aprendiendo</h3><p class="text-xs text-slate-500">Recursos para tu próxima clase</p></div><button data-nav="proyecto" class="text-xs text-cyan">Ver todos</button></div><div class="mt-5 grid gap-4 md:grid-cols-3">${resource("01", "¿Qué es un ecosistema?", "Conceptos base para comenzar", "cyan")}${resource("02", "Leer una gráfica", "Interpretá tendencias y cambios", "leaf")}${resource("03", "Tu primera medición", "Guía rápida del sensor", "soil")}</div></div>`;
        mount(shell(content, "Dashboard"), "dashboard");
        drawChart();
      }

      function stat(value, title, note, color) {
        return `<div class="glass rounded-2xl p-5"><div class="mb-5 flex items-start justify-between"><span class="text-3xl font-bold">${value}</span><span class="rounded-lg bg-${color}/10 p-2 text-${color}">${icon("chart")}</span></div><p class="text-sm text-slate-300">${title}</p><p class="mt-1 text-xs text-${color}">${note}</p></div>`;
      }

      function activity(title, time, ico) {
        return `<div class="flex gap-3"><span class="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-white/5 text-cyan">${icon(ico, "h-4 w-4")}</span><div><p class="text-sm">${title}</p><p class="mt-1 text-xs text-slate-500">${time}</p></div></div>`;
      }

      function resource(num, title, text, color) {
        return `<div class="group rounded-xl border border-white/10 bg-white/[.02] p-4"><span class="text-xs text-${color}">${num}</span><h4 class="mt-7 font-medium">${title}</h4><p class="mt-1 text-xs text-slate-500">${text}</p></div>`;
      }

      function drawChart() {
        const c = document.querySelector("#main-chart");
        if (!c || !window.Chart) return;
        state.chart = new Chart(c, {
          type: "line",
          data: {
            labels: [
              "00:00",
              "04:00",
              "08:00",
              "12:00",
              "16:00",
              "20:00",
              "Ahora",
            ],
            datasets: [
              {
                label: "Temperatura",
                data: [19, 18, 21, 25, 27, 24, 24.8],
                borderColor: "#69d4e5",
                backgroundColor: "rgba(105,212,229,.12)",
                fill: true,
                tension: 0.4,
              },
              {
                label: "Humedad",
                data: [70, 74, 68, 60, 55, 59, 61],
                borderColor: "#83c99a",
                backgroundColor: "transparent",
                tension: 0.4,
              },
            ],
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: {
                labels: {
                  color: "#94a3b8",
                  boxWidth: 12,
                },
              },
            },
            scales: {
              x: {
                grid: {
                  color: "rgba(255,255,255,.05)",
                },
                ticks: {
                  color: "#64748b",
                },
              },
              y: {
                grid: {
                  color: "rgba(255,255,255,.05)",
                },
                ticks: {
                  color: "#64748b",
                },
              },
            },
          },
        });
      }

      function clase() {
        const content = `<div class="mb-8 flex flex-wrap items-end justify-between gap-4"><div><p class="text-sm text-cyan">Aula colaborativa</p><h2 class="mt-1 text-3xl font-bold">Mi clase</h2><p class="mt-2 text-sm text-slate-400">Aprendé junto a tu grupo y explorá los cambios en tiempo real.</p></div>${state.user?.role === "docente" || state.user?.role === "administrador" ? `<button id="new-class" class="rounded-xl bg-cyan px-5 py-3 text-sm font-semibold text-night">${icon("plus", "inline h-4 w-4")} Crear clase</button>` : ""}</div><div class="grid gap-5 lg:grid-cols-[1.2fr_.8fr]"><div class="glass overflow-hidden rounded-2xl"><div class="grid-bg border-b border-white/10 p-6"><div class="flex items-start justify-between"><div><span class="rounded-full bg-leaf/10 px-3 py-1 text-xs text-leaf">ACTIVA AHORA</span><h3 class="mt-4 text-2xl font-semibold">Calidad del aire</h3><p class="mt-2 text-sm text-slate-400">Prof. García · Ciencias Naturales</p></div><span class="text-4xl float">🌿</span></div><div class="mt-7 flex flex-wrap gap-4 text-sm text-slate-400"><span>👥 28 alumnos</span><span>⏱ 45 min</span><span>📍 Laboratorio 2</span></div></div><div class="p-6"><h4 class="font-semibold">Código de acceso</h4><div class="mt-3 flex items-center justify-between rounded-xl border border-dashed border-cyan/40 bg-cyan/5 p-4"><span class="font-mono text-2xl tracking-[.3em] text-cyan">${state.classCode || "ECO-24A"}</span><button id="copy-code" class="text-xs text-slate-400 hover:text-white">Copiar</button></div><p class="mt-3 text-xs text-slate-500">Compartí este código para que tus alumnos se unan.</p></div></div><div class="glass rounded-2xl p-6"><h3 class="font-semibold">Próximas clases</h3><div class="mt-5 space-y-3">${["Biodiversidad del patio", "Energías renovables", "Cierre del proyecto"].map((x, i) => `<div class="rounded-xl border border-white/10 p-4"><p class="text-sm">${x}</p><p class="mt-1 text-xs text-slate-500">${["Mañana · 10:00", "Jueves · 09:30", "Viernes · 11:00"][i]}</p></div>`).join("")}</div><button id="join-class" class="mt-5 w-full rounded-xl border border-cyan/30 py-3 text-sm text-cyan hover:bg-cyan/10">Unirme con un código</button></div></div><div class="glass mt-5 rounded-2xl p-6"><div class="flex items-center justify-between"><h3 class="font-semibold">Cambios del profesor en tiempo real</h3><span class="flex items-center gap-2 text-xs text-leaf"><i class="h-2 w-2 rounded-full bg-leaf"></i>Sincronizado</span></div><div class="mt-5 grid gap-3 md:grid-cols-3">${["Módulo de temperatura", "Intervalo de muestra: 30s", "Visualización: gráfica lineal"].map((x) => `<div class="rounded-xl bg-white/[.03] p-4 text-sm text-slate-300">${x}<span class="mt-2 block text-xs text-slate-500">Actualizado hace 1 min</span></div>`).join("")}</div></div>`;
        mount(shell(content, "Mi clase"), "clase");
        document.querySelector("#copy-code")?.addEventListener("click", () => {
          navigator.clipboard?.writeText(state.classCode || "ECO-24A");
          toast("Código copiado");
        });
        document.querySelector("#join-class")?.addEventListener("click", () => {
          const code = prompt("Ingresá el código de la clase");
          if (code) {
            state.classCode = code.toUpperCase();
            toast("Te uniste a la clase");
          }
        });
        document.querySelector("#new-class")?.addEventListener("click", () => {
          state.classCode = `ECO-${Math.random().toString(36).slice(2, 5).toUpperCase()}`;
          toast(`Clase creada: ${state.classCode}`);
          clase();
        });
      }

      function sensores() {
        const rows = state.sensors.length
          ? state.sensors
          : [
              {
                id_sp: "",
                valor: "",
              },
            ];
        const content = `<div class="mb-8"><p class="text-sm text-leaf">Laboratorio de datos</p><h2 class="mt-1 text-3xl font-bold">Sensores</h2><p class="mt-2 text-sm text-slate-400">Agregá módulos y guardá mediciones en este navegador.</p></div><div class="grid gap-5 lg:grid-cols-[.8fr_1.2fr]"><div class="glass rounded-2xl p-6"><h3 class="font-semibold">Nueva medición</h3><form id="sensor-form" class="mt-5 space-y-4"><label class="block text-sm text-slate-300">ID del proyecto<input name="id_proyecto" type="number" min="1" required value="1" class="mt-2 w-full rounded-xl border border-white/10 bg-night px-3 py-3"></label><label class="block text-sm text-slate-300">ID del módulo<input name="id_modulo" type="number" min="1" required value="1" class="mt-2 w-full rounded-xl border border-white/10 bg-night px-3 py-3"></label><div><div class="mb-2 flex items-center justify-between"><label class="text-sm text-slate-300">Sensores conectados</label><button type="button" id="add-sensor" class="text-xs text-cyan">+ Agregar</button></div><div id="sensor-rows" class="space-y-3">${rows.map(sensorRow).join("")}</div></div><button class="w-full rounded-xl bg-cyan py-3 font-semibold text-night">Guardar mediciones</button><p id="sensor-msg" class="min-h-5 text-sm"></p></form></div><div class="glass rounded-2xl p-6"><div class="flex items-center justify-between"><div><h3 class="font-semibold">Estado de la estación</h3><p class="text-xs text-slate-500">Datos de demostración</p></div><span class="rounded-full bg-leaf/10 px-3 py-1 text-xs text-leaf">● Local</span></div><div class="mt-6 grid gap-3 sm:grid-cols-3">${["Temperatura", "Humedad", "Calidad aire"].map((x, i) => `<div class="rounded-xl border border-white/10 p-4"><p class="text-xs text-slate-500">${x}</p><b class="mt-2 block text-2xl">${["24.8 °C", "61 %", "Buena"][i]}</b><span class="mt-2 block text-xs text-leaf">Normal</span></div>`).join("")}</div><div class="mt-6 h-60"><canvas id="sensor-chart"></canvas></div></div></div>`;
        mount(shell(content, "Sensores"), "sensores");
        document.querySelector("#add-sensor").onclick = () => {
          document.querySelector("#sensor-rows").insertAdjacentHTML(
            "beforeend",
            sensorRow({
              id_sp: "",
              valor: "",
            }),
          );
        };
        document
          .querySelector("#sensor-rows")
          .addEventListener("click", (e) => {
            if (e.target.dataset.remove)
              e.target.closest(".sensor-row").remove();
          });
        document.querySelector("#sensor-form").onsubmit = (e) => {
          e.preventDefault();
          const msg = document.querySelector("#sensor-msg");
          const mediciones = [...document.querySelectorAll(".sensor-row")].map(
            (r) => ({
              id_sp: Number(r.querySelector("[name=id_sp]").value),
              valor: Number(r.querySelector("[name=valor]").value),
            }),
          );
          state.sensors = mediciones;
          msg.textContent = `Mediciones guardadas · ${mediciones.length} sensores`;
          msg.className = "text-sm text-leaf";
        };
        if (window.Chart)
          new Chart(document.querySelector("#sensor-chart"), {
            type: "bar",
            data: {
              labels: ["Temperatura", "Humedad", "CO₂"],
              datasets: [
                {
                  data: [24.8, 61, 420],
                  backgroundColor: ["#69d4e5", "#83c99a", "#bd8b62"],
                  borderRadius: 8,
                },
              ],
            },
            options: {
              plugins: {
                legend: {
                  display: false,
                },
              },
              scales: {
                x: {
                  ticks: {
                    color: "#94a3b8",
                  },
                  grid: {
                    display: false,
                  },
                },
                y: {
                  ticks: {
                    color: "#64748b",
                  },
                  grid: {
                    color: "rgba(255,255,255,.05)",
                  },
                },
              },
            },
          });
      }
      const sensorRow = (row) =>
        `<div class="sensor-row flex gap-2"><input name="id_sp" type="number" min="1" required placeholder="ID sensor" value="${esc(row.id_sp)}" class="min-w-0 flex-1 rounded-xl border border-white/10 bg-night px-3 py-3 text-sm"><input name="valor" type="number" step="any" required placeholder="Valor" value="${esc(row.valor)}" class="min-w-0 flex-1 rounded-xl border border-white/10 bg-night px-3 py-3 text-sm"><button type="button" data-remove="true" class="rounded-xl border border-red-400/20 px-3 text-red-300">×</button></div>`;

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
        const content = `<div class="glass max-w-2xl rounded-2xl p-7"><p class="text-sm text-cyan">Mi cuenta</p><h2 class="mt-1 text-3xl font-bold">${esc(state.user?.nombre)}</h2><p class="mt-2 text-slate-400">${esc(state.user?.id)}</p><div class="mt-8 grid gap-4 sm:grid-cols-2"><div class="rounded-xl bg-white/[.03] p-4"><small class="text-slate-500">Rol</small><p class="mt-1">${roleName(state.user?.role)}</p></div><div class="rounded-xl bg-white/[.03] p-4"><small class="text-slate-500">Institución</small><p class="mt-1">Proyecto Ambiental</p></div></div></div>`;
        mount(shell(content, "Mi perfil"), "perfil");
      }

      function classroomDevices(classId) {
        return state.devices.filter((device) => device.classId === classId);
      }

      function clase() {
        const canManage =
          state.user?.role === "docente" ||
          state.user?.role === "administrador";
        const cards = state.classrooms
          .map((classroom) => {
            const devices = classroomDevices(classroom.id);
            const memberCount = classroom.memberCount || (state.classroomMembers[classroom.id] || []).length;
            return `<article class="glass rounded-2xl p-6"><span class="text-xs text-cyan">${esc(classroom.code || "Sin código")}</span><h3 class="mt-3 text-xl font-semibold">${esc(classroom.name)}</h3><p class="mt-1 text-sm text-slate-400">Ciencias ambientales · ${memberCount} miembros</p><div class="mt-5 grid grid-cols-2 gap-3 text-sm"><div class="rounded-xl bg-white/[.03] p-3"><b class="block text-xl">${devices.length}</b><span class="text-xs text-slate-500">dispositivos</span></div><div class="rounded-xl bg-white/[.03] p-3"><b class="block text-xl">${devices.reduce((total, device) => total + device.sensors.length, 0)}</b><span class="text-xs text-slate-500">sensores</span></div></div><button data-select-class="${classroom.id}" class="mt-5 w-full rounded-xl border border-cyan/30 py-3 text-sm text-cyan">Configurar dispositivos</button><button data-members-class="${classroom.id}" class="mt-2 w-full rounded-xl border border-white/10 py-2 text-xs text-slate-400">Ver miembros</button></article>`;
          })
          .join("");
        const status = state.classroomsLoading
          ? `<p class="mt-3 text-xs text-cyan">Sincronizando aulas con la API...</p>`
          : state.classroomsError
            ? `<p class="mt-3 rounded-xl border border-soil/40 bg-soil/10 p-3 text-xs text-soil">API no disponible: ${esc(state.classroomsError)}. Se muestran las aulas guardadas en este navegador.</p>`
            : `<p class="mt-3 text-xs text-leaf">Aulas sincronizadas con la API.</p>`;
        const selectedMembers = state.classroomMembers[state.selectedMembersClass] || [];
        const membersPanel = state.selectedMembersClass
          ? `<div class="glass mt-5 rounded-2xl p-6"><h3 class="font-semibold">Miembros del aula</h3><div class="mt-4 grid gap-2 sm:grid-cols-2">${selectedMembers.map((member) => `<div class="rounded-xl bg-white/[.03] p-3 text-sm">${esc(member.nombre || member.name || member.id || "Usuario")}<span class="mt-1 block text-xs text-slate-500">${esc(member.rol || member.role || "Miembro")}</span></div>`).join("") || `<p class="text-sm text-slate-500">Todavía no hay miembros.</p>`}</div></div>`
          : "";
        const content = `<div class="mb-8 flex flex-wrap items-end justify-between gap-4"><div><p class="text-sm text-cyan">Aula colaborativa</p><h2 class="mt-1 text-3xl font-bold">Mis aulas</h2><p class="mt-2 text-sm text-slate-400">Cada aula puede tener varios dispositivos de medición.</p>${status}</div>${canManage ? `<button id="new-class" class="rounded-xl bg-cyan px-5 py-3 text-sm font-semibold text-night">+ Crear aula</button>` : ""}</div><div class="grid gap-5 md:grid-cols-2 xl:grid-cols-3">${cards || `<div class="glass rounded-2xl p-8 text-sm text-slate-400 md:col-span-2 xl:col-span-3">Todavía no hay aulas. Podés crear una o unirte con un código.</div>`}</div><div class="mt-5 flex flex-wrap gap-3"><button id="join-class" class="rounded-xl border border-cyan/30 px-4 py-2 text-sm text-cyan">+ Unirme con un código</button><button id="reload-classrooms" class="rounded-xl border border-white/10 px-4 py-2 text-sm text-slate-400">Actualizar</button></div>${membersPanel}`;
        mount(shell(content, "Mi clase"), "clase");
        document.querySelector("#new-class")?.addEventListener("click", async () => {
          const name = prompt("Nombre del aula");
          if (!name?.trim()) return;
          const classroom = {
            id: Date.now(),
            name: name.trim(),
            code: `ECO-${Math.random().toString(36).slice(2, 5).toUpperCase()}`,
          };
          state.classroomsLoading = true;
          state.classroomsError = "";
          clase();
          try {
            const created = await apiRequest("/aulas", {
              method: "POST",
              body: JSON.stringify({
                nombre: classroom.name,
                descripcion: "",
                usuario: state.user.id,
                rol: state.user.role,
              }),
            });
            Object.assign(classroom, classroomFromApi(created.aula || created));
            state.classrooms.push(classroom);
            toast(`Aula creada: ${classroom.code || classroom.name}`);
          } catch (error) {
            state.classroomsError = error.name === "AbortError" ? "tiempo de espera agotado" : error.message;
            toast(`No se pudo crear el aula: ${error.message}`, true);
          }
          saveClassrooms();
          state.classroomsLoading = false;
          clase();
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
                usuario: state.user.id,
                rol: state.user.role,
              }),
            });
            const joinedClassroom = classroomFromApi(joined.aula || joined);
            if (!state.classrooms.some((item) => String(item.id) === String(joinedClassroom.id)))
              state.classrooms.push(joinedClassroom);
            state.classCode = joinedClassroom.code || normalizedCode;
            saveClassrooms();
            toast(`Te uniste a ${joinedClassroom.name}`);
          } catch (error) {
            state.classroomsError = error.name === "AbortError" ? "tiempo de espera agotado" : error.message;
            toast(`No se pudo unir al aula: ${error.message}`, true);
          }
          state.classroomsLoading = false;
          clase();
        });
        document.querySelector("#reload-classrooms")?.addEventListener("click", cargarAulas);
        document.querySelectorAll("[data-members-class]").forEach((button) => {
          button.onclick = () => cargarMiembros(button.dataset.membersClass);
        });
        document.querySelectorAll("[data-select-class]").forEach(
          (button) =>
            (button.onclick = () => {
              state.selectedClassId = Number(button.dataset.selectClass);
              go("sensores");
            }),
        );
        if (!state.classroomsLoading && !state.classroomsLoaded) cargarAulas();
      }

      async function cargarAulas() {
        state.classroomsLoading = true;
        state.classroomsLoaded = false;
        state.classroomsError = "";
        clase();
        try {
          const data = await apiRequest("/aulas");
          const aulas = data.aulas || data.classrooms || data;
          if (!Array.isArray(aulas)) throw new Error("Formato de aulas no válido.");
          state.classrooms = aulas.map(classroomFromApi);
          saveClassrooms();
        } catch (error) {
          state.classroomsError = error.name === "AbortError" ? "tiempo de espera agotado" : error.message;
        } finally {
          state.classroomsLoading = false;
          state.classroomsLoaded = true;
          clase();
        }
      }

      async function cargarMiembros(classId) {
        try {
          const data = await apiRequest(`/aulas/${encodeURIComponent(classId)}/miembros`);
          const members = data.miembros || data.members || data;
          if (!Array.isArray(members)) throw new Error("Formato de miembros no válido.");
          state.classroomMembers[classId] = members;
          state.selectedMembersClass = classId;
          const names = state.classroomMembers[classId].map((member) => member.nombre || member.name || member.id || "Usuario");
          toast(names.length ? `Miembros: ${names.join(", ")}` : "El aula todavía no tiene miembros.");
          clase();
        } catch (error) {
          toast(`No se pudieron cargar los miembros: ${error.message}`, true);
        }
      }
      const sensorConfigRow = (sensor) =>
        `<div class="config-sensor grid gap-2 sm:grid-cols-[1fr_.7fr_.7fr_auto]"><select name="type" class="rounded-xl border border-white/10 bg-night px-3 py-3 text-sm"><option ${sensor.type === "Temperatura" ? "selected" : ""}>Temperatura</option><option ${sensor.type === "Humedad" ? "selected" : ""}>Humedad</option><option ${sensor.type === "Calidad del aire" ? "selected" : ""}>Calidad del aire</option></select><input name="unit" value="${esc(sensor.unit)}" placeholder="Unidad" class="rounded-xl border border-white/10 bg-night px-3 py-3 text-sm"><input name="value" type="number" step="any" value="${esc(sensor.value)}" placeholder="Valor inicial" class="rounded-xl border border-white/10 bg-night px-3 py-3 text-sm"><button type="button" data-remove="true" class="rounded-xl border border-red-400/20 px-3 text-red-300">×</button></div>`;

      function configDevice(classId, deviceId) {
        const device = state.devices.find((item) => item.id === deviceId) || {
          name: "",
          interval: 30,
          sensors: [],
        };
        const content = `<div class="mx-auto max-w-3xl"><button id="back-sensors" class="mb-6 text-sm text-cyan">← Volver</button><div class="glass rounded-2xl p-7"><h2 class="text-3xl font-bold">${deviceId ? "Editar" : "Agregar"} medidor</h2><form id="device-form" class="mt-7 space-y-5"><label class="block text-sm text-slate-300">Nombre<input name="name" required value="${esc(device.name)}" placeholder="Medidor ventana norte" class="mt-2 w-full rounded-xl border border-white/10 bg-night px-4 py-3"></label><label class="block text-sm text-slate-300">Intervalo en segundos<input name="interval" type="number" min="1" required value="${device.interval}" class="mt-2 w-full rounded-xl border border-white/10 bg-night px-4 py-3"></label><div class="flex items-center justify-between"><span class="text-sm text-slate-300">Sensores conectados</span><button type="button" id="add-config-sensor" class="text-xs text-cyan">+ Agregar sensor</button></div><div id="config-sensors" class="space-y-3">${device.sensors.map(sensorConfigRow).join("")}</div><button class="w-full rounded-xl bg-cyan py-3 font-semibold text-night">Guardar configuración</button><p id="device-msg" class="min-h-5 text-sm"></p></form></div></div>`;
        document.querySelector("#app").innerHTML = shell(content, "Sensores");
        document.querySelector("#back-sensors").onclick = sensores;
        document.querySelector("#add-config-sensor").onclick = () =>
          document.querySelector("#config-sensors").insertAdjacentHTML(
            "beforeend",
            sensorConfigRow({
              type: "Temperatura",
              unit: "°C",
              value: "",
            }),
          );
        document
          .querySelector("#config-sensors")
          .addEventListener("click", (event) => {
            if (event.target.dataset.remove)
              event.target.closest(".config-sensor").remove();
          });
        document.querySelector("#device-form").onsubmit = (event) => {
          event.preventDefault();
          const form = new FormData(event.target);
          const sensors = [...document.querySelectorAll(".config-sensor")].map(
            (row) => ({
              type: row.querySelector("[name=type]").value,
              unit: row.querySelector("[name=unit]").value.trim(),
              value: row.querySelector("[name=value]").value,
            }),
          );
          if (!sensors.length) {
            document.querySelector("#device-msg").textContent =
              "Agregá al menos un sensor.";
            return;
          }
          const saved = {
            id: deviceId || Date.now(),
            classId,
            name: String(form.get("name")).trim(),
            interval: Number(form.get("interval")),
            code:
              device.code ||
              `DEV-${Math.random().toString(36).slice(2, 6).toUpperCase()}`,
            sensors,
          };
          const index = state.devices.findIndex((item) => item.id === saved.id);
          if (index < 0) state.devices.push(saved);
          else state.devices[index] = saved;
          toast("Dispositivo configurado");
          sensores();
        };
      }

      function sensores() {
        const classId = Number(state.selectedClassId || 0);
        const classroom =
          state.classrooms.find((item) => item.id === classId) ||
          state.classrooms[0];
        const devices = classroom ? classroomDevices(classroom.id) : [];
        const canManage =
          state.user?.role === "docente" ||
          state.user?.role === "administrador";
        const cards = devices
          .map(
            (device) =>
              `<article class="glass rounded-2xl p-6"><div class="flex items-start justify-between"><div><span class="text-xs text-cyan">${esc(device.code)}</span><h3 class="mt-1 text-xl font-semibold">${esc(device.name)}</h3><p class="text-sm text-slate-400">${device.sensors.length} sensores · cada ${device.interval}s</p></div><span class="rounded-full bg-leaf/10 px-3 py-1 text-xs text-leaf">Listo</span></div><div class="mt-5 grid gap-3 sm:grid-cols-2">${device.sensors.map((sensor) => `<div class="rounded-xl border border-white/10 p-4"><div class="flex justify-between"><b>${esc(sensor.type)}</b><span class="text-xs text-slate-500">${esc(sensor.unit)}</span></div><p class="mt-2 text-2xl font-semibold">${esc(sensor.value || "—")}</p></div>`).join("")}</div>${canManage ? `<button data-edit-device="${device.id}" class="mt-5 rounded-xl border border-cyan/30 px-4 py-2 text-sm text-cyan">Editar sensores</button>` : ""}</article>`,
          )
          .join("");
        const content = `<div class="mb-8 flex flex-wrap items-end justify-between gap-4"><div><p class="text-sm text-leaf">Laboratorio de datos</p><h2 class="mt-1 text-3xl font-bold">Dispositivos y sensores</h2><p class="mt-2 text-sm text-slate-400">${classroom ? `Aula: ${esc(classroom.name)}` : "Creá un aula desde Mi clase."}</p></div>${classroom && canManage ? `<button id="new-device" class="rounded-xl bg-cyan px-5 py-3 text-sm font-semibold text-night">+ Agregar dispositivo</button>` : ""}</div><div class="space-y-4">${cards || `<div class="glass rounded-2xl p-8 text-sm text-slate-400">No hay dispositivos en esta aula.</div>`}</div>`;
        mount(shell(content, "Sensores"), "sensores");
        document
          .querySelector("#new-device")
          ?.addEventListener("click", () => configDevice(classroom.id));
        document
          .querySelectorAll("[data-edit-device]")
          .forEach(
            (button) =>
              (button.onclick = () =>
                configDevice(classroom.id, Number(button.dataset.editDevice))),
          );
      }

      function mount(html, active) {
        document.querySelector("#app").innerHTML = html;
        document.querySelectorAll("[data-nav]").forEach((b) => {
          b.classList.toggle("bg-cyan/10", b.dataset.nav === active);
          b.classList.toggle("text-cyan", b.dataset.nav === active);
          b.onclick = () => go(b.dataset.nav);
        });
        document.querySelector("#logout")?.addEventListener("click", () => {
          apiRequest("/auth/logout", { method: "POST" }).catch(() => {});
          state.user = null;
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
          })[page] || dashboard
        )();
      }
      window.addEventListener("hashchange", render);
      ["ecolab_user", "ecolab_users", "ecolab_classrooms", "ecolab_class", "ecolab_api_url", "ecolab_sensors", "ecolab_devices", "ecolab_selected_class"].forEach((key) => localStorage.removeItem(key));
      apiRequest("/auth/me")
        .then((data) => { state.user = data.usuario; })
        .catch(() => { state.user = null; })
        .finally(render);
