"use client";

import { useState } from "react";

type FeedbackCategory = "feil" | "forslag" | "annet";

const categoryLabels: Record<FeedbackCategory, string> = {
  feil: "Noe fungerer ikke",
  forslag: "Forslag til ny funksjon",
  annet: "Annet"
};

export default function FeedbackButton() {
  const [isOpen, setIsOpen] = useState(false);
  const [category, setCategory] = useState<FeedbackCategory>("feil");
  const [message, setMessage] = useState("");
  const [email, setEmail] = useState("");
  const [isSubmitted, setIsSubmitted] = useState(false);

  const closeModal = () => {
    setIsOpen(false);
    setIsSubmitted(false);
    setCategory("feil");
    setMessage("");
    setEmail("");
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;
    setIsSubmitted(true);
  };

  return (
    <>
      <button
        type="button"
        className="feedback-fab"
        onClick={() => setIsOpen(true)}
        title="Gi tilbakemelding"
        aria-label="Gi tilbakemelding"
      >
        <span className="feedback-fab-icon">💬</span>
        <span className="feedback-fab-label">Tilbakemelding</span>
      </button>

      {isOpen && (
        <div className="feedback-overlay" onClick={closeModal}>
          <div className="feedback-modal" onClick={(e) => e.stopPropagation()}>
            <div className="feedback-modal-header">
              <h3>Gi tilbakemelding</h3>
              <button type="button" className="feedback-close" onClick={closeModal} aria-label="Lukk">
                ✕
              </button>
            </div>

            {isSubmitted ? (
              <div className="feedback-success">
                <span className="feedback-success-icon">✓</span>
                <p>Takk for tilbakemeldingen!</p>
                <button type="button" className="feedback-submit" onClick={closeModal}>
                  Lukk
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="feedback-form">
                <div className="feedback-category-group">
                  {(Object.keys(categoryLabels) as FeedbackCategory[]).map((key) => (
                    <button
                      key={key}
                      type="button"
                      className={`feedback-category-chip ${category === key ? "active" : ""}`}
                      onClick={() => setCategory(key)}
                    >
                      {categoryLabels[key]}
                    </button>
                  ))}
                </div>

                <textarea
                  className="feedback-textarea"
                  placeholder="Beskriv hva som skjedde, eller hva du ønsker deg..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={5}
                  autoFocus
                />

                <input
                  className="feedback-email-input"
                  type="email"
                  placeholder="E-post (valgfritt, hvis vi skal følge opp)"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />

                <button type="submit" className="feedback-submit" disabled={!message.trim()}>
                  Send tilbakemelding
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
}
