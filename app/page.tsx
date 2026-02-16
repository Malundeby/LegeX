import ToolHub from "./components/ToolHub";

export default function HomePage() {
  return (
    <main>
      <header>
        <h1>Legeverktøy</h1>
        <p>Designet for en enklere klinisk hverdag.</p>
        <p className="header-tagline">Av leger, for leger.</p>
      </header>
      <ToolHub />
      <p className="footer-note">
        Ingen persondata lagres. Resultater kan kopieres direkte inn i journal.
      </p>
    </main>
  );
}
