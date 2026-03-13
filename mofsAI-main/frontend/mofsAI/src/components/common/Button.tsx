import React from 'react';

type ButtonBaseProps = {
  variant?: 'primary' | 'secondary';
  size?: 'small' | 'medium' | 'large';
  children?: React.ReactNode;
  label?: string;
  className?: string;
};

type ButtonAsButton = ButtonBaseProps & React.ButtonHTMLAttributes<HTMLButtonElement> & { href?: never };
type ButtonAsAnchor = ButtonBaseProps & React.AnchorHTMLAttributes<HTMLAnchorElement> & { href: string };

type ButtonProps = ButtonAsButton | ButtonAsAnchor;

const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'medium',
  children,
  label,
  className = '',
  ...props
}) => {
  const baseStyles = 'font-semibold rounded focus:outline-none focus:ring-2 focus:ring-opacity-50 inline-block text-center';
  const variantStyles =
    variant === 'primary'
      ? 'bg-blue-600 text-white hover:bg-blue-700'
      : 'bg-gray-200 text-gray-800 hover:bg-gray-300';
  const sizeStyles =
    size === 'small'
      ? 'px-3 py-1 text-sm'
      : size === 'large'
        ? 'px-6 py-3 text-lg'
        : 'px-4 py-2';
  const combined = `${baseStyles} ${variantStyles} ${sizeStyles} ${className}`.trim();
  const content = label ?? children;

  if ('href' in props && props.href) {
    const { href, ...rest } = props;
    return (
      <a href={href} className={combined} {...rest}>
        {content}
      </a>
    );
  }
  return (
    <button type="button" className={combined} {...(props as React.ButtonHTMLAttributes<HTMLButtonElement>)}>
      {content}
    </button>
  );
};

export default Button;