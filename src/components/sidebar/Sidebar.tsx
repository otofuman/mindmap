import React from 'react';
import { useMindMapStore } from '../../store/useMindMapStore';
import { SidebarStyleSection } from './SidebarStyleSection';

export const Sidebar: React.FC = () => {
  const document = useMindMapStore((state) => state.document);
  const selectedNodeId = useMindMapStore((state) => state.selectedNodeId);
  const updateTopic = useMindMapStore((state) => state.updateTopic);
  const updateTopicDisplay = useMindMapStore((state) => state.updateTopicDisplay);
  const deleteTopic = useMindMapStore((state) => (state as any).deleteTopic);

  const selectedTopic = document.topics.find((t) => t.id === selectedNodeId);
  const selectedDisplay = document.topicDisplays.find((d) => d.topicId === selectedNodeId);

  if (!selectedTopic || !selectedDisplay) {
    return (
      <div className="w-80 h-full bg-gray-50/80 backdrop-blur border-l border-gray-200 p-6 text-xs text-gray-400 flex flex-col justify-center items-center text-center">
        <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center text-lg mb-3 text-gray-400">
          💡
        </div>
        <span className="font-medium text-gray-500">ノードを選択すると<br />詳細属性を編集できます</span>
      </div>
    );
  }

  const handleDeleteClick = () => {
    if (window.confirm('選択したノードを削除してもよろしいですか？')) {
      deleteTopic(selectedTopic.id);
    }
  };

  return (
    <div className="w-80 h-full bg-white border-l border-gray-200 p-5 flex flex-col gap-5 text-xs overflow-y-auto shadow-sm">
      <div className="flex justify-between items-center border-b border-gray-100 pb-3">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-blue-600"></span>
          <h3 className="font-bold text-gray-800 text-sm tracking-wide">ノード詳細編集</h3>
        </div>
        <button
          onClick={handleDeleteClick}
          className="text-red-500 hover:text-red-700 font-semibold px-2.5 py-1 rounded-lg hover:bg-red-50 transition"
        >
          削除
        </button>
      </div>

      {/* タイトル */}
      <div className="flex flex-col gap-1.5">
        <label className="font-bold text-gray-700 flex items-center gap-1">
          <span>📝</span>
          <span>タイトル</span>
        </label>
        <input
          type="text"
          value={selectedTopic.title}
          onChange={(e) => updateTopic(selectedTopic.id, { title: e.target.value })}
          className="border border-gray-200 bg-gray-50/50 rounded-xl p-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition text-gray-800 font-medium"
        />
      </div>

      {/* 詳細メモ */}
      <div className="flex flex-col gap-1.5">
        <label className="font-bold text-gray-700 flex items-center gap-1">
          <span>📋</span>
          <span>詳細メモ</span>
        </label>
        <textarea
          rows={5}
          value={selectedTopic.detailMemo || ''}
          onChange={(e) => updateTopic(selectedTopic.id, { detailMemo: e.target.value })}
          placeholder="トピックの詳細説明を入力..."
          className="border border-gray-200 bg-gray-50/50 rounded-xl p-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition text-gray-800 resize-none leading-relaxed"
        />
      </div>

      {/* スタイル設定セクション（分割ファイル） */}
      <SidebarStyleSection
        backgroundColor={selectedDisplay.backgroundColor}
        textColor={selectedDisplay.textColor}
        onColorChange={(bgColor, textColor) => {
          updateTopicDisplay(selectedTopic.id, {
            backgroundColor: bgColor,
            textColor: textColor,
          });
        }}
      />
    </div>
  );
};