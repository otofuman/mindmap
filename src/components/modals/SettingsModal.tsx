import React from 'react';
import { useMindMapStore } from '../../store/useMindMapStore';

interface SettingsModalProps {
  onClose: () => void;  
  onExportToMermaidFile: () => void;
  onExportToImage: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  onClose,
  onExportToMermaidFile,
  onExportToImage
}) => {
  const mapDocument = useMindMapStore((state) => state.document);

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6 relative">
        <h2 className="text-lg font-bold mb-4 text-gray-800">一般設定</h2>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">マップタイトル</label>
            <input
              type="text"
              value={mapDocument.meta.title}
              onChange={(e) => {
                useMindMapStore.getState().updateMeta({ title: e.target.value });
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* 🌟 追加：背景グリッドの表示切替設定 */}
          <div className="flex items-center justify-between pt-2">
            <div>
              <label className="text-sm font-medium text-gray-700">背景に正方形グリッドを表示</label>
              <p className="text-xs text-gray-400">キャンバスの背景ドット/グリッドの表示を切り替えます</p>
            </div>
            <input
              type="checkbox"
              checked={mapDocument.meta.showGrid ?? true}
              onChange={(e) => {
                useMindMapStore.getState().updateMeta({ showGrid: e.target.checked });
              }}
              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 cursor-pointer"
            />
          </div>

          <label className="block text-sm font-medium text-gray-700 mb-1">出力</label>
          <button
            onClick={onExportToMermaidFile}
            className="w-60 text-left px-2.5 py-1.5 text-xs font-medium text-gray-700 hover:text-blue-700 rounded-lg border border-gray-300 transition"
          >
            Mermaid形式で出力
          </button>

          <button
            onClick={onExportToImage}
            className="w-60 text-left px-2.5 py-1.5 text-xs font-medium text-gray-700 hover:text-blue-700 rounded-lg border border-gray-300 transition"
          >
            画像形式で出力
          </button>
        </div>

        <div className="mt-6 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition"
          >
            閉じる
          </button>
        </div>
      </div>
    </div>
  );
};