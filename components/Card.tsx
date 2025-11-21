import React from 'react';

interface CardProps {
  title?: string;
  children: React.ReactNode;
  className?: string;
  action?: React.ReactNode;
}

const Card: React.FC<CardProps> = ({ title, children, className = '', action }) => {
  return (
    <div className={`bg-white rounded-xl border border-gray-200 shadow-sm ${className}`}>
      {(title || action) && (
        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center">
          {title && <h3 className="text-lg font-semibold text-gray-800">{title}</h3>}
          {action && <div>{action}</div>}
        </div>
      )}
      <div className="p-6">
        {children}
      </div>
    </div>
  );
};

export default Card;