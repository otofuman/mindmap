import React from 'react';
import { useMindMapStore } from '../../store/useMindMapStore';

export const Sidebar: React.FC = () => {
  const document = useMindMapStore((state) => state.document);
  const selectedNodeId = useMindMapStore((state) => state.selectedNodeId);
  const updateTopic = useMindMapStore((state) => state.updateTopic);
  const updateTopicDisplay = useMindMapStore((state) => state.updateTopicDisplay);
  const deleteTopic = useMindMapStore((state) => state.deleteTopic);

  const selectedTopic = document.topics.find((t) => t.id === selectedNodeId);
  const selectedDisplay = document.topicDisplays.find((d) => d.topicId === selectedNodeId);

  if (!selectedTopic || !selectedDisplay) {
    return (
      <div className="w-80 h-full bg-gray-50 border-l border-gray-200 p-4 text-xs text-gray-400 flex flex-col justify-center items-center text-center">
        <span>ノードを選択すると<br />詳細属性を編集できます</span>
      </div>
    );
  }

  return (
    <div className="w-80 h-full bg-white border-l border-gray-200 p-4 flex flex-col gap-4 text-xs overflow-y-auto">
      <div className="flex justify-between items-center border-b pb-2">
        <h3 className="font-bold text-gray-800 text-sm">ノード属性編集</h3>
        <button
          onClick={() => deleteTopic(selectedTopic.id)}
          className="text-red-600 hover:text-red-800 font-semibold"
        >
          削除
        </button>
      </div>

      {/* ID (読み取り専用) */}
      <div className="flex flex-col gap-1">
        <label className="text-gray-500 font-medium">Topic ID</label>
        <span className="font-mono text-gray-600 bg-gray-100 p-1.5 rounded">{selectedTopic.id}</span>
      </div>

      {/* タイトル */}
      <div className="flex flex-col gap-1">
        <label className="text-gray-700 font-semibold">タイトル</label>
        <input
          type="text"
          value={selectedTopic.title}
          onChange={(e) => updateTopic(selectedTopic.id, { title: e.target.value })}
          className="border border-gray-300 rounded p-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
      </div>

      {/* 詳細メモ */}
      <div className="flex flex-col gap-1">
        <label className="text-gray-700 font-semibold">詳細メモ</label>
        <textarea
          rows={4}
          value={selectedTopic.detailMemo || ''}
          onChange={(e) => updateTopic(selectedTopic.id, { detailMemo: e.target.value })}
          placeholder="トピックの詳細説明を入力..."
          className="border border-gray-300 rounded p-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none"
        />
      </div>

      {/* カラー設定 */}
      <div className="flex flex-col gap-2 pt-2 border-t">
        <span className="font-semibold text-gray-700">スタイル設定</span>
        
        <div className="flex justify-between items-center">
          <label className="text-gray-600">背景色</label>
          <input
            type="color"
            value={selectedDisplay.backgroundColor || '#ffffff'}
            onChange={(e) => updateTopicDisplay(selectedTopic.id, { backgroundColor: e.target.value })}
            className="w-8 h-8 rounded border border-gray-300 cursor-pointer"
          />
        </div>

        <div className="flex justify-between items-center">
          <label className="text-gray-600">文字色</label>
          <input
            type="color"
            value={selectedDisplay.textColor || '#333333'}
            onChange={(e) => updateTopicDisplay(selectedTopic.id, { textColor: e.target.value })}
            className="w-8 h-8 rounded border border-gray-300 cursor-pointer"
          />
        </div>
      </div>
    </div>
  );
};