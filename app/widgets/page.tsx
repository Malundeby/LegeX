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
        Alle data lagres lokalt i nettleseren. Ingen persondata sendes til server.
      </p>
    </main>
  );
}
