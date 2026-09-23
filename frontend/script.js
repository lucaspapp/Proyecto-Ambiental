      const state = {
        user: JSON.parse(localStorage.getItem("ecolab_user") || "null"),
        users: JSON.parse(localStorage.getItem("ecolab_users") || "[]"),
        classrooms: JSON.parse(
          localStorage.getItem("ecolab_classrooms") || "[]",
        ),
        devices: JSON.parse(localStorage.getItem("ecolab_devices") || "[]"),
        sensors: JSON.parse(localStorage.getItem("ecolab_sensors") || "[]"),
        classCode: localStorage.getItem("ecolab_class") || "",
        chart: null,
        classroomMembers: {},
        selectedMembersClass: "",
        classroomsLoading: false,
        classroomsError: "",
        classroomsLoaded: false,
      };
      const API_CONFIG = {
        baseUrl: window.ECOLAB_API_URL || localStorage.getItem("ecolab_api_url") || "http://127.0.0.1:8003",
        timeoutMs: 5000,
      };
      const apiUrl = (path) =>
        `${API_CONFIG.baseUrl.replace(/\/$/, "")}/${path.replace(/^\//, "")}`;
      async function apiRequest(path, options = {}) {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), API_CONFIG.timeoutMs);
        const headers = {
          Accept: "application/json",
          "X-Usuario-Local": state.user?.id || "",
          ...(options.body ? { "Content-Type": "application/json" } : {}),
          ...(options.headers || {}),
        };
        try {
          const response = await fetch(apiUrl(path), {
            ...options,
            headers,
            signal: controller.signal,
          });
          const data = await response.json().catch(() => ({}));
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
        localStorage.setItem("ecolab_classrooms", JSON.stringify(state.classrooms));
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
        })[role] ||
        role ||
        "Invitado";

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

      function login() {
        document.querySelector("#app").innerHTML =
          `<div class="grid min-h-screen lg:grid-cols-2"><div class="grid-bg relative hidden overflow-hidden bg-gradient-to-br from-[#102f37] via-night to-night p-12 lg:flex lg:flex-col lg:justify-between"><div class="flex items-center gap-3"><div class="grid h-12 w-12 place-items-center rounded-2xl bg-cyan text-xl font-bold text-night">E</div><b class="text-xl">Eco<span class="text-cyan">Lab</span></b></div><div class="relative"><div class="absolute -left-24 -top-24 h-72 w-72 rounded-full bg-cyan/10 blur-3xl"></div><p class="mb-4 text-sm uppercase tracking-[.25em] text-cyan">Aprender haciendo</p><h1 class="max-w-xl text-5xl font-bold leading-tight">Medí, entendé y transformá tu entorno.</h1><p class="mt-6 max-w-lg text-slate-400">Una plataforma para que profesores y alumnos exploren datos ambientales en tiempo real.</p></div><p class="text-xs text-slate-600">Proyecto Ambiental · Plataforma educativa</p></div><div class="flex items-center justify-center p-6"><div class="w-full max-w-md"><div class="mb-10 lg:hidden"><b class="text-xl">Eco<span class="text-cyan">Lab</span></b></div><p class="mb-2 text-sm text-cyan">Bienvenido de nuevo</p><h2 class="text-3xl font-bold">Entrá a tu aula</h2><p class="mt-2 text-sm text-slate-400">Usá tus datos para continuar con tu proyecto.</p>          <form id="login-form" class="mt-8 space-y-5"><label class="block text-sm text-slate-300">Correo electrónico<input name="id" type="email" required placeholder="nombre@colegio.edu" class="mt-2 w-full rounded-xl border border-white/10 bg-panel px-4 py-3 outline-none focus:border-cyan"></label><label class="block text-sm text-slate-300">Contraseña<input name="password" type="password" required minlength="8" placeholder="••••••••" class="mt-2 w-full rounded-xl border border-white/10 bg-panel px-4 py-3 outline-none focus:border-cyan"></label><button class="w-full rounded-xl bg-cyan px-4 py-3 font-semibold text-night transition hover:bg-white">Ingresar al aula</button><p id="login-msg" class="min-h-5 text-center text-sm text-red-300"></p></form><div class="mt-8 border-t border-white/10 pt-6 text-center text-sm text-slate-400">¿Primera vez? <button id="register-link" class="text-cyan hover:underline">Crear una cuenta</button></div><p class="mt-8 text-center text-xs text-slate-600">La cuenta debe existir en la API y tener una contraseña válida.</p></div></div></div>`;
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
              localStorage.setItem("ecolab_user", JSON.stringify(state.user));
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
          `<div class="grid min-h-screen place-items-center p-6"><div class="w-full max-w-lg"><button onclick="login()" class="mb-8 text-sm text-cyan">← Volver al ingreso</button><div class="glass rounded-3xl p-7 md:p-10"><p class="text-sm text-cyan">Nueva cuenta</p><h1 class="mt-2 text-3xl font-bold">Creá tu perfil</h1><p class="mt-2 text-sm text-slate-400">Registrate para participar de las clases ambientales.</p><form id="register-form" class="mt-7 grid gap-4 sm:grid-cols-2"><label class="text-sm text-slate-300">Nombre<input name="nombre" required class="mt-2 w-full rounded-xl border border-white/10 bg-night px-3 py-3"></label><label class="text-sm text-slate-300">Apellido<input name="apellido" required class="mt-2 w-full rounded-xl border border-white/10 bg-night px-3 py-3"></label><label class="text-sm text-slate-300 sm:col-span-2">Correo electrónico<input name="id" type="email" required class="mt-2 w-full rounded-xl border border-white/10 bg-night px-3 py-3"></label><label class="text-sm text-slate-300">Rol<select name="rol" class="mt-2 w-full rounded-xl border border-white/10 bg-night px-3 py-3"><option value="estudiante">Alumno</option><option value="docente">Profesor</option></select></label><label class="text-sm text-slate-300">Contraseña<input name="contrasenia" type="password" minlength="8" required class="mt-2 w-full rounded-xl border border-white/10 bg-night px-3 py-3"></label><button class="rounded-xl bg-cyan px-4 py-3 font-semibold text-night sm:col-span-2">Crear cuenta</button><p id="register-msg" class="sm:col-span-2 text-sm"></p></form></div></div></div>`;
        document.querySelector("#register-form").onsubmit = async (e) => {
          e.preventDefault();
          const f = new FormData(e.target);
          const msg = document.querySelector("#register-msg");
          const id = String(f.get("id")).trim().toLowerCase();
          if (state.users.some((user) => user.id === id)) {
            msg.textContent = "Ya existe una cuenta con ese correo.";
            msg.className = "text-sm text-red-300 sm:col-span-2";
            return;
          }
          const user = {
            id,
            nombre: String(f.get("nombre")).trim(),
            apellido: String(f.get("apellido")).trim(),
            role: String(f.get("rol")),
          };
          try {
            const response = await fetch(apiUrl("/crearuser"), {
              method: "POST",
              body: f,
              headers: { Accept: "application/json" },
            });
            const data = await response.json().catch(() => ({}));
            if (!response.ok) throw new Error(data.detail || "No se pudo crear la cuenta.");
            state.users.push(user);
            localStorage.setItem("ecolab_users", JSON.stringify(state.users));
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
            localStorage.setItem("ecolab_class", state.classCode);
            toast("Te uniste a la clase");
          }
        });
        document.querySelector("#new-class")?.addEventListener("click", () => {
          state.classCode = `ECO-${Math.random().toString(36).slice(2, 5).toUpperCase()}`;
          localStorage.setItem("ecolab_class", state.classCode);
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
          localStorage.setItem("ecolab_sensors", JSON.stringify(mediciones));
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
        const content = `<div class="mb-8"><p class="text-sm text-soil">Gestión del espacio</p><h2 class="mt-1 text-3xl font-bold">Administración</h2><p class="mt-2 text-sm text-slate-400">Gestioná los usuarios guardados en este navegador.</p></div><div class="glass rounded-2xl p-6"><div class="flex flex-wrap items-center justify-between gap-3"><div><h3 class="font-semibold">Usuarios registrados</h3><p class="text-xs text-slate-500">${users.length} cuentas visibles</p></div><button id="admin-add" class="rounded-xl bg-cyan px-4 py-2 text-sm font-semibold text-night">${icon("plus", "inline h-4 w-4")} Nuevo usuario</button></div><div class="mt-5 overflow-x-auto"><table class="w-full text-left text-sm"><thead class="border-b border-white/10 text-xs uppercase text-slate-500"><tr><th class="p-3">Usuario</th><th class="p-3">Institución</th><th class="p-3">Rol</th><th class="p-3">Acciones</th></tr></thead><tbody>${users.map((u) => `<tr class="border-b border-white/5"><td class="p-3"><b>${esc(u.nombre)} ${esc(u.apellido)}</b><small class="block text-xs text-slate-500">${esc(u.id)}</small></td><td class="p-3 text-slate-400">Proyecto Ambiental</td><td class="p-3"><span class="rounded-full bg-cyan/10 px-2 py-1 text-xs text-cyan">${roleName(u.role)}</span></td><td class="p-3 text-slate-500">Local</td></tr>`).join("") || `<tr><td colspan="4" class="p-8 text-center text-slate-500">Todavía no hay registros.</td></tr>`}</tbody></table></div></div>`;
        mount(shell(content, "Administración"), "admin");
        document.querySelector("#admin-add").onclick = () => register();
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
            toast(`Aula creada: ${classroom.code || classroom.name}`);
          } catch (error) {
            state.classroomsError = error.name === "AbortError" ? "tiempo de espera agotado" : error.message;
            toast("Aula creada localmente; la API no respondió.", true);
          }
          state.classrooms.push(classroom);
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
            localStorage.setItem("ecolab_class", state.classCode);
            saveClassrooms();
            toast(`Te uniste a ${joinedClassroom.name}`);
          } catch (error) {
            state.classroomsError = error.name === "AbortError" ? "tiempo de espera agotado" : error.message;
            state.classCode = normalizedCode;
            localStorage.setItem("ecolab_class", normalizedCode);
            toast("No se pudo sincronizar el aula; se guardó el código localmente.", true);
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
              localStorage.setItem(
                "ecolab_selected_class",
                button.dataset.selectClass,
              );
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
          const data = await apiRequest(`/aulas?usuario=${encodeURIComponent(state.user?.id || "")}&rol=${encodeURIComponent(state.user?.role || "")}`);
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
          const data = await apiRequest(`/aulas/${encodeURIComponent(classId)}/miembros?usuario=${encodeURIComponent(state.user?.id || "")}&rol=${encodeURIComponent(state.user?.role || "")}`);
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
          localStorage.setItem("ecolab_devices", JSON.stringify(state.devices));
          toast("Dispositivo configurado");
          sensores();
        };
      }

      function sensores() {
        const classId = Number(
          localStorage.getItem("ecolab_selected_class") || 0,
        );
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
          localStorage.removeItem("ecolab_user");
          state.user = null;
          login();
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
          login();
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
      render();
