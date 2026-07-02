import { useState, useEffect } from 'react';
import Modal          from '@common/Modal/Modal';
import Button         from '@common/Button/Button';
import { useToast }   from '@hooks/useToast';
import { getFarmers } from '@services/farmerService';
import { getVisitTypes, createVisit } from '@services/visitService';

const INITIAL_FORM = {
  farmerId:    '',
  visitTypeId: '',
  visitDate:   new Date().toISOString().split('T')[0],
  location:    '',
  notes:       '',
};

const labelCls   = 'block text-xs font-semibold mb-1.5 text-foreground';
const inputCls   = 'w-full h-9 px-3 rounded-lg border border-input bg-white text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring transition-colors';
const invalidCls = 'border-destructive focus-visible:ring-destructive/30';

export default function VisitLogModal({ isOpen, onClose, onSave, preselectedFarmer = null }) {
  const { showToast } = useToast();

  const [form,       setForm]       = useState(() => ({ ...INITIAL_FORM, farmerId: preselectedFarmer?.id ?? '' }));
  const [errors,     setErrors]     = useState({});
  const [farmers,    setFarmers]    = useState([]);
  const [visitTypes, setVisitTypes] = useState([]);
  const [dataLoading, setDataLoading] = useState(false);
  const [submitting,  setSubmitting]  = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setDataLoading(true);
    Promise.all([
      getFarmers({ limit: 200 }),
      getVisitTypes(),
    ]).then(([farmerData, typeData]) => {
      setFarmers(farmerData.farmers ?? []);
      setVisitTypes(typeData ?? []);
    }).catch(() => {
      showToast('Failed to load form data.', 'error');
    }).finally(() => {
      setDataLoading(false);
    });
  }, [isOpen]);

  function handleChange(field, value) {
    setForm(prev => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors(prev => ({ ...prev, [field]: '' }));
  }

  function validate() {
    const errs = {};
    if (!form.farmerId)    errs.farmerId    = 'Select a farmer.';
    if (!form.visitTypeId) errs.visitTypeId = 'Select a visit type.';
    if (!form.visitDate)   errs.visitDate   = 'Provide a visit date.';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!validate()) return;

    setSubmitting(true);
    try {
      await createVisit({
        farmer_id:      Number(form.farmerId),
        visit_type_id:  Number(form.visitTypeId),
        scheduled_date: form.visitDate,
        location:       form.location || undefined,
        notes:          form.notes    || undefined,
      });
      const farmer = farmers.find(f => String(f.id) === String(form.farmerId));
      showToast(`Visit logged for ${farmer?.name ?? 'farmer'}.`, 'success');
      setForm(INITIAL_FORM);
      setErrors({});
      onSave?.();
    } catch (err) {
      showToast(err.message ?? 'Failed to log visit. Please try again.', 'error');
    } finally {
      setSubmitting(false);
    }
  }

  function handleClose() {
    setForm(INITIAL_FORM);
    setErrors({});
    onClose();
  }

  const footer = (
    <>
      <Button variant="ghost"   onClick={handleClose} disabled={submitting}>Cancel</Button>
      <Button variant="primary" onClick={handleSubmit} disabled={submitting || dataLoading}>
        {submitting
          ? <><i className="fas fa-spinner fa-spin" aria-hidden="true" /> Saving…</>
          : <><i className="fas fa-save"            aria-hidden="true" /> Log Visit</>}
      </Button>
    </>
  );

  return (
    <Modal id="visitModal" isOpen={isOpen} onClose={handleClose} title="Log Field Visit" footer={footer}>
      <form onSubmit={handleSubmit} noValidate className="space-y-4">

        {/* Farmer select */}
        <div>
          <label className={labelCls} htmlFor="vl-farmer">Farmer *</label>
          <select
            id="vl-farmer"
            className={`${inputCls} ${errors.farmerId ? invalidCls : ''}`}
            value={form.farmerId}
            onChange={e => handleChange('farmerId', e.target.value)}
            disabled={dataLoading}
          >
            <option value="">{dataLoading ? 'Loading farmers…' : 'Select farmer'}</option>
            {farmers.map(f => (
              <option key={f.id} value={f.id}>{f.name} — {f.village}</option>
            ))}
          </select>
          {errors.farmerId && <p className="text-destructive text-xs mt-1">{errors.farmerId}</p>}
        </div>

        <div className="grid grid-cols-2 gap-4">
          {/* Visit Type */}
          <div>
            <label className={labelCls} htmlFor="vl-type">Visit Type *</label>
            <select
              id="vl-type"
              className={`${inputCls} ${errors.visitTypeId ? invalidCls : ''}`}
              value={form.visitTypeId}
              onChange={e => handleChange('visitTypeId', e.target.value)}
              disabled={dataLoading}
            >
              <option value="">{dataLoading ? 'Loading…' : 'Select type'}</option>
              {visitTypes.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
            {errors.visitTypeId && <p className="text-destructive text-xs mt-1">{errors.visitTypeId}</p>}
          </div>

          {/* Visit Date */}
          <div>
            <label className={labelCls} htmlFor="vl-date">Visit Date *</label>
            <input
              type="date"
              id="vl-date"
              className={`${inputCls} ${errors.visitDate ? invalidCls : ''}`}
              value={form.visitDate}
              onChange={e => handleChange('visitDate', e.target.value)}
            />
            {errors.visitDate && <p className="text-destructive text-xs mt-1">{errors.visitDate}</p>}
          </div>
        </div>

        {/* Location */}
        <div>
          <label className={labelCls} htmlFor="vl-location">Village / Location</label>
          <input
            type="text"
            id="vl-location"
            className={inputCls}
            placeholder="e.g. Nashik, Maharashtra"
            value={form.location}
            onChange={e => handleChange('location', e.target.value)}
          />
        </div>

        {/* Notes */}
        <div>
          <label className={labelCls} htmlFor="vl-notes">Observations / Notes</label>
          <textarea
            id="vl-notes"
            className="w-full px-3 py-2 rounded-lg border border-input bg-white text-sm min-h-[80px] resize-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring transition-colors"
            placeholder="Describe observations, recommendations given, follow-up actions…"
            value={form.notes}
            onChange={e => handleChange('notes', e.target.value)}
          />
        </div>

      </form>
    </Modal>
  );
}
