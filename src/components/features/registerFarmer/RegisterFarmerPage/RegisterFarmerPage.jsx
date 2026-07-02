import { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate, useLocation }                from 'react-router-dom';
import { useToast }                                from '@hooks/useToast';
import { useFormConfig }                          from '@context/FormConfigContext';
import {
  createFarmer,
  updateFarmer,
  completeFarmerRegistration,
  checkMobileDuplicate,
  getFarmerById,
  getVillageContext,
  getGeoStates,
  getGeoDistricts,
  getGeoTalukas,
  getGeoVillages,
  uploadFarmerPhotos,
} from '@services/farmerService';
import FORM_OPTIONS    from '@data/config/formOptions.json';

/* ─── Form reference data — static fallbacks used before context mounts ── */
const CROPS_LIST_DEFAULT     = FORM_OPTIONS.crops;
const INPUTS_LIST_DEFAULT    = FORM_OPTIONS.inputs;
const CHALLENGE_LIST_DEFAULT = FORM_OPTIONS.challenges;
const SCHEME_LIST_DEFAULT    = FORM_OPTIONS.govtSchemes;
const IRRIG_INFRA_DEFAULT    = FORM_OPTIONS.irrigationInfra;


/* ─── Shared style constants ──────────────────────────────────── */
const inputCls   = 'w-full h-9 px-3 rounded-lg border border-input bg-white text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring transition-colors';
const selectCls  = inputCls;
const invalidCls = 'border-destructive focus-visible:ring-destructive/30';
const labelCls   = 'block text-xs font-semibold mb-1.5 text-foreground';
const hintCls    = 'text-xs text-muted-foreground mt-1';
const errorCls   = 'text-destructive text-xs mt-1';

const ICON_COLORS = {
  green:  'bg-green-100 text-green-700',
  blue:   'bg-blue-100 text-blue-700',
  amber:  'bg-amber-100 text-amber-700',
  brown:  'bg-amber-50 text-amber-900',
  purple: 'bg-purple-100 text-purple-700',
};

/* ─── Shared sub-components ──────────────────────────────────── */
function FormSection({ icon, iconColor = 'green', title, sub, children }) {
  return (
    <div className="mb-6 rounded-xl border border-green-100 overflow-hidden">
      <div className="flex items-center gap-3 px-5 py-3.5 bg-green-50/60 border-b border-green-100">
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${ICON_COLORS[iconColor]}`}>
          <i className={icon} aria-hidden="true" />
        </div>
        <div>
          <div className="text-sm font-bold text-foreground font-heading">{title}</div>
          {sub && <div className="text-xs text-muted-foreground">{sub}</div>}
        </div>
      </div>
      <div className="p-5 space-y-4">{children}</div>
    </div>
  );
}

function FormField({ label, required, hint, error, id, children }) {
  return (
    <div>
      {label && (
        <label className={labelCls} htmlFor={id}>
          {label}{required && <span className="text-destructive ml-0.5">*</span>}
        </label>
      )}
      {children}
      {hint  && !error && <p className={hintCls}>{hint}</p>}
      {error && <p className={errorCls}>{error}</p>}
    </div>
  );
}

function OptionGroup({ options, selected, onToggle, multi = true }) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((opt) => {
        const val      = typeof opt === 'string' ? opt : opt.value;
        const lbl      = typeof opt === 'string' ? opt : opt.label;
        const isActive = multi
          ? (Array.isArray(selected) && selected.includes(val))
          : selected === val;
        return (
          <button
            key={val}
            type="button"
            onClick={() => onToggle(val)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer border transition-colors
              ${isActive
                ? 'bg-green-700 text-white border-green-700'
                : 'border-green-200 bg-white text-green-700 hover:border-green-400'}`}
          >
            {lbl}
          </button>
        );
      })}
    </div>
  );
}

function SliderTrack({ options, selected, onSelect }) {
  return (
    <div className="flex gap-2 flex-wrap">
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onSelect(opt.value)}
          className={`flex-1 min-w-[100px] px-4 py-2.5 rounded-lg text-xs font-semibold border transition-colors text-center
            ${selected === opt.value
              ? 'bg-green-50 border-primary text-primary font-bold'
              : 'border-border bg-white text-foreground hover:border-green-400'}`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

function SearchableSelect({ id, options, value, onChange, placeholder = 'Search…', disabled = false, invalid = false }) {
  const [query, setQuery] = useState('');
  const [open, setOpen]   = useState(false);
  const wrapRef           = useRef(null);

  const selected = options.find((o) => o.id === value);

  const filtered = query
    ? options.filter((o) => o.name.toLowerCase().includes(query.toLowerCase()))
    : options;

  useEffect(() => {
    if (!open) return;
    function onDown(e) {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) {
        setOpen(false);
        setQuery('');
      }
    }
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [open]);

  function handleSelect(opt) {
    onChange(opt.id, opt.name);
    setQuery('');
    setOpen(false);
  }

  const base = 'w-full h-9 px-3 pr-8 rounded-lg border bg-white text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring transition-colors';
  const err  = invalid  ? 'border-destructive focus-visible:ring-destructive/30' : 'border-input';
  const dis  = disabled ? 'bg-muted/30 cursor-not-allowed text-muted-foreground'  : '';

  return (
    <div ref={wrapRef} className="relative">
      <input
        id={id}
        type="text"
        autoComplete="off"
        disabled={disabled}
        placeholder={disabled ? placeholder : (selected ? selected.name : placeholder)}
        value={open ? query : (selected?.name ?? '')}
        onFocus={() => { if (!disabled) { setOpen(true); setQuery(''); } }}
        onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
        className={`${base} ${err} ${dis}`}
      />
      <i className={`fas fa-chevron-down absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground pointer-events-none transition-transform duration-150 ${open ? 'rotate-180' : ''}`} />
      {open && !disabled && (
        <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-white border border-border rounded-lg shadow-lg max-h-52 overflow-y-auto">
          {filtered.length === 0 ? (
            <div className="px-3 py-2 text-xs text-muted-foreground">
              {query ? `No results for "${query}"` : 'No options available'}
            </div>
          ) : filtered.map((opt) => (
            <button
              key={opt.id}
              type="button"
              onMouseDown={(e) => { e.preventDefault(); handleSelect(opt); }}
              className={`w-full text-left px-3 py-2 text-sm transition-colors hover:bg-green-50 hover:text-green-800
                ${value === opt.id ? 'bg-green-50 font-semibold text-green-800' : 'text-foreground'}`}
            >
              {opt.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function PhotoZone({ id, icon, caption, file, onFile, error, small }) {
  const galleryRef  = useRef(null);
  const videoRef    = useRef(null);
  const canvasRef   = useRef(null);
  const streamRef   = useRef(null);
  const gpsRef      = useRef(null);   // {lat, lng} once acquired — ref avoids stale-closure in capturePhoto
  const locationRef = useRef('');    // reverse-geocoded name for stamp

  const [showCamera,   setShowCamera]   = useState(false);
  const [showPreview,  setShowPreview]  = useState(false);
  const [camErr,       setCamErr]       = useState('');
  const [gpsStatus,    setGpsStatus]    = useState('idle');   // 'idle'|'acquiring'|'acquired'|'error'
  const [liveGps,      setLiveGps]      = useState(null);     // drives viewfinder display
  const [liveLocation, setLiveLocation] = useState('');       // human-readable place name
  const [liveTime,     setLiveTime]     = useState('');

  const previewUrl = file ? URL.createObjectURL(file) : null;

  function stopStream() {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }

  // Attach stream to video element once modal is visible
  useEffect(() => {
    if (showCamera && videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current;
      videoRef.current.play().catch(() => {});
    }
  }, [showCamera]);

  // Tick the live clock while viewfinder is open
  useEffect(() => {
    if (!showCamera) return;
    function tick() {
      const now = new Date();
      const d = now.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
      const t = now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true });
      setLiveTime(`${d}  ${t}`);
    }
    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, [showCamera]);

  // Release camera when component unmounts
  useEffect(() => () => stopStream(), []);

  // ── Handlers ────────────────────────────────────────────────────────────────

  function handleGalleryChange(e) {
    const f = e.target.files[0];
    e.target.value = '';
    if (!f) return;
    if (!['image/jpeg', 'image/jpg', 'image/png', 'image/webp'].includes(f.type)) {
      onFile(null, 'Only JPG, PNG, or WEBP images are accepted.');
      return;
    }
    if (f.size > 3 * 1024 * 1024) { onFile(null, 'File exceeds 3 MB.'); return; }
    onFile(f, null);
  }

  async function openCamera() {
    setCamErr('');
    gpsRef.current = null;
    locationRef.current = '';
    setLiveGps(null);
    setLiveLocation('');
    setGpsStatus('idle');
    if (!navigator.mediaDevices?.getUserMedia) {
      setCamErr('Camera not supported in this browser. Use Gallery instead.');
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 960 } },
        audio: false,
      });
      streamRef.current = stream;
      setShowCamera(true);
    } catch {
      setCamErr('Camera access denied. Please allow camera permission or use Gallery.');
      return;
    }

    // Request GPS in background — doesn't block camera open
    if (navigator.geolocation) {
      setGpsStatus('acquiring');
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
          gpsRef.current = coords;
          setLiveGps(coords);
          setGpsStatus('acquired');
          // Reverse-geocode in background to get a human-readable place name
          fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${coords.lat}&lon=${coords.lng}&format=json`,
            { headers: { 'User-Agent': 'ProfitPortal/1.0' } },
          )
            .then((r) => r.json())
            .then((data) => {
              const a = data.address ?? {};
              const name = [
                a.village || a.hamlet || a.suburb || a.town || a.city || a.municipality,
                a.county  || a.state_district || a.district,
                a.state,
              ].filter(Boolean).slice(0, 3).join(', ');
              if (name) { locationRef.current = name; setLiveLocation(name); }
            })
            .catch(() => {});
        },
        () => setGpsStatus('error'),
        { enableHighAccuracy: true, timeout: 15000 },
      );
    } else {
      setGpsStatus('error');
    }
  }

  function closeCamera() {
    stopStream();
    setShowCamera(false);
    setGpsStatus('idle');
    setLiveGps(null);
    setLiveLocation('');
    locationRef.current = '';
  }

  function capturePhoto() {
    const video  = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    canvas.width  = video.videoWidth  || 1280;
    canvas.height = video.videoHeight || 960;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0);

    // ── Stamp: timestamp + GPS ──────────────────────────────────────────────
    const now     = new Date();
    const dateStr = now.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
    const timeStr = now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true });
    const gps     = gpsRef.current;
    const gpsStr  = gps
      ? `${gps.lat.toFixed(5)}°N  ${gps.lng.toFixed(5)}°E`
      : 'GPS: unavailable';

    const locName  = locationRef.current;
    const lines    = [`${dateStr}  ${timeStr}`, gpsStr, ...(locName ? [locName] : [])];
    const fontSize = Math.max(16, Math.floor(canvas.height * 0.026));
    const lineH    = fontSize * 1.65;
    const pad      = Math.floor(fontSize * 0.65);

    ctx.font = `bold ${fontSize}px monospace`;
    const textW = Math.max(...lines.map((l) => ctx.measureText(l).width));
    const boxW  = textW + pad * 2;
    const boxH  = lines.length * lineH + pad;
    const bx    = 14;
    const by    = canvas.height - boxH - 14;

    // Semi-transparent rounded background
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    const r = 7;
    ctx.beginPath();
    ctx.moveTo(bx + r, by);
    ctx.lineTo(bx + boxW - r, by);
    ctx.quadraticCurveTo(bx + boxW, by, bx + boxW, by + r);
    ctx.lineTo(bx + boxW, by + boxH - r);
    ctx.quadraticCurveTo(bx + boxW, by + boxH, bx + boxW - r, by + boxH);
    ctx.lineTo(bx + r, by + boxH);
    ctx.quadraticCurveTo(bx, by + boxH, bx, by + boxH - r);
    ctx.lineTo(bx, by + r);
    ctx.quadraticCurveTo(bx, by, bx + r, by);
    ctx.closePath();
    ctx.fill();

    // Gold stamp text with subtle shadow for legibility
    ctx.fillStyle   = '#FFD700';
    ctx.shadowColor = 'rgba(0,0,0,0.7)';
    ctx.shadowBlur  = 4;
    lines.forEach((line, i) => {
      ctx.fillText(line, bx + pad, by + pad + fontSize + i * lineH);
    });
    ctx.shadowBlur = 0;
    // ── end stamp ──────────────────────────────────────────────────────────

    canvas.toBlob(
      (blob) => {
        if (!blob) return;
        const captured = new File([blob], `photo-${Date.now()}.jpg`, { type: 'image/jpeg' });
        onFile(captured, null);
        closeCamera();
      },
      'image/jpeg',
      0.92,
    );
  }

  // ── Style helpers ────────────────────────────────────────────────────────────
  const btnBase    = 'flex items-center gap-1.5 rounded-lg font-semibold transition-colors text-[11px]';
  const camBtn     = `${btnBase} bg-green-600 text-white hover:bg-green-700 ${small ? 'p-1.5' : 'px-3 py-1.5'}`;
  const galBtn     = `${btnBase} border border-green-300 text-green-700 hover:bg-green-50 ${small ? 'p-1.5' : 'px-3 py-1.5'}`;
  const overlayBtn = 'flex items-center gap-1 bg-black/60 hover:bg-black/80 text-white text-[10px] px-1.5 py-0.5 rounded-md';

  return (
    <>
      {/* ── Fullscreen camera viewfinder ───────────────────────────────────── */}
      {showCamera && (
        <div
          className="fixed inset-0 z-[9999] bg-black"
          style={{ touchAction: 'none' }}
        >
          {/* Live video — fills entire screen */}
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="absolute inset-0 w-full h-full object-cover"
          />
          <canvas ref={canvasRef} className="hidden" />

          {/* ── Live stamp preview (top-left, mirrors what gets burned in) ── */}
          <div className="absolute top-4 left-4 pointer-events-none font-mono">
            <div className="bg-black/55 rounded-lg px-3 py-2 space-y-1">
              <div className="text-yellow-400 text-xs font-bold leading-tight">{liveTime}</div>
              <div className="text-xs leading-tight">
                {gpsStatus === 'acquiring' && (
                  <span className="text-yellow-300/60">
                    <i className="fas fa-spinner fa-spin mr-1 text-[9px]" />GPS: acquiring…
                  </span>
                )}
                {gpsStatus === 'acquired' && liveGps && (
                  <span className="text-yellow-400 font-bold">
                    {liveGps.lat.toFixed(5)}°N&nbsp;&nbsp;{liveGps.lng.toFixed(5)}°E
                  </span>
                )}
                {gpsStatus === 'error' && (
                  <span className="text-red-400">GPS: unavailable</span>
                )}
              </div>
              {liveLocation ? (
                <div className="text-yellow-300 text-xs leading-tight">{liveLocation}</div>
              ) : gpsStatus === 'acquired' && (
                <div className="text-yellow-300/50 text-xs leading-tight italic">locating…</div>
              )}
            </div>
          </div>

          {/* Controls — absolutely anchored to bottom so they always show */}
          <div
            className="absolute bottom-0 inset-x-0 flex items-center justify-between px-8"
            style={{
              paddingTop: '2rem',
              paddingBottom: 'max(2rem, env(safe-area-inset-bottom, 2rem))',
              background: 'linear-gradient(to top, rgba(0,0,0,0.85) 0%, transparent 100%)',
            }}
          >
            {/* Cancel */}
            <button
              type="button"
              onClick={closeCamera}
              className="px-5 py-2.5 rounded-full border-2 border-white/70 text-white text-sm font-semibold hover:bg-white/10 active:bg-white/20 transition-colors"
            >
              Cancel
            </button>

            {/* Shutter */}
            <div className="flex flex-col items-center gap-2">
              <button
                type="button"
                onClick={capturePhoto}
                className="w-20 h-20 rounded-full bg-white border-4 border-white/60 shadow-2xl active:scale-90 transition-transform flex items-center justify-center"
                aria-label="Capture photo"
              >
                <i className="fas fa-camera text-2xl text-gray-800" />
              </button>
              <span className="text-white text-xs font-semibold tracking-wide">Capture</span>
            </div>

            {/* Spacer matching Cancel width */}
            <div className="w-24" />
          </div>
        </div>
      )}

      {/* ── Photo tile ─────────────────────────────────────────────────────── */}
      <div>
        <div className={`relative border-2 border-dashed rounded-xl overflow-hidden transition-all
          ${small ? 'h-24' : 'h-36'}
          ${error ? 'border-destructive' : file ? 'border-green-500 bg-green-50' : 'border-green-200 hover:border-green-400'}`}
        >
          {previewUrl ? (
            <>
              <img src={previewUrl} alt="preview" className="h-full w-full object-cover" />
              <div className="absolute bottom-1.5 right-1.5 flex gap-1.5">
                <button type="button" className={overlayBtn} onClick={() => setShowPreview(true)}>
                  <i className="fas fa-expand text-[9px]" /> Preview
                </button>
                <button type="button" className={overlayBtn} onClick={openCamera}>
                  <i className="fas fa-camera text-[9px]" /> Retake
                </button>
                <button type="button" className={overlayBtn} onClick={() => galleryRef.current?.click()}>
                  <i className="fas fa-images text-[9px]" /> Change
                </button>
              </div>

              {/* ── Full-screen image preview lightbox ── */}
              {showPreview && (
                <div
                  className="fixed inset-0 z-[9999] bg-black/90 flex items-center justify-center p-4"
                  onClick={() => setShowPreview(false)}
                >
                  <img
                    src={previewUrl}
                    alt="full preview"
                    className="max-w-full max-h-full object-contain rounded-lg shadow-2xl"
                    onClick={(e) => e.stopPropagation()}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPreview(false)}
                    className="absolute top-4 right-4 w-10 h-10 rounded-full bg-black/60 hover:bg-black/80 text-white flex items-center justify-center transition-colors"
                    aria-label="Close preview"
                  >
                    <i className="fas fa-xmark text-lg" />
                  </button>
                </div>
              )}
            </>
          ) : (
            <div className="h-full flex flex-col items-center justify-center gap-2 p-3 text-center">
              <i className={`${icon} text-2xl text-green-300`} aria-hidden="true" />
              {!small && <span className="text-xs text-muted-foreground">{caption}</span>}
              {camErr && <p className="text-[10px] text-destructive leading-tight">{camErr}</p>}
              <div className="flex gap-2">
                <button type="button" className={camBtn} onClick={openCamera}>
                  <i className="fas fa-camera" />
                  {!small && 'Camera'}
                </button>
                <button type="button" className={galBtn} onClick={() => galleryRef.current?.click()}>
                  <i className="fas fa-images" />
                  {!small && 'Gallery'}
                </button>
              </div>
              {!small && <small className="text-[10px] text-muted-foreground/70">JPG, PNG, WEBP — max 3 MB</small>}
            </div>
          )}

          {/* Gallery file picker (no capture attribute) */}
          <input
            ref={galleryRef}
            id={id}
            type="file"
            accept="image/jpeg,image/jpg,image/png,image/webp"
            className="hidden"
            onChange={handleGalleryChange}
          />
        </div>
        {error && <p className={errorCls}>{error}</p>}
      </div>
    </>
  );
}

/* ─── Per-step base validators (keyed by step ID) ────────────── */
const VALIDATOR_BY_ID = {
  identity: (f) => {
    const e = {};
    if (!f.firstName.trim())          e.firstName = 'First name is required.';
    if (!f.lastName.trim())           e.lastName  = 'Last name is required.';
    if (!/^\d{10}$/.test(f.mobile))   e.mobile    = 'Enter a valid 10-digit mobile.';
    if (!f.gender)                    e.gender    = 'Select a gender.';
    if (f.age && (Number(f.age) < 18 || Number(f.age) > 110)) e.age = 'Age must be between 18 and 110.';
    if (f.aadhaar && !/^\d{12}$/.test(f.aadhaar)) e.aadhaar = 'Aadhaar must be 12 digits.';
    return e;
  },
  location: (f) => {
    const e = {};
    if (!f.state)          e.state    = 'Select a state.';
    if (!f.district)       e.district = 'Select a district.';
    if (!f.taluka.trim())  e.taluka   = 'Taluka is required.';
    if (!f.village.trim()) e.village  = 'Village is required.';
    if (f.pincode && !/^\d{6}$/.test(f.pincode)) e.pincode = '6-digit pincode required.';
    return e;
  },
  farm: (f) => {
    const e = {};
    if (!f.totalLand || Number(f.totalLand) <= 0) e.totalLand   = 'Enter valid total land area.';
    if (!f.soilType)                               e.soilType    = 'Select soil type.';
    if (!f.waterSource)                            e.waterSource = 'Select a water source.';
    return e;
  },
  crops:     (f) => { const e = {}; if (!f.crops.length) e.crops = 'Select at least one crop.'; return e; },
  practice:  (f) => { const e = {}; if (!f.farmMethod)   e.farmMethod = 'Select current farming method.'; return e; },
  readiness: (f) => { const e = {}; if (!f.interest)     e.interest   = 'Select interest level.'; return e; },
  engage:    (f) => { const e = {}; if (!f.followupDate) e.followupDate = 'Follow-up date is required.'; return e; },
  photos:    () => ({}),
  review:    () => ({}),
};

const INIT = {
  farmerId: '',
  firstName: '', middleName: '', lastName: '',
  mobile: '', altContact: '', gender: '', age: '', education: '', aadhaar: '', dob: '',
  // Location — names for display + IDs for API
  state: '', stateId: null,
  district: '', districtId: null,
  taluka: '', talukaId: null,
  village: '', villageId: null,
  pincode: '', mandi: '', gps: '',
  totalLand: '', irrigatedLand: '', nonIrrigatedLand: '', soilType: '', waterSource: '',
  ownership: '', irrigInfra: [],
  crops: [], cropsOther: '', season: '', annualYield: '', cropCoverage: '', yieldHistory: '',
  farmMethod: '', inputs: [], challenges: [], practiceNotes: '',
  interest: '', awareness: [], training: '', timeline: '', attended: '',
  consultNotes: '', followupDate: '', appointment: 'Scheduled', priority: '', nextAction: '', refBy: '',
  // Leadership-configured extended field values (key → value)
  customFields: {},
  // Agronomist-added ad-hoc observations: [{ id, label, value }]
  adHocFields: [],
};

/* ─── Session persistence key ────────────────────────────────── */
const SESSION_KEY = 'pscms_reg_session';

function saveSession(step, form, draftId) {
  try {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify({ step, form, draftId }));
  } catch { /* storage full — ignore */ }
}

function clearSession() {
  sessionStorage.removeItem(SESSION_KEY);
}

/* ─── Resume helpers ─────────────────────────────────────────── */
const EDU_REVERSE      = { None: 'Illiterate', Primary: 'Primary', Secondary: 'Secondary', Graduate: 'Graduate', 'Post Graduate': 'Post Graduate' };
const GENDER_CAP       = { male: 'Male', female: 'Female', other: 'Other' };
const OWNERSHIP_REVERSE= { owned: 'Own', leased: 'Leased', share_cropped: 'Shared / Bagayat', other: '' };
const FARM_REVERSE     = { chemical: 'Chemical', organic: 'Organic', natural: 'Natural', mixed: 'Mixed' };
const INTEREST_REVERSE = { high: 'High', medium: 'Medium', low: 'Low' };
const PRIORITY_REVERSE = { high: 'High', medium: 'Medium', low: 'Low' };

function farmerToForm(f) {
  const gps = f.gps_lat && f.gps_lng ? `${f.gps_lat}, ${f.gps_lng}` : '';
  return {
    farmerId:        f.farmer_code        || '',
    firstName:       f.first_name         || '',
    middleName:      f.middle_name        || '',
    lastName:        f.last_name          || '',
    mobile:          f.mobile             || '',
    altContact:      f.alt_mobile         || '',
    gender:          GENDER_CAP[f.gender] || '',
    age:             f.age != null ? String(f.age) : '',
    education:       EDU_REVERSE[f.education_level] || '',
    aadhaar:         '',   // never re-populate sensitive data
    dob:             f.dob || '',
    // Location IDs filled separately via getVillageContext
    stateId: null, state: '', districtId: null, district: '',
    talukaId: null, taluka: '',
    villageId:       f.village_id || null,
    village:         f.village_name || f.village || '',
    pincode:         f.pin_code          || '',
    mandi:           f.nearest_mandi     || '',
    gps,
    // Farm
    totalLand:        f.land_acres               != null ? String(f.land_acres)               : '',
    irrigatedLand:    f.irrigated_land_acres      != null ? String(f.irrigated_land_acres)     : '',
    nonIrrigatedLand: f.non_irrigated_land_acres  != null ? String(f.non_irrigated_land_acres) : '',
    soilType:         f.soil_type    || '',
    waterSource:      f.water_source || '',
    ownership:        OWNERSHIP_REVERSE[f.land_ownership] || '',
    irrigInfra:       [],
    // Crops
    crops:        f.primary_crop && f.primary_crop !== '—' ? [f.primary_crop] : [],
    cropsOther:   '',
    season:       '',
    annualYield:  f.annual_yield_quintals != null ? String(f.annual_yield_quintals) : '',
    cropCoverage: '',
    yieldHistory: f.yield_history_notes || '',
    // Practice
    farmMethod:    FARM_REVERSE[f.farming_type] || '',
    inputs:        [],
    challenges:    [],
    practiceNotes: f.practice_notes || '',
    // Readiness
    interest:  INTEREST_REVERSE[f.interest_level] || '',
    awareness: [],
    training:  '',
    timeline:  f.adoption_timeline || '',
    attended:  f.attended_training === 1 ? 'Yes' : f.attended_training === 0 ? 'No' : '',
    // Engage
    consultNotes: f.consult_notes || '',
    followupDate: f.followup_date  || '',
    appointment:  'Scheduled',
    priority:     PRIORITY_REVERSE[f.priority] || '',
    nextAction:   f.next_action  || '',
    refBy:        f.referred_by  || '',
  };
}

// Returns the step ID to resume at (resolved to an index inside the component).
function determineResumeStepId(f) {
  if (!f.village_id)                              return 'location';
  if (!f.land_acres)                              return 'farm';
  if (!f.primary_crop || f.primary_crop === '—') return 'crops';
  if (!f.interest_level)                          return 'practice';
  if (!f.followup_date)                           return 'engage';
  return 'photos';
}

function ReviewBlock({ title, icon, rows }) {
  return (
    <div className="mb-5">
      <div className="flex items-center gap-2 text-sm font-bold text-green-800 mb-2">
        <i className={icon} aria-hidden="true" /> {title}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1.5 bg-muted/30 rounded-xl p-4">
        {rows.map(([lbl, val]) => (
          <div key={lbl} className="flex gap-2 text-xs">
            <span className="text-muted-foreground w-28 shrink-0">{lbl}</span>
            <span className="font-semibold text-foreground">
              {val || <span className="text-muted-foreground/50">—</span>}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   MAIN COMPONENT
═══════════════════════════════════════════════════════════════ */
// ── Generic extended-field renderer ──────────────────────────────────────────
// Renders Leadership-configured custom fields inside a form step.
function ExtendedFieldsSection({ stepId, form, onSet, errors, onError }) {
  const { getFieldsForStep } = useFormConfig();
  const fields = getFieldsForStep(stepId);
  if (!fields.length) return null;

  const inputCfg = 'w-full h-9 px-3 rounded-lg border border-input bg-white text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring transition-colors';
  const textareaCfg = 'w-full px-3 py-2 rounded-lg border border-input bg-white text-sm min-h-[72px] resize-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring transition-colors';

  function renderInput(f) {
    const val = form.customFields?.[f.key] ?? f.defaultValue ?? '';
    const err = errors?.[`custom_${f.key}`];
    const errCls = err ? 'border-destructive focus-visible:ring-destructive/30' : '';

    if (f.type === 'textarea') {
      return (
        <textarea
          className={`${textareaCfg} ${errCls}`}
          rows={3}
          placeholder={f.placeholder || ''}
          value={val}
          onChange={(e) => onSet(f.key, e.target.value)}
        />
      );
    }
    if (f.type === 'select') {
      return (
        <select className={`${inputCfg} ${errCls}`} value={val}
          onChange={(e) => onSet(f.key, e.target.value)}>
          <option value="">— Select —</option>
          {(f.options ?? []).map((o) => <option key={o}>{o}</option>)}
        </select>
      );
    }
    if (f.type === 'toggle') {
      return (
        <OptionGroup
          options={f.options ?? []}
          selected={val}
          multi={false}
          onToggle={(v) => onSet(f.key, val === v ? '' : v)}
        />
      );
    }
    if (f.type === 'multiselect') {
      return (
        <OptionGroup
          options={f.options ?? []}
          selected={Array.isArray(val) ? val : []}
          multi={true}
          onToggle={(v) => {
            const arr = Array.isArray(val) ? val : [];
            onSet(f.key, arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]);
          }}
        />
      );
    }
    if (f.type === 'checkbox') {
      return (
        <OptionGroup
          options={['Yes', 'No']}
          selected={val}
          multi={false}
          onToggle={(v) => onSet(f.key, val === v ? '' : v)}
        />
      );
    }
    if (f.type === 'number') {
      const hasMin = f.min !== '' && f.min != null;
      const hasMax = f.max !== '' && f.max != null;
      return (
        <input
          className={`${inputCfg} ${errCls}`}
          type="number"
          placeholder={f.placeholder || ''}
          value={val}
          onChange={(e) => {
            let v = e.target.value;
            // Clamp digit count to max length
            if (v !== '' && hasMax && v.replace(/[^0-9]/g, '').length > Number(f.max)) {
              v = v.slice(0, Number(f.max));
            }
            onSet(f.key, v);
            const errKey = `custom_${f.key}`;
            if (onError) {
              const len = v.replace(/[^0-9]/g, '').length;
              if (v !== '' && hasMin && len < Number(f.min)) {
                onError((p) => ({ ...p, [errKey]: `Must be at least ${f.min} digits.` }));
              } else {
                onError((p) => ({ ...p, [errKey]: '' }));
              }
            }
          }}
        />
      );
    }
    if (f.type === 'text') {
      const hasMin = f.min !== '' && f.min != null;
      const hasMax = f.max !== '' && f.max != null;
      return (
        <input
          className={`${inputCfg} ${errCls}`}
          type="text"
          placeholder={f.placeholder || ''}
          maxLength={hasMax ? Number(f.max) : undefined}
          value={val}
          onChange={(e) => {
            const v = e.target.value;
            onSet(f.key, v);
            const errKey = `custom_${f.key}`;
            if (onError) {
              if (v !== '' && hasMin && v.length < Number(f.min)) {
                onError((p) => ({ ...p, [errKey]: `Must be at least ${f.min} characters.` }));
              } else {
                onError((p) => ({ ...p, [errKey]: '' }));
              }
            }
          }}
        />
      );
    }
    // date (and any other types)
    return (
      <input
        className={`${inputCfg} ${errCls}`}
        type={f.type === 'date' ? 'date' : 'text'}
        placeholder={f.placeholder || ''}
        value={val}
        onChange={(e) => onSet(f.key, e.target.value)}
      />
    );
  }

  return (
    <div className="mt-6 rounded-xl border border-dashed border-primary/30 overflow-hidden">
      <div className="flex items-center gap-2 px-5 py-3 bg-primary/5 border-b border-primary/10">
        <i className="fas fa-puzzle-piece text-primary text-xs" />
        <span className="text-sm font-bold text-primary/80">Extended Fields</span>
        <span className="text-[0.65rem] text-muted-foreground ml-1">Configured by Team Lead</span>
      </div>
      <div className="p-5 space-y-4">
        {fields.map((f) => {
          const err = errors?.[`custom_${f.key}`];
          return (
            <FormField key={f.id} label={f.label} required={f.required} hint={f.hint} error={err}>
              {renderInput(f)}
            </FormField>
          );
        })}
      </div>
    </div>
  );
}

// ── Agronomist ad-hoc optional observations ──────────────────────────────────
// Lets the agronomist add any key-value notes during registration (stored in
// adHocFields form state, merged into custom_fields on the engage-step save).
function AdHocFieldsSection({ adHocFields, onChange }) {
  const inputCfg = 'flex-1 h-8 px-2.5 rounded-lg border border-input bg-white text-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring transition-colors';

  function addField() {
    onChange([...adHocFields, { id: Date.now(), label: '', value: '' }]);
  }

  function updateField(id, key, val) {
    onChange(adHocFields.map((f) => (f.id === id ? { ...f, [key]: val } : f)));
  }

  function removeField(id) {
    onChange(adHocFields.filter((f) => f.id !== id));
  }

  return (
    <div className="mt-5 rounded-xl border border-dashed border-amber-300 overflow-hidden">
      <div className="flex items-center justify-between px-5 py-3 bg-amber-50/60 border-b border-amber-200">
        <div className="flex items-center gap-2">
          <i className="fas fa-pen-alt text-amber-600 text-xs" aria-hidden="true" />
          <span className="text-sm font-bold text-amber-800">Your Observations</span>
          <span className="text-[0.65rem] text-muted-foreground ml-1">Optional — add any custom notes</span>
        </div>
        <button
          type="button"
          onClick={addField}
          className="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-amber-700 border border-amber-300 rounded-lg hover:bg-amber-100 transition-colors"
        >
          <i className="fas fa-plus text-[0.6rem]" aria-hidden="true" /> Add Field
        </button>
      </div>
      {adHocFields.length === 0 ? (
        <div className="px-5 py-4 text-xs text-muted-foreground italic">
          No custom fields added yet. Click "Add Field" to record observations specific to this visit.
        </div>
      ) : (
        <div className="p-5 space-y-2">
          {adHocFields.map((f) => (
            <div key={f.id} className="flex gap-2 items-center">
              <input
                className={inputCfg}
                placeholder="Label (e.g. Bank Name)"
                value={f.label}
                onChange={(e) => updateField(f.id, 'label', e.target.value)}
              />
              <input
                className={inputCfg}
                placeholder="Value"
                value={f.value}
                onChange={(e) => updateField(f.id, 'value', e.target.value)}
              />
              <button
                type="button"
                onClick={() => removeField(f.id)}
                className="w-8 h-8 flex items-center justify-center text-destructive/60 hover:text-destructive hover:bg-destructive/5 rounded-lg border border-destructive/20 transition-colors shrink-0"
              >
                <i className="fas fa-times text-xs" aria-hidden="true" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function RegisterFarmerPage() {
  const { showToast }          = useToast();
  const navigate               = useNavigate();
  const location               = useLocation();
  const { getDropdownOptions, getEnabledSteps, getFieldsForStep, configuredBy, territory, refetchConfig } = useFormConfig();

  // Filter a geography list to only IDs the team lead configured.
  // If the configured list is empty, all items at that level are allowed.
  function filterGeo(items, configuredIds) {
    if (!configuredIds || configuredIds.length === 0) return items;
    const allowed = new Set(configuredIds);
    return items.filter((x) => allowed.has(x.id));
  }
  // Derived from context — respects Leadership's step enable/disable configuration.
  const enabledSteps = getEnabledSteps();
  const [step, setStep]        = useState(0);
  const [form, setForm]        = useState(INIT);
  const [errors, setErrors]    = useState({});
  const [resuming, setResuming]= useState(false);   // shows "Loading draft…" spinner
  const [showAadhaar, setShowAadhaar] = useState(false);
  const [gpsLoading, setGpsLoading]   = useState(false);
  const [photos, setPhotos]    = useState({ farmer: null, land: null, well: null, soil: null, house: null });
  const [photoErrors, setPhotoErrors] = useState({});
  const [submitting, setSubmitting]   = useState(false);
  const [saving, setSaving]           = useState(false);

  // Draft ID — set after step 0 creates the farmer record
  const [draftId, setDraftId]  = useState(null);

  // Geography cascading data
  const [geoStates,    setGeoStates]    = useState([]);
  const [geoDistricts, setGeoDistricts] = useState([]);
  const [geoTalukas,   setGeoTalukas]   = useState([]);
  const [geoVillages,  setGeoVillages]  = useState([]);

  // ── Dynamic dropdown lists from FormConfigContext ─────────────────────────
  // Fall back to the static JSON defaults when the context returns empty arrays.
  const CROPS_LIST     = getDropdownOptions('crops').length     ? getDropdownOptions('crops')     : CROPS_LIST_DEFAULT;
  const INPUTS_LIST    = getDropdownOptions('inputs').length    ? getDropdownOptions('inputs')    : INPUTS_LIST_DEFAULT;
  const CHALLENGE_LIST = getDropdownOptions('challenges').length? getDropdownOptions('challenges'): CHALLENGE_LIST_DEFAULT;
  const SCHEME_LIST    = getDropdownOptions('awareness').length ? getDropdownOptions('awareness') : SCHEME_LIST_DEFAULT;
  const IRRIG_INFRA    = getDropdownOptions('irrigationInfra').length ? getDropdownOptions('irrigationInfra') : IRRIG_INFRA_DEFAULT;
  const SOIL_OPTIONS   = getDropdownOptions('soilType');
  const WATER_OPTIONS  = getDropdownOptions('waterSource');
  const OWNERSHIP_OPTS = getDropdownOptions('ownership');
  const FARM_METHOD_OPTS = getDropdownOptions('farmMethod');
  const SEASON_OPTS    = getDropdownOptions('season');
  const TRAINING_OPTS  = getDropdownOptions('training');
  const TIMELINE_OPTS  = getDropdownOptions('timeline');
  const APPT_OPTS      = getDropdownOptions('appointment');
  const PRIORITY_OPTS  = getDropdownOptions('priority');
  const GENDER_OPTS    = getDropdownOptions('gender');
  const EDU_OPTS       = getDropdownOptions('education');

  // Helper: set a custom-field value
  function setCustomField(key, value) {
    setForm((p) => ({ ...p, customFields: { ...p.customFields, [key]: value } }));
  }

  // ── Restore geography dropdowns for a given set of IDs ──────
  const restoreGeoDropdowns = useCallback(async (stateId, districtId, talukaId) => {
    try {
      const [districts, talukas, villages] = await Promise.all([
        stateId    ? getGeoDistricts(stateId)    : Promise.resolve([]),
        districtId ? getGeoTalukas(districtId)   : Promise.resolve([]),
        talukaId   ? getGeoVillages(talukaId)    : Promise.resolve([]),
      ]);
      setGeoDistricts(districts);
      setGeoTalukas(talukas);
      setGeoVillages(villages);
    } catch { /* silent — user can re-select if cascade fails */ }
  }, []);

  // Re-fetch so fields added by the team lead after the agronomist logged in are visible.
  useEffect(() => { refetchConfig(); }, []);   // eslint-disable-line react-hooks/exhaustive-deps

  // ── Mount: load states + handle resume / session restore ─────
  useEffect(() => {
    getGeoStates().then(setGeoStates).catch(() => {});

    const resumeFarmerId = location.state?.resumeFarmerId;

    // ── Case 1: Resume a saved farmer from DraftListPage ─────
    if (resumeFarmerId) {
      setResuming(true);
      (async () => {
        try {
          // On F5 refresh, location.state persists in browser History API — so Case 1
          // re-fires even though the user is just refreshing mid-registration.
          // Prefer the local session when it belongs to the same farmer: it holds
          // step progress and unsaved form values that the DB doesn't have yet.
          const existingRaw = sessionStorage.getItem(SESSION_KEY);
          if (existingRaw) {
            try {
              const { step: sStep, form: sForm, draftId: sDraftId } = JSON.parse(existingRaw);
              if (sDraftId === resumeFarmerId && sStep !== undefined && sStep !== null) {
                setForm(sForm);
                setStep(sStep);
                setDraftId(resumeFarmerId);
                restoreGeoDropdowns(sForm.stateId, sForm.districtId, sForm.talukaId);
                return;
              }
            } catch { /* corrupted session — fall through to API load */ }
          }

          const farmer = await getFarmerById(resumeFarmerId);
          if (!farmer) { showToast('Could not load draft. Starting fresh.', 'error'); return; }

          const prefilled   = farmerToForm(farmer);
          const resumeStepId = determineResumeStepId(farmer);
          const resumeStep   = Math.max(0, enabledSteps.findIndex((s) => s.id === resumeStepId));

          // Cascade-load geography if farmer has a village
          if (farmer.village_id) {
            try {
              const ctx = await getVillageContext(farmer.village_id);
              prefilled.stateId    = ctx.state_id;
              prefilled.state      = ctx.state_name;
              prefilled.districtId = ctx.district_id;
              prefilled.district   = ctx.district_name;
              prefilled.talukaId   = ctx.taluka_id;
              prefilled.taluka     = ctx.taluka_name;
              prefilled.villageId  = ctx.village_id;
              prefilled.village    = ctx.village_name;
              if (!prefilled.pincode && ctx.pin_code) prefilled.pincode = ctx.pin_code;
              await restoreGeoDropdowns(ctx.state_id, ctx.district_id, ctx.taluka_id);
            } catch { /* geography cascade optional */ }
          }

          setForm(prefilled);
          setDraftId(resumeFarmerId);
          setStep(resumeStep);
          saveSession(resumeStep, prefilled, resumeFarmerId);
          showToast(`Resuming ${farmer.first_name ?? 'farmer'}'s registration at step ${resumeStep + 1}.`, 'info');
        } catch {
          showToast('Failed to load draft. Starting fresh.', 'error');
        } finally {
          setResuming(false);
        }
      })();
      return;
    }

    // ── Case 2: Restore session on refresh / back-forward / unavailable nav API ─
    // Only skip restore when navType is explicitly 'navigate' (sidebar link, URL bar).
    // 'reload' = F5, 'back_forward' = history nav, undefined = API unavailable — all restore.
    // draftId is NOT required: early steps (before the farmer record is created) should
    // also be restored so the user doesn't lose their identity/location input on refresh.
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (raw) {
      const navType = performance.getEntriesByType?.('navigation')[0]?.type;
      if (navType !== 'navigate') {
        try {
          const { step: s, form: f, draftId: d } = JSON.parse(raw);
          if (s !== undefined && s !== null) {
            setForm(f);
            setStep(s);
            if (d) setDraftId(d);
            restoreGeoDropdowns(f.stateId, f.districtId, f.talukaId);
            return;
          }
        } catch { /* corrupted session — start fresh */ }
      }
    }

    // ── Case 3: Fresh navigation (nav-link click) — clear any stale session
    clearSession();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const totalSteps = enabledSteps.length;
  const pct        = Math.round((step / Math.max(totalSteps - 1, 1)) * 100);

  function set(field, value) {
    setForm((p) => ({ ...p, [field]: value }));
    setErrors((p) => ({ ...p, [field]: '' }));
  }

  function toggleArr(field, value) {
    setForm((p) => {
      const arr = p[field];
      return { ...p, [field]: arr.includes(value) ? arr.filter((v) => v !== value) : [...arr, value] };
    });
    setErrors((p) => ({ ...p, [field]: '' }));
  }

  function handleStateChange(stateId, stateName) {
    setForm((p) => ({ ...p, stateId, state: stateName, districtId: null, district: '', talukaId: null, taluka: '', villageId: null, village: '' }));
    setErrors((p) => ({ ...p, state: '' }));
    setGeoDistricts([]); setGeoTalukas([]); setGeoVillages([]);
    if (stateId) getGeoDistricts(stateId).then(setGeoDistricts).catch(() => {});
  }

  function handleDistrictChange(districtId, districtName) {
    setForm((p) => ({ ...p, districtId, district: districtName, talukaId: null, taluka: '', villageId: null, village: '' }));
    setErrors((p) => ({ ...p, district: '' }));
    setGeoTalukas([]); setGeoVillages([]);
    if (districtId) getGeoTalukas(districtId).then(setGeoTalukas).catch(() => {});
  }

  function handleTalukaChange(talukaId, talukaName) {
    setForm((p) => ({ ...p, talukaId, taluka: talukaName, villageId: null, village: '' }));
    setErrors((p) => ({ ...p, taluka: '' }));
    setGeoVillages([]);
    if (talukaId) getGeoVillages(talukaId).then(setGeoVillages).catch(() => {});
  }

  function handleVillageChange(villageId, villageName) {
    setForm((p) => ({ ...p, villageId, village: villageName }));
    setErrors((p) => ({ ...p, village: '' }));
  }

  function handleDobChange(dob) {
    set('dob', dob);
    if (dob) {
      const birth = new Date(dob);
      const today = new Date();
      let age = today.getFullYear() - birth.getFullYear();
      const m = today.getMonth() - birth.getMonth();
      if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
      if (age >= 0 && age <= 110) set('age', String(age));
    }
  }

  function handleGps() {
    if (!navigator.geolocation) { showToast('Geolocation not supported.', 'error'); return; }
    setGpsLoading(true);
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        set('gps', `${coords.latitude.toFixed(6)}, ${coords.longitude.toFixed(6)}`);
        setGpsLoading(false);
        showToast('Location captured successfully.', 'success');
      },
      () => { setGpsLoading(false); showToast('Location access denied.', 'error'); },
      { timeout: 10000, enableHighAccuracy: true },
    );
  }

  // Auto-capture GPS when the location step opens (silent — no toast on auto-trigger).
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (enabledSteps[step]?.id !== 'location') return;
    if (form.gps || gpsLoading || !navigator.geolocation) return;
    setGpsLoading(true);
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        set('gps', `${coords.latitude.toFixed(6)}, ${coords.longitude.toFixed(6)}`);
        setGpsLoading(false);
      },
      () => { setGpsLoading(false); }, // silent fail — user can click "Use Location" manually
      { timeout: 10000, enableHighAccuracy: true },
    );
  }, [step]); // intentional: only re-run when step changes, not on every form update

  // Auto-save form + step to session on every change so a mid-step refresh
  // doesn't lose values typed since the last Next / Back click (400 ms debounce).
  useEffect(() => {
    const timer = setTimeout(() => saveSession(step, form, draftId), 400);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form, step, draftId]);

  function setPhoto(key, file, err) {
    setPhotos((p) => ({ ...p, [key]: file }));
    setPhotoErrors((p) => ({ ...p, [key]: err || '' }));
  }

  // ── Step payload builders ───────────────────────────────────

  function buildStep1Payload() {
    const EDU_MAP = { Illiterate: 'None', Primary: 'Primary', Secondary: 'Secondary', HSC: 'Secondary', Graduate: 'Graduate', 'Post Graduate': 'Post Graduate' };
    const p = { first_name: form.firstName.trim(), mobile: form.mobile };
    if (form.farmerId.trim())   p.farmer_code     = form.farmerId.trim();
    if (form.middleName.trim()) p.middle_name     = form.middleName.trim();
    if (form.lastName.trim())   p.last_name       = form.lastName.trim();
    if (form.altContact)        p.alt_mobile      = form.altContact;
    if (form.gender)            p.gender          = form.gender.toLowerCase();
    if (form.dob)               p.dob             = form.dob;
    if (form.age)               p.age             = parseInt(form.age);
    if (form.education)         p.education_level = EDU_MAP[form.education] || 'None';
    return p;
  }

  function buildStepPayload(stepId) {
    const OWNERSHIP_MAP = { 'Own': 'owned', 'Leased': 'leased', 'Shared / Bagayat': 'share_cropped', 'Family Owned': 'owned' };
    const FARM_MAP      = { Chemical: 'chemical', Organic: 'organic', Natural: 'natural', Mixed: 'mixed' };
    const INTEREST_MAP  = { Low: 'low', Medium: 'medium', High: 'high' };
    const PRIORITY_MAP  = { High: 'high', Medium: 'medium', Low: 'low' };

    switch (stepId) {
      case 'location': {
        const p = {};
        if (form.villageId) p.village_id    = form.villageId;
        if (form.pincode)   p.pin_code      = form.pincode;
        if (form.mandi)     p.nearest_mandi = form.mandi;
        if (form.gps) {
          const parts = form.gps.split(',').map((x) => parseFloat(x.trim()));
          if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
            p.gps_lat = parts[0]; p.gps_lng = parts[1];
          }
        }
        return p;
      }
      case 'farm': {
        const p = {};
        if (form.totalLand)        p.land_acres               = parseFloat(form.totalLand);
        if (form.irrigatedLand)    p.irrigated_land_acres      = parseFloat(form.irrigatedLand);
        if (form.nonIrrigatedLand) p.non_irrigated_land_acres  = parseFloat(form.nonIrrigatedLand);
        if (form.soilType)         p.soil_type                 = form.soilType;
        if (form.waterSource)      p.water_source              = form.waterSource;
        if (form.ownership)        p.land_ownership            = OWNERSHIP_MAP[form.ownership] || 'other';
        return p;
      }
      case 'crops': {
        const p = { crop_names: form.crops };
        if (form.annualYield)  p.annual_yield_quintals = parseFloat(form.annualYield);
        if (form.yieldHistory) p.yield_history_notes   = form.yieldHistory;
        if (form.cropCoverage) p.practice_notes        = `Coverage: ${form.cropCoverage}`;
        if (form.season)       p.submission_notes      = `Season: ${form.season}`;
        return p;
      }
      case 'practice': {
        const p = {};
        if (form.farmMethod)    p.farming_type   = FARM_MAP[form.farmMethod] || 'chemical';
        if (form.practiceNotes) p.practice_notes = form.practiceNotes;
        return p;
      }
      case 'readiness': {
        const p = {};
        if (form.interest)  p.interest_level    = INTEREST_MAP[form.interest] || 'medium';
        if (form.timeline)  p.adoption_timeline = form.timeline;
        if (form.attended)  p.attended_training = form.attended === 'Yes' ? 1 : 0;
        return p;
      }
      case 'engage': {
        const p = {};
        if (form.consultNotes) p.consult_notes = form.consultNotes;
        if (form.followupDate) p.followup_date = form.followupDate;
        if (form.priority)     p.priority      = PRIORITY_MAP[form.priority] || 'medium';
        if (form.nextAction)   p.next_action   = form.nextAction;
        if (form.refBy)        p.referred_by   = form.refBy;

        // Merge Leadership-configured values + agronomist ad-hoc observations
        const merged = { ...form.customFields };
        (form.adHocFields || []).forEach((f) => {
          const key = f.label.trim().toLowerCase()
            .replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
          if (key) merged[key] = f.value;
        });
        if (Object.keys(merged).length) p.custom_fields = merged;
        return p;
      }
      default: return {};
    }
  }

  // ── Navigation ──────────────────────────────────────────────

  function scrollToFirstError() {
    requestAnimationFrame(() => {
      const el = document.querySelector('[data-error="true"], .border-destructive');
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
  }

  async function handleNext() {
    const stepId   = enabledSteps[step]?.id ?? '';
    const baseValidate = VALIDATOR_BY_ID[stepId] ?? (() => ({}));
    const errs = baseValidate(form);

    // Validate required Leadership-configured extended fields for this step
    const configuredFields = getFieldsForStep(stepId);
    for (const f of configuredFields) {
      if (f.required) {
        const val = form.customFields?.[f.key];
        const empty = val === undefined || val === '' || val === null
          || (Array.isArray(val) && !val.length);
        if (empty) errs[`custom_${f.key}`] = `${f.label} is required.`;
      }
    }

    if (Object.keys(errs).length) { setErrors(errs); scrollToFirstError(); return; }

    setSaving(true);
    let activeDraftId = draftId;
    try {
      if (step === 0) {
        if (!draftId) {
          // Fresh — check mobile uniqueness then create
          const isDuplicate = await checkMobileDuplicate(form.mobile);
          if (isDuplicate) {
            setErrors({ mobile: 'This mobile number is already registered.' });
            setSaving(false);
            return;
          }
          const result = await createFarmer(buildStep1Payload());
          activeDraftId = result.id;
          setDraftId(result.id);
          set('farmerId', result.farmer_code);
        } else {
          // Resuming step 0 — save all identity fields (not just farmer_code)
          await updateFarmer(draftId, buildStep1Payload());
        }
      } else if (draftId) {
        const payload = buildStepPayload(stepId);
        // Persist all custom field values on every step save so they're not
        // lost if the user doesn't reach the 'engage' step (which normally
        // flushes them). The 'engage' case in buildStepPayload already sets
        // custom_fields (merged with ad-hoc), so only add here for other steps.
        if (payload.custom_fields === undefined && Object.keys(form.customFields || {}).length > 0) {
          payload.custom_fields = { ...form.customFields };
        }
        if (Object.keys(payload).length > 0) {
          await updateFarmer(draftId, payload);
        }
      }
      setErrors({});
      const nextStep = Math.min(step + 1, totalSteps - 1);
      setStep(nextStep);
      saveSession(nextStep, form, activeDraftId);
    } catch (err) {
      // err.message may be a raw JSON string from the backend — extract the detail field if present
      let msg = err?.message || 'Failed to save. Please try again.';
      try { const parsed = JSON.parse(msg); if (parsed?.detail) msg = parsed.detail; } catch { /* not JSON */ }
      showToast(msg, 'error');
    } finally {
      setSaving(false);
    }
  }

  function handleBack() {
    setErrors({});
    const prevStep = Math.max(step - 1, 0);
    setStep(prevStep);
    saveSession(prevStep, form, draftId);
  }

  function handleStepClick(idx) {
    if (idx === step) return;
    if (idx < step) {
      setErrors({});
      setStep(idx);
      saveSession(idx, form, draftId);
    } else {
      const errs = VALIDATORS[step](form);
      if (Object.keys(errs).length) { setErrors(errs); scrollToFirstError(); return; }
      setErrors({});
      setStep(idx);
      saveSession(idx, form, draftId);
    }
  }

  function handleReset() {
    clearSession();
    setForm({ ...INIT, customFields: {}, adHocFields: [] });
    setErrors({});
    setStep(0);
    setDraftId(null);
    setPhotos({ farmer: null, land: null, well: null, soil: null, house: null });
    setGeoDistricts([]); setGeoTalukas([]); setGeoVillages([]);
  }

  async function handleSubmit() {
    if (!draftId) {
      showToast('Registration data is incomplete. Please go back and complete all steps.', 'error');
      return;
    }
    setSubmitting(true);
    try {
      // Upload photos if any were selected
      const selectedPhotos = Object.entries(photos).filter(([, f]) => f instanceof File).map(([k]) => k);
      if (selectedPhotos.length > 0) {
        try {
          const result = await uploadFarmerPhotos(draftId, photos);
          // Backend may silently skip files with unsupported format
          const skipped = result?.skipped_unsupported ?? [];
          const notSaved = selectedPhotos.filter(k => !(result?.saved ?? []).includes(k) && !skipped.includes(k));
          if (skipped.length > 0) {
            showToast(`${skipped.length} photo(s) skipped — use JPG, PNG, or WEBP format. Upload later from the farmer profile.`, 'warning');
          } else if (notSaved.length > 0) {
            showToast(`Some photos could not be saved. You can upload them from the farmer profile.`, 'warning');
          }
        } catch (photoErr) {
          // Non-fatal — registration succeeds even if photo upload fails
          let msg = photoErr?.message || '';
          try { const p = JSON.parse(msg); if (p?.detail) msg = p.detail; } catch { /* not JSON */ }
          showToast(`Photos could not be saved${msg ? ` (${msg})` : ''}. You can upload them from the farmer profile.`, 'warning');
        }
      }
      // Mark the draft as fully registered — moves it from Drafts to Farmers list
      await completeFarmerRegistration(draftId);
      showToast(`Farmer "${form.firstName} ${form.lastName}" registered successfully.`, 'success');
      clearSession();
      handleReset();
      navigate(-1);
    } catch (err) {
      showToast(err?.message || 'Failed to complete registration.', 'error');
    } finally {
      setSubmitting(false);
    }
  }

  /* ─── Shared input helpers ─────────────────────────────────── */
  const ic = (field) => `${inputCls} ${errors[field] ? invalidCls : ''}`;
  const sc = (field) => `${selectCls} ${errors[field] ? invalidCls : ''}`;
  const iconInputWrap = 'relative flex items-center';
  const iconInput     = (field) => `${ic(field)} pl-8`;

  /* ─── Step renderers ──────────────────────────────────────── */

  function S1_Identity() {
    return (
      <FormSection icon="fas fa-id-card" iconColor="green" title="Personal Identity" sub="Basic identification details of the farmer">
        <FormField label="Farmer ID" hint={draftId ? 'Auto-assigned — edit to use a custom ID' : 'Optional — leave blank to auto-assign after save'}>
          <div className={iconInputWrap}>
            <i className="fas fa-id-badge absolute left-3 text-muted-foreground text-xs pointer-events-none" aria-hidden="true" />
            <input
              className={`${inputCls} pl-8 font-mono text-xs`}
              placeholder={draftId ? '' : 'e.g. FMR-0001 or leave blank'}
              value={form.farmerId}
              onChange={(e) => set('farmerId', e.target.value)}
              id="regFarmerId"
            />
          </div>
        </FormField>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <FormField label="First Name" id="regFirstName" required error={errors.firstName}>
            <div className={iconInputWrap}>
              <i className="fas fa-user absolute left-3 text-muted-foreground text-xs pointer-events-none" aria-hidden="true" />
              <input className={iconInput('firstName')} id="regFirstName" placeholder="e.g. Ramesh"
                value={form.firstName} onChange={(e) => set('firstName', e.target.value)} />
            </div>
          </FormField>
          <FormField label="Middle Name" id="regMiddleName">
            <input className={inputCls} id="regMiddleName" placeholder="e.g. Bhiku"
              value={form.middleName} onChange={(e) => set('middleName', e.target.value)} />
          </FormField>
          <FormField label="Last Name" id="regLastName" required error={errors.lastName}>
            <input className={ic('lastName')} id="regLastName" placeholder="e.g. Patel"
              value={form.lastName} onChange={(e) => set('lastName', e.target.value)} />
          </FormField>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField label="Mobile Number" id="regMobile" required error={errors.mobile}
            hint="Must be unique — used as login identifier">
            <div className={iconInputWrap}>
              <i className="fas fa-mobile-alt absolute left-3 text-muted-foreground text-xs pointer-events-none" aria-hidden="true" />
              <input className={iconInput('mobile')} id="regMobile" placeholder="10-digit number"
                maxLength={10} inputMode="numeric"
                value={form.mobile} onChange={(e) => set('mobile', e.target.value)} />
            </div>
          </FormField>
          <FormField label="Alternate Contact" id="regAltContact">
            <div className={iconInputWrap}>
              <i className="fas fa-phone absolute left-3 text-muted-foreground text-xs pointer-events-none" aria-hidden="true" />
              <input className={`${inputCls} pl-8`} id="regAltContact" placeholder="Optional" maxLength={10}
                value={form.altContact} onChange={(e) => set('altContact', e.target.value)} />
            </div>
          </FormField>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <FormField label="Gender" id="regGender" required error={errors.gender}>
            <select className={sc('gender')} id="regGender"
              value={form.gender} onChange={(e) => set('gender', e.target.value)}>
              <option value="">— Select —</option>
              {GENDER_OPTS.map((g) => <option key={g}>{g}</option>)}
            </select>
          </FormField>
          <FormField label="Age (years)" id="regAge" error={errors.age}>
            <input
              className={ic('age')}
              id="regAge"
              type="number"
              min={18}
              max={110}
              placeholder="e.g. 42"
              value={form.age}
              onChange={(e) => {
                let val = e.target.value;
                if (val !== '' && Number(val) > 110) val = '110';
                set('age', val);
                if (val !== '' && Number(val) < 18) {
                  setErrors((p) => ({ ...p, age: 'Age must be between 18 and 110.' }));
                } else {
                  setErrors((p) => ({ ...p, age: '' }));
                }
              }}
            />
          </FormField>
          <FormField label="Education" id="regEducation">
            <select className={selectCls} id="regEducation"
              value={form.education} onChange={(e) => set('education', e.target.value)}>
              <option value="">— Optional —</option>
              {EDU_OPTS.map((e) => <option key={e}>{e}</option>)}
            </select>
          </FormField>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField label="Aadhaar Number" id="regAadhaar" error={errors.aadhaar}
            hint="12-digit number — only last 4 digits stored visibly">
            <div className={iconInputWrap}>
              <i className="fas fa-fingerprint absolute left-3 text-muted-foreground text-xs pointer-events-none" aria-hidden="true" />
              <input
                className={`${ic('aadhaar')} pl-8 pr-9`}
                id="regAadhaar"
                type={showAadhaar ? 'text' : 'password'}
                placeholder="12-digit Aadhaar"
                maxLength={12} inputMode="numeric" autoComplete="off"
                value={form.aadhaar} onChange={(e) => set('aadhaar', e.target.value)}
              />
              <button type="button"
                className="absolute right-2 text-muted-foreground hover:text-primary transition-colors"
                onClick={() => setShowAadhaar((v) => !v)}>
                <i className={`fas ${showAadhaar ? 'fa-eye' : 'fa-eye-slash'} text-xs`} aria-hidden="true" />
              </button>
            </div>
          </FormField>
          <FormField label="Date of Birth" id="regDob" hint="Age is auto-calculated from DOB">
            <input className={inputCls} id="regDob" type="date"
              value={form.dob} onChange={(e) => handleDobChange(e.target.value)} />
          </FormField>
        </div>
        <ExtendedFieldsSection stepId="identity" form={form} onSet={setCustomField} errors={errors} onError={setErrors} />
      </FormSection>
    );
  }

  function S2_Location() {
    return (
      <FormSection icon="fas fa-map-marker-alt" iconColor="blue" title="Location Details" sub="Where the farmer is based and farms">
        <div className="flex items-center gap-3 p-4 bg-blue-50 border border-blue-200 rounded-xl">
          <div className="w-9 h-9 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center shrink-0">
            <i className="fas fa-satellite-dish" aria-hidden="true" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-xs font-bold text-blue-800">GPS Coordinates</div>
            <div className="text-xs text-blue-600">
              {gpsLoading ? 'Detecting location…' : form.gps ? `Captured: ${form.gps}` : 'Auto-capturing location…'}
            </div>
          </div>
          <button type="button"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 text-white text-xs font-semibold hover:bg-blue-700 transition-colors disabled:opacity-60"
            onClick={handleGps} disabled={gpsLoading}>
            <i className={`fas ${gpsLoading ? 'fa-spinner fa-spin' : 'fa-crosshairs'}`} aria-hidden="true" />
            {gpsLoading ? 'Detecting…' : form.gps ? 'Recapture' : 'Use Location'}
          </button>
        </div>

        <div className="relative flex items-center gap-3 my-2">
          <div className="flex-1 border-t border-border" />
          <span className="text-xs text-muted-foreground">or fill manually</span>
          <div className="flex-1 border-t border-border" />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField label="State" id="regState" required error={errors.state}>
            <select className={sc('state')} id="regState"
              value={form.stateId ?? ''}
              onChange={(e) => {
                const opt = e.target.options[e.target.selectedIndex];
                handleStateChange(e.target.value ? Number(e.target.value) : null, opt.text);
              }}>
              <option value="">— Select State —</option>
              {filterGeo(geoStates, territory?.state_ids).map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </FormField>
          <FormField label="District" id="regDistrict" required error={errors.district}
            hint={!form.stateId ? 'Select a state first' : undefined}>
            <SearchableSelect
              id="regDistrict"
              options={filterGeo(geoDistricts, territory?.district_ids)}
              value={form.districtId}
              onChange={(id, name) => handleDistrictChange(id, name)}
              placeholder={form.stateId ? 'Search district…' : '— Select state first —'}
              disabled={!form.stateId}
              invalid={!!errors.district}
            />
          </FormField>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField label="Taluka / Tehsil" required error={errors.taluka}
            hint={!form.districtId ? 'Select a district first' : undefined}>
            <SearchableSelect
              options={filterGeo(geoTalukas, territory?.taluka_ids)}
              value={form.talukaId}
              onChange={(id, name) => handleTalukaChange(id, name)}
              placeholder={form.districtId ? 'Search taluka…' : '— Select district first —'}
              disabled={!form.districtId}
              invalid={!!errors.taluka}
            />
          </FormField>
          <FormField label="Village" required error={errors.village}
            hint={!form.talukaId ? 'Select a taluka first' : undefined}>
            <SearchableSelect
              options={filterGeo(geoVillages, territory?.village_ids)}
              value={form.villageId}
              onChange={(id, name) => handleVillageChange(id, name)}
              placeholder={form.talukaId ? 'Search village…' : '— Select taluka first —'}
              disabled={!form.talukaId}
              invalid={!!errors.village}
            />
          </FormField>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField label="Pincode" error={errors.pincode} hint="6-digit pincode">
            <div className={iconInputWrap}>
              <i className="fas fa-mail-bulk absolute left-3 text-muted-foreground text-xs pointer-events-none" aria-hidden="true" />
              <input className={`${ic('pincode')} pl-8`} placeholder="6-digit pincode"
                maxLength={6} inputMode="numeric"
                value={form.pincode} onChange={(e) => set('pincode', e.target.value)} />
            </div>
          </FormField>
          <FormField label="Nearest Market / Mandi">
            <input className={inputCls} placeholder="e.g. Anand APMC"
              value={form.mandi} onChange={(e) => set('mandi', e.target.value)} />
          </FormField>
        </div>

        <FormField label="GPS Coordinates" hint="Format: Latitude, Longitude">
          <div className="flex gap-2">
            <div className={`${iconInputWrap} flex-1`}>
              <i className="fas fa-crosshairs absolute left-3 text-muted-foreground text-xs pointer-events-none" aria-hidden="true" />
              <input className={`${inputCls} pl-8`} placeholder="Auto-filled or enter manually: Lat, Long"
                value={form.gps} onChange={(e) => set('gps', e.target.value)} />
            </div>
            <button type="button"
              disabled={!form.gps}
              onClick={() => form.gps && window.open(`https://www.google.com/maps?q=${encodeURIComponent(form.gps)}`, '_blank')}
              className="px-3 py-1.5 rounded-lg border border-border text-xs font-semibold text-foreground bg-white hover:border-primary transition-colors disabled:opacity-40">
              <i className="fas fa-map" aria-hidden="true" /> Map
            </button>
          </div>
        </FormField>
      </FormSection>
    );
  }

  function S3_Farm() {
    return (
      <FormSection icon="fas fa-tractor" iconColor="amber" title="Farm Profile" sub="Land details, soil type and water source">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <FormField label="Total Land (acres)" required error={errors.totalLand}>
            <input className={ic('totalLand')} type="number" step="0.5" min="0.5" placeholder="e.g. 5.5"
              value={form.totalLand} onChange={(e) => set('totalLand', e.target.value)} />
          </FormField>
          <FormField label="Irrigated (acres)">
            <input className={inputCls} type="number" step="0.5" min="0" placeholder="e.g. 3.0"
              value={form.irrigatedLand} onChange={(e) => set('irrigatedLand', e.target.value)} />
          </FormField>
          <FormField label="Non-irrigated (acres)">
            <input className={inputCls} type="number" step="0.5" min="0" placeholder="e.g. 2.5"
              value={form.nonIrrigatedLand} onChange={(e) => set('nonIrrigatedLand', e.target.value)} />
          </FormField>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField label="Soil Type" required error={errors.soilType}>
            <select className={sc('soilType')} value={form.soilType} onChange={(e) => set('soilType', e.target.value)}>
              <option value="">— Select —</option>
              {SOIL_OPTIONS.map((o) => <option key={o}>{o}</option>)}
            </select>
          </FormField>
          <FormField label="Primary Water Source" required error={errors.waterSource}>
            <select className={sc('waterSource')} value={form.waterSource} onChange={(e) => set('waterSource', e.target.value)}>
              <option value="">— Select —</option>
              {WATER_OPTIONS.map((o) => <option key={o}>{o}</option>)}
            </select>
          </FormField>
        </div>
        <FormField label="Land Ownership">
          <OptionGroup options={OWNERSHIP_OPTS.length ? OWNERSHIP_OPTS : ['Own','Leased','Shared / Bagayat','Family Owned']}
            selected={form.ownership} multi={false}
            onToggle={(v) => set('ownership', form.ownership === v ? '' : v)} />
        </FormField>
        <FormField label="Irrigation Infrastructure">
          <OptionGroup options={IRRIG_INFRA} selected={form.irrigInfra} multi={true}
            onToggle={(v) => toggleArr('irrigInfra', v)} />
        </FormField>
        <ExtendedFieldsSection stepId="farm" form={form} onSet={setCustomField} errors={errors} onError={setErrors} />
      </FormSection>
    );
  }

  function S4_Crops() {
    const textareaCls = 'w-full px-3 py-2 rounded-lg border border-input bg-white text-sm min-h-[72px] resize-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring transition-colors';
    return (
      <FormSection icon="fas fa-seedling" iconColor="green" title="Cropping Details" sub="Current and seasonal crop patterns">
        <FormField label="Current / Main Crop(s)" required error={errors.crops}>
          <OptionGroup options={CROPS_LIST} selected={form.crops} multi={true}
            onToggle={(v) => toggleArr('crops', v)} />
        </FormField>
        <FormField label="Other Crops (specify)">
          <input className={inputCls} placeholder="e.g. Turmeric, Castor..."
            value={form.cropsOther} onChange={(e) => set('cropsOther', e.target.value)} />
        </FormField>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField label="Seasonal Pattern">
            <select className={selectCls} value={form.season} onChange={(e) => set('season', e.target.value)}>
              <option value="">— Select —</option>
              {SEASON_OPTS.map((o) => <option key={o}>{o}</option>)}
            </select>
          </FormField>
          <FormField label="Approx. Annual Yield (quintals)">
            <input className={inputCls} type="number" min="0" placeholder="e.g. 45"
              value={form.annualYield} onChange={(e) => set('annualYield', e.target.value)} />
          </FormField>
        </div>
        <FormField label="Acre-wise Crop Coverage">
          <textarea className={textareaCls} rows={3}
            placeholder="e.g. Cotton – 3 acres, Groundnut – 2 acres, Vegetables – 0.5 acres"
            value={form.cropCoverage} onChange={(e) => set('cropCoverage', e.target.value)} />
        </FormField>
        <FormField label="Previous Year Yield History">
          <textarea className={`${textareaCls} min-h-[56px]`} rows={2}
            placeholder="e.g. Cotton 2024-25: 8 quintals/acre, Wheat: 12 quintals/acre"
            value={form.yieldHistory} onChange={(e) => set('yieldHistory', e.target.value)} />
        </FormField>
        <ExtendedFieldsSection stepId="crops" form={form} onSet={setCustomField} errors={errors} onError={setErrors} />
      </FormSection>
    );
  }

  function S5_Practice() {
    return (
      <FormSection icon="fas fa-flask" iconColor="brown" title="Farming Practice" sub="Current input usage, methods and challenges">
        <FormField label="Current Farming Method" required error={errors.farmMethod}>
          <OptionGroup
            options={FARM_METHOD_OPTS.length ? FARM_METHOD_OPTS : ['Chemical', 'Organic', 'Natural / Zero-budget', 'Mixed']}
            selected={form.farmMethod} multi={false}
            onToggle={(v) => set('farmMethod', form.farmMethod === v ? '' : v)} />
        </FormField>
        <FormField label="Inputs Currently Used">
          <OptionGroup options={INPUTS_LIST} selected={form.inputs} multi={true}
            onToggle={(v) => toggleArr('inputs', v)} />
        </FormField>
        <FormField label="Current Challenges Faced">
          <OptionGroup options={CHALLENGE_LIST} selected={form.challenges} multi={true}
            onToggle={(v) => toggleArr('challenges', v)} />
        </FormField>
        <FormField label="Additional Notes on Practice">
          <textarea className="w-full px-3 py-2 rounded-lg border border-input bg-white text-sm min-h-[72px] resize-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring transition-colors"
            rows={3} placeholder="Any other details about the farming approach..."
            value={form.practiceNotes} onChange={(e) => set('practiceNotes', e.target.value)} />
        </FormField>
        <ExtendedFieldsSection stepId="practice" form={form} onSet={setCustomField} errors={errors} onError={setErrors} />
      </FormSection>
    );
  }

  function S6_Readiness() {
    return (
      <FormSection icon="fas fa-chart-line" iconColor="purple" title="Adoption Readiness" sub="Farmer's openness to change and natural farming transition">
        <FormField label="Interest in Natural / Organic Farming" required error={errors.interest}>
          <SliderTrack
            options={[
              { value: 'Low',    label: 'Low Interest'      },
              { value: 'Medium', label: 'Moderate'          },
              { value: 'High',   label: 'Highly Interested' },
            ]}
            selected={form.interest}
            onSelect={(v) => set('interest', v)} />
        </FormField>
        <FormField label="Awareness of Government Schemes">
          <OptionGroup options={SCHEME_LIST} selected={form.awareness} multi={true}
            onToggle={(v) => toggleArr('awareness', v)} />
        </FormField>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField label="Training Requirement">
            <select className={selectCls} value={form.training} onChange={(e) => set('training', e.target.value)}>
              <option value="">— Select —</option>
              {TRAINING_OPTS.map((o) => <option key={o}>{o}</option>)}
            </select>
          </FormField>
          <FormField label="Conversion Timeline (approx.)">
            <select className={selectCls} value={form.timeline} onChange={(e) => set('timeline', e.target.value)}>
              <option value="">— Select —</option>
              {TIMELINE_OPTS.map((o) => <option key={o}>{o}</option>)}
            </select>
          </FormField>
        </div>
        <FormField label="Has Attended Any Training / Demo?">
          <OptionGroup options={['Yes','No']} selected={form.attended} multi={false}
            onToggle={(v) => set('attended', form.attended === v ? '' : v)} />
        </FormField>
        <ExtendedFieldsSection stepId="readiness" form={form} onSet={setCustomField} errors={errors} onError={setErrors} />
      </FormSection>
    );
  }

  function S7_Engage() {
    return (
      <FormSection icon="fas fa-handshake" iconColor="blue" title="Engagement Plan" sub="Next actions, follow-up and appointment">
        <FormField label="Consultation Notes">
          <textarea className="w-full px-3 py-2 rounded-lg border border-input bg-white text-sm min-h-[96px] resize-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring transition-colors"
            rows={4} placeholder="Key observations from initial meeting, farmer's concerns, specific requirements..."
            value={form.consultNotes} onChange={(e) => set('consultNotes', e.target.value)} />
        </FormField>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField label="Follow-up Date" required error={errors.followupDate} hint="Must be today or a future date">
            <div className={iconInputWrap}>
              <i className="fas fa-calendar-alt absolute left-3 text-muted-foreground text-xs pointer-events-none" aria-hidden="true" />
              <input className={`${ic('followupDate')} pl-8`} type="date"
                value={form.followupDate} onChange={(e) => set('followupDate', e.target.value)} />
            </div>
          </FormField>
          <FormField label="Appointment Status">
            <select className={selectCls} value={form.appointment} onChange={(e) => set('appointment', e.target.value)}>
              {APPT_OPTS.length
                ? APPT_OPTS.map((o) => <option key={o}>{o}</option>)
                : <>
                    <option value="Scheduled">Scheduled</option>
                    <option value="Pending">Pending Confirmation</option>
                    <option value="FollowUp">Follow-up Required</option>
                    <option value="Completed">Initial Visit Done</option>
                  </>
              }
            </select>
          </FormField>
        </div>
        <FormField label="Priority Level">
          <OptionGroup
            options={PRIORITY_OPTS.length ? PRIORITY_OPTS : ['High', 'Medium', 'Low']}
            selected={form.priority} multi={false}
            onToggle={(v) => set('priority', form.priority === v ? '' : v)} />
        </FormField>
        <FormField label="Next Action Item">
          <input className={inputCls} placeholder="e.g. Send fertilizer schedule, arrange demo plot visit..."
            value={form.nextAction} onChange={(e) => set('nextAction', e.target.value)} />
        </FormField>
        <FormField label="Referred by (if any)">
          <input className={inputCls} placeholder="e.g. Another farmer name, organization..."
            value={form.refBy} onChange={(e) => set('refBy', e.target.value)} />
        </FormField>
        <ExtendedFieldsSection stepId="engage" form={form} onSet={setCustomField} errors={errors} onError={setErrors} />
        <AdHocFieldsSection
          adHocFields={form.adHocFields || []}
          onChange={(fields) => setForm((p) => ({ ...p, adHocFields: fields }))}
        />
      </FormSection>
    );
  }

  function S8_Photos() {
    return (
      <FormSection icon="fas fa-camera" iconColor="blue" title="Photo Uploads"
        sub="Farmer portrait and farm/infrastructure photos (optional, max 3 MB each)">
        <FormField label="Farmer Photo" hint="JPG, PNG, WEBP — max 3 MB">
          <PhotoZone id="farmerPhotoInput" icon="fas fa-user-circle"
            caption="Click or drag to upload farmer portrait photo"
            file={photos.farmer} onFile={(f, e) => setPhoto('farmer', f, e)} error={photoErrors.farmer} />
        </FormField>
        <div>
          <label className={labelCls}>
            Farm &amp; Infrastructure Photos
            <span className="text-[10px] text-muted-foreground/70 font-normal ml-1">(optional)</span>
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { key: 'land',  icon: 'fas fa-mountain', cap: 'Land / Field'    },
              { key: 'well',  icon: 'fas fa-water',    cap: 'Well / Borewell' },
              { key: 'soil',  icon: 'fas fa-seedling', cap: 'Soil Sample'     },
              { key: 'house', icon: 'fas fa-home',     cap: 'House / Farm'    },
            ].map(({ key, icon, cap }) => (
              <div key={key}>
                <PhotoZone id={`${key}PhotoInput`} icon={icon} caption={cap} small
                  file={photos[key]} onFile={(f, e) => setPhoto(key, f, e)} error={photoErrors[key]} />
                <div className="text-[10px] text-center text-muted-foreground mt-1">{cap}</div>
              </div>
            ))}
          </div>
          <p className={hintCls}>JPG, PNG or WEBP — each file must be under 3 MB</p>
        </div>
      </FormSection>
    );
  }

  function S9_Review() {
    const fullName = [form.firstName, form.middleName, form.lastName].filter(Boolean).join(' ');
    return (
      <div>
        <div className="flex items-center gap-3 p-4 mb-5 rounded-xl bg-green-50 border-2 border-green-200">
          <div className="w-10 h-10 bg-green-700 rounded-full flex items-center justify-center shrink-0">
            <i className="fas fa-clipboard-check text-white text-sm" aria-hidden="true" />
          </div>
          <div>
            <div className="text-[0.9375rem] font-extrabold text-green-900 font-heading">
              Review &amp; Confirm Registration
            </div>
            <div className="text-xs text-green-700 mt-0.5">
              Please verify all information before submitting. You can go back to edit any step.
            </div>
          </div>
        </div>
        <ReviewBlock title="Personal Identity" icon="fas fa-id-card" rows={[
          ['Farmer ID', form.farmerId], ['Full Name', fullName],
          ['Mobile', form.mobile], ['Alternate', form.altContact],
          ['Gender', form.gender], ['Age', form.age ? `${form.age} yrs` : ''],
          ['Education', form.education],
          ['Aadhaar', form.aadhaar ? `XXXX XXXX ${form.aadhaar.slice(-4)}` : ''],
          ['Date of Birth', form.dob],
        ]} />
        <ReviewBlock title="Location" icon="fas fa-map-marker-alt" rows={[
          ['State', form.state], ['District', form.district], ['Taluka', form.taluka],
          ['Village', form.village], ['Pincode', form.pincode],
          ['Mandi', form.mandi], ['GPS', form.gps],
        ]} />
        <ReviewBlock title="Farm Profile" icon="fas fa-tractor" rows={[
          ['Total Land', form.totalLand ? `${form.totalLand} acres` : ''],
          ['Irrigated', form.irrigatedLand ? `${form.irrigatedLand} acres` : ''],
          ['Non-irrigated', form.nonIrrigatedLand ? `${form.nonIrrigatedLand} acres` : ''],
          ['Soil Type', form.soilType], ['Water Source', form.waterSource],
          ['Ownership', form.ownership], ['Irrig. Infra', form.irrigInfra.join(', ')],
        ]} />
        <ReviewBlock title="Cropping Details" icon="fas fa-seedling" rows={[
          ['Crops', [...form.crops, form.cropsOther].filter(Boolean).join(', ')],
          ['Season', form.season],
          ['Annual Yield', form.annualYield ? `${form.annualYield} qtl` : ''],
          ['Coverage', form.cropCoverage],
        ]} />
        <ReviewBlock title="Farming Practice" icon="fas fa-flask" rows={[
          ['Method', form.farmMethod], ['Inputs', form.inputs.join(', ')],
          ['Challenges', form.challenges.join(', ')], ['Notes', form.practiceNotes],
        ]} />
        <ReviewBlock title="Adoption Readiness" icon="fas fa-chart-line" rows={[
          ['Interest', form.interest], ['Schemes', form.awareness.join(', ')],
          ['Training', form.training], ['Timeline', form.timeline], ['Attended', form.attended],
        ]} />
        <ReviewBlock title="Engagement Plan" icon="fas fa-handshake" rows={[
          ['Follow-up Date', form.followupDate], ['Appointment', form.appointment],
          ['Priority', form.priority], ['Next Action', form.nextAction],
          ['Referred By', form.refBy], ['Notes', form.consultNotes],
        ]} />
        {(() => {
          // Merge Leadership-configured values + ad-hoc observations for review display
          const allFields = { ...form.customFields };
          (form.adHocFields || []).forEach((f) => {
            const key = f.label.trim().toLowerCase()
              .replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
            if (key) allFields[key] = f.value;
          });
          return Object.keys(allFields).length > 0 ? (
            <ReviewBlock
              title="Extended & Custom Fields"
              icon="fas fa-puzzle-piece"
              rows={Object.entries(allFields).map(([k, v]) => [
                k.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
                Array.isArray(v) ? v.join(', ') : String(v ?? ''),
              ])}
            />
          ) : null;
        })()}
      </div>
    );
  }

  const RENDERER_BY_ID = {
    identity:  S1_Identity,
    location:  S2_Location,
    farm:      S3_Farm,
    crops:     S4_Crops,
    practice:  S5_Practice,
    readiness: S6_Readiness,
    engage:    S7_Engage,
    photos:    S8_Photos,
    review:    S9_Review,
  };

  const progressGradient = pct < 30
    ? 'linear-gradient(90deg,#EF5350,#D32F2F)'
    : pct < 70
      ? 'linear-gradient(90deg,#FF9800,#E65100)'
      : 'linear-gradient(90deg,#4CAF50,#1B5E20)';

  /* ─── Main render ─────────────────────────────────────────── */
  if (resuming) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[40vh] gap-4 text-muted-foreground">
        <i className="fas fa-spinner fa-spin text-2xl text-green-600" aria-hidden="true" />
        <p className="text-sm font-medium">Loading draft…</p>
      </div>
    );
  }

  return (
    <div id="page-register" className="space-y-6 pb-36">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-xl font-bold text-foreground font-heading">Register New Farmer</div>
          <div className="text-sm text-muted-foreground mt-0.5">Complete all steps to add a farmer to the system</div>
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
        {/* ── Green gradient wizard header ── */}
        <div className="bg-gradient-to-br from-green-900 via-green-800 to-green-700 text-white px-8 py-8">
          <div className="text-lg font-extrabold font-heading mb-0.5">
            <i className="fas fa-user-plus mr-2 opacity-90" aria-hidden="true" />
            Farmer Registration
          </div>
          <div className="text-sm text-white/70 mb-4">Fill all sections to create a complete farmer profile</div>

          {configuredBy && (
            <div className="inline-flex items-center gap-1.5 bg-white/15 text-white/90 text-xs font-medium px-3 py-1.5 rounded-full mb-5">
              <i className="fas fa-user-tie text-[10px] opacity-80" aria-hidden="true" />
              Form configured by <strong className="font-semibold text-white">{configuredBy}</strong>
            </div>
          )}

          <div className="flex gap-3 flex-wrap" role="list">
            {enabledSteps.map((s, idx) => {
              const isDone   = idx < step;
              const isActive = idx === step;
              return (
                <div
                  key={s.id}
                  role="listitem"
                  aria-label={`Step ${idx + 1}: ${s.label}`}
                  className="flex flex-col items-center gap-1"
                  style={{ cursor: isActive ? 'default' : 'pointer' }}
                  onClick={() => handleStepClick(idx)}
                >
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all
                    ${isActive ? 'bg-white text-green-800 shadow-lg scale-110'
                      : isDone  ? 'bg-green-500 text-white'
                      : 'bg-white/30 text-white hover:bg-white/50'}`}>
                    {isDone
                      ? <i className="fas fa-check text-[10px]" aria-hidden="true" />
                      : idx + 1}
                  </div>
                  <div className={`text-[10px] font-semibold hidden sm:block ${isActive ? 'text-white' : 'text-white/70 hover:text-white'}`}>
                    {s.label}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── Wizard body ── */}
        <div className="p-6" id="regWizardBody">
          {(() => {
            const stepDef = enabledSteps[step];
            const Renderer = stepDef ? RENDERER_BY_ID[stepDef.id] : null;
            // Call as a plain function (not <Renderer />) so React doesn't treat
            // each render's new function reference as a different component type —
            // which would unmount/remount the subtree on every keystroke.
            return Renderer ? Renderer() : null;
          })()}
        </div>
      </div>

      {/* ── Fixed wizard footer ── */}
      <div
        id="regWizardFooter"
        style={{ position: 'fixed', bottom: 'var(--bottom-nav-h)', left: 'var(--footer-left)', right: 0, zIndex: 9999 }}
        className="bg-white border-t border-border px-6 py-3 flex items-center gap-4 shadow-lg"
      >
        <div className="flex-1 min-w-0">
          <div className="flex justify-between text-xs font-semibold text-foreground mb-1">
            <span>Step {step + 1} of {totalSteps} — {enabledSteps[step]?.label ?? ''}</span>
            <span>{pct}%</span>
          </div>
          <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-300 progress-shimmer"
              style={{ width: `${pct}%`, background: progressGradient }}
              role="progressbar"
              aria-valuenow={pct}
              aria-valuemin={0}
              aria-valuemax={100}
            />
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {step > 0 ? (
            <button type="button"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border text-xs font-semibold text-foreground bg-white hover:bg-muted/50 transition-colors"
              onClick={handleBack}>
              <i className="fas fa-arrow-left" aria-hidden="true" /> Back
            </button>
          ) : (
            <button type="button"
              className="px-3 py-1.5 rounded-lg border border-border text-xs font-semibold text-muted-foreground bg-white hover:bg-muted/50 transition-colors"
              onClick={handleReset}>
              Reset
            </button>
          )}

          {step < totalSteps - 1 ? (
            <button type="button"
              disabled={saving}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-primary text-white text-xs font-semibold hover:bg-primary/90 transition-colors disabled:opacity-60"
              onClick={handleNext}>
              {saving
                ? <><i className="fas fa-spinner fa-spin" aria-hidden="true" /> Saving…</>
                : <>Save &amp; Next <i className="fas fa-arrow-right" aria-hidden="true" /></>}
            </button>
          ) : (
            <button type="button"
              disabled={submitting}
              onClick={handleSubmit}
              style={{ background: 'linear-gradient(135deg,#1B5E20,#2E7D32)' }}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-white text-xs font-semibold transition-opacity disabled:opacity-60">
              {submitting
                ? <><i className="fas fa-spinner fa-spin" aria-hidden="true" /> Registering…</>
                : <><i className="fas fa-check-circle" aria-hidden="true" /> Register Farmer</>}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
