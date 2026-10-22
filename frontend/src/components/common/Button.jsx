export default function Button({
  children,
  variant = 'primary', // primary | secondary | danger | ghost | outline
  size = 'md',        // sm | md | lg
  type = 'button',
  disabled = false,
  onClick,
  className = '',
  icon: Icon,
  ...props
}) {
  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      className={`btn btn-${variant} btn-${size} ${className}`}
      {...props}
    >
      {Icon && <Icon size={size === 'sm' ? 15 : size === 'lg' ? 20 : 17} className="btn-icon" />}
      {children}
    </button>
  );
}
