const themes = {
  dark: {
    '--dc-theme-name': 'dark',
    '--dc-font-body': '"Inter", "Segoe UI", system-ui, sans-serif',
    '--dc-font-display': '"Space Grotesk", "Inter", system-ui, sans-serif',
    '--dc-bg-base': '#0B0B0F',
    '--dc-bg-elevated': '#111118',
    '--dc-bg-elevated-strong': '#14141C',
    '--dc-bg-panel': 'rgba(20, 20, 28, 0.7)',
    '--dc-bg-panel-solid': '#14141C',
    '--dc-bg-panel-soft': 'rgba(17, 17, 24, 0.88)',
    '--dc-bg-input': '#111118',
    '--dc-bg-code': '#17171F',
    '--dc-text-primary': '#FFFFFF',
    '--dc-text-body': '#D1D5DB',
    '--dc-text-secondary': '#A1A1AA',
    '--dc-text-muted': '#71717A',
    '--dc-border-subtle': 'rgba(255, 255, 255, 0.06)',
    '--dc-border-strong': 'rgba(255, 255, 255, 0.12)',
    '--dc-shadow-soft': '0 10px 30px rgba(0, 0, 0, 0.4)',
    '--dc-shadow-hover': '0 18px 36px rgba(0, 0, 0, 0.42)',
    '--dc-accent': '#FF3B5C',
    '--dc-accent-hover': '#FF5C75',
    '--dc-accent-soft': 'rgba(255, 59, 92, 0.15)',
    '--dc-accent-softer': 'rgba(255, 59, 92, 0.08)',
    '--dc-success': '#34D399',
    '--dc-warning': '#F59E0B',
    '--dc-danger': '#FB7185',
    '--dc-radius-card': '20px',
    '--dc-radius-panel': '16px',
    '--dc-radius-pill': '999px',
    '--dc-shell-width': 'min(1320px, calc(100% - 32px))'
  },
  light: {
    '--dc-theme-name': 'light',
    '--dc-font-body': '"Inter", "Segoe UI", system-ui, sans-serif',
    '--dc-font-display': '"Space Grotesk", "Inter", system-ui, sans-serif',
    '--dc-bg-base': '#F5F5F7',
    '--dc-bg-elevated': '#FFFFFF',
    '--dc-bg-elevated-strong': '#FFFFFF',
    '--dc-bg-panel': 'rgba(255, 255, 255, 0.84)',
    '--dc-bg-panel-solid': '#FFFFFF',
    '--dc-bg-panel-soft': 'rgba(255, 255, 255, 0.96)',
    '--dc-bg-input': '#FFFFFF',
    '--dc-bg-code': '#F1F5F9',
    '--dc-text-primary': '#111111',
    '--dc-text-body': '#374151',
    '--dc-text-secondary': '#6B7280',
    '--dc-text-muted': '#9CA3AF',
    '--dc-border-subtle': 'rgba(17, 24, 39, 0.08)',
    '--dc-border-strong': 'rgba(17, 24, 39, 0.16)',
    '--dc-shadow-soft': '0 14px 36px rgba(15, 23, 42, 0.12)',
    '--dc-shadow-hover': '0 18px 40px rgba(15, 23, 42, 0.16)',
    '--dc-accent': '#FF3B5C',
    '--dc-accent-hover': '#FF5C75',
    '--dc-accent-soft': 'rgba(255, 59, 92, 0.14)',
    '--dc-accent-softer': 'rgba(255, 59, 92, 0.08)',
    '--dc-success': '#059669',
    '--dc-warning': '#D97706',
    '--dc-danger': '#E11D48',
    '--dc-radius-card': '20px',
    '--dc-radius-panel': '16px',
    '--dc-radius-pill': '999px',
    '--dc-shell-width': 'min(1320px, calc(100% - 32px))'
  }
};

export function applyTheme(themeName = 'dark') {
  const selectedTheme = themes[themeName] ?? themes.dark;
  const root = document.documentElement;

  Object.entries(selectedTheme).forEach(([property, value]) => {
    root.style.setProperty(property, value);
  });

  root.dataset.theme = themeName;

  const themeColor = selectedTheme['--dc-bg-base'] ?? '#0B0B0F';
  const metaThemeColor = document.querySelector('meta[name="theme-color"]');
  if (metaThemeColor) {
    metaThemeColor.setAttribute('content', themeColor);
  }
}

export { themes };
