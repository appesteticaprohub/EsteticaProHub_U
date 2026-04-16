import Select from './Select';

interface CountrySelectProps {
  id: string;
  name: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  required?: boolean;
  disabled?: boolean;
  className?: string;
}

const LATIN_AMERICAN_COUNTRIES = [
  { value: 'Argentina', label: 'Argentina' },
  { value: 'Bolivia', label: 'Bolivia' },
  { value: 'Brasil', label: 'Brasil' },
  { value: 'Chile', label: 'Chile' },
  { value: 'Colombia', label: 'Colombia' },
  { value: 'Costa Rica', label: 'Costa Rica' },
  { value: 'Cuba', label: 'Cuba' },
  { value: 'Ecuador', label: 'Ecuador' },
  { value: 'El Salvador', label: 'El Salvador' },
  { value: 'Guatemala', label: 'Guatemala' },
  { value: 'Honduras', label: 'Honduras' },
  { value: 'México', label: 'México' },
  { value: 'Nicaragua', label: 'Nicaragua' },
  { value: 'Panamá', label: 'Panamá' },
  { value: 'Paraguay', label: 'Paraguay' },
  { value: 'Perú', label: 'Perú' },
  { value: 'Puerto Rico', label: 'Puerto Rico' },
  { value: 'República Dominicana', label: 'República Dominicana' },
  { value: 'Uruguay', label: 'Uruguay' },
  { value: 'Venezuela', label: 'Venezuela' }
];

export default function CountrySelect({
  id,
  name,
  value,
  onChange,
  required = false,
  disabled = false,
  className = ""
}: CountrySelectProps) {
  return (
    <Select
      id={id}
      name={name}
      value={value}
      onChange={onChange}
      options={LATIN_AMERICAN_COUNTRIES}
      placeholder="Selecciona tu país"
      required={required}
      disabled={disabled}
      className={className}
    />
  );
}