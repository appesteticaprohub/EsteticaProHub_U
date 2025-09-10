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
  { value: 'argentina', label: 'Argentina' },
  { value: 'bolivia', label: 'Bolivia' },
  { value: 'brasil', label: 'Brasil' },
  { value: 'chile', label: 'Chile' },
  { value: 'colombia', label: 'Colombia' },
  { value: 'costa_rica', label: 'Costa Rica' },
  { value: 'cuba', label: 'Cuba' },
  { value: 'ecuador', label: 'Ecuador' },
  { value: 'el_salvador', label: 'El Salvador' },
  { value: 'guatemala', label: 'Guatemala' },
  { value: 'honduras', label: 'Honduras' },
  { value: 'mexico', label: 'México' },
  { value: 'nicaragua', label: 'Nicaragua' },
  { value: 'panama', label: 'Panamá' },
  { value: 'paraguay', label: 'Paraguay' },
  { value: 'peru', label: 'Perú' },
  { value: 'puerto_rico', label: 'Puerto Rico' },
  { value: 'republica_dominicana', label: 'República Dominicana' },
  { value: 'uruguay', label: 'Uruguay' },
  { value: 'venezuela', label: 'Venezuela' }
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