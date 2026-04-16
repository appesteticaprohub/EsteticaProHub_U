import Select from './Select';

interface SpecialtySelectProps {
  id: string;
  name: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  required?: boolean;
  disabled?: boolean;
  className?: string;
}

const SPECIALTIES = [
  { value: 'Cosmetología', label: 'Cosmetología' },
  { value: 'Cosmiatría', label: 'Cosmiatría' },
  { value: 'Medicina Estética', label: 'Medicina Estética' },
  { value: 'Esteticista', label: 'Esteticista' },
  { value: 'Enfermería', label: 'Enfermería' },
  { value: 'Masoterapia', label: 'Masoterapia' },
  { value: 'Medicina General', label: 'Medicina General' },
  { value: 'Cirugía Plástica', label: 'Cirugía Plástica' },
  { value: 'Fisioterapia', label: 'Fisioterapia' },
  { value: 'Terapias Holísticas', label: 'Terapias Holísticas' },
  { value: 'Spa Manager', label: 'Spa Manager' },
  { value: 'Dermatología', label: 'Dermatología' }
];

export default function SpecialtySelect({
  id,
  name,
  value,
  onChange,
  required = false,
  disabled = false,
  className = ""
}: SpecialtySelectProps) {
  return (
    <Select
      id={id}
      name={name}
      value={value}
      onChange={onChange}
      options={SPECIALTIES}
      placeholder="Selecciona tu especialidad"
      required={required}
      disabled={disabled}
      className={className}
    />
  );
}