// src/shared/components/ErrorBlock.jsx
import React from 'react';
import { AlertTriangle } from 'lucide-react';

export default function ErrorBlock({ error, onRetry }) {
  const message = error?.message ?? error ?? 'Erro desconhecido.';
  const code    = error?.code ?? null;

  return (
    <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 rounded-xl p-8 text-center">
      <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-3" />
      <p className="text-red-700 dark:text-red-300 font-semibold mb-1">{message}</p>
      {code && (
        <p className="text-xs text-red-400 dark:text-red-500 font-mono mb-4">
          código: {code}
        </p>
      )}
      {onRetry && (
        <button
          onClick={onRetry}
          className="px-4 py-2 bg-red-100 hover:bg-red-200 dark:bg-red-900/50 text-red-700 dark:text-red-300 rounded-lg text-sm font-medium"
        >
          Tentar novamente
        </button>
      )}
    </div>
  );
}
