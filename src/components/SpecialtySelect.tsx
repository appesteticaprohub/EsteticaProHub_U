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
  { value: 'cosmetología', label: 'Cosmetología' },
  { value: 'cosmiatría', label: 'Cosmiatría' },
  { value: 'medicina_estetica', label: 'Medicina Estética' },
  { value: 'esteticista', label: 'Esteticista' },
  { value: 'enfermería', label: 'Enfermería' },
  { value: 'masoterapia', label: 'Masoterapia' },
  { value: 'medicina_general', label: 'Medicina general' },
  { value: 'cirugía_plástica', label: 'Cirugía plástica' },
  { value: 'fisioterapia', label: 'Fisioterapia' },
  { value: 'terapias_holísticas', label: 'Terapias holísticas' },
  { value: 'spa_manager', label: 'Spa manager' },
  { value: 'dermatología', label: 'Dermatología' }
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