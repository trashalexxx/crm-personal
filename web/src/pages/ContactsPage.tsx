import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ContactsView } from '../components/contacts/ContactsView';
import { Badge, Button, Modal, PageHeader } from '../components/ui';
import { useToast } from '../context/ToastContext';
import { fullName } from '../lib/format';
import { contactsService } from '../services/contacts.service';
import { dataService } from '../services/insights.service';
import { ImportContactsModal } from '../components/contacts/ImportContactsModal';

const DUPLICATE_REASON: Record<string, string> = {
  email: 'mismo correo electrónico',
  phone: 'mismo teléfono',
  name: 'mismo nombre',
};

export function ContactsPage() {
  const { notify, notifyError } = useToast();
  const [createSignal, setCreateSignal] = useState(0);
  const [importOpen, setImportOpen] = useState(false);
  const [duplicatesOpen, setDuplicatesOpen] = useState(false);

  const { data: duplicates } = useQuery({
    queryKey: ['contact-duplicates'],
    queryFn: contactsService.duplicates,
    staleTime: 120_000,
  });

  const duplicateCount = duplicates?.groups.length ?? 0;

  const exportCsv = async () => {
    try {
      await dataService.exportContacts();
      notify('Exportación descargada');
    } catch (error) {
      notifyError(error);
    }
  };

  return (
    <>
      <PageHeader
        title="Contactos"
        subtitle="Tu base de datos de personas y empresas"
        actions={
          <>
            {duplicateCount > 0 && (
              <Button variant="secondary" size="sm" onClick={() => setDuplicatesOpen(true)}>
                ⚠️ {duplicateCount} posible(s) duplicado(s)
              </Button>
            )}
            <Button variant="secondary" size="sm" onClick={exportCsv}>
              Exportar CSV
            </Button>
            <Button variant="secondary" size="sm" onClick={() => setImportOpen(true)}>
              Importar CSV
            </Button>
            <Button onClick={() => setCreateSignal((n) => n + 1)}>Nuevo contacto</Button>
          </>
        }
      />

      <ContactsView createSignal={createSignal} />

      <ImportContactsModal open={importOpen} onClose={() => setImportOpen(false)} />

      <Modal
        open={duplicatesOpen}
        title="Posibles contactos duplicados"
        onClose={() => setDuplicatesOpen(false)}
        size="lg"
      >
        <p className="mb-4 text-sm text-slate-500">
          Estos contactos comparten datos. Revísalos y decide si quieres unificarlos manualmente;
          la aplicación no fusiona nada de forma automática.
        </p>
        <ul className="space-y-3">
          {duplicates?.groups.map((group) => (
            <li key={`${group.reason}-${group.value}`} className="rounded-lg border border-slate-200 p-3 dark:border-slate-800">
              <Badge className="mb-2 bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300">
                {DUPLICATE_REASON[group.reason]}
              </Badge>
              <ul className="space-y-1">
                {group.contacts.map((contact) => (
                  <li key={contact.id}>
                    <Link
                      to={`/contactos/${contact.id}`}
                      onClick={() => setDuplicatesOpen(false)}
                      className="text-sm font-medium text-brand-600 hover:underline dark:text-brand-400"
                    >
                      {fullName(contact)}
                    </Link>
                    <span className="ml-2 text-xs text-slate-500">
                      {[contact.company, contact.email, contact.phone].filter(Boolean).join(' · ')}
                    </span>
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ul>
      </Modal>
    </>
  );
}
