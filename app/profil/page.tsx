"use client";

import { useEffect, useRef, useState } from "react";
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
  cleanStamp,
  suggestStamp,
  readLocalPrefs,
  storePrefs
} from "@/lib/profile";
import { announceProfile, useProfile } from "@/app/components/useProfile";
import Logo from "@/app/components/Logo";
import SignaturePad, { InkPicker, SIGPAD_CSS } from "@/app/components/SignaturePad";
import StampView, { STAMP_CSS } from "@/app/components/StampView";
import { INKS, isImageSignature, isInk, type Ink, type SavedSignature } from "@/lib/drawing";
import SignatureUpload, { SIGUP_CSS, SignatureImageView } from "@/app/components/SignatureUpload";
import { deleteDrawnSignature, loadDrawnSignature, saveDrawnSignature } from "@/app/utils/signatureStore";

type Status = { kind: "ok" | "error"; text: string } | null;

export default function ProfilePage() {
  const router = useRouter();
  const { user, name, signature, phone, stamp } = useProfile();
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

  const [drawing, setDrawing] = useState<SavedSignature | null>(null);
  const [savedDrawing, setSavedDrawing] = useState<SavedSignature | null>(null);
  const [uploading, setUploading] = useState(false);
  const [drawInk, setDrawInk] = useState<Ink>("blaa");
  const [drawStatus, setDrawStatus] = useState<Status>(null);
  const [savingDraw, setSavingDraw] = useState(false);
  const drawTouchedRef = useRef(false);

  const [stampDraft, setStampDraft] = useState("");
  const [stampInk, setStampInk] = useState<Ink>("blaa");
  const [stampStatus, setStampStatus] = useState<Status>(null);
  const [savingStamp, setSavingStamp] = useState(false);

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
    setStampDraft(stamp);
  }, [stamp]);

  useEffect(() => {
    const ink = user?.user_metadata?.stamp_ink;
    if (isInk(ink)) setStampInk(ink);
  }, [user]);

  useEffect(() => {
    if (!user?.id) return;
    loadDrawnSignature(user.id).then((d) => {
      setSavedDrawing(d);
      // Never replace something the user has started drawing while this loaded.
      if (d && !drawTouchedRef.current) {
        setDrawing(d);
        setDrawInk(d.ink);
      }
    });
  }, [user?.id]);

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

  async function saveDrawing() {
    if (!user || !drawing) return;
    setSavingDraw(true);
    setDrawStatus(null);
    const next = { ...drawing, ink: drawInk };
    const err = await saveDrawnSignature(user.id, next);
    setSavingDraw(false);
    if (err) {
      setDrawStatus({ kind: "error", text: authErrorMessage(err) });
      return;
    }
    setSavedDrawing(next);
    setDrawStatus({ kind: "ok", text: "Den håndskrevne signaturen er lagret." });
  }

  async function removeDrawing() {
    if (!user) return;
    if (savedDrawing && !window.confirm("Slette den lagrede håndskrevne signaturen?")) return;
    setDrawStatus(null);
    if (savedDrawing) {
      const err = await deleteDrawnSignature(user.id);
      if (err) {
        setDrawStatus({ kind: "error", text: authErrorMessage(err) });
        return;
      }
      setDrawStatus({ kind: "ok", text: "Den håndskrevne signaturen er slettet." });
    }
    setSavedDrawing(null);
    setDrawing(null);
  }

  async function saveStamp(e: React.FormEvent) {
    e.preventDefault();
    setSavingStamp(true);
    setStampStatus(null);
    const clean = cleanStamp(stampDraft);
    const { data, error } = await createClient().auth.updateUser({ data: { stamp: clean, stamp_ink: stampInk } });
    setSavingStamp(false);
    if (error) {
      setStampStatus({ kind: "error", text: authErrorMessage(error.message) });
      return;
    }
    setStampDraft(clean);
    if (data.user) announceProfile(data.user);
    setStampStatus({ kind: "ok", text: "Stempelet er lagret." });
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
      <style dangerouslySetInnerHTML={{ __html: SIGPAD_CSS + STAMP_CSS + SIGUP_CSS }} />
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

      <section className="profile-card" aria-labelledby="handskrift-h">
        <h2 id="handskrift-h">Håndskrevet signatur</h2>
        <p>
          Tegn med mus, styreflate, penn eller finger, eller last opp et bilde av signaturen din på papir. Signaturen kan
          legges på PDF-skjemaer. Den lagres bare på kontoen din, og bare du kan se den. Bildet du laster opp, lagres ikke;
          bare den rensede signaturen.
        </p>
        {uploading ? (
          <SignatureUpload
            ink={drawInk}
            onCancel={() => setUploading(false)}
            onUse={(img) => {
              drawTouchedRef.current = true;
              setDrawing(img);
              setDrawStatus(null);
              setUploading(false);
            }}
          />
        ) : isImageSignature(drawing) ? (
          <div className="sig-image-box">
            <span style={{ display: "block", width: `min(100%, ${Math.round((150 * drawing.w) / drawing.h)}px)` }}>
              <SignatureImageView sig={drawing} ink={drawInk} />
            </span>
          </div>
        ) : (
          <SignaturePad
            value={drawing}
            ink={drawInk}
            onChange={(d) => {
              drawTouchedRef.current = true;
              setDrawing(d);
              setDrawStatus(null);
            }}
          />
        )}
        {!uploading && <div className="profile-row sig-actions">
          <InkPicker
            value={drawInk}
            inks={INKS}
            onChange={(i) => {
              setDrawInk(i);
              setDrawing((d) => (d ? { ...d, ink: i } : d));
            }}
          />
          <button type="button" className="profile-button secondary" onClick={() => setUploading(true)}>
            Last opp bilde
          </button>
          <button type="button" className="profile-button secondary" onClick={() => setDrawing(null)} disabled={!drawing}>
            {isImageSignature(drawing) ? "Tegn i stedet" : "Tøm"}
          </button>
          <button
            type="button"
            className="profile-button"
            onClick={saveDrawing}
            disabled={savingDraw || !drawing || JSON.stringify({ ...drawing, ink: drawInk }) === JSON.stringify(savedDrawing)}
          >
            {savingDraw ? "Lagrer …" : "Lagre håndskrift"}
          </button>
          {savedDrawing && (
            <button type="button" className="profile-button secondary" onClick={removeDrawing}>
              Slett lagret
            </button>
          )}
        </div>}
        {drawStatus && <p className={`profile-status ${drawStatus.kind}`} role="status">{drawStatus.text}</p>}
      </section>

      <section className="profile-card" aria-labelledby="stempel-h">
        <h2 id="stempel-h">Stempel</h2>
        <p>Legges på PDF-skjemaer som et stempel med ramme. Første linje skrives med fet skrift.</p>
        <form className="profile-form" onSubmit={saveStamp}>
          <label>
            Stempeltekst (inntil 6 linjer)
            <textarea
              className="profile-textarea"
              value={stampDraft}
              onChange={(e) => setStampDraft(e.target.value)}
              rows={5}
              placeholder={"Legefornavn Legeetternavn\nLege\nHPR-nr. 1234567\nLegesenter A\nTlf. 22 33 44 55"}
            />
          </label>
          <div className="profile-row">
            <InkPicker value={stampInk} inks={INKS} onChange={setStampInk} />
            {!stampDraft.trim() && (name || signature) && (
              <button type="button" className="profile-button secondary" onClick={() => setStampDraft(suggestStamp(name, signature, phone))}>
                Lag forslag
              </button>
            )}
            <button
              type="submit"
              className="profile-button"
              disabled={savingStamp || (cleanStamp(stampDraft) === stamp && stampInk === (isInk(user.user_metadata?.stamp_ink) ? user.user_metadata.stamp_ink : "blaa"))}
            >
              {savingStamp ? "Lagrer …" : "Lagre stempel"}
            </button>
          </div>
        </form>
        {stampDraft.trim() && (
          <div className="stamp-preview" aria-label="Forhåndsvisning av stempelet">
            <StampView text={cleanStamp(stampDraft)} ink={stampInk} scale={1.6} />
          </div>
        )}
        {stampStatus && <p className={`profile-status ${stampStatus.kind}`} role="status">{stampStatus.text}</p>}
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
