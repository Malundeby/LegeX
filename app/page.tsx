import ToolHub from "./components/ToolHub";
import FeedbackButton from "./components/FeedbackButton";

export default function HomePage() {
  return (
    <main>
      <header>
        <div className="header-title-row">
          <span className="header-mark" aria-hidden="true">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M8 2V14M2 8H14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </span>
          <h1>Legeverktøy</h1>
          <span className="beta-badge">Under utvikling</span>
        </div>
        <p>Designet for en enklere klinisk hverdag.</p>
        <p className="header-tagline">Av leger, for leger.</p>
      </header>
      <ToolHub />
      <p className="footer-note">
        Ingen pasientdata lagres. Resultater kan kopieres direkte inn i journal.
      </p>
      <FeedbackButton />
    </main>
  );
}
