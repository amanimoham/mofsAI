import React from 'react';

interface CardProps {
  title?: string;
  description?: string;
  icon?: React.ReactNode;
  image?: string;
  className?: string;
  children?: React.ReactNode;
}

const Card: React.FC<CardProps> = ({ title, description, icon, image, className = '', children }) => {
  const baseClass = `bg-white shadow-md rounded-lg p-6 transition-transform transform hover:scale-105 overflow-hidden ${className}`.trim();

  if (children != null) {
    return <div className={baseClass}>{children}</div>;
  }

  return (
    <div className={baseClass}>
      {(image || icon) && (
        <div className="flex items-center mb-4">
          {image ? (
            <img src={image} alt="" className="w-12 h-12 object-cover rounded-lg mr-4" />
          ) : (
            <div className="text-2xl text-blue-500">{icon}</div>
          )}
          {title && <h3 className="ml-4 text-xl font-semibold">{title}</h3>}
        </div>
      )}
      {!image && !icon && title && <h3 className="text-xl font-semibold mb-4">{title}</h3>}
      {description && <p className="text-gray-600">{description}</p>}
    </div>
  );
};

export default Card;