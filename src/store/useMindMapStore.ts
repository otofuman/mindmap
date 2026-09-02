import { create } from 'zustand';
import type {
  Topic,
  Connection,
  TopicDisplay,
  ConnectionDisplay,
  MindMapDocument,
  ConnectionType
} from '../types/mindmap';
import { type NodeChange, type EdgeChange } from '@xyflow/react';
import { getLayoutedElements } from '../utils/layout';

interface MindMapState {
  document: MindMapDocument;
  selectedNodeId: string | null;

  // Undo/Redo 用の履歴スタック
  past: MindMapDocument[];
  future: MindMapDocument[];

  onNodesChange: (changes: NodeChange[]) => void;
  onEdgesChange: (changes: EdgeChange[]) => void;
  addTopic: (title: string, position: { x: number; y: number }, parentTopicId?: string) => string;
  connectTopics: (sourceId: string, targetId: string) => void;
  deleteTopic: (topicId: string) => void;
  applyAutoLayout: (direction?: 'LR' | 'TB') => void;

  // Undo / Redo アクション
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;

  loadDocument: (newDocument: MindMapDocument) => void;
  updateTopic: (topicId: string, updates: Partial<Topic>) => void;
  updateTopicDisplay: (topicId: string, updates: Partial<TopicDisplay>) => void;
  
  connectingSourceId: string | null;
  setConnectingSourceId: (id: string | null) => void;
  handleNodeTapForConnect: (targetNodeId: string) => void;

  updateConnectionType: (connectionId: string, type: ConnectionType) => void;
  deleteConnection: (connectionId: string) => void;
}

const generateId = () => `id_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

const initialDocument: MindMapDocument = {
  meta: {
    id: 'doc_1',
    title: '無題のマインドマップ',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    version: '1.0.0',
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
      size: { width: 150, height: 40 },
      backgroundColor: '#ffffff',
      textColor: '#333333',
    },
  ],
  connectionDisplays: [],
  customLists: [],
  history: [],
};

// 履歴保存のヘルパー（pastに現在のドキュメントを追加し、futureをクリア）
const pushHistory = (state: MindMapState, newDocument: MindMapDocument) => {
  return {
    past: [...state.past, state.document],
    future: [],
    document: newDocument,
    canUndo: true,
    canRedo: false,
  };
};

export const useMindMapStore = create<MindMapState>((set, get) => ({
  document: initialDocument,
  selectedNodeId: null,

  past: [],
  future: [],
  canUndo: false,
  canRedo: false,
  connectingSourceId: null,

  setConnectingSourceId: (id: string | null) => set({ connectingSourceId: id }),

  // ノードタップ時の接続ロジック
  handleNodeTapForConnect: (targetNodeId: string) => {
    const { connectingSourceId, connectTopics } = get();

    if (!connectingSourceId) {
      // 1回目のタップ: 接続元に指定
      set({ connectingSourceId: targetNodeId });
    } else if (connectingSourceId === targetNodeId) {
      // 同じノードを再度タップ: キャンセル
      set({ connectingSourceId: null });
    } else {
      // 2回目のタップ: 接続元と接続先をつなぐ
      connectTopics(connectingSourceId, targetNodeId);
      set({ connectingSourceId: null });
    }
  },

  onNodesChange: (changes: NodeChange[]) => {
    const selectChange = changes.find((c) => c.type === 'select');
    let nextSelectedId = get().selectedNodeId;
    if (selectChange && selectChange.type === 'select') {
      nextSelectedId = selectChange.selected ? selectChange.id : null;
    }

    const removeChange = changes.find((c) => c.type === 'remove');
    if (removeChange && removeChange.type === 'remove') {
      get().deleteTopic(removeChange.id);
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

        // 位置変更時も履歴に記録（ドラッグ終了時の判定簡略化のため）
        return {
          ...pushHistory(state, newDocument),
          selectedNodeId: nextSelectedId,
        };
      });
    } else {
      set({ selectedNodeId: nextSelectedId });
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

  addTopic: (title: string, position: { x: number; y: number }, parentTopicId?: string) => {
    const newTopicId = generateId();
    const newConnectionId = generateId();

    const newTopic: Topic = {
      id: newTopicId,
      title,
      detailMemo: '',
      customValues: {},
    };

    const newTopicDisplay: TopicDisplay = {
      topicId: newTopicId,
      shape: 'rounded_rectangle',
      position,
      size: { width: 150, height: 40 },
      backgroundColor: '#ffffff',
      textColor: '#333333',
    };

    set((state) => {
      const nextTopics = [...state.document.topics, newTopic];
      const nextTopicDisplays = [...state.document.topicDisplays, newTopicDisplay];
      const nextConnections = [...state.document.connections];

      if (parentTopicId) {
        nextConnections.push({
          id: newConnectionId,
          sourceTopicId: parentTopicId,
          targetTopicId: newTopicId,
          type: 'line',
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
        selectedNodeId: newTopicId,
      };
    });

    return newTopicId;
  },

  connectTopics: (sourceId: string, targetId: string) => {
    if (sourceId === targetId) return; // 自分自身への接続は無視

    const { document } = get();

    // 既に全く同じ向きの接続が存在する場合は無視（登録しない・警告なし）
    const existingSame = document.connections.find(
      (c) => c.sourceTopicId === sourceId && c.targetTopicId === targetId
    );
    if (existingSame) return;

    // 逆向きの接続が既に存在する場合
    const existingReverse = document.connections.find(
      (c) => c.sourceTopicId === targetId && c.targetTopicId === sourceId
    );

    if (existingReverse) {
      // 既存接続が 'bi_arrow' ならば既に双方向なので何もしない
      if (existingReverse.type === 'bi_arrow') return;

      // 既存の逆向き接続を 'bi_arrow' (双方向) に昇格更新
      set((state) => {
        const newConnections = state.document.connections.map((c) =>
          c.id === existingReverse.id ? { ...c, type: 'bi_arrow' as ConnectionType } : c
        );
        const newDocument = { ...state.document, connections: newConnections };
        return pushHistory(state, newDocument);
      });
      return;
    }

    // 新規接続作成（基本設定: 'arrow' 正方向矢印）
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
      style: 'solid',      // lineStyle ではなく style の場合
      routing: 'straight',   // 必要に応じて適切なデフォルト値
      color: '#475569',     // lineColor ではなく color の場合
      strokeWidth: 2,       // 線の太さ
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
        selectedNodeId: state.selectedNodeId === topicId ? null : state.selectedNodeId,
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

  // Undo (元に戻す)
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

  // Redo (やり直す)
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
  
  // ドキュメントの一括読み込み（インポート）
  loadDocument: (newDocument: MindMapDocument) => {
    set({
      document: newDocument,
      selectedNodeId: null,
      past: [],
      future: [],
      canUndo: false,
      canRedo: false,
    });
  },
  // トピック基本情報の更新
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

  // トピック描画スタイルの更新
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
}));