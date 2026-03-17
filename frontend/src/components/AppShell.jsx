export default function AppShell({ children }) {
  return (
    <div className="dc-app-shell">
      <div className="dc-background" aria-hidden="true">
        <div className="dc-background__glow dc-background__glow--primary" />
        <div className="dc-background__glow dc-background__glow--secondary" />
        <div className="dc-background__grid" />
        <div className="dc-background__noise" />
      </div>
      <div className="dc-app-chrome">{children}</div>
    </div>
  );
}
