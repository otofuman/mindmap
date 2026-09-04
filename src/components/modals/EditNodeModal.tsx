import React from 'react';
import { useMindMapStore } from '../../store/useMindMapStore';

interface EditNodeModalProps {
  nodeId: string;
  onClose: () => void;
}

export const EditNodeModal: React.FC<EditNodeModalProps> = ({ nodeId, onClose }) => {
  const document = useMindMapStore((state) => state.document);
  const updateTopic = useMindMapStore((state) => state.updateTopic);

  const topic = document.topics.find((t) => t.id === nodeId);
  if (!topic) return null;

  return (
    <div className="fixed inset-0 z-[200] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 pointer-events-auto">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 flex flex-col gap-4 animate-fadeIn">
        <div className="flex justify-between items-center border-b border-gray-100 pb-3">
          <h3 className="font-bold text-gray-800 text-sm flex items-center gap-2">
            <span>📝</span>
            <span>ノード詳細編集</span>
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 font-bold px-2 py-1"
          >
            ✕
          </button>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-bold text-gray-700">タイトル</label>
          <input
            type="text"
            value={topic.title}
            onChange={(e) => updateTopic(topic.id, { title: e.target.value })}
            className="border border-gray-200 bg-gray-50 rounded-xl p-2.5 text-xs text-gray-800 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-bold text-gray-700">詳細メモ</label>
          <textarea
            rows={4}
            value={topic.detailMemo || ''}
            onChange={(e) => updateTopic(topic.id, { detailMemo: e.target.value })}
            placeholder="トピックの詳細説明を入力..."
            className="border border-gray-200 bg-gray-50 rounded-xl p-2.5 text-xs text-gray-800 resize-none leading-relaxed focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          />
        </div>

        <div className="flex justify-end pt-2">
          <button
            onClick={onClose}
            className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold px-4 py-2 rounded-xl transition shadow-sm"
          >
            完了
          </button>
        </div>
      </div>
    </div>
  );
};