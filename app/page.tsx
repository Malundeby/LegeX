import ToolHub from "./components/ToolHub";
import FeedbackButton from "./components/FeedbackButton";

export default function HomePage() {
  return (
    <main>
      <header>
        <div className="header-title-row">
          <h1>Legeverktøy</h1>
          <span className="beta-badge">Under utvikling</span>
        </div>
        <p>Designet for en enklere klinisk hverdag.</p>
        <p className="header-tagline">Av leger, for leger.</p>
      </header>
      <ToolHub />
      <p className="footer-note">
        Ingen persondata lagres. Resultater kan kopieres direkte inn i journal.
      </p>
      <FeedbackButton />
    </main>
  );
}
