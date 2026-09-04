import React from 'react';
import { useMindMapStore } from '../../store/useMindMapStore';
import type { CustomListMaster, ListItem } from '../../types/mindmap';

interface EditNodeModalProps {
  nodeId: string;
  onClose: () => void;
}

export const EditNodeModal: React.FC<EditNodeModalProps> = ({ nodeId, onClose }) => {
  const document = useMindMapStore((state) => state.document);
  const updateTopic = useMindMapStore((state) => state.updateTopic);

  const topic = document.topics.find((t) => t.id === nodeId);
  const customLists = document.customLists || [];

  if (!topic) return null;

  // タイトルや詳細メモの更新
  const handleFieldChange = (field: string, value: any) => {
    updateTopic(nodeId, { [field]: value });
  };

  // カスタム値の更新（customValues）
  const handleCustomValueChanged = (listId: string, value: any) => {
    const newCustomValues = {
      ...(topic.customValues || {}),
      [listId]: value,
    };
    updateTopic(nodeId, { customValues: newCustomValues });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-[550px] max-h-[80vh] flex flex-col overflow-hidden border border-gray-100">
        
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between bg-gray-50">
          <h2 className="text-base font-bold text-gray-800">トピック詳細編集</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl font-bold w-8 h-8 rounded-full flex items-center justify-center hover:bg-gray-200 transition">✕</button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {/* 基本情報 */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-gray-600">タイトル</label>
            <input
              type="text"
              value={topic.title}
              onChange={(e) => handleFieldChange('title', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-gray-600">詳細メモ</label>
            <textarea
              value={topic.detailMemo || ''}
              onChange={(e) => handleFieldChange('detailMemo', e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>

          <hr className="border-gray-200 my-2" />

          {/* カスタムリスト・動的列の入力欄 */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider">カスタム属性</h3>
            
            {customLists.map((list: CustomListMaster) => {
              const currentValue = topic.customValues?.[list.id] || '';

              return (
                <div key={list.id} className="space-y-1">
                  <label className="text-xs font-semibold text-gray-700 flex items-center justify-between">
                    <span>{list.name}</span>
                    <span className="text-[10px] text-gray-400 bg-gray-100 px-2 py-0.5 rounded">[{list.type}]</span>
                  </label>

                  {/* リスト / 人 の場合（セレクトボックス） */}
                  {(list.type === 'list' || list.type === 'person') && (
                    <select
                      value={currentValue}
                      onChange={(e) => handleCustomValueChanged(list.id, e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">未選択</option>
                      {(list.items as ListItem[]).map((item) => (
                        <option key={item.id} value={item.id}>{item.label}</option>
                      ))}
                    </select>
                  )}

                  {/* カレンダーの場合（日付ピッカー） */}
                  {list.type === 'calendar' && (
                    <input
                      type="date"
                      value={currentValue}
                      onChange={(e) => handleCustomValueChanged(list.id, e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  )}

                  {/* マイルストーンの場合 */}
                  {list.type === 'milestone' && (
                    <select
                      value={currentValue}
                      onChange={(e) => handleCustomValueChanged(list.id, e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">マイルストーンを選択</option>
                      {(list.items as any[]).map((item) => (
                        <option key={item.id} value={item.id}>{item.label}</option>
                      ))}
                    </select>
                  )}
                </div>
              );
            })}

            {customLists.length === 0 && (
              <div className="text-xs text-gray-400 text-center py-4">
                設定されたカスタムリストはありません。<br />ヘッダーの設定アイコンから追加してください。
              </div>
            )}
          </div>
        </div>

        <div className="px-6 py-3 border-t border-gray-200 bg-gray-50 flex justify-end">
          <button onClick={onClose} className="px-5 py-2 bg-gray-800 text-white text-sm font-medium rounded-xl hover:bg-gray-900 transition">完了</button>
        </div>

      </div>
    </div>
  );
};