"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { MIN_PASSWORD_LENGTH, authErrorMessage } from "@/lib/auth";
import {
  COLOR_OPTIONS,
  DEFAULT_PREFS,
  FONT_OPTIONS,
  MENU_OPTIONS,
  type Prefs,
  cleanPhone,
  cleanSignature,
  readLocalPrefs,
  storePrefs
} from "@/lib/profile";
import { announceProfile, useProfile } from "@/app/components/useProfile";
import Logo from "@/app/components/Logo";

type Status = { kind: "ok" | "error"; text: string } | null;

export default function ProfilePage() {
  const router = useRouter();
  const { user, name, signature, phone } = useProfile();
  const [prefs, setPrefs] = useState<Prefs>(DEFAULT_PREFS);
  const [prefsStatus, setPrefsStatus] = useState<Status>(null);

  const [nameDraft, setNameDraft] = useState("");
  const [nameStatus, setNameStatus] = useState<Status>(null);
  const [savingName, setSavingName] = useState(false);

  const [phoneDraft, setPhoneDraft] = useState("");
  const [phoneStatus, setPhoneStatus] = useState<Status>(null);
  const [savingPhone, setSavingPhone] = useState(false);

  const [sigDraft, setSigDraft] = useState("");
  const [sigStatus, setSigStatus] = useState<Status>(null);
  const [savingSig, setSavingSig] = useState(false);

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [pwStatus, setPwStatus] = useState<Status>(null);
  const [savingPw, setSavingPw] = useState(false);

  useEffect(() => {
    if (user === null) router.replace("/login?next=/profil");
  }, [user, router]);

  useEffect(() => {
    setNameDraft(name);
  }, [name]);

  useEffect(() => {
    setPhoneDraft(phone);
  }, [phone]);

  useEffect(() => {
    setSigDraft(signature);
  }, [signature]);

  useEffect(() => {
    setPrefs(readLocalPrefs());
  }, [user]);

  async function choose(patch: Partial<Prefs>) {
    const next = { ...prefs, ...patch };
    setPrefs(next);
    storePrefs(next);
    setPrefsStatus(null);
    const { data, error } = await createClient().auth.updateUser({ data: { prefs: next } });
    if (error) setPrefsStatus({ kind: "error", text: `Brukes her, men ble ikke lagret på kontoen: ${authErrorMessage(error.message)}` });
    else {
      setPrefsStatus({ kind: "ok", text: "Lagret" });
      if (data.user) announceProfile(data.user);
    }
  }

  async function saveName(e: React.FormEvent) {
    e.preventDefault();
    setSavingName(true);
    setNameStatus(null);
    const { data, error } = await createClient().auth.updateUser({ data: { full_name: nameDraft.trim() } });
    setSavingName(false);
    if (error) {
      setNameStatus({ kind: "error", text: authErrorMessage(error.message) });
      return;
    }
    if (data.user) announceProfile(data.user);
    setNameStatus({ kind: "ok", text: "Navnet er lagret." });
  }

  async function savePhone(e: React.FormEvent) {
    e.preventDefault();
    setSavingPhone(true);
    setPhoneStatus(null);
    const clean = cleanPhone(phoneDraft);
    const { data, error } = await createClient().auth.updateUser({ data: { phone: clean } });
    setSavingPhone(false);
    if (error) {
      setPhoneStatus({ kind: "error", text: authErrorMessage(error.message) });
      return;
    }
    setPhoneDraft(clean);
    if (data.user) announceProfile(data.user);
    setPhoneStatus({ kind: "ok", text: "Telefonnummeret er lagret." });
  }

  async function saveSignature(e: React.FormEvent) {
    e.preventDefault();
    setSavingSig(true);
    setSigStatus(null);
    const clean = cleanSignature(sigDraft);
    const { data, error } = await createClient().auth.updateUser({ data: { signature: clean } });
    setSavingSig(false);
    if (error) {
      setSigStatus({ kind: "error", text: authErrorMessage(error.message) });
      return;
    }
    setSigDraft(clean);
    if (data.user) announceProfile(data.user);
    setSigStatus({ kind: "ok", text: "Signaturen er lagret." });
  }

  async function savePassword(e: React.FormEvent) {
    e.preventDefault();
    setPwStatus(null);
    if (password.length < MIN_PASSWORD_LENGTH) {
      setPwStatus({ kind: "error", text: `Passordet må være minst ${MIN_PASSWORD_LENGTH} tegn.` });
      return;
    }
    if (password !== confirm) {
      setPwStatus({ kind: "error", text: "Passordene er ikke like." });
      return;
    }
    setSavingPw(true);
    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ password });
    if (error) {
      setSavingPw(false);
      setPwStatus({ kind: "error", text: authErrorMessage(error.message) });
      return;
    }
    // Other devices must log in again with the new password; this one stays signed in.
    await supabase.auth.signOut({ scope: "others" });
    setSavingPw(false);
    setPassword("");
    setConfirm("");
    setPwStatus({ kind: "ok", text: "Passordet er endret. Andre enheter er logget ut." });
  }

  if (!user) {
    return (
      <main className="profile-page">
        <p>{user === null ? "Sender deg til innlogging …" : "Laster …"}</p>
      </main>
    );
  }

  return (
    <main className="profile-page">
      <div className="profile-head">
        <Logo size={34} />
        <h1>Profil</h1>
        <Link href="/">← Til Legeassistent</Link>
      </div>

      <section className="profile-card" aria-labelledby="navn-h">
        <h2 id="navn-h">Navn</h2>
        <p>
          Brukes på PDF-skjemaer du fyller ut, og som signatur i ferdigskrevne tekster. Innlogget som {user.email}.
        </p>
        <form className="profile-form" onSubmit={saveName}>
          <label>
            Navn og tittel
            <input
              value={nameDraft}
              onChange={(e) => setNameDraft(e.target.value)}
              autoComplete="name"
              placeholder="F.eks. Kari Nordmann, lege"
            />
          </label>
          <button type="submit" className="profile-button" disabled={savingName || nameDraft.trim() === name}>
            {savingName ? "Lagrer …" : "Lagre navn"}
          </button>
        </form>
        {nameStatus && <p className={`profile-status ${nameStatus.kind}`} role="status">{nameStatus.text}</p>}
      </section>

      <section className="profile-card" aria-labelledby="telefon-h">
        <h2 id="telefon-h">Telefon</h2>
        <p>Brukes som hurtigvalg når du fyller ut PDF-skjemaer.</p>
        <form className="profile-form" onSubmit={savePhone}>
          <label>
            Telefonnummer
            <input
              type="tel"
              value={phoneDraft}
              onChange={(e) => setPhoneDraft(e.target.value)}
              autoComplete="tel"
              inputMode="tel"
              maxLength={30}
              placeholder="F.eks. 22 33 44 55"
            />
          </label>
          <button type="submit" className="profile-button" disabled={savingPhone || cleanPhone(phoneDraft) === phone}>
            {savingPhone ? "Lagrer …" : "Lagre telefon"}
          </button>
        </form>
        {phoneStatus && <p className={`profile-status ${phoneStatus.kind}`} role="status">{phoneStatus.text}</p>}
      </section>

      <section className="profile-card" aria-labelledby="signatur-h">
        <h2 id="signatur-h">Signatur</h2>
        <p>
          Brukes der det står {"{signatur}"} i fraser, i Helsenorge-meldingen og som hurtigvalg når du fyller ut PDF-skjemaer.
          Uten signatur brukes navnet.
        </p>
        <form className="profile-form" onSubmit={saveSignature}>
          <label>
            Signatur (inntil 6 linjer)
            <textarea
              className="profile-textarea"
              value={sigDraft}
              onChange={(e) => setSigDraft(e.target.value)}
              rows={4}
              placeholder={"Legefornavn Legeetternavn\nLege\nLegesenter A"}
            />
          </label>
          <div className="profile-row">
            {!sigDraft.trim() && name && (
              <button
                type="button"
                className="profile-button secondary"
                onClick={() => setSigDraft(`${name}\nLege\n`)}
              >
                Start med navnet
              </button>
            )}
            <button type="submit" className="profile-button" disabled={savingSig || cleanSignature(sigDraft) === signature}>
              {savingSig ? "Lagrer …" : "Lagre signatur"}
            </button>
          </div>
        </form>
        {sigStatus && <p className={`profile-status ${sigStatus.kind}`} role="status">{sigStatus.text}</p>}
      </section>

      <section className="profile-card" aria-labelledby="visning-h">
        <h2 id="visning-h">Visning</h2>
        <p>Endringene vises med en gang og følger kontoen din til andre enheter.</p>

        <div className="profile-group">
          <h3>Meny</h3>
          <div className="profile-options" role="radiogroup" aria-label="Meny">
            {MENU_OPTIONS.map((o) => (
              <button
                key={o.value}
                type="button"
                role="radio"
                aria-checked={prefs.menu === o.value}
                className="profile-option"
                onClick={() => choose({ menu: o.value })}
              >
                <span className={`profile-menu-demo ${o.value}`} aria-hidden="true">
                  <span className="bar"><i /><i /><i /><i /></span>
                  <span className="body" />
                </span>
                <strong>{o.label}</strong>
                <small>{o.hint}</small>
              </button>
            ))}
          </div>
        </div>

        <div className="profile-group">
          <h3>Font</h3>
          <div className="profile-options" role="radiogroup" aria-label="Font">
            {FONT_OPTIONS.map((o) => (
              <button
                key={o.value}
                type="button"
                role="radio"
                aria-checked={prefs.font === o.value}
                className="profile-option"
                onClick={() => choose({ font: o.value })}
              >
                <span className="profile-sample" style={{ fontFamily: o.sample }}>Aa Øø 123</span>
                <strong>{o.label}</strong>
                <small>{o.hint}</small>
              </button>
            ))}
          </div>
        </div>

        <div className="profile-group">
          <h3>Farge</h3>
          <div className="profile-options" role="radiogroup" aria-label="Farge">
            {COLOR_OPTIONS.map((o) => (
              <button
                key={o.value}
                type="button"
                role="radio"
                aria-checked={prefs.farge === o.value}
                className="profile-option"
                onClick={() => choose({ farge: o.value })}
              >
                <span className="profile-swatch" aria-hidden="true">
                  <span style={{ background: o.swatch[0] }} />
                  <span style={{ background: o.swatch[1] }} />
                </span>
                <strong>{o.label}</strong>
              </button>
            ))}
          </div>
        </div>
        {prefsStatus && <p className={`profile-status ${prefsStatus.kind}`} role="status">{prefsStatus.text}</p>}
      </section>

      <section className="profile-card" aria-labelledby="passord-h">
        <h2 id="passord-h">Passord</h2>
        <p>Du forblir innlogget her. Andre enheter må logge inn på nytt.</p>
        <form className="profile-form" onSubmit={savePassword}>
          <label>
            Nytt passord (minst {MIN_PASSWORD_LENGTH} tegn)
            <input type="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          </label>
          <label>
            Gjenta passord
            <input type="password" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required />
          </label>
          <button type="submit" className="profile-button" disabled={savingPw}>
            {savingPw ? "Endrer …" : "Endre passord"}
          </button>
        </form>
        {pwStatus && <p className={`profile-status ${pwStatus.kind}`} role="status">{pwStatus.text}</p>}
      </section>
    </main>
  );
}
