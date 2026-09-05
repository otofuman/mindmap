import React from 'react';
import { useMindMapStore } from '../../store/useMindMapStore';

interface NodeMenuProps {
  target: { id: string; x: number; y: number };
  onAddChild: (id: string) => void;
  onClose: () => void;
  onEdit: (id: string) => void;
  onConnect: (id: string) => void;
  onStyle: (id: string) => void;
  onDelete: (id: string) => void;
}

export const NodeMenu: React.FC<NodeMenuProps> = ({
  target,
  onAddChild,
  onClose,
  onEdit,
  onConnect,
  onStyle,
  onDelete,
}) => {
  // ストアからカスタム列マスターとトピックデータ、更新用アクションを取得
  const customLists = useMindMapStore((state) => state.document.customLists || []);
  const topics = useMindMapStore((state) => state.document.topics || []);
  const updateTopic = useMindMapStore((state) => state.updateTopic);
  const saveStyleToItem = useMindMapStore((state) => state.saveCurrentNodeStyleToItem);

  // 該当するノードを取得
  const currentTopic = topics.find((t) => t.id === target.id);
  const customValues = currentTopic?.customValues || {};

  // カスタム列の値を更新するハンドラー
  const handleCustomValueChanged = (listId: string, value: any) => {
    const newValues = { ...customValues, [listId]: value };
    updateTopic(target.id, { customValues: newValues });
  };

  return (
    <div
      style={{ top: target.y, left: target.x }}
      className="absolute z-[100] bg-white border border-gray-200 shadow-xl rounded-xl p-1 flex flex-col gap-0.5 min-w-[200px] pointer-events-auto"
    >
      <div className="flex justify-between items-center text-[10px] text-gray-400 px-2.5 py-1 font-medium border-b border-gray-100">
        <span>メニュー</span>
        <button onClick={onClose} className="hover:text-gray-600 font-bold px-1">
          ✕
        </button>
      </div>
      
      <button
        onClick={() => {
          onEdit(target.id);
          onClose();
        }}
        className="w-full text-left px-2.5 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition"
      >
        ⚙ 詳細編集
      </button>

      <button
        onClick={() => {
          onStyle(target.id);
          onClose();
        }}
        className="w-full text-left px-2.5 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition"
      >
        🎨 スタイルの変更
      </button>

      {/* 🌟 カスタム列の値の一覧表示・選択セクション */}
      {customLists.length > 0 && (
        <div className="my-1 border-t border-b border-gray-100 py-1 space-y-1">
          <div className="text-[10px] font-bold text-gray-400 px-2.5 uppercase tracking-wider">カスタム列</div>
          {customLists.map((list) => {
            const currentValue = customValues[list.id];

            return (
              <div key={list.id} className="px-2.5 py-1 flex flex-col gap-1">
                <div className="text-[11px] font-medium text-gray-600 truncate">{list.name}</div>
                
                {/* 1. リスト / 人 の場合：セレクトボックス ＋ 書式保存ボタン */}
                {(list.type === 'list' || list.type === 'person') && (
                  <div className="flex items-center gap-1.5">
                    <select
                      value={currentValue || ''}
                      onChange={(e) => handleCustomValueChanged(list.id, e.target.value || null)}
                      className="w-full bg-gray-50 border border-gray-200 rounded px-2 py-1 text-xs text-gray-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    >
                      <option value="">(未設定)</option>
                      {(list.items || []).map((item: any) => (
                        <option key={item.id} value={item.id}>
                          {item.label}
                        </option>
                      ))}
                    </select>

                    {/* 小さいボタン：現在のノード書式を選択中のアイテムに記憶 */}
                    <button
                      type="button"
                      disabled={!currentValue}
                      onClick={() => {
                        if (currentValue) {
                          saveStyleToItem(target.id, list.id, currentValue);
                        }
                      }}
                      className={`p-1.5 text-xs rounded border transition flex items-center justify-center ${
                        currentValue
                          ? 'bg-white border-gray-200 hover:bg-blue-50 text-blue-600 cursor-pointer shadow-2xs'
                          : 'bg-gray-50 border-gray-100 text-gray-300 cursor-not-allowed'
                      }`}
                      title={currentValue ? "現在のノードの書式をこのアイテムに記憶する" : "アイテムを選択すると書式を記憶できます"}
                    >
                      🎨
                    </button>
                  </div>
                )}

                {/* 2. マイルストーンの場合：セレクトボックス ＋ 書式保存ボタン */}
                {list.type === 'milestone' && (
                  <div className="flex items-center gap-1.5">
                    <select
                      value={currentValue || ''}
                      onChange={(e) => handleCustomValueChanged(list.id, e.target.value || null)}
                      className="w-full bg-gray-50 border border-gray-200 rounded px-2 py-1 text-xs text-gray-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    >
                      <option value="">(未設定)</option>
                      {(list.items || []).map((ms: any) => (
                        <option key={ms.id} value={ms.id}>
                          {ms.label}
                        </option>
                      ))}
                    </select>

                    <button
                      type="button"
                      disabled={!currentValue}
                      onClick={() => {
                        if (currentValue) {
                          saveStyleToItem(target.id, list.id, currentValue);
                        }
                      }}
                      className={`p-1.5 text-xs rounded border transition flex items-center justify-center ${
                        currentValue
                          ? 'bg-white border-gray-200 hover:bg-blue-50 text-blue-600 cursor-pointer shadow-2xs'
                          : 'bg-gray-50 border-gray-100 text-gray-300 cursor-not-allowed'
                      }`}
                      title={currentValue ? "現在のノードの書式をこのマイルストーンに記憶する" : "マイルストーンを選択すると書式を記憶できます"}
                    >
                      🎨
                    </button>
                  </div>
                )}

                {/* 3. テキストの場合：インプット入力 */}
                {list.type === 'text' && (
                  <input
                    type="text"
                    value={currentValue || ''}
                    onChange={(e) => handleCustomValueChanged(list.id, e.target.value)}
                    placeholder="値を入力..."
                    className="w-full bg-gray-50 border border-gray-200 rounded px-2 py-1 text-xs text-gray-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                )}

                {/* 4. 数値の場合：数値入力 */}
                {list.type === 'number' && (
                  <input
                    type="number"
                    value={currentValue ?? ''}
                    onChange={(e) => handleCustomValueChanged(list.id, e.target.value === '' ? null : Number(e.target.value))}
                    placeholder="数値を入力..."
                    className="w-full bg-gray-50 border border-gray-200 rounded px-2 py-1 text-xs text-gray-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                )}

                {/* 5. カレンダーの場合：日付入力 */}
                {list.type === 'calendar' && (
                  <input
                    type="date"
                    value={currentValue || ''}
                    onChange={(e) => handleCustomValueChanged(list.id, e.target.value || null)}
                    className="w-full bg-gray-50 border border-gray-200 rounded px-2 py-1 text-xs text-gray-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                )}
              </div>
            );
          })}
        </div>
      )}

      <button
        onClick={() => {
          onAddChild(target.id);
          onClose();
        }}
        className="w-full text-left px-2.5 py-1.5 text-xs font-medium text-white bg-gray-600 hover:bg-gray-700 rounded-lg transition flex items-center gap-1.5"
      >
        子を追加
      </button>

      <button
        onClick={() => {
          onConnect(target.id);
          onClose();
        }}
        className="w-full text-left px-2.5 py-1.5 text-xs font-medium text-white bg-blue-900 hover:bg-blue-800 rounded-lg transition"
      >
        接続を追加
      </button>

      <button
        onClick={() => {
          if (window.confirm('選択したノードを削除してもよろしいですか？')) {
            onDelete(target.id);
            onClose();
          }
        }}
        className="w-full text-left px-2.5 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 rounded-lg transition border-t border-gray-100 mt-0.5 pt-1"
      >
        削除
      </button>
    </div>
  );
};