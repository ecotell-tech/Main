/**
 * ScoringConfigPage — Organic Farming Manager
 * Screen 33: Configurable readiness scoring with 5 factors + weightage
 *
 * Note: this config controls the scoring_factors table (real, persisted),
 * but is not yet wired into the actual farmer adoption_score calculation —
 * that's a separate formula (see backend/app/services/farmer_service.py
 * _compute_adoption_score). Saving here updates the displayed weights only.
 */
import { useState, useEffect, useCallback, useMemo } from 'react';
import Badge   from '@common/Badge/Badge';
import Button  from '@common/Button/Button';
import { useToast } from '@hooks/useToast';
import { getScoringFactors, updateScoringWeights } from '@services/scoringService';
import { getFarmers } from '@services/farmerService';
import { ApiError } from '@services/api';

/* Decorative icon/color per factor code — not stored server-side */
const FACTOR_META = {
  interest:      { icon: 'fas fa-heart',           color: '#e11d48' },
  water:         { icon: 'fas fa-droplet',         color: '#2563eb' },
  chemical:      { icon: 'fas fa-flask',            color: '#d97706' },
  training:      { icon: 'fas fa-graduation-cap',   color: '#7c3aed' },
  participation: { icon: 'fas fa-handshake',        color: '#0d9488' },
};

const BAND = (score) =>
  score >= 70 ? { label: 'High',   color: '#16a34a', bg: '#dcfce7', border: '#bbf7d0', icon: 'fas fa-circle-check'       }
: score >= 40 ? { label: 'Medium', color: '#d97706', bg: '#fef3c7', border: '#fde68a', icon: 'fas fa-circle-half-stroke' }
:               { label: 'Low',    color: '#ef4444', bg: '#fee2e2', border: '#fecaca', icon: 'fas fa-circle-exclamation'  };

/* ─── Main Page ─────────────────────────────────────────────────────── */
export default function ScoringConfigPage() {
  const { showToast } = useToast();
  const [factors,  setFactors]  = useState([]);
  const [farmers,  setFarmers]  = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [saving,   setSaving]   = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [factorsRes, farmersRes] = await Promise.all([
          getScoringFactors(),
          getFarmers({ limit: 500 }),
        ]);
        if (cancelled) return;
        setFactors(factorsRes);
        setFarmers(farmersRes.farmers);
      } catch {
        if (!cancelled) showToast('Failed to load scoring configuration.', 'error');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const totalWeight = factors.reduce((s, f) => s + f.weight, 0);
  const isValid     = totalWeight === 100;

  const updateWeight = useCallback((id, val) => {
    const n = Math.min(100, Math.max(0, Number(val) || 0));
    setFactors(prev => prev.map(f => f.id === id ? { ...f, weight: n } : f));
  }, []);

  async function handleSave() {
    if (!isValid) { showToast('Weights must total exactly 100%.', 'error'); return; }
    setSaving(true);
    try {
      const updated = await updateScoringWeights(factors);
      setFactors(updated.map(f => ({
        id: f.id, code: f.code, label: f.label, description: f.description,
        weight: f.weight, isActive: f.is_active,
        options: (f.options ?? []).map(o => ({ id: o.id, label: o.label, score: o.score_points })),
      })));
      showToast('Scoring configuration saved.', 'success');
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Failed to save scoring configuration.';
      showToast(message, 'error');
    } finally {
      setSaving(false);
    }
  }

  function handleReset() {
    getScoringFactors().then(setFactors);
    showToast('Reset to saved configuration.', 'info');
  }

  /* Distribution from real farmer adoption scores */
  const { high, medium, low, total } = useMemo(() => {
    const high   = farmers.filter(f => (f.adoptionScore ?? 0) >= 70).length;
    const medium = farmers.filter(f => (f.adoptionScore ?? 0) >= 40 && (f.adoptionScore ?? 0) < 70).length;
    const low    = farmers.filter(f => (f.adoptionScore ?? 0) < 40).length;
    return { high, medium, low, total: farmers.length };
  }, [farmers]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-40 text-muted-foreground text-sm">
        <i className="fas fa-spinner fa-spin mr-2" /> Loading…
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-3xl mx-auto">

      {/* Header */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-xl font-extrabold text-foreground font-heading">Readiness Scoring Configuration</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Configure the 5 scoring factors and their importance weights (must total 100%)</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleReset} disabled={saving}>
            <i className="fas fa-rotate-left mr-2" /> Reset
          </Button>
          <Button variant="primary" onClick={handleSave} disabled={!isValid || saving}>
            {saving
              ? <><i className="fas fa-spinner fa-spin mr-2" />Saving…</>
              : <><i className="fas fa-save mr-2" />Save Weights</>}
          </Button>
        </div>
      </div>

      <div className="flex items-center gap-2.5 px-4 py-3 rounded-xl bg-blue-50 border border-blue-100 text-xs text-blue-700">
        <i className="fas fa-circle-info shrink-0" />
        These weights are saved but don't yet drive the automatic adoption score calculation — that still uses a separate formula.
      </div>

      {/* Weight total indicator */}
      <div className={`flex items-center gap-3 px-4 py-3 rounded-xl border ${isValid ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
        <i className={`fas ${isValid ? 'fa-circle-check text-green-600' : 'fa-circle-exclamation text-red-500'} text-lg`} />
        <div className="flex-1">
          <div className={`text-sm font-bold ${isValid ? 'text-green-700' : 'text-red-700'}`}>
            Total Weight: {totalWeight}% {isValid ? '— Ready to save' : `— ${totalWeight > 100 ? `${totalWeight - 100}% over limit` : `${100 - totalWeight}% remaining`}`}
          </div>
          <div className="h-2 mt-1.5 rounded-full bg-white overflow-hidden border border-white/60">
            <div className="h-full rounded-full transition-all"
              style={{ width: `${Math.min(totalWeight, 100)}%`, background: isValid ? '#16a34a' : totalWeight > 100 ? '#ef4444' : '#d97706' }} />
          </div>
        </div>
        <div className={`text-2xl font-extrabold ${isValid ? 'text-green-700' : 'text-red-600'}`}>{totalWeight}%</div>
      </div>

      {/* Factor cards */}
      <div className="space-y-4">
        {factors.map(factor => {
          const meta = FACTOR_META[factor.code] ?? { icon: 'fas fa-sliders', color: '#6b7280' };
          const weightPct = factor.weight;
          return (
            <div key={factor.id} className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
              <div className="flex items-center gap-3 px-5 py-4 border-b border-border">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: `${meta.color}15` }}>
                  <i className={meta.icon} style={{ color: meta.color }} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-bold text-foreground">{factor.label}</div>
                  <div className="text-[0.65rem] text-muted-foreground mt-0.5">{factor.description}</div>
                </div>
                {/* Weight input */}
                <div className="flex items-center gap-2 shrink-0">
                  <div className="flex items-center gap-1 bg-muted/60 rounded-lg border border-border overflow-hidden">
                    <button onClick={() => updateWeight(factor.id, factor.weight - 5)} className="px-2.5 py-1.5 text-sm font-bold text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">−</button>
                    <input
                      type="number" min="0" max="100"
                      value={factor.weight}
                      onChange={e => updateWeight(factor.id, e.target.value)}
                      className="w-12 text-center text-sm font-extrabold bg-transparent border-none focus:outline-none text-foreground"
                    />
                    <span className="text-xs text-muted-foreground pr-1">%</span>
                    <button onClick={() => updateWeight(factor.id, factor.weight + 5)} className="px-2.5 py-1.5 text-sm font-bold text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">+</button>
                  </div>
                </div>
              </div>

              {/* Weight bar + scoring options */}
              <div className="px-5 py-4 space-y-3">
                <div>
                  <div className="flex justify-between text-[0.62rem] text-muted-foreground mb-1">
                    <span>Contribution to total score</span>
                    <span className="font-semibold" style={{ color: meta.color }}>{weightPct}%</span>
                  </div>
                  <div className="h-2 rounded-full bg-muted overflow-hidden">
                    <div className="h-full rounded-full transition-all" style={{ width: `${weightPct}%`, background: meta.color }} />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1">
                  {factor.options.map(opt => (
                    <div key={opt.id} className="flex items-center justify-between px-3 py-2 rounded-lg bg-muted/40 border border-border">
                      <span className="text-[0.68rem] text-foreground font-medium">{opt.label}</span>
                      <span className="text-[0.68rem] font-bold" style={{ color: opt.score >= 70 ? '#16a34a' : opt.score >= 40 ? '#d97706' : '#ef4444' }}>
                        {opt.score} pts
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Score band thresholds */}
      <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
        <div className="flex items-center gap-2 px-5 py-3.5 border-b border-border bg-muted/30">
          <i className="fas fa-sliders text-sm text-muted-foreground" />
          <span className="text-sm font-bold text-foreground">Score Band Thresholds</span>
          <Badge variant="muted">Fixed</Badge>
        </div>
        <div className="p-5 grid grid-cols-3 gap-4">
          {[
            { label: 'High Readiness',   range: '70–100', color: '#16a34a', bg: '#f0fdf4', border: '#bbf7d0', icon: 'fas fa-circle-check'       },
            { label: 'Medium Readiness', range: '40–69',  color: '#d97706', bg: '#fffbeb', border: '#fde68a', icon: 'fas fa-circle-half-stroke' },
            { label: 'Low Readiness',    range: '0–39',   color: '#ef4444', bg: '#fef2f2', border: '#fecaca', icon: 'fas fa-circle-exclamation'  },
          ].map(({ label, range, color, bg, border, icon }) => (
            <div key={label} className="flex flex-col items-center gap-2 p-4 rounded-xl border text-center"
              style={{ background: bg, borderColor: border }}>
              <i className={`${icon} text-2xl`} style={{ color }} />
              <div className="text-sm font-extrabold" style={{ color }}>{range}</div>
              <div className="text-[0.65rem] font-semibold" style={{ color }}>{label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Current distribution preview */}
      <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
        <div className="flex items-center gap-2 px-5 py-3.5 border-b border-border bg-muted/30">
          <i className="fas fa-chart-pie text-sm text-muted-foreground" />
          <span className="text-sm font-bold text-foreground">Current Score Distribution</span>
          <Badge variant="info">{total} farmers</Badge>
        </div>
        <div className="p-5 space-y-3">
          {total === 0 ? (
            <div className="text-center text-sm text-muted-foreground py-4">No farmers in the database yet</div>
          ) : [
            { label: 'High Readiness (70–100)',   count: high,   pct: Math.round((high / total) * 100),   color: '#16a34a', bg: '#dcfce7' },
            { label: 'Medium Readiness (40–69)', count: medium, pct: Math.round((medium / total) * 100), color: '#d97706', bg: '#fef3c7' },
            { label: 'Low Readiness (0–39)',     count: low,    pct: Math.round((low / total) * 100),   color: '#ef4444', bg: '#fee2e2' },
          ].map(({ label, count, pct, color, bg }) => (
            <div key={label} className="flex items-center gap-4">
              <div className="w-32 text-[0.65rem] font-semibold" style={{ color }}>{label}</div>
              <div className="flex-1 h-5 bg-muted rounded-full overflow-hidden">
                <div className="h-full rounded-full flex items-center justify-end pr-2"
                  style={{ width: `${pct}%`, background: color, minWidth: count > 0 ? '2rem' : '0' }}>
                  <span className="text-white text-[0.58rem] font-bold">{count}</span>
                </div>
              </div>
              <div className="text-xs font-bold min-w-[2.5rem] text-right" style={{ color }}>{pct}%</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
