import { useState, useEffect } from 'react';
import Button from '@common/Button/Button';
import { useToast } from '@hooks/useToast';
import { getSmsGatewayConfig, saveSmsGatewayConfig } from '@services/smsGatewayService';

const EMPTY_FORM = {
  providerName: '',
  isActive: false,
  httpMethod: 'POST',
  requestUrl: '',
  headersText: '{}',
  bodyTemplate: '',
  senderId: '',
};

function TextField({ label, value, onChange, placeholder, hint, colSpan }) {
  return (
    <div className={colSpan === 2 ? 'sm:col-span-2' : ''}>
      <label className="block text-xs font-semibold mb-1.5 text-foreground">{label}</label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full h-9 px-3 rounded-lg border border-input bg-card text-sm focus:outline-none focus:ring-1 focus:ring-ring transition-colors"
      />
      {hint && <p className="text-[0.68rem] text-muted-foreground mt-1">{hint}</p>}
    </div>
  );
}

function SecretField({ label, value, onChange, isSet, maskedValue, hint }) {
  return (
    <div>
      <label className="block text-xs font-semibold mb-1.5 text-foreground">{label}</label>
      <input
        type="password"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={isSet ? `Currently set (${maskedValue}) — leave blank to keep` : 'Not set'}
        autoComplete="new-password"
        className="w-full h-9 px-3 rounded-lg border border-input bg-card text-sm focus:outline-none focus:ring-1 focus:ring-ring transition-colors"
      />
      {hint && <p className="text-[0.68rem] text-muted-foreground mt-1">{hint}</p>}
    </div>
  );
}

export default function SmsGatewayConfigPage() {
  const { showToast } = useToast();

  const [form, setForm] = useState(EMPTY_FORM);
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [apiSecretInput, setApiSecretInput] = useState('');
  const [hasApiKey, setHasApiKey] = useState(false);
  const [hasApiSecret, setHasApiSecret] = useState(false);
  const [apiKeyMasked, setApiKeyMasked] = useState('');
  const [apiSecretMasked, setApiSecretMasked] = useState('');
  const [updatedAt, setUpdatedAt] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const cfg = await getSmsGatewayConfig();
        if (cancelled) return;
        setForm({
          providerName: cfg.providerName ?? '',
          isActive: !!cfg.isActive,
          httpMethod: cfg.httpMethod ?? 'POST',
          requestUrl: cfg.requestUrl ?? '',
          headersText: JSON.stringify(cfg.headersJson ?? {}, null, 2),
          bodyTemplate: cfg.bodyTemplate ?? '',
          senderId: cfg.senderId ?? '',
        });
        setHasApiKey(!!cfg.hasApiKey);
        setHasApiSecret(!!cfg.hasApiSecret);
        setApiKeyMasked(cfg.apiKeyMasked ?? '');
        setApiSecretMasked(cfg.apiSecretMasked ?? '');
        setUpdatedAt(cfg.updatedAt ?? null);
      } catch {
        showToast('Failed to load SMS gateway config.', 'error');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function set(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSave() {
    if (form.isActive && !form.requestUrl.trim()) {
      showToast('Request URL is required to enable the gateway.', 'error');
      return;
    }

    let headersJson;
    try {
      headersJson = form.headersText.trim() ? JSON.parse(form.headersText) : {};
    } catch {
      showToast('Headers must be valid JSON.', 'error');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        providerName: form.providerName,
        isActive: form.isActive,
        httpMethod: form.httpMethod,
        requestUrl: form.requestUrl,
        headersJson,
        bodyTemplate: form.bodyTemplate,
        senderId: form.senderId,
      };
      if (apiKeyInput !== '') payload.apiKey = apiKeyInput;
      if (apiSecretInput !== '') payload.apiSecret = apiSecretInput;

      const saved = await saveSmsGatewayConfig(payload);
      setHasApiKey(!!saved.has_api_key);
      setHasApiSecret(!!saved.has_api_secret);
      setApiKeyMasked(saved.api_key_masked ?? '');
      setApiSecretMasked(saved.api_secret_masked ?? '');
      setUpdatedAt(saved.updated_at ?? null);
      setApiKeyInput('');
      setApiSecretInput('');
      showToast('SMS gateway configuration saved.', 'success');
    } catch {
      showToast('Failed to save SMS gateway config.', 'error');
    } finally {
      setSaving(false);
    }
  }

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
          <h1 className="text-xl font-extrabold text-foreground font-heading">SMS Gateway</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Configure the SMS gateway used to send login OTPs to field staff.
          </p>
        </div>
        <Button variant="primary" onClick={handleSave} disabled={saving}>
          {saving
            ? <><i className="fas fa-spinner fa-spin mr-2" />Saving…</>
            : <><i className="fas fa-save mr-2" />Save</>}
        </Button>
      </div>

      {/* Active status banner */}
      <div className={`flex items-center gap-3 px-4 py-3 rounded-xl border ${form.isActive ? 'bg-green-50 border-green-200' : 'bg-muted/40 border-border'}`}>
        <div className="flex-1">
          <div className={`text-sm font-bold ${form.isActive ? 'text-green-700' : 'text-foreground'}`}>
            {form.isActive ? 'Gateway is active — OTP login will use this configuration' : 'Gateway is inactive'}
          </div>
          {updatedAt && (
            <div className="text-[0.68rem] text-muted-foreground mt-0.5">
              Last updated {new Date(updatedAt).toLocaleString()}
            </div>
          )}
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={form.isActive}
          onClick={() => set('isActive', !form.isActive)}
          className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2
            ${form.isActive ? 'bg-primary' : 'bg-border'}`}
          aria-label="Toggle gateway active"
        >
          <span className={`inline-block h-4 w-4 rounded-full bg-white shadow transition-transform duration-200 ${form.isActive ? 'translate-x-6' : 'translate-x-1'}`} />
        </button>
      </div>

      {/* Provider details */}
      <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
        <div className="flex items-center gap-2 px-5 py-3.5 border-b border-border bg-muted/30">
          <i className="fas fa-tower-broadcast text-sm text-muted-foreground" />
          <span className="text-sm font-bold text-foreground">Provider Details</span>
        </div>
        <div className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <TextField
            label="Provider Name"
            value={form.providerName}
            onChange={(v) => set('providerName', v)}
            placeholder="e.g. MSG91, Fast2SMS, TextLocal"
          />
          <TextField
            label="Sender ID"
            value={form.senderId}
            onChange={(v) => set('senderId', v)}
            placeholder="e.g. PSCMS"
          />
          <SecretField
            label="API Key"
            value={apiKeyInput}
            onChange={setApiKeyInput}
            isSet={hasApiKey}
            maskedValue={apiKeyMasked}
          />
          <SecretField
            label="API Secret"
            value={apiSecretInput}
            onChange={setApiSecretInput}
            isSet={hasApiSecret}
            maskedValue={apiSecretMasked}
            hint="Only needed if your gateway requires a separate secret/token."
          />
        </div>
      </div>

      {/* Request configuration */}
      <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
        <div className="flex items-center gap-2 px-5 py-3.5 border-b border-border bg-muted/30">
          <i className="fas fa-code text-sm text-muted-foreground" />
          <span className="text-sm font-bold text-foreground">Request Configuration</span>
        </div>
        <div className="p-5 space-y-4">

          <div className="flex items-center gap-2 px-4 py-3 rounded-lg bg-blue-50 border border-blue-100 text-xs text-blue-700">
            <i className="fas fa-circle-info shrink-0" />
            Use placeholders <code className="px-1 rounded bg-blue-100">{'{mobile}'}</code>{' '}
            <code className="px-1 rounded bg-blue-100">{'{otp}'}</code>{' '}
            <code className="px-1 rounded bg-blue-100">{'{sender_id}'}</code>{' '}
            <code className="px-1 rounded bg-blue-100">{'{api_key}'}</code>{' '}
            <code className="px-1 rounded bg-blue-100">{'{api_secret}'}</code>{' '}
            in headers or the body template — they're substituted when an OTP is sent.
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-[7rem_1fr] gap-4">
            <div>
              <label className="block text-xs font-semibold mb-1.5 text-foreground">Method</label>
              <select
                value={form.httpMethod}
                onChange={(e) => set('httpMethod', e.target.value)}
                className="w-full h-9 px-3 rounded-lg border border-input bg-card text-sm focus:outline-none focus:ring-1 focus:ring-ring"
              >
                <option value="POST">POST</option>
                <option value="GET">GET</option>
              </select>
            </div>
            <TextField
              label="Request URL"
              value={form.requestUrl}
              onChange={(v) => set('requestUrl', v)}
              placeholder="https://api.example-gateway.com/v1/sms/send"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold mb-1.5 text-foreground">Headers (JSON)</label>
            <textarea
              value={form.headersText}
              onChange={(e) => set('headersText', e.target.value)}
              rows={4}
              spellCheck={false}
              placeholder={'{\n  "Authorization": "Bearer {api_key}"\n}'}
              className="w-full px-3 py-2 rounded-lg border border-input bg-card text-sm font-mono focus:outline-none focus:ring-1 focus:ring-ring"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold mb-1.5 text-foreground">Body Template</label>
            <textarea
              value={form.bodyTemplate}
              onChange={(e) => set('bodyTemplate', e.target.value)}
              rows={4}
              spellCheck={false}
              placeholder={'{\n  "sender": "{sender_id}",\n  "to": "{mobile}",\n  "message": "Your OTP is {otp}"\n}'}
              className="w-full px-3 py-2 rounded-lg border border-input bg-card text-sm font-mono focus:outline-none focus:ring-1 focus:ring-ring"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
