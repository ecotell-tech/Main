/**
 * OnboardUserPage.jsx — Comprehensive new-user onboarding form.
 *
 * Accessible to:  manager (Leadership), admin
 *
 * Sections
 *   1. Personal Information      (Name, DOB, Gender, Blood Group, Aadhaar, PAN)
 *   2. Contact Details           (Mobile, Alt Mobile, WhatsApp, Work Email, Personal Email)
 *   3. Professional Details      (Employee ID, Designation, Dept, Emp Type, Joining Date,
 *                                 Probation, Experience, Education, Languages, Prev Org)
 *   4. Role & Reporting          (Platform Role, Reports To, Account Status)
 *   5. Territory Assignment      (State, District, Taluka, Pin Code, Villages, Target)
 *   6. Emergency Contact         (Name, Relation, Mobile)
 *   7. Device & System Access    (Device Type, Device ID, Login Method, 2FA, Access Dates)
 *   8. Bank / Payroll Details    (Bank, Account, IFSC, CTC, PF, UAN)
 *   9. Documents & Notes         (Document checklist, Onboarding remarks)
 */

import { useState, useMemo } from 'react';
import { useNavigate }       from 'react-router-dom';
import { useAuth }           from '@context/AuthContext';
import { useToast }          from '@hooks/useToast';
import Button                from '@common/Button/Button';
import Badge                 from '@common/Badge/Badge';
import SYSTEM_USERS          from '@data/mock/users.json';
import STATE_DISTRICTS       from '@data/config/stateDistricts.json';
import { ROUTES }            from '@constants/routes';
import { cn }                from '@/lib/utils';

// â”€â”€ Role configuration â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const ROLE_META = {
  manager:             { label: 'Leadership',          icon: 'fas fa-crown',                color: '#0d9488', bg: '#f0fdfa' },
  admin:               { label: 'Manager',             icon: 'fas fa-user-shield',          color: '#7c3aed', bg: '#faf5ff' },
  team_lead:           { label: 'Team Lead',           icon: 'fas fa-users-between-lines',  color: '#2563eb', bg: '#eff6ff' },
  agronomist:          { label: 'Field Representative', icon: 'fas fa-leaf',                color: '#16a34a', bg: '#f0fdf4' },
  data_entry_operator: { label: 'Data Entry Operator', icon: 'fas fa-keyboard',             color: '#d97706', bg: '#fffbeb' },
};

// What roles each actor can create
// Hierarchy: Leadership → Manager → Team Lead → {Agronomist, DEO}
const CAN_MANAGE = {
  manager:   ['admin'],
  admin:     ['team_lead'],
  team_lead: ['agronomist', 'data_entry_operator'],
};

// Reporting-to role for each new role
const REPORTS_TO_ROLE = {
  admin:               ['manager'],
  team_lead:           ['admin'],
  agronomist:          ['team_lead'],
  data_entry_operator: ['team_lead'],
};

const STATES = Object.keys(STATE_DISTRICTS);

const BLOOD_GROUPS   = ['A+', 'Aâˆ’', 'B+', 'Bâˆ’', 'AB+', 'ABâˆ’', 'O+', 'Oâˆ’'];
const DEPARTMENTS    = ['Agri Sales', 'Field Operations', 'Data & Analytics', 'Administration', 'IT & Systems', 'Finance & HR', 'Training & QA'];
const EMP_TYPES      = [
  { value: 'full_time',  label: 'Full-time' },
  { value: 'part_time',  label: 'Part-time' },
  { value: 'contract',   label: 'Contract' },
  { value: 'intern',     label: 'Internship' },
  { value: 'probation',  label: 'Probation' },
];
const EDUCATION_OPTS = ['Below 10th', '10th Pass', '12th Pass', 'ITI / Diploma', "Bachelor's Degree", "Master's Degree", 'Doctorate / PhD'];
const LANGUAGES_OPTS = ['English', 'Hindi', 'Marathi', 'Gujarati', 'Kannada', 'Telugu', 'Tamil', 'Bengali', 'Punjabi', 'Odia'];
const DEVICE_TYPES   = ['Mobile (Android)', 'Mobile (iOS)', 'Tablet', 'Desktop / Laptop'];
const LOGIN_METHODS  = [
  { value: 'otp',      label: 'OTP (Mobile)' },
  { value: 'password', label: 'Password' },
  { value: 'both',     label: 'OTP + Password' },
];
const BANKS = [
  'State Bank of India', 'Bank of Baroda', 'Canara Bank', 'Punjab National Bank',
  'HDFC Bank', 'ICICI Bank', 'Axis Bank', 'Kotak Mahindra Bank', 'Yes Bank',
  'IDFC First Bank', 'Other',
];
const DOC_TYPES = [
  { id: 'aadhaar_card',   label: 'Aadhaar Card',         icon: 'fas fa-id-card' },
  { id: 'pan_card',       label: 'PAN Card',             icon: 'fas fa-credit-card' },
  { id: 'photo_id',       label: 'Photo ID Proof',       icon: 'fas fa-image' },
  { id: 'address_proof',  label: 'Address Proof',        icon: 'fas fa-home' },
  { id: 'appointment',    label: 'Appointment Letter',   icon: 'fas fa-file-contract' },
  { id: 'education_cert', label: 'Education Certificate', icon: 'fas fa-graduation-cap' },
];

// â”€â”€ Step metadata â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const STEPS = [
  { id: 1, label: 'Personal Information',  short: 'Personal',     icon: 'fas fa-id-badge',             color: '#2563eb' },
  { id: 2, label: 'Contact Details',       short: 'Contact',      icon: 'fas fa-address-book',         color: '#16a34a' },
  { id: 3, label: 'Professional Details',  short: 'Professional', icon: 'fas fa-briefcase',            color: '#7c3aed' },
  { id: 4, label: 'Role & Reporting',      short: 'Role',         icon: 'fas fa-sitemap',              color: '#0d9488' },
  { id: 5, label: 'Territory',             short: 'Territory',    icon: 'fas fa-map-location-dot',     color: '#d97706' },
  { id: 6, label: 'Emergency Contact',     short: 'Emergency',    icon: 'fas fa-heart-pulse',          color: '#dc2626' },
  { id: 7, label: 'Device & Access',       short: 'Access',       icon: 'fas fa-mobile-screen-button', color: '#0284c7' },
  { id: 8, label: 'Bank & Payroll',        short: 'Bank',         icon: 'fas fa-building-columns',     color: '#64748b' },
  { id: 9, label: 'Documents & Notes',     short: 'Docs',         icon: 'fas fa-folder-open',          color: '#9333ea' },
];

function isStepDone(id, form) {
  switch (id) {
    case 1: return !!(form.name && form.dob && form.gender);
    case 2: return !!(form.mobile && form.mobile.length === 10);
    case 3: return !!(form.joiningDate);
    case 4: return !!(form.role);
    case 5: return !!(form.state && form.district);
    case 6: return !!(form.emergencyName && form.emergencyMobile && form.emergencyMobile.length === 10);
    case 7: return !!(form.loginMethod && form.accessFrom);
    case 8: return !!(form.bankName && form.accountNumber);
    case 9: return form.uploadedDocs.length > 0;
    default: return false;
  }
}

const today = new Date().toISOString().split('T')[0];

const EMPTY = {
  // 1 — Personal
  name: '', dob: '', gender: '', bloodGroup: '', aadhaar: '', pan: '',
  // 2 — Contact
  mobile: '', altMobile: '', whatsapp: '', email: '', personalEmail: '',
  // 3 — Professional
  employeeId: '', designation: '', department: '', employmentType: 'full_time',
  joiningDate: today, probationEndDate: '', experience: '', education: '', languages: [],
  previousOrg: '', previousExp: '',
  // 4 — Role & Reporting
  role: '', reportingTo: '', status: 'active',
  // 5 — Territory
  state: '', district: '', taluka: '', villages: '', targetFarmers: '', pinCode: '',
  // 6 — Emergency Contact
  emergencyName: '', emergencyRelation: '', emergencyMobile: '',
  // 7 — Device & Access
  deviceType: 'Mobile (Android)', deviceId: '', loginMethod: 'otp',
  accessFrom: today, accessTo: '', twoFa: true,
  // 8 — Bank / Payroll
  bankName: '', accountNumber: '', ifsc: '', pfNumber: '', uanNumber: '', ctc: '',
  // 9 — Notes & Docs
  notes: '', uploadedDocs: [],
};

// â”€â”€ UI helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const inputCls = (err) => cn(
  'w-full h-10 px-3 text-sm bg-background text-foreground rounded-lg border',
  'placeholder:text-muted-foreground/50 transition-all duration-150',
  'focus:outline-none focus:ring-2',
  err
    ? 'border-red-400 focus:border-red-400 focus:ring-red-200'
    : 'border-input focus:border-primary/70 focus:ring-primary/20',
);

const iconInputCls = (err) => cn(inputCls(err), 'pl-9');

function IField({ icon, iconColor, err, children }) {
  return (
    <div className="relative">
      <i className={cn(
        icon, 'absolute left-3 top-1/2 -translate-y-1/2 text-xs pointer-events-none z-10',
        err ? 'text-red-400' : (iconColor ?? 'text-muted-foreground/60'),
      )} />
      {children}
    </div>
  );
}

function FieldWrapper({ label, required, error, hint, children, span2 = false }) {
  return (
    <div className={cn('flex flex-col gap-1.5', span2 && 'sm:col-span-2')}>
      <label className="text-[0.68rem] font-bold uppercase tracking-widest text-muted-foreground/80 select-none">
        {label}
        {required && <span className="text-red-500 ml-0.5 normal-case font-black">*</span>}
      </label>
      {children}
      {hint && !error && <p className="text-[0.6rem] text-muted-foreground/60 leading-snug">{hint}</p>}
      {error && (
        <p className="text-[0.65rem] text-red-600 font-medium flex items-center gap-1">
          <i className="fas fa-circle-exclamation text-[9px]" /> {error}
        </p>
      )}
    </div>
  );
}

function SelectField({ value, onChange, options, disabled, placeholder, error }) {
  return (
    <div className="relative">
      <select
        className={cn(
          inputCls(error),
          'appearance-none pr-8 cursor-pointer',
          disabled && 'opacity-50 cursor-not-allowed',
        )}
        value={value} onChange={onChange} disabled={disabled}>
        {placeholder && <option value="">{placeholder}</option>}
        {options.map(opt =>
          typeof opt === 'string'
            ? <option key={opt} value={opt}>{opt}</option>
            : <option key={opt.value} value={opt.value}>{opt.label}</option>
        )}
      </select>
      <i className="fas fa-chevron-down absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground/60 text-[10px] pointer-events-none" />
    </div>
  );
}

function ToggleSwitch({ checked, onChange, label }) {
  return (
    <button type="button" onClick={onChange} role="switch" aria-checked={checked}
      className="flex items-center gap-3">
      <div className={cn(
        'relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 shadow-inner',
        checked ? 'bg-primary' : 'bg-muted-foreground/25',
      )}>
        <span className={cn(
          'inline-block h-4 w-4 transform rounded-full bg-white shadow-md transition-transform duration-200',
          checked ? 'translate-x-[22px]' : 'translate-x-1',
        )} />
      </div>
      {label && (
        <span className={cn('text-xs font-semibold transition-colors', checked ? 'text-primary' : 'text-muted-foreground')}>
          {label}
        </span>
      )}
    </button>
  );
}

function SectionCard({ stepId, badge, children }) {
  const s = STEPS[stepId - 1];
  return (
    <div className="bg-card rounded-2xl border border-border overflow-hidden shadow-sm">
      <div className="flex items-center gap-3 px-6 py-3.5 border-b border-border"
        style={{ background: `${s.color}12` }}>
        <div
          className="w-7 h-7 rounded-lg flex items-center justify-center text-white text-[0.65rem] font-extrabold shadow-sm shrink-0"
          style={{ background: s.color }}>
          {stepId}
        </div>
        <i className={cn(s.icon, 'text-sm shrink-0')} style={{ color: s.color }} />
        <span className="text-sm font-bold text-foreground">{s.label}</span>
        {badge && (
          <span className="ml-auto text-[0.58rem] font-semibold uppercase tracking-wide text-muted-foreground bg-muted px-2 py-0.5 rounded-full border border-border">
            {badge}
          </span>
        )}
      </div>
      <div className="p-6">{children}</div>
    </div>
  );
}

// â”€â”€ Success card â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function SuccessCard({ user, onAddAnother, onViewUsers }) {
  const meta = ROLE_META[user.role];
  return (
    <div className="bg-card rounded-2xl border border-border overflow-hidden shadow-sm">
      <div
        className="relative px-8 pt-10 pb-8 text-center overflow-hidden"
        style={{ background: `linear-gradient(160deg, ${meta?.color ?? '#2563eb'}18, ${meta?.color ?? '#2563eb'}06)` }}>
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ background: `radial-gradient(ellipse at 50% 0%, ${meta?.color ?? '#2563eb'}28, transparent 65%)` }} />
        <div className="relative inline-flex mb-4">
          <div
            className="w-24 h-24 rounded-full flex items-center justify-center text-3xl font-extrabold text-white shadow-xl ring-4 ring-white"
            style={{ background: `linear-gradient(135deg, ${meta?.color ?? '#64748b'}, ${meta?.color ?? '#64748b'}88)` }}>
            {user.initials}
          </div>
          <div className="absolute -bottom-1 -right-1 w-8 h-8 bg-green-500 rounded-full flex items-center justify-center shadow-lg ring-2 ring-white">
            <i className="fas fa-check text-white text-xs" />
          </div>
        </div>
        <h2 className="text-2xl font-extrabold text-foreground">Account Created!</h2>
        <p className="text-muted-foreground text-sm mt-1">
          <strong className="text-foreground">{user.name}</strong> has been onboarded as{' '}
          <strong style={{ color: meta?.color }}>{meta?.label ?? user.role}</strong>
        </p>
      </div>

      <div className="p-6 space-y-5">
        <div className="bg-amber-50 border border-amber-200/70 rounded-xl p-4 space-y-3">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-amber-400 rounded-md flex items-center justify-center shrink-0">
              <i className="fas fa-key text-white text-[10px]" />
            </div>
            <span className="text-xs font-bold text-amber-800 uppercase tracking-wide">Login Credentials</span>
            <span className="ml-auto text-[0.58rem] font-bold text-amber-700 bg-amber-200 border border-amber-300 rounded-full px-2 py-0.5">
              Share Securely
            </span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {[
              ['Employee ID',      user.employeeId,                            'fas fa-id-badge'],
              ['Login Mobile',     user.mobile,                                'fas fa-mobile-screen-button'],
              ['Default Password', user.mobile,                                'fas fa-lock'],
              ['Login Method',     (user.loginMethod ?? 'otp').toUpperCase(),  'fas fa-right-to-bracket'],
              ['2FA',              user.twoFa ? 'Enabled âœ“' : 'Disabled',     'fas fa-shield-halved'],
              ['Status',           user.status ?? 'Active',                    'fas fa-circle'],
            ].map(([lbl, val, ico]) => (
              <div key={lbl} className="flex items-start gap-2 bg-white/70 rounded-lg p-2 border border-amber-100">
                <i className={cn(ico, 'text-amber-500 text-xs mt-0.5 shrink-0')} />
                <div className="min-w-0">
                  <p className="text-[0.56rem] text-amber-700 font-bold uppercase tracking-wide truncate">{lbl}</p>
                  <p className="font-mono font-bold text-amber-900 text-xs truncate">{val || '—'}</p>
                </div>
              </div>
            ))}
          </div>
          <p className="text-[0.62rem] text-amber-700 flex items-start gap-1.5 pt-1.5 border-t border-amber-200">
            <i className="fas fa-triangle-exclamation mt-0.5 shrink-0" />
            User must change password on first login. Aadhaar &amp; bank details stored masked.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          {[
            user.department  && { icon: 'fas fa-building',       color: 'text-violet-500', label: user.department },
            user.joiningDate && { icon: 'fas fa-calendar-check', color: 'text-green-600',  label: `Joined: ${user.joiningDate}` },
            (user.state || user.district) && { icon: 'fas fa-location-dot', color: 'text-orange-500', label: [user.district, user.state].filter(Boolean).join(', ') },
            user.education   && { icon: 'fas fa-graduation-cap', color: 'text-blue-500',   label: user.education },
            user.emergencyContact?.name && { icon: 'fas fa-heart-pulse', color: 'text-red-500', label: `Emergency: ${user.emergencyContact.name}` },
            user.uploadedDocs?.length > 0 && { icon: 'fas fa-folder-check', color: 'text-green-600', label: `${user.uploadedDocs.length} docs` },
          ].filter(Boolean).map((chip, i) => (
            <span key={i} className="flex items-center gap-1.5 px-3 py-1.5 bg-muted rounded-full text-[0.65rem] font-medium text-foreground border border-border">
              <i className={cn(chip.icon, chip.color, 'text-[10px]')} />
              {chip.label}
            </span>
          ))}
        </div>

        <div className="flex gap-3 pt-1 border-t border-border">
          <Button variant="outline" onClick={onAddAnother} className="flex-1">
            <i className="fas fa-user-plus mr-2" /> Onboard Another
          </Button>
          <Button onClick={onViewUsers} className="flex-1">
            <i className="fas fa-users mr-2" /> View All Users
          </Button>
        </div>
      </div>
    </div>
  );
}

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export default function OnboardUserPage() {
  const { currentUser } = useAuth();
  const { showToast }   = useToast();
  const navigate        = useNavigate();

  const myRole         = currentUser?.role ?? 'admin';
  const creatableRoles = CAN_MANAGE[myRole] ?? [];

  const [form,   setForm]   = useState({ ...EMPTY, role: creatableRoles[0] ?? '' });
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [done,   setDone]   = useState(null);

  const reportingOptions = useMemo(() => {
    const targetRoles = REPORTS_TO_ROLE[form.role] ?? [];
    return SYSTEM_USERS.filter(u => targetRoles.includes(u.role) && u.status === 'active');
  }, [form.role]);

  const districtOptions = STATE_DISTRICTS[form.state] ?? [];

  function set(field, value) {
    setForm(prev => ({ ...prev, [field]: value }));
    setErrors(prev => ({ ...prev, [field]: '' }));
  }

  function toggleLanguage(lang) {
    setForm(prev => {
      const has = prev.languages.includes(lang);
      return { ...prev, languages: has ? prev.languages.filter(l => l !== lang) : [...prev.languages, lang] };
    });
  }

  function toggleDoc(docId) {
    setForm(prev => {
      const has = prev.uploadedDocs.includes(docId);
      return { ...prev, uploadedDocs: has ? prev.uploadedDocs.filter(d => d !== docId) : [...prev.uploadedDocs, docId] };
    });
  }

  // â”€â”€ Validation â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  function validate() {
    const e = {};
    if (!form.name.trim())                              e.name           = 'Full name is required.';
    if (!form.mobile.trim())                            e.mobile         = 'Mobile number is required.';
    else if (!/^\d{10}$/.test(form.mobile))             e.mobile         = 'Must be exactly 10 digits.';
    else if (SYSTEM_USERS.find(u => u.mobile === form.mobile)) e.mobile  = 'This mobile is already registered.';
    if (form.altMobile    && !/^\d{10}$/.test(form.altMobile))    e.altMobile     = 'Must be exactly 10 digits.';
    if (form.whatsapp     && !/^\d{10}$/.test(form.whatsapp))     e.whatsapp      = 'Must be exactly 10 digits.';
    if (form.email        && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email))         e.email         = 'Enter a valid email address.';
    if (form.personalEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.personalEmail)) e.personalEmail = 'Enter a valid email address.';
    if (form.aadhaar      && !/^\d{12}$/.test(form.aadhaar.replace(/\s/g, '')))       e.aadhaar       = 'Aadhaar must be 12 digits.';
    if (form.pan          && !/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(form.pan.toUpperCase())) e.pan       = 'Invalid PAN format (e.g. ABCDE1234F).';
    if (!form.role)                                     e.role           = 'Role is required.';
    if (!form.joiningDate)                              e.joiningDate    = 'Joining date is required.';
    if (form.emergencyMobile && !/^\d{10}$/.test(form.emergencyMobile)) e.emergencyMobile = 'Must be exactly 10 digits.';
    if (form.pinCode      && !/^\d{6}$/.test(form.pinCode))   e.pinCode        = 'Pin code must be 6 digits.';
    if (form.ifsc         && !/^[A-Z]{4}0[A-Z0-9]{6}$/.test(form.ifsc.toUpperCase())) e.ifsc         = 'Invalid IFSC format (e.g. SBIN0001234).';
    return e;
  }

  // â”€â”€ Submit â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  async function handleSubmit(e) {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      showToast(`Please fix ${Object.keys(errs).length} validation error(s) before submitting.`, 'error');
      return;
    }

    setSaving(true);
    await new Promise(r => setTimeout(r, 600));

    const meta     = ROLE_META[form.role];
    const initials = form.name.trim().split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
    const empSeq   = String(SYSTEM_USERS.length + 1).padStart(4, '0');
    const roleCode = { manager: 'MGR', admin: 'MGR', team_lead: 'TL', agronomist: 'AGR', data_entry_operator: 'DEO' }[form.role] ?? 'USR';

    const newUser = {
      id:             `USR-${Date.now()}`,
      initials,
      employeeId:     form.employeeId || `PP-${roleCode}-${empSeq}`,
      name:           form.name.trim(),
      mobile:         form.mobile.trim(),
      altMobile:      form.altMobile.trim() || null,
      whatsapp:       form.whatsapp.trim() || form.mobile.trim(),
      email:          form.email.trim() || `${form.name.toLowerCase().replace(/\s+/g, '.')}@profitportal.in`,
      personalEmail:  form.personalEmail.trim() || null,
      role:           form.role,
      designation:    form.designation || (meta?.label ?? form.role),
      department:     form.department,
      employmentType: form.employmentType,
      reportingTo:    form.reportingTo || null,
      joiningDate:    form.joiningDate
        ? new Date(form.joiningDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
        : '',
      probationEndDate: form.probationEndDate || null,
      experience:     form.experience,
      education:      form.education,
      languages:      form.languages,
      previousOrg:    form.previousOrg,
      aadhaar:        form.aadhaar ? `xxxx-xxxx-${form.aadhaar.slice(-4)}` : null,
      pan:            form.pan.toUpperCase() || null,
      bloodGroup:     form.bloodGroup,
      dob:            form.dob,
      gender:         form.gender,
      state:          form.state,
      district:       form.district,
      taluka:         form.taluka,
      villages:       form.villages,
      targetFarmers:  form.targetFarmers ? Number(form.targetFarmers) : 0,
      pinCode:        form.pinCode,
      emergencyContact: form.emergencyName
        ? { name: form.emergencyName, relation: form.emergencyRelation, mobile: form.emergencyMobile }
        : null,
      deviceType:     form.deviceType,
      loginMethod:    form.loginMethod,
      twoFa:          form.twoFa,
      accessFrom:     form.accessFrom,
      accessTo:       form.accessTo || null,
      bankName:       form.bankName,
      accountNumber:  form.accountNumber ? `xxxx${form.accountNumber.slice(-4)}` : null,
      ifsc:           form.ifsc.toUpperCase() || null,
      pfNumber:       form.pfNumber || null,
      uanNumber:      form.uanNumber || null,
      ctc:            form.ctc || null,
      status:         form.status,
      notes:          form.notes,
      uploadedDocs:   form.uploadedDocs,
      lastLogin:      'Never',
      avatarColor:    meta?.color
        ? `linear-gradient(135deg,${meta.color},${meta.color}88)`
        : 'linear-gradient(135deg,#6b7280,#374151)',
    };

    setSaving(false);
    setDone(newUser);
    showToast(`${newUser.name} has been onboarded as ${meta?.label ?? form.role}.`, 'success');
  }

  function handleAddAnother() {
    setDone(null);
    setForm({ ...EMPTY, role: creatableRoles[0] ?? '' });
    setErrors({});
  }

  const meta           = ROLE_META[form.role];
  const completedSteps = STEPS.filter(s => isStepDone(s.id, form)).length;
  const progressPct    = Math.round((completedSteps / STEPS.length) * 100);
  const previewInitials = form.name
    ? form.name.trim().split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
    : '';

  // â”€â”€ Render â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  return (
    <div className="max-w-5xl mx-auto space-y-4 pb-8">

      {/* â”€â”€ Back link â”€â”€ */}
      <button type="button" onClick={() => navigate(-1)}
        className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors">
        <i className="fas fa-arrow-left text-[10px]" /> Back
      </button>

      {/* â”€â”€ Hero banner â”€â”€ */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white shadow-xl border border-white/5">
        {/* Role-tinted ambient glow */}
        <div className="absolute inset-0 pointer-events-none transition-all duration-700"
          style={{ background: `radial-gradient(ellipse at 75% 50%, ${meta?.color ?? '#2563eb'}33 0%, transparent 65%)` }} />
        {/* Subtle dot grid */}
        <div className="absolute inset-0 opacity-[0.035] pointer-events-none"
          style={{ backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.8) 1px, transparent 1px)', backgroundSize: '20px 20px' }} />

        <div className="relative flex items-center gap-6 px-7 py-6">
          <div className="flex-1 min-w-0">
            <p className="text-[0.62rem] font-bold uppercase tracking-[0.22em] text-white/40 mb-1.5 flex items-center gap-2">
              <i className="fas fa-user-plus" /> New User Onboarding
            </p>
            <h1 className="text-2xl font-extrabold text-white tracking-tight leading-none mb-2">
              Create Platform Account
            </h1>
            <p className="text-white/50 text-xs leading-relaxed max-w-sm">
              Fill all{' '}
              <span className="text-white font-semibold">{STEPS.length} sections</span>{' '}
              to onboard a new team member with full access credentials.
            </p>
            {/* Progress bar */}
            <div className="flex items-center gap-3 mt-4">
              <div className="relative h-1.5 w-44 bg-white/15 rounded-full overflow-hidden">
                <div className="absolute inset-y-0 left-0 rounded-full transition-all duration-500"
                  style={{ width: `${progressPct}%`, background: meta?.color ?? '#38bdf8' }} />
              </div>
              <span className="text-[0.6rem] text-white/45 shrink-0 tabular-nums">
                {completedSteps}/{STEPS.length} sections filled
              </span>
            </div>
          </div>

          {/* Live user preview card */}
          {!done && (
            <div className="hidden md:flex flex-col items-center gap-3 bg-white/8 backdrop-blur-sm border border-white/15 rounded-2xl px-5 py-4 shrink-0 min-w-[165px]">
              <div
                className="w-16 h-16 rounded-full flex items-center justify-center text-xl font-extrabold text-white shadow-lg ring-2 ring-white/20 transition-all duration-300"
                style={{ background: meta ? `linear-gradient(135deg,${meta.color}dd,${meta.color}88)` : 'linear-gradient(135deg,#475569,#1e293b)' }}>
                {previewInitials || <i className="fas fa-user text-white/35 text-base" />}
              </div>
              <div className="text-center space-y-0.5 w-full">
                <p className="text-xs font-bold text-white leading-tight truncate">
                  {form.name || <span className="text-white/30 font-normal italic text-[0.63rem]">Name not set</span>}
                </p>
                <p className="text-[0.6rem] font-semibold truncate" style={{ color: meta?.color ?? '#94a3b8' }}>
                  <i className={cn(meta?.icon ?? 'fas fa-user', 'mr-1')} />
                  {meta?.label ?? 'No role selected'}
                </p>
                {form.mobile && <p className="text-[0.58rem] text-white/35 font-mono mt-0.5">{form.mobile}</p>}
                {form.department && <p className="text-[0.58rem] text-white/35 mt-0.5 truncate">{form.department}</p>}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* â”€â”€ Role picker (if multiple) â”€â”€ */}
      {!done && creatableRoles.length > 1 && (
        <div className="flex flex-wrap gap-2">
          {creatableRoles.map(r => {
            const rm     = ROLE_META[r];
            const active = form.role === r;
            return (
              <button key={r} type="button" onClick={() => set('role', r)}
                className={cn(
                  'flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold border-2 transition-all duration-150',
                  active
                    ? 'shadow-md scale-[1.02]'
                    : 'bg-card border-border text-muted-foreground hover:border-primary/40 hover:bg-muted/50',
                )}
                style={active ? { color: rm?.color, background: rm?.bg, borderColor: rm?.color } : {}}>
                <i className={rm?.icon} style={{ color: active ? rm?.color : undefined }} />
                {rm?.label ?? r}
              </button>
            );
          })}
        </div>
      )}

      {/* â”€â”€ Step progress track â”€â”€ */}
      {!done && (
        <div className="flex gap-1.5 overflow-x-auto pb-0.5">
          {STEPS.map(s => {
            const complete = isStepDone(s.id, form);
            return (
              <div key={s.id}
                className={cn(
                  'flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[0.6rem] font-semibold border shrink-0 transition-all',
                  complete
                    ? 'border-green-300 bg-green-50 text-green-700'
                    : 'border-border bg-card text-muted-foreground/70',
                )}>
                <span className={cn(
                  'w-3.5 h-3.5 rounded-full flex items-center justify-center text-[0.5rem] font-bold shrink-0',
                  complete ? 'bg-green-500 text-white' : 'bg-muted text-muted-foreground/60',
                )}>
                  {complete ? <i className="fas fa-check" /> : s.id}
                </span>
                <span className="hidden sm:block">{s.short}</span>
              </div>
            );
          })}
        </div>
      )}

      {/* â”€â”€ Success / Form â”€â”€ */}
      {done ? (
        <SuccessCard
          user={done}
          onAddAnother={handleAddAnother}
          onViewUsers={() => navigate(ROUTES.abs.users ?? '/app/admin/users')}
        />
      ) : (
        <form onSubmit={handleSubmit} noValidate className="space-y-4">

          {/* Role notice band */}
          {form.role && (
            <div className="flex items-center gap-3 px-4 py-2.5 rounded-xl border text-xs font-medium"
              style={{ background: meta?.bg, borderColor: `${meta?.color}30`, color: meta?.color }}>
              <i className={cn(meta?.icon, 'text-sm shrink-0')} />
              <span>Creating account for: <strong>{meta?.label ?? form.role}</strong></span>
              <div className="ml-auto flex items-center gap-1.5 bg-amber-100 text-amber-800 border border-amber-200 rounded-full px-2.5 py-0.5 text-[0.6rem] font-semibold shrink-0">
                <i className="fas fa-key text-[9px]" /> Default password = mobile number
              </div>
            </div>
          )}

          {/* â”€â”€â”€ 1: Personal Information â”€â”€â”€ */}
          <SectionCard stepId={1}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-5 gap-y-4">

              <FieldWrapper label="Full Name" required error={errors.name}>
                <IField icon="fas fa-user" err={errors.name}>
                  <input type="text" className={iconInputCls(errors.name)}
                    placeholder="e.g. Rajesh Kumar Sharma"
                    value={form.name} onChange={e => set('name', e.target.value)} maxLength={80} />
                </IField>
              </FieldWrapper>

              <FieldWrapper label="Date of Birth" error={errors.dob}>
                <IField icon="fas fa-cake-candles" err={errors.dob}>
                  <input type="date" className={iconInputCls(errors.dob)}
                    value={form.dob} onChange={e => set('dob', e.target.value)}
                    max={new Date(Date.now() - 18 * 365.25 * 86400000).toISOString().split('T')[0]} />
                </IField>
              </FieldWrapper>

              <FieldWrapper label="Gender" error={errors.gender}>
                <div className="flex gap-2">
                  {[
                    { val: 'Male',   icon: 'fas fa-mars'       },
                    { val: 'Female', icon: 'fas fa-venus'      },
                    { val: 'Other',  icon: 'fas fa-genderless' },
                  ].map(g => (
                    <button key={g.val} type="button" onClick={() => set('gender', g.val)}
                      className={cn(
                        'flex-1 h-10 rounded-lg text-xs font-semibold border-2 transition-all flex items-center justify-center gap-1.5',
                        form.gender === g.val
                          ? 'border-primary bg-primary/10 text-primary shadow-sm'
                          : 'border-border text-muted-foreground hover:border-primary/40 hover:bg-muted/40',
                      )}>
                      <i className={cn(g.icon, 'text-[10px]')} /> {g.val}
                    </button>
                  ))}
                </div>
              </FieldWrapper>

              <FieldWrapper label="Blood Group" error={errors.bloodGroup}>
                <SelectField value={form.bloodGroup} onChange={e => set('bloodGroup', e.target.value)}
                  options={BLOOD_GROUPS} placeholder="Select blood group..." />
              </FieldWrapper>

              <FieldWrapper label="Aadhaar Number" error={errors.aadhaar} hint="12 digits · stored masked after save">
                <IField icon="fas fa-id-card" err={errors.aadhaar}>
                  <input type="text" className={iconInputCls(errors.aadhaar)}
                    placeholder="XXXX XXXX XXXX"
                    value={form.aadhaar}
                    onChange={e => set('aadhaar', e.target.value.replace(/\D/g, '').slice(0, 12))} maxLength={12} />
                </IField>
              </FieldWrapper>

              <FieldWrapper label="PAN Number" error={errors.pan} hint="10-char Permanent Account Number">
                <IField icon="fas fa-credit-card" err={errors.pan}>
                  <input type="text" className={iconInputCls(errors.pan)}
                    placeholder="ABCDE1234F"
                    value={form.pan}
                    onChange={e => set('pan', e.target.value.toUpperCase().slice(0, 10))} maxLength={10} />
                </IField>
              </FieldWrapper>
            </div>
          </SectionCard>

          {/* â”€â”€â”€ 2: Contact Details â”€â”€â”€ */}
          <SectionCard stepId={2} badge="Primary mobile = login ID">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-5 gap-y-4">

              <FieldWrapper label="Primary Mobile" required error={errors.mobile}
                hint="Used as login ID · default password">
                <IField icon="fas fa-mobile-screen-button" iconColor="text-green-600" err={errors.mobile}>
                  <input type="tel" className={iconInputCls(errors.mobile)}
                    placeholder="10-digit mobile"
                    value={form.mobile}
                    onChange={e => set('mobile', e.target.value.replace(/\D/g, '').slice(0, 10))} />
                </IField>
              </FieldWrapper>

              <FieldWrapper label="Alternate Mobile" error={errors.altMobile}>
                <IField icon="fas fa-phone" err={errors.altMobile}>
                  <input type="tel" className={iconInputCls(errors.altMobile)}
                    placeholder="Backup contact number"
                    value={form.altMobile}
                    onChange={e => set('altMobile', e.target.value.replace(/\D/g, '').slice(0, 10))} />
                </IField>
              </FieldWrapper>

              <FieldWrapper label="WhatsApp Number" error={errors.whatsapp} hint="Defaults to primary mobile if blank">
                <IField icon="fab fa-whatsapp" iconColor="text-green-500" err={errors.whatsapp}>
                  <input type="tel" className={iconInputCls(errors.whatsapp)}
                    placeholder="Same as mobile if blank"
                    value={form.whatsapp}
                    onChange={e => set('whatsapp', e.target.value.replace(/\D/g, '').slice(0, 10))} />
                </IField>
              </FieldWrapper>

              <FieldWrapper label="Work Email" error={errors.email} hint="Auto-generated if left blank">
                <IField icon="fas fa-envelope" err={errors.email}>
                  <input type="email" className={iconInputCls(errors.email)}
                    placeholder="name@profitportal.in"
                    value={form.email} onChange={e => set('email', e.target.value)} />
                </IField>
              </FieldWrapper>

              <FieldWrapper label="Personal Email" error={errors.personalEmail} span2>
                <IField icon="fas fa-envelope-open" err={errors.personalEmail}>
                  <input type="email" className={iconInputCls(errors.personalEmail)}
                    placeholder="Personal / backup email address"
                    value={form.personalEmail} onChange={e => set('personalEmail', e.target.value)} />
                </IField>
              </FieldWrapper>
            </div>
          </SectionCard>

          {/* â”€â”€â”€ 3: Professional Details â”€â”€â”€ */}
          <SectionCard stepId={3}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-5 gap-y-4">

              <FieldWrapper label="Employee ID" error={errors.employeeId}
                hint="Auto-generated if blank (PP-ADM-0042 style)">
                <IField icon="fas fa-hashtag" err={errors.employeeId}>
                  <input type="text" className={iconInputCls(errors.employeeId)}
                    placeholder="e.g. PP-AGR-0042"
                    value={form.employeeId}
                    onChange={e => set('employeeId', e.target.value.toUpperCase())} maxLength={20} />
                </IField>
              </FieldWrapper>

              <FieldWrapper label="Designation" error={errors.designation}
                hint="Job title (defaults to role label)">
                <IField icon="fas fa-briefcase" err={errors.designation}>
                  <input type="text" className={iconInputCls(errors.designation)}
                    placeholder="e.g. Senior Field Representative"
                    value={form.designation} onChange={e => set('designation', e.target.value)} maxLength={60} />
                </IField>
              </FieldWrapper>

              <FieldWrapper label="Department">
                <SelectField value={form.department} onChange={e => set('department', e.target.value)}
                  options={DEPARTMENTS} placeholder="Select department..." />
              </FieldWrapper>

              <FieldWrapper label="Employment Type">
                <SelectField value={form.employmentType} onChange={e => set('employmentType', e.target.value)}
                  options={EMP_TYPES} />
              </FieldWrapper>

              <FieldWrapper label="Date of Joining" required error={errors.joiningDate}>
                <IField icon="fas fa-calendar-check" iconColor="text-primary" err={errors.joiningDate}>
                  <input type="date" className={iconInputCls(errors.joiningDate)}
                    value={form.joiningDate} onChange={e => set('joiningDate', e.target.value)} />
                </IField>
              </FieldWrapper>

              <FieldWrapper label="Probation End Date" hint="Applicable for full-time / contract">
                <IField icon="fas fa-calendar-xmark" err={false}>
                  <input type="date" className={iconInputCls(false)}
                    value={form.probationEndDate} onChange={e => set('probationEndDate', e.target.value)}
                    min={form.joiningDate || today} />
                </IField>
              </FieldWrapper>

              <FieldWrapper label="Years of Experience">
                <IField icon="fas fa-clock-rotate-left" err={false}>
                  <input type="number" className={iconInputCls(false)}
                    placeholder="e.g. 3"
                    value={form.experience} onChange={e => set('experience', e.target.value)} min={0} max={50} />
                </IField>
              </FieldWrapper>

              <FieldWrapper label="Highest Education">
                <SelectField value={form.education} onChange={e => set('education', e.target.value)}
                  options={EDUCATION_OPTS} placeholder="Select qualification..." />
              </FieldWrapper>

              <FieldWrapper label="Previous Organisation">
                <IField icon="fas fa-building" err={false}>
                  <input type="text" className={iconInputCls(false)}
                    placeholder="Last employer name"
                    value={form.previousOrg} onChange={e => set('previousOrg', e.target.value)} maxLength={80} />
                </IField>
              </FieldWrapper>

              <FieldWrapper label="Role at Previous Org">
                <IField icon="fas fa-user-tag" err={false}>
                  <input type="text" className={iconInputCls(false)}
                    placeholder="e.g. 2 yrs as Field Officer"
                    value={form.previousExp} onChange={e => set('previousExp', e.target.value)} maxLength={80} />
                </IField>
              </FieldWrapper>

              <FieldWrapper label="Languages Known" span2>
                <div className="flex flex-wrap gap-2 pt-0.5">
                  {LANGUAGES_OPTS.map(lang => {
                    const active = form.languages.includes(lang);
                    return (
                      <button key={lang} type="button" onClick={() => toggleLanguage(lang)}
                        className={cn(
                          'px-3 py-1.5 rounded-full text-[0.65rem] font-semibold border transition-all',
                          active
                            ? 'bg-primary text-white border-primary shadow-sm'
                            : 'border-border text-muted-foreground hover:border-primary/40 hover:bg-muted/50',
                        )}>
                        {active && <i className="fas fa-check mr-1 text-[9px]" />}
                        {lang}
                      </button>
                    );
                  })}
                </div>
              </FieldWrapper>
            </div>
          </SectionCard>

          {/* â”€â”€â”€ 4: Role & Reporting â”€â”€â”€ */}
          <SectionCard stepId={4}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-5 gap-y-4">

              {creatableRoles.length === 1 ? (
                <FieldWrapper label="Platform Role" required>
                  <div className={cn(inputCls(false), 'flex items-center gap-2 bg-muted/50 cursor-not-allowed')}>
                    <i className={cn(ROLE_META[form.role]?.icon, 'text-xs')}
                      style={{ color: ROLE_META[form.role]?.color }} />
                    <span className="text-sm">{ROLE_META[form.role]?.label ?? form.role}</span>
                  </div>
                </FieldWrapper>
              ) : (
                <FieldWrapper label="Platform Role" required error={errors.role}>
                  <SelectField value={form.role} onChange={e => set('role', e.target.value)}
                    options={creatableRoles.map(r => ({ value: r, label: ROLE_META[r]?.label ?? r }))}
                    placeholder="Select role..." error={errors.role} />
                </FieldWrapper>
              )}

              <FieldWrapper label="Reports To" error={errors.reportingTo}>
                <SelectField value={form.reportingTo} onChange={e => set('reportingTo', e.target.value)}
                  options={reportingOptions.map(u => ({ value: u.id, label: `${u.name} (${ROLE_META[u.role]?.label ?? u.role})` }))}
                  placeholder={reportingOptions.length === 0 ? 'No managers available' : 'Select reporting manager...'}
                  disabled={reportingOptions.length === 0} />
              </FieldWrapper>

              <FieldWrapper label="Account Status" span2>
                <div className="flex gap-2">
                  {[
                    { value: 'active',   label: 'Active',   dotCls: 'bg-green-500',  activeCls: 'border-green-500 bg-green-50 text-green-700' },
                    { value: 'inactive', label: 'Inactive', dotCls: 'bg-gray-400',   activeCls: 'border-gray-400 bg-gray-100 text-gray-600' },
                    { value: 'on_leave', label: 'On Leave', dotCls: 'bg-yellow-500', activeCls: 'border-yellow-500 bg-yellow-50 text-yellow-700' },
                  ].map(s => (
                    <button key={s.value} type="button" onClick={() => set('status', s.value)}
                      className={cn(
                        'flex items-center justify-center gap-2 px-4 h-10 rounded-lg text-xs font-semibold border-2 transition-all',
                        form.status === s.value ? s.activeCls : 'border-border text-muted-foreground hover:border-gray-300 hover:bg-muted/40',
                      )}>
                      <span className={cn('w-2 h-2 rounded-full shrink-0', form.status === s.value ? s.dotCls : 'bg-muted-foreground/30')} />
                      {s.label}
                    </button>
                  ))}
                </div>
              </FieldWrapper>
            </div>
          </SectionCard>

          {/* â”€â”€â”€ 5: Territory â”€â”€â”€ */}
          <SectionCard stepId={5} badge="optional">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-5 gap-y-4">

              <FieldWrapper label="State">
                <SelectField value={form.state}
                  onChange={e => { set('state', e.target.value); set('district', ''); }}
                  options={STATES} placeholder="Select state..." />
              </FieldWrapper>

              <FieldWrapper label="District">
                <SelectField value={form.district} onChange={e => set('district', e.target.value)}
                  options={districtOptions}
                  placeholder={districtOptions.length === 0 ? 'Select state first' : 'Select district...'}
                  disabled={districtOptions.length === 0} />
              </FieldWrapper>

              <FieldWrapper label="Taluka / Tehsil">
                <IField icon="fas fa-map-pin" err={false}>
                  <input type="text" className={iconInputCls(false)}
                    placeholder="e.g. Shirur"
                    value={form.taluka} onChange={e => set('taluka', e.target.value)} maxLength={60} />
                </IField>
              </FieldWrapper>

              <FieldWrapper label="Pin Code" error={errors.pinCode}>
                <IField icon="fas fa-location-crosshairs" err={errors.pinCode}>
                  <input type="text" className={iconInputCls(errors.pinCode)}
                    placeholder="6-digit pin code"
                    value={form.pinCode}
                    onChange={e => set('pinCode', e.target.value.replace(/\D/g, '').slice(0, 6))} maxLength={6} />
                </IField>
              </FieldWrapper>

              <FieldWrapper label="Villages / Clusters Covered" span2>
                <textarea className={cn(inputCls(false), 'h-20 py-2.5 resize-none')}
                  placeholder="Enter village names separated by commas..."
                  value={form.villages} onChange={e => set('villages', e.target.value)} maxLength={500} />
              </FieldWrapper>

              <FieldWrapper label="Annual Farmer Target" hint="Farmers to register per year">
                <IField icon="fas fa-users" err={false}>
                  <input type="number" className={iconInputCls(false)}
                    placeholder="e.g. 150"
                    value={form.targetFarmers} onChange={e => set('targetFarmers', e.target.value)} min={0} max={9999} />
                </IField>
              </FieldWrapper>
            </div>
          </SectionCard>

          {/* â”€â”€â”€ 6: Emergency Contact â”€â”€â”€ */}
          <SectionCard stepId={6} badge="optional">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-5 gap-y-4">

              <FieldWrapper label="Contact Name" error={errors.emergencyName}>
                <IField icon="fas fa-person" err={errors.emergencyName}>
                  <input type="text" className={iconInputCls(errors.emergencyName)}
                    placeholder="Spouse / Parent / Sibling name"
                    value={form.emergencyName} onChange={e => set('emergencyName', e.target.value)} maxLength={80} />
                </IField>
              </FieldWrapper>

              <FieldWrapper label="Relation">
                <SelectField value={form.emergencyRelation} onChange={e => set('emergencyRelation', e.target.value)}
                  options={['Spouse', 'Father', 'Mother', 'Brother', 'Sister', 'Son', 'Daughter', 'Friend', 'Other']}
                  placeholder="Select relation..." />
              </FieldWrapper>

              <FieldWrapper label="Emergency Mobile" error={errors.emergencyMobile}>
                <IField icon="fas fa-phone-volume" iconColor="text-red-500" err={errors.emergencyMobile}>
                  <input type="tel" className={iconInputCls(errors.emergencyMobile)}
                    placeholder="10-digit emergency number"
                    value={form.emergencyMobile}
                    onChange={e => set('emergencyMobile', e.target.value.replace(/\D/g, '').slice(0, 10))} />
                </IField>
              </FieldWrapper>
            </div>
          </SectionCard>

          {/* â”€â”€â”€ 7: Device & Access â”€â”€â”€ */}
          <SectionCard stepId={7}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-5 gap-y-4">

              <FieldWrapper label="Primary Device Type">
                <SelectField value={form.deviceType} onChange={e => set('deviceType', e.target.value)} options={DEVICE_TYPES} />
              </FieldWrapper>

              <FieldWrapper label="Device ID / IMEI" hint="For device-binding or MDM">
                <IField icon="fas fa-microchip" err={false}>
                  <input type="text" className={iconInputCls(false)}
                    placeholder="Device serial or IMEI"
                    value={form.deviceId} onChange={e => set('deviceId', e.target.value)} maxLength={50} />
                </IField>
              </FieldWrapper>

              <FieldWrapper label="Login Method">
                <SelectField value={form.loginMethod} onChange={e => set('loginMethod', e.target.value)} options={LOGIN_METHODS} />
              </FieldWrapper>

              <FieldWrapper label="Two-Factor Authentication">
                <div className="h-10 flex items-center">
                  <ToggleSwitch
                    checked={form.twoFa}
                    onChange={() => set('twoFa', !form.twoFa)}
                    label={form.twoFa ? '2FA Enabled (Recommended)' : '2FA Disabled'} />
                </div>
              </FieldWrapper>

              <FieldWrapper label="Access Start Date" error={errors.accessFrom}>
                <IField icon="fas fa-calendar-plus" iconColor="text-sky-600" err={errors.accessFrom}>
                  <input type="date" className={iconInputCls(errors.accessFrom)}
                    value={form.accessFrom} onChange={e => set('accessFrom', e.target.value)} />
                </IField>
              </FieldWrapper>

              <FieldWrapper label="Access Expiry Date" hint="Leave blank for permanent access">
                <IField icon="fas fa-calendar-minus" err={false}>
                  <input type="date" className={iconInputCls(false)}
                    value={form.accessTo} onChange={e => set('accessTo', e.target.value)}
                    min={form.accessFrom || today} />
                </IField>
              </FieldWrapper>
            </div>
          </SectionCard>

          {/* â”€â”€â”€ 8: Bank & Payroll â”€â”€â”€ */}
          <SectionCard stepId={8} badge="stored masked">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-5 gap-y-4">

              <FieldWrapper label="Bank Name">
                <SelectField value={form.bankName} onChange={e => set('bankName', e.target.value)}
                  options={BANKS} placeholder="Select bank..." />
              </FieldWrapper>

              <FieldWrapper label="Account Number" hint="Only last 4 digits shown after save">
                <IField icon="fas fa-landmark" err={false}>
                  <input type="text" className={iconInputCls(false)}
                    placeholder="Bank account number"
                    value={form.accountNumber}
                    onChange={e => set('accountNumber', e.target.value.replace(/\D/g, ''))} maxLength={18} />
                </IField>
              </FieldWrapper>

              <FieldWrapper label="IFSC Code" error={errors.ifsc}>
                <IField icon="fas fa-code-branch" err={errors.ifsc}>
                  <input type="text" className={iconInputCls(errors.ifsc)}
                    placeholder="e.g. SBIN0001234"
                    value={form.ifsc}
                    onChange={e => set('ifsc', e.target.value.toUpperCase())} maxLength={11} />
                </IField>
              </FieldWrapper>

              <FieldWrapper label="Annual CTC (₹)" hint="Gross annual cost to company">
                <IField icon="fas fa-indian-rupee-sign" err={false}>
                  <input type="number" className={iconInputCls(false)}
                    placeholder="e.g. 360000"
                    value={form.ctc} onChange={e => set('ctc', e.target.value)} min={0} />
                </IField>
              </FieldWrapper>

              <FieldWrapper label="PF Account Number">
                <IField icon="fas fa-piggy-bank" err={false}>
                  <input type="text" className={iconInputCls(false)}
                    placeholder="Provident Fund account number"
                    value={form.pfNumber} onChange={e => set('pfNumber', e.target.value)} maxLength={22} />
                </IField>
              </FieldWrapper>

              <FieldWrapper label="UAN Number" hint="12-digit Universal Account Number (EPFO)">
                <IField icon="fas fa-fingerprint" err={false}>
                  <input type="text" className={iconInputCls(false)}
                    placeholder="12-digit UAN"
                    value={form.uanNumber}
                    onChange={e => set('uanNumber', e.target.value.replace(/\D/g, '').slice(0, 12))} maxLength={12} />
                </IField>
              </FieldWrapper>
            </div>
          </SectionCard>

          {/* â”€â”€â”€ 9: Documents & Notes â”€â”€â”€ */}
          <SectionCard stepId={9} badge="optional">
            <div className="space-y-5">
              <div>
                <p className="text-[0.68rem] font-bold uppercase tracking-widest text-muted-foreground/80 mb-3">
                  Mark documents collected / verified
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {DOC_TYPES.map(doc => {
                    const checked = form.uploadedDocs.includes(doc.id);
                    return (
                      <button key={doc.id} type="button" onClick={() => toggleDoc(doc.id)}
                        className={cn(
                          'flex items-center gap-2.5 px-3 py-3 rounded-xl text-xs font-medium border-2 transition-all text-left',
                          checked
                            ? 'border-green-500 bg-green-50 text-green-800 shadow-sm'
                            : 'border-border bg-card text-muted-foreground hover:border-primary/40 hover:bg-muted/40',
                        )}>
                        <i className={cn(doc.icon, 'text-sm shrink-0', checked ? 'text-green-600' : 'text-muted-foreground/60')} />
                        <span className="leading-tight">{doc.label}</span>
                        <i className={cn('fas fa-check ml-auto text-green-600 text-[9px] transition-opacity', checked ? 'opacity-100' : 'opacity-0')} />
                      </button>
                    );
                  })}
                </div>
              </div>

              <FieldWrapper label="Internal Notes / Onboarding Remarks">
                <textarea className={cn(inputCls(false), 'h-24 py-2.5 resize-none')}
                  placeholder="Additional context, special requirements, or remarks about this user..."
                  value={form.notes} onChange={e => set('notes', e.target.value)} maxLength={500} />
                <p className="text-[0.6rem] text-muted-foreground/60 text-right mt-0.5">{form.notes.length}/500</p>
              </FieldWrapper>
            </div>
          </SectionCard>

          {/* â”€â”€â”€ Sticky action footer â”€â”€â”€ */}
          <div className="sticky bottom-4 z-20 bg-card/90 backdrop-blur-md border border-border rounded-2xl shadow-xl px-6 py-4">
            <div className="flex items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 mb-0.5">
                  <i className="fas fa-shield-halved text-primary text-xs" />
                  <p className="text-xs font-bold text-foreground">Ready to create this account?</p>
                </div>
                <p className="text-[0.62rem] text-muted-foreground">
                  {completedSteps < STEPS.length
                    ? <><span className="text-amber-600 font-semibold">{STEPS.length - completedSteps} section(s)</span> still incomplete · Default password = mobile number</>
                    : <><span className="text-green-600 font-semibold">All {STEPS.length} sections filled</span> · Aadhaar &amp; bank details stored masked</>
                  }
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Button variant="outline" type="button"
                  onClick={() => { setForm({ ...EMPTY, role: creatableRoles[0] ?? '' }); setErrors({}); }}>
                  <i className="fas fa-rotate-left mr-1.5 text-xs" /> Clear
                </Button>
                <Button type="submit" disabled={saving} className="min-w-[140px]">
                  {saving
                    ? <><i className="fas fa-spinner fa-spin mr-2" />Creating...</>
                    : <><i className="fas fa-user-check mr-2" />Create Account</>
                  }
                </Button>
              </div>
            </div>
          </div>

        </form>
      )}
    </div>
  );
}
