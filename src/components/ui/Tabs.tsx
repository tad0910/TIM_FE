import React, { useState } from 'react';

export interface TabItem {
  id: string;
  label: string;
  icon?: React.ReactNode;
  content: React.ReactNode;
}

export interface TabsProps {
  tabs: TabItem[];
  defaultTab?: string;
  onChange?: (tabId: string) => void;
}

export default function Tabs({ tabs, defaultTab, onChange }: TabsProps) {
  const [activeTab, setActiveTab] = useState(defaultTab || tabs[0]?.id);

  const handleTabClick = (id: string) => {
    setActiveTab(id);
    onChange?.(id);
  };

  return (
    <div className="w-full">
      <div className="border-b border-slate-200">
        <nav className="-mb-px flex space-x-6 overflow-x-auto" aria-label="Tabs">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => handleTabClick(tab.id)}
                className={`
                  whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors flex items-center gap-2
                  ${
                    isActive
                      ? 'border-teal-500 text-teal-600'
                      : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                  }
                `}
                aria-current={isActive ? 'page' : undefined}
              >
                {tab.icon && (
                  <span className={isActive ? 'text-teal-500' : 'text-slate-400'}>
                    {tab.icon}
                  </span>
                )}
                {tab.label}
              </button>
            );
          })}
        </nav>
      </div>
      <div className="mt-6">
        {tabs.find((t) => t.id === activeTab)?.content}
      </div>
    </div>
  );
}
