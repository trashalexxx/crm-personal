import { useQuery } from '@tanstack/react-query';
import { fullName } from '../../lib/format';
import { contactsService } from '../../services/contacts.service';
import { Select } from '../ui';

interface ContactSelectProps {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

/** Selector de contacto reutilizado por los formularios de tareas, ventas y agenda. */
export function ContactSelect({ id, value, onChange, placeholder = 'Sin contacto' }: ContactSelectProps) {
  const { data } = useQuery({
    queryKey: ['contacts', { sort: 'name' }],
    queryFn: () => contactsService.list({ sort: 'name' }),
  });

  return (
    <Select id={id} value={value} onChange={(e) => onChange(e.target.value)}>
      <option value="">{placeholder}</option>
      {data?.items.map((contact) => (
        <option key={contact.id} value={contact.id}>
          {fullName(contact)}
          {contact.company ? ` — ${contact.company}` : ''}
        </option>
      ))}
    </Select>
  );
}
