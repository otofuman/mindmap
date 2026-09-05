import { create } from 'zustand';
import type {
  Topic,
  Connection,
  TopicDisplay,
  ConnectionDisplay,
  MindMapDocument,
  ConnectionType,
  ColumnType,
  CustomListMaster
} from '../types/mindmap';
import { type NodeChange, type EdgeChange } from '@xyflow/react';
import { getLayoutedElements } from '../utils/layout';

import { autoLayoutTopics } from '../utils/layoutUtils';

interface MindMapState {
  document: MindMapDocument;
  selectedNodeIds: string[];

  past: MindMapDocument[];
  future: MindMapDocument[];
  
  markHistoryAsSaved: () => void;
  isDirty: boolean;

  // 🌟 ドラッグ状態保持用
  dragStartDocument: MindMapDocument | null;

  onNodesChange: (changes: NodeChange[]) => void;
  onEdgesChange: (changes: EdgeChange[]) => void;
  addTopic: (title: string, position: { x: number; y: number }, parentTopicId?: string, topicDisplay?: TopicDisplay) => string;
  connectTopics: (sourceId: string, targetId: string) => void;
  deleteTopic: (topicId: string) => void;
  applyAutoLayout: (direction?: 'LR' | 'TB') => void;

  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;

  loadDocument: (newDocument: MindMapDocument) => void;
  updateTopic: (topicId: string, updates: Partial<Topic>) => void;
  updateTopicDisplay: (topicId: string, updates: Partial<TopicDisplay>) => void;
  updateMultipleTopicDisplays: (topicIds: string[], updates: Partial<TopicDisplay>) => void;
  
  // 🌟 追加：一般設定（グリッド表示など）の更新用
  updateMeta: (updates: Partial<MindMapDocument['meta']>) => void;
  
  connectingSourceId: string | null;
  setConnectingSourceId: (id: string | null) => void;
  handleNodeTapForConnect: (targetNodeId: string) => void;

  updateConnectionType: (connectionId: string, type: ConnectionType) => void;
  deleteConnection: (connectionId: string) => void;
  setSelectedNodeIds: (ids: string[]) => void;
  clearSelection: () => void;

  // 🌟 変更：CustomListMaster にデフォルトスタイルを受け渡せるように拡張
  addCustomList: (name: string, type: ColumnType, items: any[], defaultItemStyle?: Record<string, any> | null) => void;
  updateCustomList: (listId: string, updates: Partial<CustomListMaster>) => void;
  deleteCustomList: (listId: string) => void;

  applyCustomListStylesToSelected: (listId: string) => void;
  saveCurrentNodeStyleToItem: (topicId: string, listId: string, itemId: string) => void;

  autoLayout: (mode: 'auto' | 'flow-top' | 'flow-left' | string) => void;
}

const generateId = () => `id_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

const initialDocument: MindMapDocument = {
  meta: {
    id: 'doc_1',
    title: '無題のマインドマップ',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    version: '1.0.0',
    savedAs: null,
    showGrid: true, // 🌟 一般設定：背景に正方形グリッドを表示するかどうか（初期値: 表示）
  },
  schema: {
    topicColumns: [],
    connectionColumns: [],
  },
  topics: [
    {
      id: 'topic_1',
      title: 'メインアイデア',
      detailMemo: '',
      customValues: {},
    },
  ],
  connections: [],
  topicDisplays: [
    {
      topicId: 'topic_1',
      shape: 'rounded_rectangle',
      position: { x: 250, y: 150 },
      size: 1,
      backgroundColor: '#ffffff',
      textColor: '#333333',
    },
  ],
  connectionDisplays: [],
  customLists: [],
  history: [],
};

const pushHistory = (state: MindMapState, newDocument: MindMapDocument) => {
  return {
    past: [...state.past, state.document],
    future: [],
    document: newDocument,
    canUndo: true,
    canRedo: false,
    isDirty: true
  };
};

export const useMindMapStore = create<MindMapState>((set, get) => ({
  document: initialDocument,
  selectedNodeIds: [],

  past: [],
  future: [],
  canUndo: false,
  canRedo: false,
  connectingSourceId: null,
  dragStartDocument: null,

  markHistoryAsSaved: () => {
    set({
      isDirty: false,
    });
  },
  isDirty: false,

  setConnectingSourceId: (id: string | null) => set({ connectingSourceId: id }),
  setSelectedNodeIds: (ids: string[]) => set({ selectedNodeIds: ids }),
  clearSelection: () => set({ selectedNodeIds: [], connectingSourceId: null }),

  handleNodeTapForConnect: (targetNodeId: string) => {
    const { connectingSourceId, connectTopics } = get();

    if (!connectingSourceId) {
      set({ connectingSourceId: targetNodeId });
    } else if (connectingSourceId === targetNodeId) {
      set({ connectingSourceId: null });
    } else {
      connectTopics(connectingSourceId, targetNodeId);
      set({ connectingSourceId: null });
    }
  },

  onNodesChange: (changes: NodeChange[]) => {
    const currentSelectedIds = [...get().selectedNodeIds];
    let idsChanged = false;
    let isDraggingNow = false;
    let isDragEndNow = false;

    changes.forEach((c) => {
      if (c.type === 'select') {
        idsChanged = true;
        if (c.selected) {
          if (!currentSelectedIds.includes(c.id)) {
            currentSelectedIds.push(c.id);
          }
        } else {
          const index = currentSelectedIds.indexOf(c.id);
          if (index > -1) {
            currentSelectedIds.splice(index, 1);
          }
        }
      } else if (c.type === 'remove') {
        get().deleteTopic(c.id);
        return;
      } else if (c.type === 'position') {
        if (c.dragging) {
          isDraggingNow = true;
        } else if (c.dragging === false) {
          isDragEndNow = true;
        }
      }
    });

    const removeChange = changes.find((c) => c.type === 'remove');
    if (removeChange && removeChange.type === 'remove') {
      return;
    }

    const positionChanges = changes.filter((c) => c.type === 'position');
    if (positionChanges.length > 0) {
      set((state) => {
        // 1. ドラッグが始まった瞬間（かつまだ dragStartDocument が保持されていない場合）
        let newDragStartDoc = state.dragStartDocument;
        if (isDraggingNow && !newDragStartDoc) {
          newDragStartDoc = state.document;
        }

        const newTopicDisplays = state.document.topicDisplays.map((display) => {
          const change = positionChanges.find((c) => c.id === display.topicId);
          if (change && change.type === 'position' && change.position) {
            return {
              ...display,
              position: change.position,
            };
          }
          return display;
        });

        const newDocument = {
          ...state.document,
          topicDisplays: newTopicDisplays,
        };

        // 2. ドラッグが終了した瞬間（dragging: false を検知）
        if (isDragEndNow && newDragStartDoc) {
          const hasChanged = JSON.stringify(newDragStartDoc) !== JSON.stringify(newDocument);
          if (hasChanged) {
            return {
              document: newDocument,
              past: [...state.past, newDragStartDoc],
              future: [],
              canUndo: true,
              canRedo: false,
              isDirty: true,
              dragStartDocument: null,
              selectedNodeIds: idsChanged ? currentSelectedIds : state.selectedNodeIds,
            };
          } else {
            return {
              document: newDocument,
              dragStartDocument: null,
              selectedNodeIds: idsChanged ? currentSelectedIds : state.selectedNodeIds,
            };
          }
        }

        // 3. ドラッグ中は履歴を積まず、プレビュー位置のみ更新
        return {
          document: newDocument,
          dragStartDocument: newDragStartDoc,
          selectedNodeIds: idsChanged ? currentSelectedIds : state.selectedNodeIds,
        };
      });
    } else if (idsChanged) {
      set({ selectedNodeIds: currentSelectedIds });
    }
  },

  onEdgesChange: (changes: EdgeChange[]) => {
    const removeChange = changes.find((c) => c.type === 'remove');
    if (removeChange && removeChange.type === 'remove') {
      set((state) => {
        const newDocument = {
          ...state.document,
          connections: state.document.connections.filter((c) => c.id !== removeChange.id),
        };
        return pushHistory(state, newDocument);
      });
    }
  },

  addTopic: (title: string, position: { x: number; y: number }, parentTopicId?: string, topicDisplay?: TopicDisplay) => {
    const newTopicId = generateId();
    const newConnectionId = generateId();

    const newTopic: Topic = {
      id: newTopicId,
      title,
      detailMemo: '',
      customValues: {},
    };

    let newTopicDisplay: TopicDisplay = {
      topicId: newTopicId,
      shape: 'rounded_rectangle',
      position,
      size: 1,
      backgroundColor: '#ffffff',
      textColor: '#333333',
    };
    
    if (topicDisplay) {
      newTopicDisplay.shape = topicDisplay.shape;
      newTopicDisplay.size = topicDisplay.size;
      newTopicDisplay.backgroundColor = topicDisplay.backgroundColor;
      newTopicDisplay.textColor = topicDisplay.textColor;
    }

    set((state) => {
      const nextTopics = [...state.document.topics, newTopic];
      const nextTopicDisplays = [...state.document.topicDisplays, newTopicDisplay];
      const nextConnections = [...state.document.connections];

      if (parentTopicId) {
        nextConnections.push({
          id: newConnectionId,
          sourceTopicId: parentTopicId,
          targetTopicId: newTopicId,
          type: 'arrow',
          memo: '',
          customValues: {},
        });
      }

      const newDocument = {
        ...state.document,
        topics: nextTopics,
        topicDisplays: nextTopicDisplays,
        connections: nextConnections,
      };

      return {
        ...pushHistory(state, newDocument),
        selectedNodeIds: [newTopicId],
      };
    });

    return newTopicId;
  },

  connectTopics: (sourceId: string, targetId: string) => {
    if (sourceId === targetId) return;

    const { document } = get();
    const existingSame = document.connections.find(
      (c) => c.sourceTopicId === sourceId && c.targetTopicId === targetId
    );
    if (existingSame) return;

    const existingReverse = document.connections.find(
      (c) => c.sourceTopicId === targetId && c.targetTopicId === sourceId
    );

    if (existingReverse) {
      if (existingReverse.type === 'bi_arrow') return;
      set((state) => {
        const newConnections = state.document.connections.map((c) =>
          c.id === existingReverse.id ? { ...c, type: 'bi_arrow' as ConnectionType } : c
        );
        const newDocument = { ...state.document, connections: newConnections };
        return pushHistory(state, newDocument);
      });
      return;
    }

    const newConnectionId = `conn-${Date.now()}`;
    const newConn: Connection = {
      id: newConnectionId,
      sourceTopicId: sourceId,
      targetTopicId: targetId,
      type: 'arrow' as ConnectionType,
      memo: '',
      customValues: {},
    };

    const newConnDisplay: ConnectionDisplay = {
      connectionId: newConnectionId,
      style: 'solid',
      routing: 'straight',
      color: '#475569',
      strokeWidth: 2,
    };

    set((state) => {
      const newDocument = {
        ...state.document,
        connections: [...state.document.connections, newConn],
        connectionDisplays: [...state.document.connectionDisplays, newConnDisplay],
      };
      return pushHistory(state, newDocument);
    });
  },

  deleteTopic: (topicId: string) => {
    set((state) => {
      const newDocument = {
        ...state.document,
        topics: state.document.topics.filter((t) => t.id !== topicId),
        topicDisplays: state.document.topicDisplays.filter((td) => td.topicId !== topicId),
        connections: state.document.connections.filter(
          (c) => c.sourceTopicId !== topicId && c.targetTopicId !== topicId
        ),
      };

      return {
        ...pushHistory(state, newDocument),
        selectedNodeIds: state.selectedNodeIds.filter((id) => id !== topicId),
      };
    });
  },

  applyAutoLayout: (direction = 'LR') => {
    set((state) => {
      const newTopicDisplays = getLayoutedElements(
        state.document.topics,
        state.document.connections,
        state.document.topicDisplays,
        direction
      );

      const newDocument = {
        ...state.document,
        topicDisplays: newTopicDisplays,
      };

      return pushHistory(state, newDocument);
    });
  },

  undo: () => {
    const { past, document, future } = get();
    if (past.length === 0) return;

    const previous = past[past.length - 1];
    const newPast = past.slice(0, past.length - 1);

    set({
      document: previous,
      past: newPast,
      future: [document, ...future],
      canUndo: newPast.length > 0,
      canRedo: true,
    });
  },

  redo: () => {
    const { past, document, future } = get();
    if (future.length === 0) return;

    const next = future[0];
    const newFuture = future.slice(1);

    set({
      document: next,
      past: [...past, document],
      future: newFuture,
      canUndo: true,
      canRedo: newFuture.length > 0,
    });
  },
  
  loadDocument: (newDocument: MindMapDocument) => {
    set({
      document: newDocument,
      selectedNodeIds: [],
      past: [],
      future: [],
      canUndo: false,
      canRedo: false,
      isDirty: false,
    });
  },

  updateTopic: (topicId: string, updates: Partial<Topic>) => {
    set((state) => {
      const newTopics = state.document.topics.map((t) =>
        t.id === topicId ? { ...t, ...updates } : t
      );
      const newDocument = {
        ...state.document,
        topics: newTopics,
      };
      return pushHistory(state, newDocument);
    });
  },

  updateTopicDisplay: (topicId: string, updates: Partial<TopicDisplay>) => {
    set((state) => {
      const newDisplays = state.document.topicDisplays.map((d) =>
        d.topicId === topicId ? { ...d, ...updates } : d
      );
      const newDocument = {
        ...state.document,
        topicDisplays: newDisplays,
      };
      return pushHistory(state, newDocument);
    });
  },

  updateMultipleTopicDisplays: (topicIds: string[], updates: Partial<TopicDisplay>) => {
    set((state) => {
      const updatedDisplays = state.document.topicDisplays.map((display) => {
        if (topicIds.includes(display.topicId)) {
          return { ...display, ...updates };
        }
        return display;
      });
      const newDocument = {
        ...state.document,
        topicDisplays: updatedDisplays,
      };
      return {
        ...pushHistory(state, newDocument),
      };
    });
  },

  // 🌟 追加：メタ情報（一般設定）を更新するメソッド
  updateMeta: (updates: Partial<MindMapDocument['meta']>) => {
    set((state) => {
      const newMeta = { ...state.document.meta, ...updates };
      const newDocument = {
        ...state.document,
        meta: newMeta,
      };
      return pushHistory(state, newDocument);
    });
  },

  updateConnectionType: (connectionId: string, type: ConnectionType) => {
    set((state) => {
      const newConnections = state.document.connections.map((c) =>
        c.id === connectionId ? { ...c, type } : c
      );
      const newDocument = { ...state.document, connections: newConnections };
      return pushHistory(state, newDocument);
    });
  },

  deleteConnection: (connectionId: string) => {
    set((state) => {
      const newConnections = state.document.connections.filter((c) => c.id !== connectionId);
      const newDisplays = state.document.connectionDisplays.filter(
        (d) => d.connectionId !== connectionId
      );
      const newDocument = {
        ...state.document,
        connections: newConnections,
        connectionDisplays: newDisplays,
      };
      return pushHistory(state, newDocument);
    });
  },

  // 🌟 変更：各アイテムごとの既定スタイル（defaultItemStyle：null許容）を受け取れるように拡張
  addCustomList: (name: string, type: ColumnType, items: any[], defaultItemStyle: Record<string, any> | null = null) => {
    set((state) => {
      const newList: CustomListMaster = {
        id: generateId(),
        name,
        type,
        items,
        defaultItemStyle, // 各アイテムごとの既定スタイル（nullでも可）
      };
      const newDocument = {
        ...state.document,
        customLists: [...(state.document.customLists || []), newList],
      };
      return pushHistory(state, newDocument);
    });
  },

  updateCustomList: (listId: string, updates: Partial<CustomListMaster>) => {
    set((state) => {
      const newLists = (state.document.customLists || []).map((list) =>
        list.id === listId ? { ...list, ...updates } : list
      );
      const newDocument = {
        ...state.document,
        customLists: newLists,
      };
      return pushHistory(state, newDocument);
    });
  },

  deleteCustomList: (listId: string) => {
    set((state) => {
      const newLists = (state.document.customLists || []).filter((list) => list.id !== listId);
      const newDocument = {
        ...state.document,
        customLists: newLists,
      };
      return pushHistory(state, newDocument);
    });
  },

  autoLayout: (mode: 'auto' | 'flow-top' | 'flow-left' | string) => {
    set((state) => {
      const { document } = state;

      if (document.topics.length === 0) return state;

      const newTopicDisplays = autoLayoutTopics(
        mode,
        document.topics,
        document.connections,
        document.topicDisplays,
        document.customLists || []
      );

      const newDocument = {
        ...document,
        topicDisplays: newTopicDisplays,
      };

      return pushHistory(state, newDocument);
    });
  },
  applyCustomListStylesToSelected: (listId: string) => {
    set((state) => {
      const { selectedNodeIds, document } = state;
      const { topics, topicDisplays, customLists } = document;

      // 選択ノードがない場合は全ノードを対象にするか、何もしない（ここでは選択ノードを対象、なければ全ノード）
      const targetIds = selectedNodeIds.length > 0 ? selectedNodeIds : topics.map((t) => t.id);

      let newDisplays = [...topicDisplays];
      let hasChanges = false;

      targetIds.forEach((topicId) => {
        const topic = topics.find((t) => t.id === topicId);
        if (!topic || !topic.customValues) return;

        // 各カスタム列の値を確認
        Object.entries(topic.customValues).forEach(([thislistId, val]) => {
          if (thislistId !== listId) return;

          const list = customLists.find((l) => l.id === listId);
          if (!list) return;

          let targetStyle: Record<string, any> | null = null;

          // 1. 選択された値（アイテム）個別にスタイルが設定されているか確認
          if (list.items && Array.isArray(list.items)) {
            const matchedItem = list.items.find((item: any) => item.id === val);
            if (matchedItem && matchedItem.style) {
              targetStyle = matchedItem.style;
            }
          }
          
          // 2. 個別スタイルがなければ、リスト全体の既定スタイルを確認
          if (!targetStyle && list.defaultItemStyle) {
            targetStyle = list.defaultItemStyle;
          }

          // スタイルが見つかった場合、ノードの表示（TopicDisplay）を上書き
          if (targetStyle) {
            hasChanges = true;
            newDisplays = newDisplays.map((d) => {
              if (d.topicId === topicId) {
                return {
                  ...d,
                  ...targetStyle, // スタイルを上書き
                };
              }
              return d;
            });
          }
        });
      });

      if (!hasChanges) return state;

      const newDocument = {
        ...state.document,
        topicDisplays: newDisplays,
      };
      return pushHistory(state, newDocument);
    });
  },

  saveCurrentNodeStyleToItem: (topicId: string, listId: string, itemId: string) => {
    set((state) => {
      const { topicDisplays, customLists } = state.document;

      // ノードの現在の表示スタイルを取得
      const display = topicDisplays.find((d) => d.topicId === topicId);
      if (!display) return state;

      // 保存するスタイルプロパティ（背景色、文字色、形状など）
      const currentStyle = {
        backgroundColor: display.backgroundColor,
        textColor: display.textColor,
        shape: display.shape,
      };

      // 該当するカスタムリストのアイテムのスタイルを更新
      const newCustomLists = customLists.map((list) => {
        if (list.id !== listId) return list;

        const newItems = list.items.map((item: any) => {
          if (item.id === itemId) {
            return {
              ...item,
              style: currentStyle, // ノードの現在の書式をアイテムに割り当て
            };
          }
          return item;
        });

        return {
          ...list,
          items: newItems,
        };
      });

      const newDocument = {
        ...state.document,
        customLists: newCustomLists,
      };

      return pushHistory(state, newDocument);
    });
  },

}));