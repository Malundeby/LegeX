import ModernWidgetDashboard from "../components/ModernWidgetDashboard";

export default function WidgetsPage() {
  return (
    <main>
      <header>
        <h1>Mine Widgets</h1>
        <p>Notater og huskelister - alt på ett sted</p>
        <p className="header-tagline">Drag & drop for å organisere</p>
      </header>
      <ModernWidgetDashboard />
      <p className="footer-note">
        Uten innlogging lagres siden bare i nettleseren. Innlogget lagres den på kontoen din.
      </p>
    </main>
  );
}
