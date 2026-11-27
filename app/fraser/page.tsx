import Frasekatalog from "@/app/components/fraser/Frasekatalog";

export const metadata = {
  title: "Fraser · Legeassistent",
};

export default function FraserPage() {
  return (
    <main style={{ maxWidth: 1180, padding: "24px 24px 48px" }}>
      <Frasekatalog />
    </main>
  );
}
