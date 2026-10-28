import Ripple from './Ripple';

export default function Button({
  children,
  variant = 'primary', // primary | secondary | danger | ghost | outline
  size = 'md', // sm | md | lg
  type = 'button',
  disabled = false,
  loading = false,
  onClick,
  className = '',
  icon: Icon,
  ...props
}) {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      onClick={onClick}
      className={`btn btn-${variant} btn-${size} ${className}`}
      style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '8px', ...props.style }}
      {...props}
    >
      {loading ? (
        <Ripple size={size === 'sm' ? 15 : size === 'lg' ? 20 : 17} color="currentColor" />
      ) : (
        Icon && <Icon size={size === 'sm' ? 15 : size === 'lg' ? 20 : 17} className="btn-icon" />
      )}
      {children}
    </button>
  );
}
