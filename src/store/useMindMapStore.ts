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
import { isRoot } from '../utils/mindmapUtils'; // 先ほど作成したisRootをインポート

interface MindMapState {
  document: MindMapDocument;
  selectedNodeIds: string[];

  past: MindMapDocument[];
  future: MindMapDocument[];
  
  markHistoryAsSaved: () => void; // 追加
  isDirty: boolean;

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
  
  dragStartDocument: MindMapDocument | null;
  startDrag: () => void;
  endDrag: () => void;

  connectingSourceId: string | null;
  setConnectingSourceId: (id: string | null) => void;
  handleNodeTapForConnect: (targetNodeId: string) => void;

  updateConnectionType: (connectionId: string, type: ConnectionType) => void;
  deleteConnection: (connectionId: string) => void;
  setSelectedNodeIds: (ids: string[]) => void;
  clearSelection: () => void;

  // --- カスタムリスト管理アクション ---
  addCustomList: (name: string, type: ColumnType, items: any[]) => void;
  updateCustomList: (listId: string, updates: Partial<any>) => void;
  deleteCustomList: (listId: string) => void;

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

  markHistoryAsSaved: () => {
    set({
      isDirty: false, // 🌟 保存されたので未保存フラグを下ろす
    });
  },
  isDirty: false,

  dragStartDocument: null,

  // 🌟 ドラッグ開始時に、その時点のドキュメントを保持する
  startDrag: () => set((state) => ({ dragStartDocument: state.document })),

  // 🌟 ドラッグ終了時に、開始時から位置が変わっていれば1回だけ履歴に積む
  endDrag: () => set((state) => {
    if (!state.dragStartDocument) return {};

    const hasChanged = JSON.stringify(state.dragStartDocument) !== JSON.stringify(state.document);
    if (!hasChanged) return { dragStartDocument: null };

    return {
      past: [...state.past, state.dragStartDocument],
      future: [],
      canUndo: true,
      canRedo: false,
      isDirty: true,
      dragStartDocument: null,
    };
  }),

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
      }
    });

    const removeChange = changes.find((c) => c.type === 'remove');
    if (removeChange && removeChange.type === 'remove') {
      return;
    }

    const positionChanges = changes.filter((c) => c.type === 'position');
    if (positionChanges.length > 0) {
      set((state) => {
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

        return {
          ...pushHistory(state, newDocument),
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

  // --- カスタムリスト管理の実装 ---
  addCustomList: (name: string, type: ColumnType, items: any[]) => {
    set((state) => {
      const newList: CustomListMaster = {
        id: generateId(),
        name,
        type,
        items,
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

  // useMindMapStore.ts に追加・拡張するアクション例
  reorderCustomListItems: (listId: string, newItems: any[]) => {
    set((state) => {
      const newLists = (state.document.customLists || []).map((list) =>
        list.id === listId ? { ...list, items: newItems } : list
      );
      const newDocument = {
        ...state.document,
        customLists: newLists,
      };
      return pushHistory(state, newDocument);
    });
  },

  // useMindMapStore.ts に追加・拡張する自動レイアウトアクション

  autoLayout: (mode: 'auto' | 'flow-top' | 'flow-left' | string) => {
    set((state) => {
      const topics = state.document.topics;
      const connections = state.document.connections;
      let topicDisplays = [...state.document.topicDisplays];
      const customLists = state.document.customLists || [];
      
      if (topics.length === 0) return state;

      // 1. ルートノードの特定
      const rootTopics = topics.filter((t) => isRoot(t.id, connections));
      const rootTopic = rootTopics.length > 0 ? rootTopics[0] : topics[0];

      // 2. 接続から親子の子要素マップを作成
      const childrenMap = new Map<string, string[]>();
      connections.forEach((conn) => {
        // 同じ接続の重複追加を防ぐ
        const list = childrenMap.get(conn.sourceTopicId) || [];
        if (!list.includes(conn.targetTopicId)) {
          list.push(conn.targetTopicId);
          childrenMap.set(conn.sourceTopicId, list);
        }
      });

      const spacingX = 220;
      const spacingY = 100;

      const setPosition = (topicId: string, x: number, y: number) => {
        const existingDisplay = topicDisplays.find((td) => td.topicId === topicId);
        if (existingDisplay) {
          existingDisplay.position = { x, y };
        } else {
          topicDisplays.push({
            topicId,
            shape: 'rounded_rectangle',
            position: { x, y },
            backgroundColor: '#ffffff',
            textColor: '#0f172a',
          });
        }
      };

      // 3. モードに応じたレイアウト計算（無限ループ防止の visited セットを導入）
      if (mode === 'auto' || mode === 'flow-top' || mode === 'flow-left') {
        const visited = new Set<string>();

        const layoutNode = (topicId: string, depth: number, offsetIdx: number): number => {
          // 既に訪れたノードならループを防ぐためスキップ
          if (visited.has(topicId)) return offsetIdx;
          visited.add(topicId);

          const children = childrenMap.get(topicId) || [];

          if (mode === 'flow-left') {
            const x = depth * spacingX;
            let currentY = offsetIdx * spacingY;
            setPosition(topicId, x, currentY);

            if (children.length === 0) return offsetIdx + 1;

            for (const childId of children) {
              currentY = layoutNode(childId, depth + 1, currentY);
            }
            return currentY;
          } else {
            const x = offsetIdx * spacingX;
            const y = depth * spacingY;
            setPosition(topicId, x, y);

            let currentX = offsetIdx;
            if (children.length === 0) return offsetIdx + 1;

            for (const childId of children) {
              currentX = layoutNode(childId, depth + 1, currentX);
            }
            return currentX;
          }
        };

        layoutNode(rootTopic.id, 0, 0);

        // ツリーから外れた孤立ノードがあれば空いている場所に並べる
        let orphanOffset = 0;
        topics.forEach((t) => {
          if (!visited.has(t.id)) {
            setPosition(t.id, 0, (layoutNode as any).maxY || (topics.length * spacingY + orphanOffset));
            orphanOffset += spacingY;
          }
        });

      } else {
        // 🏷️ カスタムリスト / カレンダーでの並べ替え・グループ化
        const targetList = customLists.find((l) => l.id === mode || l.name === mode);
        if (targetList) {
          let currentY = 0;

          if (targetList.type === 'calendar') {
            // 📅 カレンダー型：日付（customValues）を時系列順にソートして縦に並べる
            const sortedTopics = [...topics].sort((a, b) => {
              // トピックの customValues から日付っぽい文字列を探す
              const valA = Object.values(a.customValues || {}).find(v => typeof v === 'string' && !isNaN(Date.parse(v)));
              const valB = Object.values(b.customValues || {}).find(v => typeof v === 'string' && !isNaN(Date.parse(v)));
              
              if (!valA) return 1;
              if (!valB) return -1;
              return new Date(valA).getTime() - new Date(valB).getTime();
            });

            sortedTopics.forEach((t, index) => {
              setPosition(t.id, 0, index * spacingY);
            });

          } else if (targetList.type === 'milestone') {
            // 🏷️ マイルストーン型：階層構造に従って上から順に整列
            let depthIndex = 0;
            const layoutMilestoneTree = (topicId: string) => {
              setPosition(topicId, 0, depthIndex * spacingY);
              depthIndex++;
              const children = childrenMap.get(topicId) || [];
              children.forEach(childId => layoutMilestoneTree(childId));
            };
            
            if (rootTopic) {
              layoutMilestoneTree(rootTopic.id);
            }

          } else {
            // 📋 通常のリスト型：リストマスター項目の順序やグループで並べ替え
            const rootChildren = childrenMap.get(rootTopic.id) || [];
            rootChildren.forEach((childId) => {
              setPosition(childId, 0, currentY);
              currentY += spacingY;
            });
          }
        }
      }

      const newDocument = { ...state.document, topicDisplays };
      return pushHistory(state, newDocument);
    });
  },
}));