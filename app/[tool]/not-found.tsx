import Link from "next/link";

export default function NotFound() {
  return (
    <main>
      <header>
        <h1>Verktøy ikke funnet</h1>
        <p>Beklager, vi fant ikke verktøyet du lette etter.</p>
      </header>
      <div className="section" style={{ marginTop: 20 }}>
        <h2 style={{ margin: "0 0 16px" }}>Tilgjengelige verktøy:</h2>
        <div className="list">
          <Link href="/madrs" className="button">MADRS</Link>
          <Link href="/gad7" className="button">GAD-7</Link>
          <Link href="/bmi" className="button">BMI-kalkulator</Link>
          <Link href="/fib-4" className="button">FIB-4</Link>
        </div>
        <p style={{ marginTop: 20 }}>
          <Link href="/" style={{ color: "var(--primary)" }}>← Tilbake til forsiden</Link>
        </p>
      </div>
    </main>
  );
}
