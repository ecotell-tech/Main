import { apiFetch } from '@services/api';

/**
 * Fetch the current SMS gateway config (Leadership only).
 *
 * Returns snake_case fields as sent by the API, plus:
 *   apiKeyMasked / apiSecretMasked  {string}  — e.g. '••••••ab12', never the real value
 *   hasApiKey / hasApiSecret        {boolean} — whether a secret is currently stored
 */
export async function getSmsGatewayConfig() {
  const data = await apiFetch('/settings/sms-gateway');
  return {
    providerName:    data.provider_name,
    isActive:        data.is_active,
    httpMethod:      data.http_method,
    requestUrl:      data.request_url,
    headersJson:     data.headers_json,
    bodyTemplate:    data.body_template,
    senderId:        data.sender_id,
    apiKeyMasked:    data.api_key_masked,
    apiSecretMasked: data.api_secret_masked,
    hasApiKey:       data.has_api_key,
    hasApiSecret:    data.has_api_secret,
    updatedAt:       data.updated_at,
  };
}

/**
 * Save the SMS gateway config.
 *
 * @param {object} config
 * @param {string}  config.providerName
 * @param {boolean} config.isActive
 * @param {string}  config.httpMethod
 * @param {string}  config.requestUrl
 * @param {object}  config.headersJson
 * @param {string}  config.bodyTemplate
 * @param {string}  config.senderId
 * @param {string}  [config.apiKey]    - Omit to leave the stored key unchanged; '' clears it.
 * @param {string}  [config.apiSecret] - Omit to leave the stored secret unchanged; '' clears it.
 */
export async function saveSmsGatewayConfig(config) {
  const body = {
    provider_name: config.providerName,
    is_active:     config.isActive,
    http_method:   config.httpMethod,
    request_url:   config.requestUrl,
    headers_json:  config.headersJson,
    body_template: config.bodyTemplate,
    sender_id:     config.senderId,
  };
  if (config.apiKey !== undefined)    body.api_key    = config.apiKey;
  if (config.apiSecret !== undefined) body.api_secret = config.apiSecret;

  return apiFetch('/settings/sms-gateway', {
    method: 'PUT',
    body: JSON.stringify(body),
  });
}
