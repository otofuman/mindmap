import React from 'react';
import { useMindMapStore } from '../../store/useMindMapStore';

interface StyleNodeModalProps {
  nodeId: string;
  onClose: () => void;
}

export const StyleNodeModal: React.FC<StyleNodeModalProps> = ({ nodeId, onClose }) => {
  const document = useMindMapStore((state) => state.document);
  const updateTopicDisplay = useMindMapStore((state) => state.updateTopicDisplay);

  const display = document.topicDisplays.find((d) => d.topicId === nodeId);
  if (!display) return null;

  return (
    <div className="fixed inset-0 z-[200] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 pointer-events-auto">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xs p-6 flex flex-col gap-4 animate-fadeIn">
        <div className="flex justify-between items-center border-b border-gray-100 pb-3">
          <h3 className="font-bold text-gray-800 text-sm flex items-center gap-2">
            <span>🎨</span>
            <span>スタイル変更</span>
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 font-bold px-2 py-1"
          >
            ✕
          </button>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1.5 bg-gray-50 p-2.5 rounded-xl border border-gray-100">
            <label className="text-[11px] font-medium text-gray-600">背景色</label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={display.backgroundColor || '#ffffff'}
                onChange={(e) =>
                  updateTopicDisplay(nodeId, {
                    backgroundColor: e.target.value,
                    textColor: display.textColor,
                  })
                }
                className="w-7 h-7 rounded-lg border border-gray-200 cursor-pointer bg-transparent"
              />
              <span className="text-[10px] font-mono text-gray-500 uppercase">{display.backgroundColor}</span>
            </div>
          </div>

          <div className="flex flex-col gap-1.5 bg-gray-50 p-2.5 rounded-xl border border-gray-100">
            <label className="text-[11px] font-medium text-gray-600">文字色</label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={display.textColor || '#333333'}
                onChange={(e) =>
                  updateTopicDisplay(nodeId, {
                    backgroundColor: display.backgroundColor,
                    textColor: e.target.value,
                  })
                }
                className="w-7 h-7 rounded-lg border border-gray-200 cursor-pointer bg-transparent"
              />
              <span className="text-[10px] font-mono text-gray-500 uppercase">{display.textColor}</span>
            </div>
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <button
            onClick={onClose}
            className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold px-4 py-2 rounded-xl transition shadow-sm"
          >
            完了
          </button>
        </div>
      </div>
    </div>
  );
};