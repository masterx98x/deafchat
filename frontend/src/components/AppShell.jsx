export default function AppShell({ children, transitionOverlay = null, isArriving = false }) {
  return (
    <div className="dc-app-shell">
      <div className="dc-background dc-background--lite" aria-hidden="true">
        <div className="dc-background__glow dc-background__glow--primary" />
        <div className="dc-background__glow dc-background__glow--secondary" />
        <div className="dc-background__particles">
          <span className="dc-background__particle dc-background__particle--1" />
          <span className="dc-background__particle dc-background__particle--2" />
          <span className="dc-background__particle dc-background__particle--3" />
          <span className="dc-background__particle dc-background__particle--4" />
        </div>
        <div className="dc-background__grid" />
        <div className="dc-background__noise" />
      </div>
      <div className={`dc-app-chrome${isArriving ? ' dc-app-chrome--arriving' : ''}`}>{children}</div>
      {transitionOverlay}
    </div>
  );
}
