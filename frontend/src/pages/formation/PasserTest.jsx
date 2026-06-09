import { useState, useEffect, useRef } from "react";
import { employeAPI } from "api/formation";

export default function PasserTest({ formation, onTermine, onRetour }) {
  const [questions,   setQuestions]   = useState([]);
  const [current,     setCurrent]     = useState(0);
  const [reponses,    setReponses]    = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [submitting,  setSubmitting]  = useState(false);
  const [error,       setError]       = useState("");
  const debut = useRef(Date.now());

  useEffect(() => {
    employeAPI.questions(formation.id).then(qs => {
      if (qs && qs.length > 20) qs = qs.slice(0, 20);
      setQuestions(qs);
      setReponses(new Array(qs.length).fill(""));
      setLoading(false);
    });
  }, []);

  const setRep = (val) => {
    const r = [...reponses]; r[current] = val; setReponses(r);
  };

  const soumettre = async () => {
    setSubmitting(true);
    try {
      const duree = Math.round((Date.now() - debut.current) / 60000);
      const r = await employeAPI.soumettre(formation.id, { reponses, duree_min: duree });
      onTermine(r);
    } catch (e) { setError("Une erreur est survenue. Veuillez réessayer."); setSubmitting(false); }
  };

  if (loading) return (
    <div className="loading-page">
      <div className="spinner" style={{ width: 24, height: 24 }}/>
      <span>Chargement du test…</span>
    </div>
  );

  const q        = questions[current];
  const progress = Math.round(((current + 1) / questions.length) * 100);

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)" }}>

      <div className="topbar">
        <span className="topbar-logo">
          <span>{formation.titre}</span>
        </span>
        <button className="topbar-logout" onClick={onRetour}>Quitter</button>
      </div>

      <div style={{ background: "var(--g2)", height: 4 }}>
        <div style={{ height: 4, background: "var(--blue)", width: `${progress}%`,
                      transition: "width .3s" }}/>
      </div>

      <div style={{ maxWidth: 640, margin: "36px auto", padding: "0 24px" }}>

        <p style={{ fontSize: 13, color: "var(--text3)", marginBottom: 16 }}>
          Question {current + 1} / {questions.length}
          {" · "}
          {q.type === "qcm" ? "QCM" : "Question ouverte"}
        </p>

        <div className="card" style={{ marginBottom: 20 }}>
          <p style={{ fontSize: 16, fontWeight: 500, marginBottom: 20,
                      lineHeight: 1.6 }}>{q.question}</p>

          {q.type === "qcm" && q.options && (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {q.options.map((opt, i) => {
                const selected = reponses[current] === opt;
                return (
                  <button key={i} onClick={() => setRep(opt)} style={{
                    padding: "10px 14px", borderRadius: "var(--r)", cursor: "pointer",
                    border: selected ? "1.5px solid var(--blue)" : "1.5px solid var(--g2)",
                    background: selected ? "var(--blue-lt)" : "var(--white)",
                    textAlign: "left", fontSize: 14, color: "var(--text)"
                  }}>
                    {opt}
                  </button>
                );
              })}
            </div>
          )}

          {q.type === "ouverte" && (
            <textarea className="field-input" value={reponses[current]}
              onChange={e => setRep(e.target.value)}
              rows={5} placeholder="Rédigez votre réponse ici…"/>
          )}
        </div>

        {error && <p className="alert-error">{error}</p>}

        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <button className="btn btn-outline" onClick={() => setCurrent(c => c - 1)}
            disabled={current === 0}>
            ← Précédent
          </button>
          {current < questions.length - 1 ? (
            <button className="btn btn-blue" onClick={() => setCurrent(c => c + 1)}>
              Suivant →
            </button>
          ) : (
            <button className="btn btn-blue" onClick={soumettre} disabled={submitting}
              style={{ background: submitting ? "var(--g3)" : "var(--success)" }}>
              {submitting ? "Correction en cours…" : "Soumettre le test"}
            </button>
          )}
        </div>

      </div>
    </div>
  );
}
