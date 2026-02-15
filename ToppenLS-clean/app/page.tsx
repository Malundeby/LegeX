import ToolHub from "./components/ToolHub";

export default function HomePage() {
  return (
    <main>
      <header>
        <h1>Nyttige fastlegeverktøy</h1>
        <p>Rask tilgang til skåringsverktøy og PDF-er – uten ekstra klikk.</p>
      </header>
      <ToolHub />
      <p className="footer-note">
        Ingen persondata lagres. Resultater kan kopieres direkte inn i journal.
      </p>
    </main>
  );
}
