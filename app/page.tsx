import ToolHub from "./components/ToolHub";
import FeedbackButton from "./components/FeedbackButton";
import Logo from "./components/Logo";

export default function HomePage() {
  return (
    <main>
      <header>
        <div className="header-title-row">
          <Logo size={36} />
          <h1>Legeassistent</h1>
          <span className="beta-badge">Under utvikling</span>
        </div>
      </header>
      <ToolHub />
      <p className="footer-note">
        Ingen pasientdata lagres. Resultater kan kopieres direkte inn i journal.
      </p>
      <FeedbackButton />
    </main>
  );
}
