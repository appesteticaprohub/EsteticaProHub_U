import Select from './Select';

interface DateSelectProps {
  day: string;
  month: string;
  year: string;
  onChange: (field: 'day' | 'month' | 'year', value: string) => void;
  required?: boolean;
  disabled?: boolean;
  className?: string;
}

// Generar días (1-31)
const DAYS = Array.from({ length: 31 }, (_, i) => ({
  value: String(i + 1),
  label: String(i + 1)
}));

// Meses en español
const MONTHS = [
  { value: '1', label: 'Enero' },
  { value: '2', label: 'Febrero' },
  { value: '3', label: 'Marzo' },
  { value: '4', label: 'Abril' },
  { value: '5', label: 'Mayo' },
  { value: '6', label: 'Junio' },
  { value: '7', label: 'Julio' },
  { value: '8', label: 'Agosto' },
  { value: '9', label: 'Septiembre' },
  { value: '10', label: 'Octubre' },
  { value: '11', label: 'Noviembre' },
  { value: '12', label: 'Diciembre' }
];

// Generar años (desde 1950 hasta año actual)
const currentYear = new Date().getFullYear();
const YEARS = Array.from({ length: currentYear - 1949 }, (_, i) => ({
  value: String(currentYear - i),
  label: String(currentYear - i)
}));

export default function DateSelect({
  day,
  month,
  year,
  onChange,
  required = false,
  disabled = false,
  className = ""
}: DateSelectProps) {
  const handleDayChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onChange('day', e.target.value);
  };

  const handleMonthChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onChange('month', e.target.value);
  };

  const handleYearChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onChange('year', e.target.value);
  };

  return (
    <div className={`grid grid-cols-3 gap-3 ${className}`}>
      {/* Día */}
      <div>
        <Select
          id="day"
          name="day"
          value={day}
          onChange={handleDayChange}
          options={DAYS}
          placeholder="Día"
          required={required}
          disabled={disabled}
        />
      </div>

      {/* Mes */}
      <div>
        <Select
          id="month"
          name="month"
          value={month}
          onChange={handleMonthChange}
          options={MONTHS}
          placeholder="Mes"
          required={required}
          disabled={disabled}
        />
      </div>

      {/* Año */}
      <div>
        <Select
          id="year"
          name="year"
          value={year}
          onChange={handleYearChange}
          options={YEARS}
          placeholder="Año"
          required={required}
          disabled={disabled}
        />
      </div>
    </div>
  );
}