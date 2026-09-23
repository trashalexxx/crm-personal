import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useToast } from '../../context/ToastContext';
import { dataService } from '../../services/insights.service';
import type { ImportResult } from '../../types/models';
import { Button, Field, Modal, Select } from '../ui';

type DuplicateMode = 'skip' | 'update' | 'create';

export function ImportContactsModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const queryClient = useQueryClient();
  const { notify, notifyError } = useToast();

  const [csv, setCsv] = useState('');
  const [fileName, setFileName] = useState('');
  const [mode, setMode] = useState<DuplicateMode>('skip');
  const [result, setResult] = useState<ImportResult | null>(null);
  const [loading, setLoading] = useState(false);

  const reset = () => {
    setCsv('');
    setFileName('');
    setResult(null);
    setLoading(false);
  };

  const handleFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (file.size > 5_000_000) {
      notifyError(new Error('El fichero supera los 5 MB'));
      return;
    }
    setFileName(file.name);
    setResult(null);
    setCsv(await file.text());
  };

  const run = async (dryRun: boolean) => {
    setLoading(true);
    try {
      const data = await dataService.importContacts(csv, mode, dryRun);
      setResult(data);
      if (!dryRun) {
        queryClient.invalidateQueries({ queryKey: ['contacts'] });
        queryClient.invalidateQueries({ queryKey: ['contact-duplicates'] });
        queryClient.invalidateQueries({ queryKey: ['dashboard'] });
        notify(`Importación completada: ${data.created} creados, ${data.updated} actualizados`);
      }
    } catch (error) {
      notifyError(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      open={open}
      title="Importar contactos desde CSV"
      size="lg"
      onClose={() => {
        reset();
        onClose();
      }}
      footer={
        <>
          <Button variant="secondary" onClick={() => dataService.downloadTemplate()}>
            Descargar plantilla
          </Button>
          <Button variant="secondary" disabled={!csv || loading} onClick={() => run(true)}>
            Previsualizar
          </Button>
          <Button disabled={!csv} loading={loading} onClick={() => run(false)}>
            Importar
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <p className="text-sm text-slate-500">
          El fichero debe tener una fila de cabecera. Se reconocen nombres de columna en español e
          inglés (nombre/firstName, correo/email, teléfono/phone, empresa/company, etiquetas/tags…).
          Solo el nombre es obligatorio.
        </p>

        <Field label="Fichero CSV" required>
          {(id) => (
            <input
              id={id}
              type="file"
              accept=".csv,text/csv"
              onChange={handleFile}
              className="block w-full text-sm text-slate-500 file:mr-3 file:rounded-lg file:border-0 file:bg-brand-600 file:px-4 file:py-2 file:text-sm file:font-medium file:text-white hover:file:bg-brand-700"
            />
          )}
        </Field>
        {fileName && <p className="text-xs text-slate-500">Seleccionado: {fileName}</p>}

        <Field label="Si un contacto ya existe (mismo correo o teléfono)">
          {(id) => (
            <Select id={id} value={mode} onChange={(e) => setMode(e.target.value as DuplicateMode)}>
              <option value="skip">Omitirlo, no tocar el existente</option>
              <option value="update">Actualizar el contacto existente</option>
              <option value="create">Crear uno nuevo de todas formas</option>
            </Select>
          )}
        </Field>

        {result && (
          <div className="rounded-lg border border-slate-200 p-3 text-sm dark:border-slate-800">
            <p className="mb-2 font-medium">
              {result.dryRun ? 'Previsualización (no se ha guardado nada)' : 'Resultado'}
            </p>
            <ul className="space-y-0.5 text-slate-600 dark:text-slate-300">
              <li>Nuevos: {result.created}</li>
              <li>Actualizados: {result.updated}</li>
              <li>Omitidos: {result.skipped}</li>
              <li>Filas con error: {result.errors.length}</li>
            </ul>
            {result.errors.length > 0 && (
              <ul className="mt-2 max-h-32 space-y-0.5 overflow-y-auto text-xs text-brand-600 dark:text-brand-400">
                {result.errors.map((err) => (
                  <li key={`${err.row}-${err.message}`}>Fila {err.row}: {err.message}</li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>
    </Modal>
  );
}
