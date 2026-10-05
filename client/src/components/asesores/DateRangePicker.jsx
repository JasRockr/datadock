import PropTypes from 'prop-types';

const toInputValue = (date) => {
  if (!date) return '';
  const value = date instanceof Date ? date : new Date(date);
  return Number.isNaN(value.getTime()) ? '' : value.toISOString().slice(0, 10);
};

const startOfMonth = (date) => new Date(date.getFullYear(), date.getMonth(), 1);
const endOfMonth = (date) => new Date(date.getFullYear(), date.getMonth() + 1, 0);

function DateRangePicker({ value, onChange }) {
  const updateRange = (key, inputValue) => {
    const nextValue = inputValue ? new Date(`${inputValue}T00:00:00`) : null;
    const nextRange = { ...value, [key]: nextValue };

    if (nextRange.start && nextRange.end && nextRange.start > nextRange.end) {
      nextRange[key === 'start' ? 'end' : 'start'] = nextValue;
    }

    onChange(nextRange);
  };

  const setPreset = (preset) => {
    const today = new Date();
    if (preset === 'today') onChange({ start: today, end: today });
    if (preset === 'week') onChange({ start: new Date(today.getFullYear(), today.getMonth(), today.getDate() - 6), end: today });
    if (preset === 'month') onChange({ start: startOfMonth(today), end: endOfMonth(today) });
    if (preset === 'clear') onChange({ start: null, end: null });
  };

  return (
    <fieldset className="date-range-picker">
      <legend className="date-range-picker__label">Rango de fecha de novedad</legend>
      <div className="date-range-picker__fields">
        <label>
          <span>Desde</span>
          <input type="date" value={toInputValue(value.start)} onChange={event => updateRange('start', event.target.value)} />
        </label>
        <label>
          <span>Hasta</span>
          <input type="date" value={toInputValue(value.end)} onChange={event => updateRange('end', event.target.value)} />
        </label>
      </div>
      <div className="date-range-picker__presets" aria-label="Presets de fecha">
        <button type="button" onClick={() => setPreset('today')}>Hoy</button>
        <button type="button" onClick={() => setPreset('week')}>7 días</button>
        <button type="button" onClick={() => setPreset('month')}>Mes actual</button>
        <button type="button" onClick={() => setPreset('clear')}>Limpiar</button>
      </div>
    </fieldset>
  );
}

DateRangePicker.propTypes = {
  value: PropTypes.shape({
    start: PropTypes.oneOfType([PropTypes.instanceOf(Date), PropTypes.string]),
    end: PropTypes.oneOfType([PropTypes.instanceOf(Date), PropTypes.string]),
  }).isRequired,
  onChange: PropTypes.func.isRequired,
};

export default DateRangePicker;
