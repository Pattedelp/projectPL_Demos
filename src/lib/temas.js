export const TEMAS = {
  azul: {
    nombre: "Azul",
    colorMuestra: "#378ADD",
    background: "oklch(0.22 0.015 240)",
    card: "oklch(0.27 0.018 240)",
    border: "oklch(1 0 0 / 10%)",
    sidebar: "oklch(0.16 0.02 240)",
    primary: "oklch(0.65 0.18 240)",
    primaryForeground: "oklch(0.15 0.02 240)",
    ring: "oklch(0.65 0.18 240)",
  },
  naranja: {
    nombre: "Naranja",
    colorMuestra: "#D85A30",
    background: "oklch(0.22 0.012 40)",
    card: "oklch(0.27 0.015 40)",
    border: "oklch(1 0 0 / 10%)",
    sidebar: "oklch(0.19 0.014 40)",
    secondary: "oklch(0.32 0.018 40)",
    primary: "oklch(0.65 0.18 40)",
    primaryForeground: "oklch(0.15 0.02 40)",
    ring: "oklch(0.65 0.18 40)",
  },
  verde: {
    nombre: "Verde",
    colorMuestra: "#1D9E75",
    background: "oklch(0.18 0.015 160)",
    card: "oklch(0.23 0.02 160)",
    border: "oklch(1 0 0 / 9%)",
    sidebar: "oklch(0.13 0.018 160)",
    secondary: "oklch(0.28 0.022 160)",
    primary: "oklch(0.6 0.14 160)",
    primaryForeground: "oklch(0.15 0.02 160)",
    ring: "oklch(0.6 0.14 160)",
  },
  indigo: {
    nombre: "Índigo",
    colorMuestra: "#7F77DD",
    background: "oklch(0.25 0.02 280)",
    card: "oklch(0.3 0.025 280)",
    border: "oklch(1 0 0 / 11%)",
    sidebar: "oklch(0.18 0.022 280)",
    secondary: "oklch(0.35 0.025 280)",
    primary: "oklch(0.6 0.18 280)",
    primaryForeground: "oklch(0.15 0.02 280)",
    ring: "oklch(0.6 0.18 280)",
  },
};

export function aplicarTema(claveTema) {
  const tema = TEMAS[claveTema] || TEMAS.naranja;
  const root = document.documentElement;

  root.style.setProperty("--background", tema.background);
  root.style.setProperty("--card", tema.card);
  root.style.setProperty("--popover", tema.card);
  root.style.setProperty("--border", tema.border);
  root.style.setProperty("--input", tema.border);
  root.style.setProperty("--sidebar", tema.sidebar);
  root.style.setProperty("--secondary", tema.secondary);
  root.style.setProperty("--accent", tema.secondary);
  root.style.setProperty("--primary", tema.primary);
  root.style.setProperty("--primary-foreground", tema.primaryForeground);
  root.style.setProperty("--ring", tema.ring);
  root.style.setProperty("--sidebar-primary", tema.primary);
  root.style.setProperty("--sidebar-ring", tema.ring);
}

export function guardarTemaLocal(claveTema) {
  localStorage.setItem("workpilot_tema", claveTema);
}

export function cargarTemaLocal() {
  return localStorage.getItem("workpilot_tema") || "azul";
}
