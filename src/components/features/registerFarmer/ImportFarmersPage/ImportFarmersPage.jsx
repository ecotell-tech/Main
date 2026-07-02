import { useState, useRef, useCallback } from 'react';
import * as XLSX from 'xlsx';
import { useRoleTheme } from '@hooks/useRoleTheme';
import { importFarmers } from '@services/farmerService';

// ── Column definitions ──────────────────────────────────────────────────────
const COLUMNS = [
  // Identity
  { header: 'First Name',              key: 'first_name',               required: true,  section: 'Identity' },
  { header: 'Mobile (10 digits)',       key: 'mobile',                   required: true,  section: 'Identity' },
  { header: 'Last Name',               key: 'last_name',                required: false, section: 'Identity' },
  { header: 'Middle Name',             key: 'middle_name',              required: false, section: 'Identity' },
  { header: 'Gender',                  key: 'gender',                   required: false, section: 'Identity', options: ['male','female','other'] },
  { header: 'Date of Birth',           key: 'dob',                      required: false, section: 'Identity', hint: 'YYYY-MM-DD' },
  { header: 'Education Level',         key: 'education_level',          required: false, section: 'Identity', options: ['None','Primary','Secondary','Graduate','Post Graduate'] },
  { header: 'Alternate Mobile',        key: 'alt_mobile',               required: false, section: 'Identity' },
  // Location
  { header: 'State',                   key: 'state_name',               required: false, section: 'Location' },
  { header: 'District',                key: 'district_name',            required: false, section: 'Location' },
  { header: 'Taluka',                  key: 'taluka_name',              required: false, section: 'Location' },
  { header: 'Village',                 key: 'village_name',             required: false, section: 'Location' },
  { header: 'PIN Code',                key: 'pin_code',                 required: false, section: 'Location' },
  { header: 'Nearest Mandi',           key: 'nearest_mandi',            required: false, section: 'Location' },
  { header: 'GPS Latitude',            key: 'gps_lat',                  required: false, section: 'Location' },
  { header: 'GPS Longitude',           key: 'gps_lng',                  required: false, section: 'Location' },
  // Farm
  { header: 'Total Land (acres)',      key: 'land_acres',               required: false, section: 'Farm' },
  { header: 'Irrigated Land (acres)',  key: 'irrigated_land_acres',     required: false, section: 'Farm' },
  { header: 'Non-Irrigated Land (acres)', key: 'non_irrigated_land_acres', required: false, section: 'Farm' },
  { header: 'Soil Type',               key: 'soil_type',                required: false, section: 'Farm' },
  { header: 'Water Source',            key: 'water_source',             required: false, section: 'Farm' },
  { header: 'Land Ownership',          key: 'land_ownership',           required: false, section: 'Farm', options: ['owned','leased','share_cropped','other'] },
  { header: 'Farming Type',            key: 'farming_type',             required: false, section: 'Farm', options: ['chemical','organic','natural','mixed'] },
  // Practice
  { header: 'Primary Crop',            key: 'primary_crop',             required: false, section: 'Practice' },
  { header: 'Practice Notes',          key: 'practice_notes',           required: false, section: 'Practice' },
  // Readiness & Engagement
  { header: 'Interest Level',          key: 'interest_level',           required: false, section: 'Readiness', options: ['high','medium','low'] },
  { header: 'Training Willingness',    key: 'training_willingness',     required: false, section: 'Readiness', options: ['very_willing','moderate','not_willing'] },
  { header: 'Adoption Timeline',       key: 'adoption_timeline',        required: false, section: 'Readiness' },
  { header: 'Priority',                key: 'priority',                 required: false, section: 'Readiness', options: ['high','medium','low'] },
  { header: 'Next Action',             key: 'next_action',              required: false, section: 'Readiness' },
  { header: 'Referred By',             key: 'referred_by',              required: false, section: 'Readiness' },
  // Meta
  { header: 'Family Members',          key: 'family_members',           required: false, section: 'Meta' },
  { header: 'Annual Income (INR)',      key: 'annual_income',            required: false, section: 'Meta' },
  { header: 'Survey Date',             key: 'survey_date',              required: false, section: 'Meta', hint: 'YYYY-MM-DD' },
  { header: 'Farmer Code (Optional)',   key: 'farmer_code',              required: false, section: 'Meta' },
];

const SECTION_COLORS = {
  Identity:  { bg: '#eff6ff', border: '#bfdbfe', text: '#1d4ed8' },
  Location:  { bg: '#f0fdf4', border: '#bbf7d0', text: '#15803d' },
  Farm:      { bg: '#fff7ed', border: '#fed7aa', text: '#c2410c' },
  Practice:  { bg: '#fdf4ff', border: '#e9d5ff', text: '#7e22ce' },
  Readiness: { bg: '#fefce8', border: '#fde68a', text: '#a16207' },
  Meta:      { bg: '#f8fafc', border: '#e2e8f0', text: '#475569' },
};

const SAMPLE_ROW = {
  first_name: 'Ramesh', mobile: '9876543210', last_name: 'Patil',
  middle_name: 'Kumar', gender: 'male', dob: '1985-04-15',
  education_level: 'Secondary', alt_mobile: '',
  state_name: 'Maharashtra', district_name: 'Pune', taluka_name: 'Haveli', village_name: 'Uruli Kanchan',
  pin_code: '412202', nearest_mandi: 'Pune APMC', gps_lat: '18.4500', gps_lng: '74.1200',
  land_acres: '5.5', irrigated_land_acres: '3', non_irrigated_land_acres: '2.5',
  soil_type: 'Black', water_source: 'Borewell', land_ownership: 'owned', farming_type: 'mixed',
  primary_crop: 'Sugarcane', practice_notes: 'Uses drip irrigation',
  interest_level: 'high', training_willingness: 'very_willing', adoption_timeline: '6 months',
  priority: 'high', next_action: 'Schedule demo visit', referred_by: '',
  family_members: '5', annual_income: '250000', survey_date: '2026-06-01', farmer_code: '',
};

// ── Template generator ──────────────────────────────────────────────────────
function downloadTemplate() {
  const wb = XLSX.utils.book_new();

  const instr = [
    ['FARMER IMPORT TEMPLATE — Pruthashakti Kisan Kalyan Mission'],
    [''],
    ['INSTRUCTIONS:'],
    ['1. Fill the "Farmers" sheet starting from Row 3 (Row 2 is a sample — you may delete it).'],
    ['2. Columns marked REQUIRED must not be left blank.'],
    ['3. Date format must be YYYY-MM-DD (e.g. 1985-04-15).'],
    ['4. For Geography, enter exact State / District / Taluka / Village names.'],
    ['5. Enum columns accept only the listed values (case-insensitive).'],
    [''],
    ['COLUMN GUIDE:'],
    ['Column', 'Required?', 'Allowed Values / Notes'],
    ...COLUMNS.map(c => [
      c.required ? `${c.header} *` : c.header,
      c.required ? 'YES' : 'No',
      c.options ? c.options.join(' | ') : (c.hint ?? ''),
    ]),
  ];
  const wsI = XLSX.utils.aoa_to_sheet(instr);
  wsI['!cols'] = [{ wch: 34 }, { wch: 10 }, { wch: 60 }];
  XLSX.utils.book_append_sheet(wb, wsI, 'Instructions');

  const headers = COLUMNS.map(c => c.required ? `${c.header} *` : c.header);
  const sample  = COLUMNS.map(c => SAMPLE_ROW[c.key] ?? '');
  const wsF = XLSX.utils.aoa_to_sheet([headers, sample]);
  wsF['!cols'] = COLUMNS.map(() => ({ wch: 22 }));
  XLSX.utils.book_append_sheet(wb, wsF, 'Farmers');

  XLSX.writeFile(wb, 'farmer_import_template.xlsx');
}

// ── Row validator ───────────────────────────────────────────────────────────
function validateRow(row) {
  const errs = [];
  if (!String(row.first_name ?? '').trim()) errs.push('First name is required');
  if (String(row.mobile ?? '').replace(/\D/g, '').length < 10)
    errs.push('Mobile must be 10+ digits');
  COLUMNS.forEach(col => {
    if (col.options && row[col.key]) {
      const val     = String(row[col.key]).trim().toLowerCase();
      const allowed = col.options.map(o => o.toLowerCase());
      if (!allowed.includes(val))
        errs.push(`"${col.header}" must be one of: ${col.options.join(', ')}`);
    }
  });
  return errs;
}

// ── Step indicator ──────────────────────────────────────────────────────────
function Steps({ step }) {
  const STEPS = ['Upload', 'Preview', 'Import', 'Done'];
  return (
    <div className="flex items-center gap-0">
      {STEPS.map((label, i) => (
        <div key={label} className="flex items-center">
          <div className="flex flex-col items-center gap-1">
            <div className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-bold transition-colors
              ${step > i ? 'bg-green-500 text-white' : step === i ? 'bg-white text-blue-700' : 'bg-white/30 text-white/70'}`}>
              {step > i ? <i className="fas fa-check text-xs" /> : i + 1}
            </div>
            <span className={`text-[0.62rem] font-semibold hidden sm:block
              ${step === i ? 'text-white' : step > i ? 'text-green-200' : 'text-white/60'}`}>
              {label}
            </span>
          </div>
          {i < STEPS.length - 1 && (
            <div className={`h-px w-8 sm:w-14 mx-1 mt-[-12px] sm:mt-[-18px]
              ${step > i ? 'bg-green-300' : 'bg-white/30'}`} />
          )}
        </div>
      ))}
    </div>
  );
}

// ── Upload zone ─────────────────────────────────────────────────────────────
function UploadZone({ onFile, accent }) {
  const [drag, setDrag] = useState(false);
  const inputRef = useRef(null);

  const handle = useCallback((file) => {
    if (!file) return;
    if (!file.name.match(/\.(xlsx|xls|csv)$/i)) {
      alert('Please upload an .xlsx, .xls, or .csv file.');
      return;
    }
    onFile(file);
  }, [onFile]);

  return (
    <div
      onDragOver={e => { e.preventDefault(); setDrag(true); }}
      onDragLeave={() => setDrag(false)}
      onDrop={e => { e.preventDefault(); setDrag(false); handle(e.dataTransfer.files[0]); }}
      onClick={() => inputRef.current?.click()}
      className={`border-2 border-dashed rounded-2xl p-12 text-center cursor-pointer transition-all
        ${drag ? 'border-blue-400 bg-blue-50' : 'border-border hover:border-blue-300 hover:bg-blue-50/30'}`}
    >
      <input
        ref={inputRef} type="file" accept=".xlsx,.xls,.csv"
        className="hidden"
        onChange={e => handle(e.target.files?.[0])}
      />
      <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4"
        style={{ background: `${accent}20` }}>
        <i className="fas fa-file-arrow-up text-3xl" style={{ color: accent }} />
      </div>
      <p className="text-base font-bold text-foreground mb-1">Drop your Excel file here</p>
      <p className="text-sm text-muted-foreground mb-4">.xlsx, .xls, .csv — or click to browse</p>
      <span className="inline-flex items-center gap-2 text-sm font-semibold px-4 py-2 rounded-xl text-white cursor-pointer"
        style={{ background: accent }}>
        <i className="fas fa-folder-open" /> Choose File
      </span>
    </div>
  );
}

// ── Preview table ───────────────────────────────────────────────────────────
function PreviewTable({ rows, errors }) {
  const VISIBLE = COLUMNS.slice(0, 8);
  const validCount   = rows.filter((_, i) => !errors[i]?.length).length;
  const invalidCount = rows.length - validCount;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-4 flex-wrap">
        <span className="flex items-center gap-1.5 text-sm font-semibold text-green-700">
          <i className="fas fa-circle-check text-green-500" /> {validCount} ready
        </span>
        {invalidCount > 0 && (
          <span className="flex items-center gap-1.5 text-sm font-semibold text-red-700">
            <i className="fas fa-circle-xmark text-red-500" /> {invalidCount} with errors
          </span>
        )}
        <span className="text-sm text-muted-foreground ml-auto">{rows.length} rows parsed</span>
      </div>
      <div className="overflow-x-auto rounded-xl border border-border">
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-muted/50 border-b border-border">
              <th className="px-3 py-2.5 text-left font-semibold text-muted-foreground w-10">#</th>
              <th className="px-3 py-2.5 text-left font-semibold text-muted-foreground w-16">Status</th>
              {VISIBLE.map(c => (
                <th key={c.key} className="px-3 py-2.5 text-left font-semibold text-muted-foreground whitespace-nowrap">
                  {c.header}{c.required && <span className="text-red-500 ml-0.5">*</span>}
                </th>
              ))}
              <th className="px-3 py-2.5 text-left font-semibold text-muted-foreground">Issues</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => {
              const errs = errors[i] ?? [];
              const ok   = errs.length === 0;
              return (
                <tr key={i} className={`border-b border-border last:border-0
                  ${ok ? 'hover:bg-green-50/40' : 'bg-red-50/40 hover:bg-red-50/60'}`}>
                  <td className="px-3 py-2 text-muted-foreground">{i + 1}</td>
                  <td className="px-3 py-2">
                    {ok
                      ? <span className="text-[0.65rem] font-bold text-green-700 bg-green-100 px-1.5 py-0.5 rounded">OK</span>
                      : <span className="text-[0.65rem] font-bold text-red-700 bg-red-100 px-1.5 py-0.5 rounded">Error</span>
                    }
                  </td>
                  {VISIBLE.map(c => (
                    <td key={c.key} className="px-3 py-2 max-w-[110px] truncate" title={String(row[c.key] ?? '')}>
                      {row[c.key] || <span className="text-muted-foreground/40">—</span>}
                    </td>
                  ))}
                  <td className="px-3 py-2 text-red-600 text-[0.65rem] max-w-[180px]">
                    {errs.map((e, j) => <div key={j}>• {e}</div>)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Main page ───────────────────────────────────────────────────────────────
export default function ImportFarmersPage() {
  const theme  = useRoleTheme();
  const accent = theme.accent ?? '#16a34a';

  const [step,      setStep]      = useState(0);
  const [fileName,  setFileName]  = useState('');
  const [rows,      setRows]      = useState([]);
  const [errors,    setErrors]    = useState([]);
  const [progress,  setProgress]  = useState(0);
  const [result,    setResult]    = useState(null);
  const [importErr, setImportErr] = useState('');

  function handleFile(file) {
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const wb = XLSX.read(e.target.result, { type: 'array', cellText: true, cellDates: false });
        const sheetName = wb.SheetNames.includes('Farmers') ? 'Farmers' : wb.SheetNames[0];
        const raw = XLSX.utils.sheet_to_json(wb.Sheets[sheetName], { header: 1, defval: '', raw: false });

        if (!raw.length) { alert('The spreadsheet appears to be empty.'); return; }

        const headerRow = raw[0].map(h => String(h ?? '').trim());
        const keyMap = {};
        headerRow.forEach((h, idx) => {
          const clean = h.replace(/\s*\*\s*$/, '').trim();
          const col = COLUMNS.find(c => c.header.toLowerCase() === clean.toLowerCase());
          if (col) keyMap[idx] = col.key;
        });

        const parsedRows = raw.slice(1)
          .map(r => {
            const obj = {};
            Object.entries(keyMap).forEach(([idx, key]) => {
              const v = String(r[idx] ?? '').trim();
              if (v) obj[key] = v;
            });
            return obj;
          })
          .filter(r => Object.keys(r).length > 0);

        if (!parsedRows.length) { alert('No data rows found after the header row.'); return; }

        setRows(parsedRows);
        setErrors(parsedRows.map(validateRow));
        setStep(1);
      } catch (ex) {
        alert(`Failed to parse file: ${ex.message}`);
      }
    };
    reader.readAsArrayBuffer(file);
  }

  async function handleImport() {
    const validRows = rows.filter((_, i) => !errors[i]?.length);
    if (!validRows.length) return;

    setStep(2);
    setProgress(0);
    setImportErr('');

    let prog = 0;
    const ticker = setInterval(() => {
      prog = Math.min(prog + 4, 85);
      setProgress(prog);
    }, 300);

    try {
      const res = await importFarmers(validRows);
      clearInterval(ticker);
      setProgress(100);
      setResult(res);
      setStep(3);
    } catch (err) {
      clearInterval(ticker);
      setImportErr(err?.message ?? 'Import failed. Please try again.');
    }
  }

  function reset() {
    setStep(0); setFileName(''); setRows([]); setErrors([]);
    setProgress(0); setResult(null); setImportErr('');
  }

  const validCount   = rows.filter((_, i) => !errors[i]?.length).length;
  const invalidCount = rows.length - validCount;

  const sectionGroups = COLUMNS.reduce((acc, c) => {
    (acc[c.section] ??= []).push(c);
    return acc;
  }, {});

  return (
    <div className="space-y-6">

      {/* ── Hero ── */}
      <div className="rounded-2xl p-6 text-white"
        style={{ background: `linear-gradient(135deg, ${accent}, ${accent}bb)` }}>
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
                <i className="fas fa-file-import text-lg" />
              </div>
              <h1 className="text-xl font-extrabold">Import Farmers</h1>
            </div>
            <p className="text-sm opacity-80 max-w-lg">
              Upload an Excel file to register multiple farmers at once. Download the template, fill it in, and import.
            </p>
          </div>
          <Steps step={step} />
        </div>
      </div>

      {/* ── Step 0: Upload ── */}
      {step === 0 && (
        <div className="space-y-4">
          {/* Template download */}
          <div className="bg-white rounded-2xl border border-border p-4 flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-green-100 flex items-center justify-center shrink-0">
                <i className="fas fa-file-excel text-green-700 text-base" />
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">Step 1: Download the template</p>
                <p className="text-xs text-muted-foreground">All {COLUMNS.length} columns with a sample row and instructions sheet</p>
              </div>
            </div>
            <button
              onClick={downloadTemplate}
              className="flex items-center gap-2 text-sm font-semibold px-4 py-2 rounded-xl border-2 transition-colors hover:bg-green-50 shrink-0"
              style={{ borderColor: accent, color: accent }}
            >
              <i className="fas fa-download" /> Download Template
            </button>
          </div>

          {/* Column sections guide */}
          <div className="bg-white rounded-2xl border border-border p-5">
            <p className="text-sm font-bold text-foreground mb-3">Column sections</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
              {Object.entries(sectionGroups).map(([sect, cols]) => {
                const clr = SECTION_COLORS[sect] ?? SECTION_COLORS.Meta;
                return (
                  <div key={sect} className="rounded-xl p-3"
                    style={{ background: clr.bg, border: `1px solid ${clr.border}` }}>
                    <p className="text-xs font-bold mb-2" style={{ color: clr.text }}>{sect}</p>
                    <div className="flex flex-wrap gap-1">
                      {cols.map(c => (
                        <span key={c.key}
                          className="text-[0.62rem] px-1.5 py-0.5 rounded bg-white/70 text-foreground"
                          title={c.options ? `Options: ${c.options.join(', ')}` : (c.hint ?? '')}>
                          {c.header}{c.required && <span className="text-red-500 ml-0.5">*</span>}
                        </span>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Upload zone */}
          <div className="bg-white rounded-2xl border border-border p-5">
            <p className="text-sm font-bold text-foreground mb-3">Step 2: Upload your filled file</p>
            <UploadZone onFile={handleFile} accent={accent} />
          </div>
        </div>
      )}

      {/* ── Step 1: Preview ── */}
      {step === 1 && (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-border p-5 space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div>
                <p className="text-sm font-bold text-foreground">
                  <i className="fas fa-file-excel text-green-600 mr-2" />{fileName}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Previewing first 8 columns — all {COLUMNS.length} will be imported.
                </p>
              </div>
              <button onClick={reset}
                className="text-xs font-semibold text-muted-foreground hover:text-foreground flex items-center gap-1.5 px-3 py-1.5 rounded-lg hover:bg-muted transition-colors">
                <i className="fas fa-rotate-left" /> Change File
              </button>
            </div>
            <PreviewTable rows={rows} errors={errors} />
          </div>

          <div className="bg-white rounded-2xl border border-border p-4 flex items-center justify-between gap-4 flex-wrap">
            <div>
              {validCount > 0 ? (
                <p className="text-sm font-semibold text-foreground">
                  Ready to import <span className="text-green-700">{validCount} farmer{validCount !== 1 ? 's' : ''}</span>
                  {invalidCount > 0 && <span className="text-muted-foreground"> ({invalidCount} skipped)</span>}
                </p>
              ) : (
                <p className="text-sm font-semibold text-red-700">No valid rows — fix the errors above first.</p>
              )}
            </div>
            <button
              onClick={handleImport}
              disabled={validCount === 0}
              className="flex items-center gap-2 text-sm font-bold px-6 py-2.5 rounded-xl text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ background: accent }}
            >
              <i className="fas fa-upload" /> Import {validCount} Farmer{validCount !== 1 ? 's' : ''}
            </button>
          </div>
        </div>
      )}

      {/* ── Step 2: Importing ── */}
      {step === 2 && (
        <div className="bg-white rounded-2xl border border-border p-10 text-center space-y-6">
          <div className="w-20 h-20 rounded-2xl flex items-center justify-center mx-auto"
            style={{ background: importErr ? '#fef2f2' : `${accent}18` }}>
            {importErr
              ? <i className="fas fa-circle-xmark text-4xl text-red-500" />
              : <i className="fas fa-cloud-arrow-up text-4xl" style={{ color: accent }} />
            }
          </div>

          {importErr ? (
            <>
              <div>
                <p className="text-base font-bold text-foreground">Import Failed</p>
                <p className="text-sm text-red-600 mt-1 max-w-sm mx-auto">{importErr}</p>
              </div>
              <div className="flex items-center justify-center gap-3">
                <button onClick={() => setStep(1)}
                  className="text-sm font-semibold px-5 py-2 rounded-xl border border-border hover:bg-muted transition-colors">
                  Back to Preview
                </button>
                <button onClick={reset}
                  className="text-sm font-semibold px-5 py-2 rounded-xl text-white"
                  style={{ background: accent }}>
                  Start Over
                </button>
              </div>
            </>
          ) : (
            <>
              <div>
                <p className="text-base font-bold text-foreground">Importing farmers…</p>
                <p className="text-sm text-muted-foreground mt-1">Please wait, do not close this page.</p>
              </div>
              <div className="max-w-sm mx-auto space-y-1.5">
                <div className="h-3 rounded-full bg-muted overflow-hidden">
                  <div className="h-full rounded-full transition-all duration-300"
                    style={{ width: `${progress}%`, background: accent }} />
                </div>
                <p className="text-xs text-muted-foreground">{progress}%</p>
              </div>
            </>
          )}
        </div>
      )}

      {/* ── Step 3: Done ── */}
      {step === 3 && result && (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-border p-8 text-center space-y-5">
            <div className="w-20 h-20 rounded-2xl bg-green-100 flex items-center justify-center mx-auto">
              <i className="fas fa-circle-check text-4xl text-green-600" />
            </div>
            <div>
              <p className="text-xl font-extrabold text-foreground">Import Complete</p>
              <p className="text-sm text-muted-foreground mt-1">
                {result.imported} farmer{result.imported !== 1 ? 's' : ''} registered successfully
                {result.skipped > 0 && `, ${result.skipped} skipped`}.
              </p>
            </div>
            <div className="flex items-center justify-center gap-8">
              <div className="text-center">
                <div className="text-3xl font-extrabold text-green-600">{result.imported}</div>
                <div className="text-xs text-muted-foreground mt-0.5">Imported</div>
              </div>
              {result.skipped > 0 && (
                <div className="text-center">
                  <div className="text-3xl font-extrabold text-red-500">{result.skipped}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">Skipped</div>
                </div>
              )}
            </div>
            <div className="flex items-center justify-center gap-3 pt-2">
              <button onClick={reset}
                className="text-sm font-semibold px-5 py-2.5 rounded-xl border border-border hover:bg-muted transition-colors">
                <i className="fas fa-file-import mr-1.5" /> Import Another
              </button>
              <a href="/app/farmers"
                className="text-sm font-semibold px-5 py-2.5 rounded-xl text-white"
                style={{ background: accent }}>
                <i className="fas fa-users mr-1.5" /> View All Farmers
              </a>
            </div>
          </div>

          {result.results?.length > 0 && (
            <div className="bg-white rounded-2xl border border-border p-5 space-y-3">
              <p className="text-sm font-bold text-foreground">Row-by-row results</p>
              <div className="overflow-x-auto rounded-xl border border-border">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-muted/50 border-b border-border">
                      <th className="px-3 py-2.5 text-left font-semibold text-muted-foreground">Row</th>
                      <th className="px-3 py-2.5 text-left font-semibold text-muted-foreground">Status</th>
                      <th className="px-3 py-2.5 text-left font-semibold text-muted-foreground">Farmer Code</th>
                      <th className="px-3 py-2.5 text-left font-semibold text-muted-foreground">Details</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.results.map((r, i) => (
                      <tr key={i} className="border-b border-border last:border-0">
                        <td className="px-3 py-2 text-muted-foreground">{r.row}</td>
                        <td className="px-3 py-2">
                          {r.success
                            ? <span className="text-[0.65rem] font-bold text-green-700 bg-green-100 px-1.5 py-0.5 rounded">Imported</span>
                            : <span className="text-[0.65rem] font-bold text-red-700 bg-red-100 px-1.5 py-0.5 rounded">Failed</span>
                          }
                        </td>
                        <td className="px-3 py-2 font-mono">{r.farmer_code ?? '—'}</td>
                        <td className="px-3 py-2 text-muted-foreground">{r.error ?? (r.farmer_id ? `ID: ${r.farmer_id}` : '')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
