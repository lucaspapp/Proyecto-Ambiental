(() => {
  const PAGE_SIZE = 3;
  const app = document.querySelector("#app");
  const apiBase =
    window.ECOLAB_API_URL ||
    localStorage.getItem("ecolab_api_url") ||
    (window.location.protocol === "http:" || window.location.protocol === "https:"
      ? window.location.origin
      : "http://127.0.0.1:8003");
  let currentOffset = 0;
  let currentQuery = "";
  let total = 0;
  let loading = false;
  let templatePromise;

  const escapeHtml = (value) =>
    String(value ?? "").replace(/[&<>"']/g, (character) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" })[
        character
      ],
    );

  async function loadTemplate() {
    if (!templatePromise) {
      templatePromise = fetch("landing.html").then((response) => {
        if (!response.ok) throw new Error("No se pudo abrir la portada.");
        return response.text();
      });
    }
    app.innerHTML = await templatePromise;
    bindActions();
    await loadClasses(true);
  }

  function bindActions() {
    document.querySelector("#landing-login").onclick = () => window.EcoLabAuth?.login();
    document.querySelector("#landing-register").onclick = () => window.EcoLabAuth?.register();
    document.querySelector("#landing-explore").onclick = () =>
      document.querySelector("#public-classes").scrollIntoView({ behavior: "smooth" });
    document.querySelector("#public-search").onsubmit = (event) => {
      event.preventDefault();
      currentQuery = document.querySelector("#public-query").value.trim();
      loadClasses(true);
    };
    document.querySelector("#public-more").onclick = () => loadClasses(false);
  }

  async function loadClasses(reset) {
    if (loading) return;
    if (reset) {
      currentOffset = 0;
      total = 0;
      document.querySelector("#public-class-list").innerHTML = "";
    }
    loading = true;
    const status = document.querySelector("#public-status");
    const more = document.querySelector("#public-more");
    status.textContent = reset ? "Buscando aulas públicas..." : "Cargando más aulas...";
    more.disabled = true;
    try {
      const params = new URLSearchParams({
        buscar: currentQuery,
        limite: String(PAGE_SIZE),
        offset: String(currentOffset),
      });
      const response = await fetch(`${apiBase.replace(/\/$/, "")}/aulas/publicas?${params}`, {
        headers: { Accept: "application/json" },
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.detail || `La API respondió ${response.status}.`);
      const classes = data.aulas || [];
      total = Number(data.total || 0);
      currentOffset += classes.length;
      document.querySelector("#public-class-list").insertAdjacentHTML(
        "beforeend",
        classes.map((classroom) => {
          const description = classroom.descripcion || "Proyecto ambiental compartido por su comunidad escolar.";
          const count = Number(classroom.cantidad_miembros || 0);
          return `<article class="glass flex min-h-52 flex-col rounded-xl p-5"><div class="flex items-center justify-between gap-3"><span class="text-xs font-medium uppercase tracking-wider text-leaf">Aula abierta</span><span class="text-xs text-slate-500">${count} ${count === 1 ? "integrante" : "integrantes"}</span></div><h3 class="mt-4 text-lg font-semibold text-white">${escapeHtml(classroom.nombre)}</h3><p class="mt-2 flex-1 text-sm leading-6 text-slate-400">${escapeHtml(description)}</p><p class="mt-5 border-t border-white/10 pt-3 text-xs text-slate-500">EcoLab · Proyecto de ciencias ambientales</p></article>`;
        }).join(""),
      );
      if (!total) {
        status.textContent = currentQuery
          ? "No encontramos aulas públicas con esa búsqueda."
          : "Todavía no hay aulas públicas para mostrar.";
      } else {
        status.textContent = `Mostrando ${currentOffset} de ${total} aulas públicas.`;
      }
      more.classList.toggle("hidden", currentOffset >= total);
    } catch (error) {
      status.textContent = `${error.message} Comprueba que la API esté iniciada.`;
      more.classList.add("hidden");
    } finally {
      loading = false;
      more.disabled = false;
    }
  }

  window.renderPublicHome = () => {
    if (!app.dataset.publicHome) {
      app.dataset.publicHome = "true";
      loadTemplate().catch((error) => {
        app.innerHTML = `<main class="grid min-h-screen place-items-center bg-night p-6 text-center text-slate-200"><div><h1 class="text-2xl font-bold">EcoLab</h1><p class="mt-3 text-sm text-slate-400">${escapeHtml(error.message)} Recarga la página para intentarlo de nuevo.</p></div></main>`;
      });
    }
  };
})();