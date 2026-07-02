import React, { type ReactNode } from "react";

interface PageLayoutProps {
  title: string;
  description?: string;
  children: ReactNode;
  icon?: ReactNode;
  headerGradient?: string;
  contentMaxWidth?: string;
}

const PageLayout: React.FC<PageLayoutProps> = ({
  title,
  description,
  children,
  icon,
  headerGradient = "from-blue-600 to-indigo-700",
}) => {
  return (
    <div className="min-h-screen bg-[#F8FAFC] p-6">
      {/* Header Background */}
      <div className={`w-full rounded-2xl bg-gradient-to-r ${headerGradient} p-8 shadow-sm relative overflow-hidden mb-8`}>
        {/* Decorative elements */}
        <div className="absolute top-0 right-0 -mt-16 -mr-16 w-64 h-64 rounded-full bg-white opacity-5 mix-blend-overlay"></div>
        <div className="absolute bottom-0 left-10 -mb-20 w-40 h-40 rounded-full bg-white opacity-5 mix-blend-overlay"></div>
        
        <div className="flex items-center gap-4 relative z-10">
          {icon && (
            <div className="p-3 bg-white/10 rounded-xl backdrop-blur-sm text-white shadow-lg border border-white/20">
              {icon}
            </div>
          )}
          <div>
            <h1 className="text-3xl font-bold text-white tracking-tight">
              {title}
            </h1>
            {description && (
              <p className="text-blue-100 mt-1 text-base font-medium max-w-2xl">
                {description}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="w-full relative z-20">
        {children}
      </div>
    </div>
  );
};

export default PageLayout;
