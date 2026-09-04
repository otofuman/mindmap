import React, { useState } from 'react';
import { useMindMapStore } from '../../store/useMindMapStore';

interface StyleNodeModalProps {
  nodeIds: string[];
  onClose: () => void;
}

const PRESET_COLORS = [
  { bg: '#ffffff', text: '#1f2937', label: 'デフォルト' },
  { bg: '#fee2e2', text: '#991b1b', label: 'レッド' },
  { bg: '#fed7aa', text: '#9a3412', label: 'オレンジ' },
  { bg: '#fef08a', text: '#854d0e', label: 'イエロー' },
  { bg: '#d9f99d', text: '#3f6212', label: 'グリーン' },
  { bg: '#bae6fd', text: '#0369a1', label: 'ブルー' },
  { bg: '#e9d5ff', text: '#6b21a8', label: 'パープル' },
  { bg: '#f3f4f6', text: '#374151', label: 'グレー' },
  { bg: '#1f2937', text: '#ffffff', label: 'ダーク' },
];

export const StyleNodeModal: React.FC<StyleNodeModalProps> = ({ nodeIds, onClose }) => {
  const mapDocument = useMindMapStore((state) => state.document);
  const updateMultipleTopicDisplays = useMindMapStore((state) => (state as any).updateMultipleTopicDisplays);

  // 最初に選択されているノードの現在のスタイルを初期値にする
  const firstDisplay = mapDocument.topicDisplays.find((d) => d.topicId === nodeIds[0]);

  const [bgColor, setBgColor] = useState(firstDisplay?.backgroundColor || '#ffffff');
  const [textColor, setTextColor] = useState(firstDisplay?.textColor || '#1f2937');

  const handleSave = () => {
    updateMultipleTopicDisplays(nodeIds, {
      backgroundColor: bgColor,
      textColor: textColor,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl p-5 w-[320px] flex flex-col gap-4 animate-in fade-in zoom-in-95 duration-150">
        <div className="flex justify-between items-center border-b pb-2">
          <h3 className="text-sm font-bold text-gray-800">
            スタイル変更 ({nodeIds.length}件を選択中)
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 font-bold px-1">
            ✕
          </button>
        </div>

        {/* プリセット選択 */}
        <div className="flex flex-col gap-1.5">
          <span className="text-xs text-gray-500 font-medium">カラープリセット</span>
          <div className="grid grid-cols-3 gap-2">
            {PRESET_COLORS.map((preset, idx) => (
              <button
                key={idx}
                onClick={() => {
                  setBgColor(preset.bg);
                  setTextColor(preset.text);
                }}
                style={{ backgroundColor: preset.bg, color: preset.text }}
                className="text-[11px] font-semibold py-1.5 px-2 rounded-lg border border-gray-300 shadow-sm hover:scale-105 transition"
              >
                {preset.label}
              </button>
            ))}
          </div>
        </div>

        {/* カスタムカラーピッカー */}
        <div className="flex flex-col gap-3 pt-2 border-t">
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-600 font-medium">背景色</span>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={bgColor}
                onChange={(e) => setBgColor(e.target.value)}
                className="w-8 h-8 rounded cursor-pointer border border-gray-200 p-0"
              />
              <span className="text-xs text-gray-400 font-mono">{bgColor}</span>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-600 font-medium">文字色</span>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={textColor}
                onChange={(e) => setTextColor(e.target.value)}
                className="w-8 h-8 rounded cursor-pointer border border-gray-200 p-0"
              />
              <span className="text-xs text-gray-400 font-mono">{textColor}</span>
            </div>
          </div>
        </div>

        {/* プレビュー */}
        <div className="flex flex-col gap-1 pt-1">
          <span className="text-[10px] text-gray-400">プレビュー</span>
          <div
            style={{ backgroundColor: bgColor, color: textColor }}
            className="py-2 px-4 rounded-xl text-center text-xs font-medium border border-gray-200 shadow-sm"
          >
            選択中のノードが一括変更されます
          </div>
        </div>

        {/* ボタン */}
        <div className="flex justify-end gap-2 pt-2 border-t">
          <button
            onClick={onClose}
            className="px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-100 rounded-lg transition"
          >
            キャンセル
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-1.5 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm transition"
          >
            一括変更する
          </button>
        </div>
      </div>
    </div>
  );
};