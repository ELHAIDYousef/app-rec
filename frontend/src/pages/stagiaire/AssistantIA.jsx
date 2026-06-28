import { useState, useEffect, useRef } from "react";
import { stageAssistantAPI } from "api/stage";
import toast from "react-hot-toast";

const CANAUX = [
  { key: "chat",  label: "Chat IA",        icon: "💬" },
  { key: "vocal", label: "Entretien Vocal", icon: "🎙️" },
];

// ── Entretien Vocal IA ─────────────────────────────────────────

function EntretienVocal() {
  const [echanges,     setEchanges]     = useState([]);
  const [enregistrement, setEnregistrement] = useState(false);
  const [traitement,   setTraitement]   = useState(false);
  const [profil,       setProfil]       = useState(null);
  const [analyseEnCours, setAnalyseEnCours] = useState(false);
  const [pretAnalyse,  setPretAnalyse]  = useState(false);
  const [termine,      setTermine]      = useState(false);

  const mediaRecorderRef = useRef(null);
  const chunksRef        = useRef([]);
  const streamRef        = useRef(null);
  const bottomRef        = useRef(null);

  useEffect(() => {
    // Charger l'historique vocal existant
    stageAssistantAPI.historique({ canal: "vocal", page_size: 50 })
      .then(r => {
        const items = r.data.items;
        if (items.length > 0) {
          const paires = [];
          for (let i = 0; i < items.length - 1; i += 2) {
            paires.push({ user: items[i].contenu, assistant: items[i + 1]?.contenu });
          }
          setEchanges(paires);
          const nbUser = items.filter(m => m.role === "user").length;
          setPretAnalyse(nbUser >= 4);
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [echanges, traitement]);

  const lireVoix = (texte) => {
    if (!window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const utt = new SpeechSynthesisUtterance(texte);
    utt.lang = "fr-FR";
    utt.rate = 0.95;
    window.speechSynthesis.speak(utt);
  };

  const demarrerEnregistrement = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      chunksRef.current = [];

      const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : "audio/webm";

      const recorder = new MediaRecorder(stream, { mimeType });
      recorder.ondataavailable = e => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      recorder.start(100);
      mediaRecorderRef.current = recorder;
      setEnregistrement(true);
    } catch {
      toast.error("Microphone inaccessible — vérifiez les permissions du navigateur");
    }
  };

  const arreterEtEnvoyer = async () => {
    if (!mediaRecorderRef.current) return;
    setEnregistrement(false);
    setTraitement(true);

    await new Promise(resolve => {
      mediaRecorderRef.current.onstop = resolve;
      mediaRecorderRef.current.stop();
    });

    streamRef.current?.getTracks().forEach(t => t.stop());

    const blob = new Blob(chunksRef.current, { type: "audio/webm" });
    if (blob.size < 1000) {
      toast.error("Enregistrement trop court, réessayez");
      setTraitement(false);
      return;
    }

    const formData = new FormData();
    formData.append("audio", blob, "entretien.webm");

    try {
      const r = await stageAssistantAPI.vocalTranscrire(formData);
      const { transcription, reponse, pret_analyse } = r.data;

      setEchanges(prev => [...prev, { user: transcription, assistant: reponse }]);
      setPretAnalyse(pret_analyse);
      lireVoix(reponse);
    } catch (e) {
      const status = e.response?.status;
      const detail = e.response?.data?.detail || "";
      if (status === 503 || status === 502) {
        toast.error("Transcription indisponible — attendez 30 secondes et réessayez");
      } else {
        toast.error(detail || "Erreur lors du traitement vocal");
      }
    } finally {
      setTraitement(false);
    }
  };

  const terminerEntretien = async () => {
    window.speechSynthesis.cancel();
    setAnalyseEnCours(true);
    try {
      const r = await stageAssistantAPI.vocalAnalyserProfil();
      setProfil(r.data.profil);
      setTermine(true);
      toast.success("Profil extrait et enregistré avec succès !");
    } catch (e) {
      toast.error(e.response?.data?.detail || "Erreur lors de l'analyse");
    } finally {
      setAnalyseEnCours(false);
    }
  };

  const reinitialiser = async () => {
    window.speechSynthesis.cancel();
    await stageAssistantAPI.vider("vocal").catch(() => {});
    setEchanges([]);
    setProfil(null);
    setTermine(false);
    setPretAnalyse(false);
  };

  // ── Résultat profil ──
  if (termine && profil) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        <div style={{ background: "#ECFDF5", border: "1px solid #A7F3D0", borderRadius: 12, padding: 20 }}>
          <p style={{ fontWeight: 700, fontSize: 15, color: "#065F46", marginBottom: 4 }}>
            Entretien terminé — Profil extrait
          </p>
          <p style={{ fontSize: 13, color: "#047857" }}>{profil.resume_ia}</p>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          {[
            { label: "Niveau technique", value: profil.niveau_technique },
            { label: "Domaine recommandé", value: profil.domaine_recommande },
          ].map(item => (
            <div key={item.label} style={{ background: "var(--white)", border: "1px solid var(--gray2)", borderRadius: 10, padding: 14 }}>
              <p style={{ fontSize: 11, color: "var(--text3)", marginBottom: 4 }}>{item.label}</p>
              <p style={{ fontWeight: 600, fontSize: 14, color: "var(--text1)", textTransform: "capitalize" }}>{item.value || "—"}</p>
            </div>
          ))}
        </div>

        {[
          { label: "Compétences", items: profil.competences },
          { label: "Technologies maîtrisées", items: profil.technologies_maitrisees },
          { label: "Centres d'intérêt", items: profil.centres_interet },
        ].map(section => (
          <div key={section.label} style={{ background: "var(--white)", border: "1px solid var(--gray2)", borderRadius: 10, padding: 14 }}>
            <p style={{ fontSize: 12, fontWeight: 600, color: "var(--text2)", marginBottom: 8 }}>{section.label}</p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {(section.items || []).map((item, i) => (
                <span key={i} style={{ background: "var(--blue-light, #EFF6FF)", color: "var(--blue)", padding: "3px 10px", borderRadius: 20, fontSize: 12 }}>
                  {item}
                </span>
              ))}
            </div>
          </div>
        ))}

        <button className="btn btn-outline" onClick={reinitialiser}>
          Recommencer un entretien
        </button>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", minHeight: 520 }}>

      {/* Instructions */}
      {echanges.length === 0 && !traitement && (
        <div style={{ background: "#FFF7ED", border: "1px solid #FED7AA", borderRadius: 10, padding: "14px 18px", marginBottom: 16 }}>
          <p style={{ fontWeight: 700, fontSize: 13, color: "#92400E", marginBottom: 4 }}>Comment ça fonctionne ?</p>
          <p style={{ fontSize: 12, color: "#B45309", lineHeight: 1.7 }}>
            L'assistant vous posera des questions vocalement. Maintenez le bouton microphone pour répondre,
            relâchez pour envoyer. Après <strong>4 échanges minimum</strong>, vous pourrez terminer l'entretien
            pour extraire votre profil automatiquement.
          </p>
        </div>
      )}

      {/* Conversation */}
      <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: 14, paddingBottom: 12 }}>
        {echanges.length === 0 && !traitement && (
          <div style={{ textAlign: "center", color: "var(--text3)", padding: "40px 16px" }}>
            <p style={{ fontSize: 40, marginBottom: 8 }}>🎙️</p>
            <p style={{ fontWeight: 600 }}>Entretien Vocal IA</p>
            <p style={{ fontSize: 13, marginTop: 4 }}>Appuyez sur le microphone pour commencer</p>
          </div>
        )}

        {echanges.map((e, i) => (
          <div key={i} style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {/* Message stagiaire */}
            <div style={{ display: "flex", justifyContent: "flex-end" }}>
              <div style={{ maxWidth: "72%", background: "var(--blue)", color: "#fff", borderRadius: "16px 16px 4px 16px", padding: "10px 14px" }}>
                <p style={{ fontSize: 11, opacity: 0.7, marginBottom: 3 }}>Vous (transcrit)</p>
                <p style={{ fontSize: 13, lineHeight: 1.6, margin: 0 }}>{e.user}</p>
              </div>
            </div>
            {/* Réponse IA */}
            {e.assistant && (
              <div style={{ display: "flex", justifyContent: "flex-start", gap: 8, alignItems: "flex-start" }}>
                <div style={{ width: 32, height: 32, borderRadius: "50%", background: "#F3F4F6", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, flexShrink: 0 }}>🤖</div>
                <div style={{ maxWidth: "72%", background: "var(--white)", border: "1px solid var(--gray2)", borderRadius: "4px 16px 16px 16px", padding: "10px 14px" }}>
                  <p style={{ fontSize: 11, color: "var(--text3)", marginBottom: 3 }}>Assistant IA</p>
                  <p style={{ fontSize: 13, lineHeight: 1.6, margin: 0, color: "var(--text1)" }}>{e.assistant}</p>
                </div>
              </div>
            )}
          </div>
        ))}

        {traitement && (
          <div style={{ display: "flex", justifyContent: "flex-start", gap: 8, alignItems: "center" }}>
            <div style={{ width: 32, height: 32, borderRadius: "50%", background: "#F3F4F6", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>🤖</div>
            <div style={{ background: "var(--white)", border: "1px solid var(--gray2)", borderRadius: "4px 16px 16px 16px", padding: "10px 16px", fontSize: 13, color: "var(--text3)" }}>
              Transcription et analyse en cours...
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Contrôles */}
      <div style={{ borderTop: "1px solid var(--gray2)", paddingTop: 16, display: "flex", flexDirection: "column", gap: 12 }}>
        <div style={{ display: "flex", justifyContent: "center", gap: 16, alignItems: "center" }}>
          {/* Bouton microphone */}
          <button
            onMouseDown={demarrerEnregistrement}
            onMouseUp={arreterEtEnvoyer}
            onTouchStart={e => { e.preventDefault(); demarrerEnregistrement(); }}
            onTouchEnd={e => { e.preventDefault(); arreterEtEnvoyer(); }}
            disabled={traitement || analyseEnCours}
            style={{
              width: 72, height: 72, borderRadius: "50%", border: "none", cursor: "pointer",
              background: enregistrement ? "#EF4444" : "var(--blue)",
              color: "#fff", fontSize: 28,
              boxShadow: enregistrement ? "0 0 0 8px rgba(239,68,68,0.2)" : "0 4px 14px rgba(0,0,0,0.15)",
              transition: "all 0.2s", transform: enregistrement ? "scale(1.08)" : "scale(1)",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}
            title={enregistrement ? "Relâcher pour envoyer" : "Maintenir pour parler"}
          >
            {enregistrement ? "⏹" : "🎙️"}
          </button>
        </div>

        <p style={{ textAlign: "center", fontSize: 12, color: "var(--text3)" }}>
          {enregistrement
            ? "Parlez... Relâchez pour envoyer"
            : traitement
            ? "Traitement en cours..."
            : "Maintenez le bouton pour parler"}
        </p>

        {/* Bouton terminer + compteur */}
        {echanges.length > 0 && (
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: 12, color: "var(--text3)" }}>
              {echanges.length} échange{echanges.length > 1 ? "s" : ""}
              {!pretAnalyse && ` — encore ${4 - echanges.length} pour l'analyse`}
            </span>
            <button
              className="btn btn-primary btn-sm"
              onClick={terminerEntretien}
              disabled={!pretAnalyse || analyseEnCours || traitement}
            >
              {analyseEnCours ? "Analyse en cours..." : "Terminer et extraire profil"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Chat générique ─────────────────────────────────────────────

function ChatInterface({ canal }) {
  const [messages, setMessages] = useState([]);
  const [input,    setInput]    = useState("");
  const [loading,  setLoading]  = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => {
    stageAssistantAPI.historique({ canal, page_size: 30 })
      .then(r => setMessages(r.data.items.map(m => ({ role: m.role, content: m.contenu }))))
      .catch(() => {});
  }, [canal]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  const envoyer = async () => {
    const txt = input.trim();
    if (!txt || loading) return;
    setInput("");
    const newMsgs = [...messages, { role: "user", content: txt }];
    setMessages(newMsgs);
    setLoading(true);
    try {
      const r = await stageAssistantAPI.chat({ contenu: txt, canal });
      setMessages([...newMsgs, { role: "assistant", content: r.data.reponse }]);
    } catch {
      toast.error("Erreur de connexion à l'assistant");
    } finally { setLoading(false); }
  };

  const vider = async () => {
    await stageAssistantAPI.vider(canal);
    setMessages([]);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>
      <div style={{ flex: 1, overflowY: "auto", padding: "16px 4px 16px 0", display: "flex", flexDirection: "column", gap: 12 }}>
        {messages.length === 0 && (
          <div style={{ textAlign: "center", color: "var(--text3)", padding: "40px 16px" }}>
            <p style={{ fontSize: 32, marginBottom: 8 }}>💬</p>
            <p style={{ fontWeight: 600, marginBottom: 4 }}>Assistant IA 3LM Solutions</p>
            <p style={{ fontSize: 13 }}>Posez vos questions sur votre stage, votre profil, ou les sujets disponibles.</p>
          </div>
        )}
        {messages.map((m, i) => (
          <div key={i} style={{ display: "flex", justifyContent: m.role === "user" ? "flex-end" : "flex-start" }}>
            <div style={{
              maxWidth: "75%", padding: "10px 14px", borderRadius: 16,
              background: m.role === "user" ? "var(--blue)" : "var(--white)",
              color: m.role === "user" ? "#fff" : "var(--text1)",
              border: m.role === "assistant" ? "1px solid var(--gray2)" : "none",
              fontSize: 13, lineHeight: 1.6,
            }}>{m.content}</div>
          </div>
        ))}
        {loading && (
          <div style={{ display: "flex", justifyContent: "flex-start" }}>
            <div style={{ padding: "10px 14px", borderRadius: 16, background: "var(--white)",
              border: "1px solid var(--gray2)", fontSize: 13, color: "var(--text3)" }}>
              ●●● L'assistant réfléchit...
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <div style={{ borderTop: "1px solid var(--gray2)", padding: "14px 0 0" }}>
        <div style={{
          display: "flex", gap: 0, alignItems: "flex-end",
          border: "2px solid var(--blue)", borderRadius: 14,
          background: "var(--white)", overflow: "hidden",
          boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
        }}>
          <textarea
            rows={1}
            placeholder="Tapez votre message… (Entrée pour envoyer, Maj+Entrée pour nouvelle ligne)"
            value={input}
            onChange={e => {
              setInput(e.target.value);
              e.target.style.height = "auto";
              e.target.style.height = Math.min(e.target.scrollHeight, 140) + "px";
            }}
            onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); envoyer(); } }}
            style={{
              flex: 1, resize: "none", border: "none", outline: "none",
              fontSize: 14, lineHeight: 1.6, padding: "14px 16px",
              background: "transparent", color: "var(--text1)",
              minHeight: 52, maxHeight: 140, overflowY: "auto",
              fontFamily: "inherit",
            }}
          />
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "flex-end", padding: "8px 10px 8px 6px", gap: 4 }}>
            {messages.length > 0 && (
              <button
                onClick={vider}
                title="Effacer la conversation"
                style={{ background: "none", border: "none", cursor: "pointer", fontSize: 16, color: "var(--text3)", padding: "4px 6px", borderRadius: 6, lineHeight: 1 }}
              >
                🗑
              </button>
            )}
            <button
              onClick={envoyer}
              disabled={!input.trim() || loading}
              style={{
                background: input.trim() && !loading ? "var(--blue)" : "var(--gray2)",
                color: input.trim() && !loading ? "#fff" : "var(--text3)",
                border: "none", borderRadius: 10, cursor: input.trim() && !loading ? "pointer" : "not-allowed",
                padding: "8px 18px", fontSize: 13, fontWeight: 600,
                transition: "all 0.18s", whiteSpace: "nowrap",
              }}
            >
              {loading ? "●●●" : "Envoyer"}
            </button>
          </div>
        </div>
        <p style={{ fontSize: 11, color: "var(--text3)", marginTop: 6 }}>
          Entrée pour envoyer · Maj+Entrée pour une nouvelle ligne
        </p>
      </div>
    </div>
  );
}

// ── Page principale ────────────────────────────────────────────

export default function AssistantIA() {
  const [canal, setCanal] = useState("chat");

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Assistant IA</h1>
          <p className="page-subtitle">Chat textuel ou entretien vocal automatisé</p>
        </div>
      </div>

      <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
        {CANAUX.map(c => (
          <button
            key={c.key}
            className={`toggle-btn${canal === c.key ? " active" : ""}`}
            onClick={() => setCanal(c.key)}
            style={{ gap: 6, display: "flex", alignItems: "center" }}
          >
            {c.icon} {c.label}
          </button>
        ))}
      </div>

      {canal === "vocal" && (
        <div style={{ background: "#FFF7ED", border: "1px solid #FED7AA", borderRadius: 8,
          padding: "12px 16px", marginBottom: 16 }}>
          <p style={{ fontSize: 12, color: "#B45309" }}>
            L'entretien vocal est transcrit automatiquement par l'IA (Groq Whisper).
            À la fin, votre profil (compétences, niveau, domaine) est extrait et enregistré.
          </p>
        </div>
      )}

      <div className="card" style={{ height: "calc(100vh - 260px)", minHeight: 520, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        {canal === "vocal" ? <EntretienVocal /> : <ChatInterface canal={canal} />}
      </div>
    </div>
  );
}
