import Takstkartotek from "@/app/components/Takstkartotek";

export const metadata = {
  title: "Takstkartoteket"
};

export default function TakstkartotekPage() {
  return (
    <main style={{ maxWidth: 1180, padding: "24px 24px 48px" }}>
      <Takstkartotek />
    </main>
  );
}
