import React, { useState } from 'react';
import { useMindMapStore } from '../../store/useMindMapStore';
import type { CustomListMaster, ColumnType, ListItem, MilestoneItem } from '../../types/mindmap';

interface CustomListSettingsModalProps {
  onClose: () => void;
}

export const CustomListSettingsModal: React.FC<CustomListSettingsModalProps> = ({ onClose }) => {
  const customLists = useMindMapStore((state) => state.document.customLists || []);
  const addCustomList = useMindMapStore((state) => state.addCustomList);
  const updateCustomList = useMindMapStore((state) => state.updateCustomList);
  const deleteCustomList = useMindMapStore((state) => state.deleteCustomList);

  const [selectedListId, setSelectedListId] = useState<string | null>(
    customLists.length > 0 ? customLists[0].id : null
  );

  const [newListName, setNewListName] = useState('');
  const [newListType, setNewListType] = useState<ColumnType>('list');

  const currentList = customLists.find((l) => l.id === selectedListId) as CustomListMaster | undefined;

  const handleCreateList = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newListName.trim()) return;

    let initialItems: any[] = [];
    if (newListType === 'list' || newListType === 'person') {
      initialItems = [{ id: `item_${Date.now()}_1`, label: '初期項目', color: '#3b82f6' }];
    } else if (newListType === 'milestone') {
      initialItems = [{ id: `ms_${Date.now()}_1`, label: 'ルートマイルストーン', parentId: null }];
    }

    addCustomList(newListName.trim(), newListType, initialItems);
    setNewListName('');
    setNewListType('list');
  };

  const handleMoveItem = (index: number, direction: 'up' | 'down', items: any[], updateFn: (newItems: any[]) => void) => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= items.length) return;

    const newItems = [...items];
    const temp = newItems[index];
    newItems[index] = newItems[targetIndex];
    newItems[targetIndex] = temp;

    updateFn(newItems);
  };

  const handleAddItem = () => {
    if (!currentList) return;
    const newItem: ListItem = {
      id: `item_${Date.now()}`,
      label: '新しい項目',
      color: '#64748b',
    };
    const updatedItems = [...(currentList.items as ListItem[]), newItem];
    updateCustomList(currentList.id, { items: updatedItems });
  };

  const handleUpdateItem = (itemId: string, updates: Partial<ListItem>) => {
    if (!currentList) return;
    const updatedItems = (currentList.items as ListItem[]).map((item) =>
      item.id === itemId ? { ...item, ...updates } : item
    );
    updateCustomList(currentList.id, { items: updatedItems });
  };

  const handleDeleteItem = (itemId: string) => {
    if (!currentList) return;
    const updatedItems = (currentList.items as ListItem[]).filter((item) => item.id !== itemId);
    updateCustomList(currentList.id, { items: updatedItems });
  };

  const handleAddMilestone = (parentId: string | null = null) => {
    if (!currentList) return;
    const newMs: MilestoneItem = {
      id: `ms_${Date.now()}`,
      label: '新しいマイルストーン',
      parentId: parentId,
    };
    const updatedItems = [...(currentList.items as MilestoneItem[]), newMs];
    updateCustomList(currentList.id, { items: updatedItems });
  };

  const handleUpdateMilestone = (msId: string, updates: Partial<MilestoneItem>) => {
    if (!currentList) return;
    const updatedItems = (currentList.items as MilestoneItem[]).map((item) =>
      item.id === msId ? { ...item, ...updates } : item
    );
    updateCustomList(currentList.id, { items: updatedItems });
  };

  const handleDeleteMilestone = (msId: string) => {
    if (!currentList) return;
    const items = currentList.items as MilestoneItem[];
    const getIdsToDelete = (targetId: string): string[] => {
      const children = items.filter((i) => i.parentId === targetId);
      return [targetId, ...children.flatMap((c) => getIdsToDelete(c.id))];
    };
    const idsToDelete = getIdsToDelete(msId);
    const updatedItems = items.filter((item) => !idsToDelete.includes(item.id));
    updateCustomList(currentList.id, { items: updatedItems });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-2 sm:p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl h-[90vh] sm:h-[650px] flex flex-col overflow-hidden border border-gray-100">
        
        {/* ヘッダー */}
        <div className="px-4 sm:px-6 py-3 sm:py-4 border-b border-gray-200 flex items-center justify-between bg-gray-50">
          <h2 className="text-base sm:text-lg font-bold text-gray-800">カスタム列・マスター管理</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl font-bold w-8 h-8 rounded-full flex items-center justify-center hover:bg-gray-200 transition">✕</button>
        </div>

        {/* メイン (レスポンシブ: モバイルでは縦積み、タブレット以上で左右分割) */}
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
          
          {/* 左ペイン：リスト一覧 */}
          <div className="w-full md:w-1/3 border-b md:border-b-0 md:border-r border-gray-200 flex flex-col bg-gray-50/50 max-h-[35%] md:max-h-none">
            <div className="p-3 sm:p-4 border-b border-gray-200 space-y-2">
              <form onSubmit={handleCreateList} className="space-y-2">
                <input
                  type="text"
                  placeholder="列・マスター名..."
                  value={newListName}
                  onChange={(e) => setNewListName(e.target.value)}
                  className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                />
                <div className="flex gap-2">
                  <select
                    value={newListType}
                    onChange={(e) => setNewListType(e.target.value as ColumnType)}
                    className="flex-1 px-2 py-1.5 text-xs border border-gray-300 rounded-lg bg-white"
                  >
                    <option value="list">リスト</option>
                    <option value="calendar">カレンダー</option>
                    <option value="person">人</option>
                    <option value="milestone">マイルストーン</option>
                    <option value="text">テキスト</option>
                    <option value="number">数値</option>
                  </select>
                  <button type="submit" className="px-3 sm:px-4 py-1.5 bg-blue-600 text-white text-xs font-medium rounded-lg hover:bg-blue-700 transition">追加</button>
                </div>
              </form>
            </div>

            <div className="flex-1 overflow-y-auto p-2 space-y-1">
              {customLists.map((list) => (
                <div
                  key={list.id}
                  onClick={() => setSelectedListId(list.id)}
                  className={`w-full text-left px-3 py-2 rounded-xl text-sm font-medium flex items-center justify-between cursor-pointer transition ${
                    selectedListId === list.id ? 'bg-blue-50 text-blue-700 shadow-sm' : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  <div className="truncate pr-2">
                    <div className="truncate">{list.name}</div>
                    <span className="text-[10px] text-gray-400 uppercase">[{list.type}]</span>
                  </div>
                  <span className="text-xs bg-gray-200 text-gray-600 px-2 py-0.5 rounded-full shrink-0">{list.items?.length || 0}件</span>
                </div>
              ))}
            </div>
          </div>

          {/* 右ペイン：詳細・アイテム編集 */}
          <div className="flex-1 flex flex-col bg-white overflow-hidden">
            {currentList ? (
              <>
                <div className="p-3 sm:p-4 border-b border-gray-200 flex items-center justify-between bg-white gap-2">
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <input
                      type="text"
                      value={currentList.name}
                      onChange={(e) => updateCustomList(currentList.id, { name: e.target.value })}
                      className="text-sm sm:text-base font-bold text-gray-800 border-b border-transparent hover:border-gray-300 focus:border-blue-500 focus:outline-none px-1 py-0.5 truncate w-full"
                    />
                    <span className="text-[10px] sm:text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium shrink-0">
                      {currentList.type}
                    </span>
                  </div>
                  <button
                    onClick={() => {
                      if (window.confirm(`「${currentList.name}」を削除しますか？`)) {
                        deleteCustomList(currentList.id);
                        setSelectedListId(null);
                      }
                    }}
                    className="text-xs text-red-600 hover:bg-red-50 px-2.5 py-1.5 rounded-lg border border-red-200 transition shrink-0"
                  >
                    削除
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-3">
                  {/* 1. カレンダー・テキスト・数値の場合 */}
                  {(currentList.type === 'calendar' || currentList.type === 'text' || currentList.type === 'number') && (
                    <div className="text-center py-12 sm:py-16 text-gray-400 text-sm space-y-2">
                      <div className="text-2xl">📅 / ✍️</div>
                      <p>このタイプ（{currentList.type}）に事前定義のマスター項目はありません。<br />トピック詳細画面から直接値を入力・指定できます。</p>
                    </div>
                  )}

                  {/* 2. リスト・人の場合 */}
                  {(currentList.type === 'list' || currentList.type === 'person') && (
                    <>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">選択肢マスター項目</span>
                        <button onClick={handleAddItem} className="text-xs bg-gray-100 hover:bg-blue-50 text-blue-600 font-medium px-3 py-1.5 rounded-lg border border-gray-200 transition">＋ 項目を追加</button>
                      </div>

                      {((currentList.items as ListItem[]) || []).map((item, index, array) => (
                        <div key={item.id} className="flex items-center gap-2 sm:gap-3 bg-gray-50 p-2 rounded-xl border border-gray-200">
                          <input
                            type="color"
                            value={item.color || '#64748b'}
                            onChange={(e) => handleUpdateItem(item.id, { color: e.target.value })}
                            className="w-7 h-7 sm:w-8 sm:h-8 rounded border border-gray-300 cursor-pointer p-0 bg-transparent shrink-0"
                          />
                          <input
                            type="text"
                            value={item.label}
                            onChange={(e) => handleUpdateItem(item.id, { label: e.target.value })}
                            className="flex-1 min-w-0 px-2.5 py-1 bg-white border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                          <div className="flex items-center gap-0.5 border border-gray-200 rounded-lg overflow-hidden bg-white shrink-0">
                            <button
                              onClick={() => handleMoveItem(index, 'up', array, (newItems) => updateCustomList(currentList.id, { items: newItems }))}
                              disabled={index === 0}
                              className="px-2 py-1 text-xs text-gray-600 hover:bg-gray-100 disabled:opacity-30 transition"
                            >
                              ▲
                            </button>
                            <button
                              onClick={() => handleMoveItem(index, 'down', array, (newItems) => updateCustomList(currentList.id, { items: newItems }))}
                              disabled={index === array.length - 1}
                              className="px-2 py-1 text-xs text-gray-600 hover:bg-gray-100 disabled:opacity-30 transition"
                            >
                              ▼
                            </button>
                          </div>
                          <button onClick={() => handleDeleteItem(item.id)} className="text-gray-400 hover:text-red-600 p-1.5 rounded-lg hover:bg-red-50 transition shrink-0">🗑️</button>
                        </div>
                      ))}
                    </>
                  )}

                  {/* 3. マイルストーンの場合：ツリー構造（階層・親子変更・並べ替え）の編集 */}
                  {currentList.type === 'milestone' && (
                    <>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">マイルストーンツリー構造</span>
                        <button onClick={() => handleAddMilestone(null)} className="text-xs bg-gray-100 hover:bg-blue-50 text-blue-600 font-medium px-3 py-1.5 rounded-lg border border-gray-200 transition">＋ ルート追加</button>
                      </div>

                      <div className="space-y-2">
                        {(() => {
                          const items = (currentList.items as MilestoneItem[]) || [];

                          // 階層順（ツリー順）に平坦化するヘルパー
                          const buildTreeList = (parentId: string | null = null, depth: number = 0): { item: MilestoneItem; depth: number }[] => {
                            const children = items.filter(i => (i.parentId || null) === parentId);
                            let result: { item: MilestoneItem; depth: number }[] = [];
                            for (const child of children) {
                              result.push({ item: child, depth });
                              result.push(...buildTreeList(child.id, depth + 1));
                            }
                            return result;
                          };

                          const orderedTree = buildTreeList(null, 0);

                          // 同一階層・同一親内での並べ替え処理
                          const handleMoveSibling = (targetId: string, direction: 'up' | 'down') => {
                            const targetItem = items.find(i => i.id === targetId);
                            if (!targetItem) return;

                            // 同じ親を持つ兄弟のリストを取得
                            const siblings = items.filter(i => (i.parentId || null) === (targetItem.parentId || null));
                            const siblingIndex = siblings.findIndex(i => i.id === targetId);
                            
                            const targetSiblingIndex = direction === 'up' ? siblingIndex - 1 : siblingIndex + 1;
                            if (targetSiblingIndex < 0 || targetSiblingIndex >= siblings.length) return;

                            const swapItem = siblings[targetSiblingIndex];

                            // 全体配列の中で、対象アイテムとスワップ対象アイテムのインデックスを入れ替える
                            const newItems = [...items];
                            const idxA = newItems.findIndex(i => i.id === targetItem.id);
                            const idxB = newItems.findIndex(i => i.id === swapItem.id);
                            
                            if (idxA !== -1 && idxB !== -1) {
                              const temp = newItems[idxA];
                              newItems[idxA] = newItems[idxB];
                              newItems[idxB] = temp;
                              updateCustomList(currentList.id, { items: newItems });
                            }
                          };

                          return orderedTree.map(({ item: ms, depth }, index, array) => {
                            const isRoot = depth === 0;
                            // 親変更の選択肢（自分自身や自分の子孫以外を選択できるようにする）
                            const possibleParents = items.filter(item => item.id !== ms.id);

                            // 兄弟要素内での上下移動ができるか判定
                            const siblings = items.filter(i => (i.parentId || null) === (ms.parentId || null));
                            const siblingIndex = siblings.findIndex(i => i.id === ms.id);
                            const canMoveUp = siblingIndex > 0;
                            const canMoveDown = siblingIndex < siblings.length - 1;

                            return (
                              <div 
                                key={ms.id} 
                                className={`flex flex-col sm:flex-row items-stretch sm:items-center gap-2 p-2.5 rounded-xl border transition ${
                                  isRoot ? 'bg-gray-50 border-gray-200' : 'bg-white border-solid border-blue-100 shadow-2xs'
                                }`}
                                style={{ marginLeft: `${Math.min(depth * 20, 60)}px` }}
                              >
                                <div className="flex items-center gap-2 flex-1 min-w-0">
                                  <span className="text-xs font-mono text-gray-400 shrink-0">
                                    {depth > 0 ? '└'.padStart(depth * 2, ' ') : '🏷️'}
                                  </span>
                                  <input
                                    type="text"
                                    value={ms.label}
                                    onChange={(e) => handleUpdateMilestone(ms.id, { label: e.target.value })}
                                    className="flex-1 min-w-0 px-2.5 py-1 bg-white border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
                                    placeholder="マイルストーン名..."
                                  />
                                </div>

                                <div className="flex items-center justify-between sm:justify-end gap-1.5 shrink-0">
                                  {/* 親を変更ボタン ＋ 一覧から選択するモーダル/セレクトの仕組み */}
                                  <div className="flex items-center gap-1 bg-gray-50 px-2 py-1 rounded-lg border border-gray-200">
                                    <span className="text-[10px] text-gray-500">親:</span>
                                    <select
                                      value={ms.parentId || ''}
                                      onChange={(e) => handleUpdateMilestone(ms.id, { parentId: e.target.value || null })}
                                      className="bg-transparent text-xs text-gray-700 focus:outline-none cursor-pointer max-w-[100px] truncate"
                                      title="親を変更"
                                    >
                                      <option value="">(ルート階層)</option>
                                      {possibleParents.map((p) => (
                                        <option key={p.id} value={p.id}>↳ {p.label}</option>
                                      ))}
                                    </select>
                                  </div>

                                  {/* 兄弟要素内での並べ替えボタン */}
                                  <div className="flex items-center gap-0.5 border border-gray-200 rounded-lg overflow-hidden bg-white">
                                    <button
                                      onClick={() => handleMoveSibling(ms.id, 'up')}
                                      disabled={!canMoveUp}
                                      className="px-2 py-1 text-xs text-gray-600 hover:bg-gray-100 disabled:opacity-30 transition"
                                      title="上に移動"
                                    >
                                      ▲
                                    </button>
                                    <button
                                      onClick={() => handleMoveSibling(ms.id, 'down')}
                                      disabled={!canMoveDown}
                                      className="px-2 py-1 text-xs text-gray-600 hover:bg-gray-100 disabled:opacity-30 transition"
                                      title="下に移動"
                                    >
                                      ▼
                                    </button>
                                  </div>

                                  <button
                                    onClick={() => handleAddMilestone(ms.id)}
                                    className="text-xs text-blue-600 hover:bg-blue-50 px-2 py-1 rounded border border-blue-200 transition"
                                    title="子要素を追加"
                                  >
                                    ＋子
                                  </button>

                                  <button onClick={() => handleDeleteMilestone(ms.id)} className="text-gray-400 hover:text-red-600 p-1.5 rounded-lg hover:bg-red-50 transition" title="削除">🗑️</button>
                                </div>
                              </div>
                            );
                          });
                        })()}
                      </div>
                    </>
                  )}
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center text-gray-400 text-sm p-4">左側のリストを選択してください</div>
            )}
          </div>
        </div>

        {/* フッター */}
        <div className="px-4 sm:px-6 py-3 border-t border-gray-200 bg-gray-50 flex justify-end">
          <button onClick={onClose} className="px-5 py-2 bg-gray-800 text-white text-sm font-medium rounded-xl hover:bg-gray-900 transition w-full sm:w-auto">閉じる</button>
        </div>

      </div>
    </div>
  );
};