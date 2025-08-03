import React from 'react';

interface Tab {
  id: string;
  label: string;
  icon: React.ReactNode;
}

interface MobileTabsProps {
  tabs: Tab[];
  activeTab: string;
  onTabChange: (tabId: string) => void;
}

export const MobileTabs: React.FC<MobileTabsProps> = ({ tabs, activeTab, onTabChange }) => {
  return (
    <div className="bg-white border-b">
      <div className="flex">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`
              flex-1 flex flex-col items-center py-3 px-2 text-xs
              ${activeTab === tab.id 
                ? 'text-blue-600 border-b-2 border-blue-600' 
                : 'text-gray-600 hover:text-gray-900'
              }
            `}
          >
            <div className="mb-1">{tab.icon}</div>
            <span>{tab.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
};