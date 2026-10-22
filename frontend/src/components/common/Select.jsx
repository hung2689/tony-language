export default function Select({
  label,
  options = [],
  error,
  required = false,
  className = '',
  id,
  placeholder,
  ...props
}) {
  const selectId = id || props.name || Math.random().toString(36).substring(7);

  return (
    <div className={`form-group ${className}`}>
      {label && (
        <label htmlFor={selectId} className="form-label">
          {label} {required && <span className="text-danger">*</span>}
        </label>
      )}
      <select
        id={selectId}
        className={`form-select ${error ? 'is-invalid' : ''}`}
        {...props}
      >
        {placeholder && <option value="">{placeholder}</option>}
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      {error && <div className="form-error">{error}</div>}
    </div>
  );
}
