import TakstQuiz from "@/app/components/TakstQuiz";

export const metadata = {
  title: "Takstquiz | Legeassistent",
  description: "Test deg selv på takstkoder for helsesekretærer.",
};

export default function QuizPage() {
  return (
    <main>
      <TakstQuiz />
    </main>
  );
}
