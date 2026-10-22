export default function Input({
  label,
  error,
  required = false,
  className = '',
  id,
  ...props
}) {
  const inputId = id || props.name || Math.random().toString(36).substring(7);

  return (
    <div className={`form-group ${className}`}>
      {label && (
        <label htmlFor={inputId} className="form-label">
          {label} {required && <span className="text-danger">*</span>}
        </label>
      )}
      <input
        id={inputId}
        className={`form-input ${error ? 'is-invalid' : ''}`}
        {...props}
      />
      {error && <div className="form-error">{error}</div>}
    </div>
  );
}
