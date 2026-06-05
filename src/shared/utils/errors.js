// src/shared/utils/errors.js

export const ERROR_CODES = {
  // Telemetria
  TEL_TIMEOUT:     'HSM-TEL-001',
  TEL_FETCH_ATUAL: 'HSM-TEL-002',
  TEL_FETCH_HIST:  'HSM-TEL-003',
  TEL_FETCH_GERAL: 'HSM-TEL-004',
  TEL_HTTP_ERROR:  'HSM-TEL-005',

  // Alertas
  ALR_FETCH:       'HSM-ALR-001',
  ALR_MARK_LIDO:   'HSM-ALR-002',

  // Canteiros
  CNT_NOT_FOUND:   'HSM-CNT-001',
  CNT_CREATE:      'HSM-CNT-002',
  CNT_UPDATE:      'HSM-CNT-003',
  CNT_DELETE:      'HSM-CNT-004',
  CNT_VALIDATION:  'HSM-CNT-005',
  CNT_FETCH:       'HSM-CNT-006',

  // Histórico
  HST_FETCH:       'HSM-HST-001',
  HST_EXPORT:      'HSM-HST-002',
};

export class HortaError extends Error {
  constructor(code, message) {
    super(message);
    this.code    = code;
    this.name    = 'HortaError';
  }

  toString() {
    return `[${this.code}] ${this.message}`;
  }
}
