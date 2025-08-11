import React from 'react';

interface ToolbarAction {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  disabled?: boolean;
}

interface MobileToolbarProps {
  actions: ToolbarAction[];
  position?: 'top' | 'bottom';
}

export const MobileToolbar: React.FC<MobileToolbarProps> = ({ 
  actions, 
  position = 'bottom' 
}) => {
  return (
    <div 
      className={`
        fixed left-0 right-0 bg-white border-t shadow-lg
        ${position === 'top' ? 'top-0 border-b border-t-0' : 'bottom-0'}
      `}
    >
      <div className="flex items-center justify-around py-2 px-4">
        {actions.map((action, index) => (
          <button
            key={index}
            onClick={action.onClick}
            disabled={action.disabled}
            className={`
              flex flex-col items-center justify-center p-2 rounded-lg
              transition-colors duration-200
              ${action.disabled 
                ? 'text-gray-400 cursor-not-allowed' 
                : 'text-gray-700 hover:bg-gray-100 active:bg-gray-200'
              }
            `}
          >
            <div className="w-6 h-6 mb-1">
              {action.icon}
            </div>
            <span className="text-xs">{action.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
};