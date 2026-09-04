import React, { useState } from 'react';
import { useMindMapStore } from '../../store/useMindMapStore';
import type { CustomListMaster, ListItem } from '../../types/mindmap';

interface CustomListSettingsModalProps {
  onClose: () => void;
}

export const CustomListSettingsModal: React.FC<CustomListSettingsModalProps> = ({ onClose }) => {
  const customLists = useMindMapStore((state) => state.document.customLists || []);
  const addCustomList = useMindMapStore((state) => state.addCustomList);
  const updateCustomList = useMindMapStore((state) => state.updateCustomList);
  const deleteCustomList = useMindMapStore((state) => state.deleteCustomList);

  // 選択中のカスタムリストID
  const [selectedListId, setSelectedListId] = useState<string | null>(
    customLists.length > 0 ? customLists[0].id : null
  );

  // 新規リスト作成用フォームの状態
  const [newListName, setNewListName] = useState('');

  // 現在選択されているリスト
  const currentList = customLists.find((l) => l.id === selectedListId) as CustomListMaster | undefined;

  // 新規リストの追加ハンドラー
  const handleCreateList = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newListName.trim()) return;

    // デフォルトで空のアイテムを一つ持たせるか、空で作成
    addCustomList(newListName.trim(), [
      { id: `item_${Date.now()}_1`, label: '選択肢1', color: '#3b82f6' }
    ]);
    setNewListName('');
  };

  // アイテム追加
  const handleAddItem = () => {
    if (!currentList) return;
    const newItem: ListItem = {
      id: `item_${Date.now()}`,
      label: `新しい項目`,
      color: '#64748b',
    };
    const updatedItems = [...(currentList.items as ListItem[]), newItem];
    updateCustomList(currentList.id, { items: updatedItems });
  };

  // アイテム更新
  const handleUpdateItem = (itemId: string, updates: Partial<ListItem>) => {
    if (!currentList) return;
    const updatedItems = (currentList.items as ListItem[]).map((item) =>
      item.id === itemId ? { ...item, ...updates } : item
    );
    updateCustomList(currentList.id, { items: updatedItems });
  };

  // アイテム削除
  const handleDeleteItem = (itemId: string) => {
    if (!currentList) return;
    const updatedItems = (currentList.items as ListItem[]).filter((item) => item.id !== itemId);
    updateCustomList(currentList.id, { items: updatedItems });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-[800px] h-[600px] flex flex-col overflow-hidden border border-gray-100">
        
        {/* ヘッダー */}
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between bg-gray-50">
          <h2 className="text-lg font-bold text-gray-800">カスタムリスト管理（選択肢マスター）</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-xl font-bold w-8 h-8 rounded-full flex items-center justify-center hover:bg-gray-200 transition"
          >
            ✕
          </button>
        </div>

        {/* メインコンテンツ（2カラムレイアウト） */}
        <div className="flex-1 flex overflow-hidden">
          
          {/* 左ペイン：リスト一覧 */}
          <div className="w-1/3 border-r border-gray-200 flex flex-col bg-gray-50/50">
            <div className="p-4 border-b border-gray-200">
              <form onSubmit={handleCreateList} className="flex gap-2">
                <input
                  type="text"
                  placeholder="新しいリスト名..."
                  value={newListName}
                  onChange={(e) => setNewListName(e.target.value)}
                  className="flex-1 px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  type="submit"
                  className="px-3 py-1.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition"
                >
                  追加
                </button>
              </form>
            </div>

            <div className="flex-1 overflow-y-auto p-2 space-y-1">
              {customLists.map((list) => (
                <div
                  key={list.id}
                  onClick={() => setSelectedListId(list.id)}
                  className={`w-full text-left px-3 py-2.5 rounded-xl text-sm font-medium flex items-center justify-between cursor-pointer transition ${
                    selectedListId === list.id
                      ? 'bg-blue-50 text-blue-700 shadow-sm'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  <span className="truncate">{list.name}</span>
                  <span className="text-xs bg-gray-200 text-gray-600 px-2 py-0.5 rounded-full">
                    {list.items.length}件
                  </span>
                </div>
              ))}
              {customLists.length === 0 && (
                <div className="text-center py-8 text-xs text-gray-400">
                  カスタムリストがありません
                </div>
              )}
            </div>
          </div>

          {/* 右ペイン：選択中リストのアイテム編集 */}
          <div className="flex-1 flex flex-col bg-white overflow-hidden">
            {currentList ? (
              <>
                <div className="p-4 border-b border-gray-200 flex items-center justify-between bg-white">
                  <div className="flex items-center gap-3 flex-1">
                    <input
                      type="text"
                      value={currentList.name}
                      onChange={(e) => updateCustomList(currentList.id, { name: e.target.value })}
                      className="text-base font-bold text-gray-800 border-b border-transparent hover:border-gray-300 focus:border-blue-500 focus:outline-none px-1 py-0.5"
                    />
                  </div>
                  <button
                    onClick={() => {
                      if (window.confirm(`「${currentList.name}」を削除しますか？`)) {
                        deleteCustomList(currentList.id);
                        setSelectedListId(null);
                      }
                    }}
                    className="text-xs text-red-600 hover:bg-red-50 px-3 py-1.5 rounded-lg border border-red-200 transition"
                  >
                    リストを削除
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto p-6 space-y-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">選択肢アイテム一覧</span>
                    <button
                      onClick={handleAddItem}
                      className="text-xs bg-gray-100 hover:bg-blue-50 text-blue-600 font-medium px-3 py-1.5 rounded-lg border border-gray-200 transition"
                    >
                      ＋ 項目を追加
                    </button>
                  </div>

                  {(currentList.items as ListItem[]).map((item) => (
                    <div key={item.id} className="flex items-center gap-3 bg-gray-50 p-2.5 rounded-xl border border-gray-200">
                      <input
                        type="color"
                        value={item.color || '#64748b'}
                        onChange={(e) => handleUpdateItem(item.id, { color: e.target.value })}
                        className="w-8 h-8 rounded border border-gray-300 cursor-pointer p-0 bg-transparent"
                        title="カラー選択"
                      />
                      <input
                        type="text"
                        value={item.label}
                        onChange={(e) => handleUpdateItem(item.id, { label: e.target.value })}
                        className="flex-1 px-3 py-1 bg-white border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="項目のラベル..."
                      />
                      <button
                        onClick={() => handleDeleteItem(item.id)}
                        className="text-gray-400 hover:text-red-600 p-1.5 rounded-lg hover:bg-red-50 transition"
                        title="削除"
                      >
                        🗑️
                      </button>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center text-gray-400 text-sm">
                左側のリストを選択、または新しく作成してください
              </div>
            )}
          </div>

        </div>

        {/* フッター */}
        <div className="px-6 py-3 border-t border-gray-200 bg-gray-50 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 bg-gray-800 text-white text-sm font-medium rounded-xl hover:bg-gray-900 transition shadow-sm"
          >
            閉じる
          </button>
        </div>

      </div>
    </div>
  );
};