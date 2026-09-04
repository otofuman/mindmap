import React from 'react';

interface SidebarStyleSectionProps {
  backgroundColor?: string;
  textColor?: string;
  onColorChange: (bgColor: string, textColor: string) => void;
}

export const SidebarStyleSection: React.FC<SidebarStyleSectionProps> = ({
  backgroundColor = '#ffffff',
  textColor = '#333333',
  onColorChange,
}) => {
  return (
    <div className="flex flex-col gap-3 pt-4 border-t border-gray-100">
      <div className="text-xs font-bold text-gray-700 uppercase tracking-wider flex items-center gap-1.5">
        <span>🎨</span>
        <span>スタイル設定</span>
      </div>
      
      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1.5 bg-gray-50 p-2.5 rounded-xl border border-gray-100">
          <label className="text-[11px] font-medium text-gray-600">背景色</label>
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={backgroundColor}
              onChange={(e) => onColorChange(e.target.value, textColor)}
              className="w-7 h-7 rounded-lg border border-gray-200 cursor-pointer bg-transparent"
            />
            <span className="text-[10px] font-mono text-gray-500 uppercase">{backgroundColor}</span>
          </div>
        </div>

        <div className="flex flex-col gap-1.5 bg-gray-50 p-2.5 rounded-xl border border-gray-100">
          <label className="text-[11px] font-medium text-gray-600">文字色</label>
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={textColor}
              onChange={(e) => onColorChange(backgroundColor, e.target.value)}
              className="w-7 h-7 rounded-lg border border-gray-200 cursor-pointer bg-transparent"
            />
            <span className="text-[10px] font-mono text-gray-500 uppercase">{textColor}</span>
          </div>
        </div>
      </div>
    </div>
  );
};