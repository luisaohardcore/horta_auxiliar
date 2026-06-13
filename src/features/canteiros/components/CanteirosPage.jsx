// src/features/canteiros/components/CanteirosPage.jsx
import React, { useState, useEffect, useCallback } from 'react';
import {
  Plus, Pencil, Trash2, Loader2, AlertTriangle, X, Save, CheckCircle,
} from 'lucide-react';
import {
  fetchCanteiros, createCanteiro, updateCanteiro, deleteCanteiro,
} from '../services/canteirosService.js';
import { logger } from '../../../shared/utils/logger.js';
import { refreshCanteiros } from '../../../shared/hooks/useCanteiros.js';
import ErrorBlock from '../../../shared/components/ErrorBlock.jsx';

const EMPTY_FORM = {
  nome: '', cultura: '', area_m2: '', data_plantio: '',
  localizacao: '', umidade_critica: 35, notas: '', status: 'ativo',
};

function Field({ label, error, children }) {
  return (
    <div>
      <label className="text-xs font-medium text-slate-600 dark:text-slate-400 block mb-1">{label}</label>
      {children}
      {error && <p className="text-red-500 text-xs mt-1">{error}</p>}
    </div>
  );
}

const INPUT = "w-full text-sm border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-400";
const INPUT_ERR = "border-red-400 focus:ring-red-400";

function CanteirosForm({ initial, onSave, onCancel, saving }) {
  const [form, setForm] = useState(initial ?? EMPTY_FORM);
  const [errors, setErrors] = useState({});

  const set = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }));
    setErrors(prev => ({ ...prev, [field]: undefined }));
  };

  const [submitError, setSubmitError] = useState(null);

  const handleSubmit = async () => {
    setSubmitError(null);
    try {
      await onSave({ ...form, area_m2: parseFloat(form.area_m2), umidade_critica: parseFloat(form.umidade_critica) });
    } catch (err) {
      if (err.validationErrors) {
        setErrors(err.validationErrors);
      } else {
        setSubmitError(err.message ?? 'Erro ao salvar canteiro.');
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800">
          <h2 className="font-bold text-slate-800 dark:text-slate-100">
            {initial ? 'Editar canteiro' : 'Novo canteiro'}
          </h2>
          <button onClick={onCancel} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg">
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        <div className="px-6 py-5 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Nome *" error={errors.nome}>
              <input className={`${INPUT} ${errors.nome ? INPUT_ERR : ''}`}
                value={form.nome} onChange={e => set('nome', e.target.value)}
                placeholder="Canteiro A – Alface" />
            </Field>
            <Field label="Cultura *" error={errors.cultura}>
              <input className={`${INPUT} ${errors.cultura ? INPUT_ERR : ''}`}
                value={form.cultura} onChange={e => set('cultura', e.target.value)}
                placeholder="Alface Crespa" />
            </Field>
            <Field label="Área (m²) *" error={errors.area_m2}>
              <input type="number" min="0.1" step="0.1"
                className={`${INPUT} ${errors.area_m2 ? INPUT_ERR : ''}`}
                value={form.area_m2} onChange={e => set('area_m2', e.target.value)} />
            </Field>
            <Field label="Data de plantio *" error={errors.data_plantio}>
              <input type="date" className={`${INPUT} ${errors.data_plantio ? INPUT_ERR : ''}`}
                value={form.data_plantio} onChange={e => set('data_plantio', e.target.value)} />
            </Field>
            <Field label="Localização">
              <input className={INPUT} value={form.localizacao}
                onChange={e => set('localizacao', e.target.value)} placeholder="Bloco Norte" />
            </Field>
            <Field label="Limiar umidade crítica (%) *" error={errors.umidade_critica}>
              <input type="number" min="10" max="90"
                className={`${INPUT} ${errors.umidade_critica ? INPUT_ERR : ''}`}
                value={form.umidade_critica} onChange={e => set('umidade_critica', e.target.value)} />
            </Field>
          </div>
          <Field label="Status">
            <select className={INPUT} value={form.status} onChange={e => set('status', e.target.value)}>
              <option value="ativo">Ativo</option>
              <option value="inativo">Inativo</option>
            </select>
          </Field>
          <Field label="Notas">
            <textarea className={`${INPUT} resize-none`} rows={3}
              value={form.notas} onChange={e => set('notas', e.target.value)} />
          </Field>
        </div>

        <div className="flex justify-end gap-3 px-6 py-4 border-t border-slate-200 dark:border-slate-800">
          {submitError && (
            <p className="text-xs text-red-500 flex-1 self-center">{submitError}</p>
          )}
          <button onClick={onCancel} className="px-4 py-2 text-sm text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg">
            Cancelar
          </button>
          <button onClick={handleSubmit} disabled={saving}
            className="flex items-center gap-2 px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium rounded-lg disabled:opacity-60">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Salvar
          </button>
        </div>
      </div>
    </div>
  );
}

function Toast({ message, onClose }) {
  useEffect(() => { const t = setTimeout(onClose, 3000); return () => clearTimeout(t); }, [onClose]);
  return (
    <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3 bg-emerald-700 text-white px-5 py-3 rounded-xl shadow-lg text-sm font-medium">
      <CheckCircle className="w-4 h-4" /> {message}
    </div>
  );
}

export default function CanteirosPage() {
  const [canteiros, setCanteiros] = useState([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState(null);
  const [saving, setSaving]       = useState(false);
  const [modalMode, setModal]     = useState(null); // null | 'create' | canteiro object
  const [toast, setToast]         = useState(null);
  const [confirmDelete, setConfirm] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchCanteiros();
      setCanteiros(data);
      logger.info('CanteirosPage', 'loaded', { count: data.length });
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleSave = async (payload) => {
    setSaving(true);
    try {
      if (modalMode === 'create') {
        const novo = await createCanteiro(payload);
        setCanteiros(prev => [...prev, novo]);
        setToast('Canteiro criado com sucesso!');
        refreshCanteiros();
      } else {
        const updated = await updateCanteiro(modalMode.id, payload);
        setCanteiros(prev => prev.map(c => c.id === updated.id ? updated : c));
        setToast('Canteiro atualizado!');
        refreshCanteiros();
      }
      setModal(null);
    } catch (err) {
      // Re-throw so CanteirosForm.handleSubmit can display it
      throw err;
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    setConfirm(null);
    try {
      await deleteCanteiro(id);
      setCanteiros(prev => prev.filter(c => c.id !== id));
      setToast('Canteiro excluído.');
      refreshCanteiros();
      logger.info('CanteirosPage', 'deleted', { id });
    } catch (err) {
      setError(err);
    }
  };

  if (loading) return (
    <div className="flex flex-col items-center justify-center h-64 gap-3 text-slate-500">
      <Loader2 className="w-10 h-10 animate-spin text-emerald-600" />
      <p className="font-medium">Carregando canteiros…</p>
    </div>
  );

  if (error) return <ErrorBlock error={error} onRetry={load} />;

  return (
    <div className="space-y-5" data-testid="canteiros-page">
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500 dark:text-slate-400">{canteiros.length} canteiro{canteiros.length !== 1 ? 's' : ''} cadastrado{canteiros.length !== 1 ? 's' : ''}</p>
        <button onClick={() => setModal('create')}
          className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium rounded-lg">
          <Plus className="w-4 h-4" /> Novo canteiro
        </button>
      </div>

      {canteiros.length === 0 ? (
        <div className="text-center py-16 text-slate-400">Nenhum canteiro cadastrado.</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {canteiros.map(c => (
            <div key={c.id}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm flex flex-col gap-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 className="font-bold text-slate-800 dark:text-slate-100 leading-tight">{c.nome}</h3>
                  <p className="text-xs text-slate-500 mt-0.5">{c.cultura}</p>
                </div>
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full flex-shrink-0 ${
                  c.status === 'ativo'
                    ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300'
                    : 'bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-400'
                }`}>{c.status}</span>
              </div>

              <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs text-slate-600 dark:text-slate-400">
                <span>📐 {c.area_m2} m²</span>
                <span>📍 {c.localizacao}</span>
                <span>🌱 Plantio: {c.data_plantio}</span>
                <span>💧 Limite: {c.umidade_critica}%</span>
              </div>

              {c.notas && (
                <p className="text-xs text-slate-500 dark:text-slate-500 italic border-t border-slate-100 dark:border-slate-800 pt-2">
                  {c.notas}
                </p>
              )}

              <div className="flex gap-2 mt-auto pt-2 border-t border-slate-100 dark:border-slate-800">
                <button onClick={() => setModal(c)}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg flex-1 justify-center">
                  <Pencil className="w-3.5 h-3.5" /> Editar
                </button>
                <button onClick={() => setConfirm(c.id)}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg flex-1 justify-center">
                  <Trash2 className="w-3.5 h-3.5" /> Excluir
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {modalMode !== null && (
        <CanteirosForm
          initial={modalMode === 'create' ? null : modalMode}
          onSave={handleSave}
          onCancel={() => setModal(null)}
          saving={saving}
        />
      )}

      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl p-6 max-w-sm w-full">
            <h3 className="font-bold text-slate-800 dark:text-slate-100 mb-2">Excluir canteiro?</h3>
            <p className="text-sm text-slate-500 mb-5">Esta ação não pode ser desfeita.</p>
            <div className="flex gap-3 justify-end">
              <button onClick={() => setConfirm(null)} className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg">Cancelar</button>
              <button onClick={() => handleDelete(confirmDelete)} className="px-4 py-2 text-sm font-medium bg-red-600 hover:bg-red-700 text-white rounded-lg">Excluir</button>
            </div>
          </div>
        </div>
      )}

      {toast && <Toast message={toast} onClose={() => setToast(null)} />}
    </div>
  );
}
