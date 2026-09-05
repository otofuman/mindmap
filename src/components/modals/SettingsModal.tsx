import React from 'react';
import { useMindMapStore } from '../../store/useMindMapStore';

interface SettingsModalProps {
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ onClose }) => {
  const mapDocument = useMindMapStore((state) => state.document);
  // 必要に応じてメタ情報や全体設定を更新するストアのアクションを呼ぶ

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
          {/* その他の一般設定項目をここに追加 */}
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