// 動的カラム（カスタム列）のタイプ
export type ColumnType = 
  | 'text' 
  | 'number' 
  | 'person' 
  | 'calendar' 
  | 'list' 
  | 'milestone';

export interface ColumnDefinition {
  id: string;
  name: string;
  type: ColumnType;
  listMasterId?: string; // list / milestone タイプ用
}

// 1) トピックテーブル
export interface Topic {
  id: string;
  title: string;
  detailMemo: string;
  type?: 'node' | 'waypoint'; // 通常ノード または 経由点
  customValues: Record<string, any>; // 動的列データ
}

// 2) 接続テーブル
export type ConnectionType = 'line' | 'arrow' | 'reverse_arrow' | 'bi_arrow';

export interface Connection {
  id: string;
  sourceTopicId: string;
  targetTopicId: string;
  type: ConnectionType;
  memo?: string;
  customValues?: Record<string, any>;
}

// 3) トピック表示テーブル (永続履歴対象外)
export type NodeShape = 'rectangle' | 'rounded_rectangle' | 'circle' | 'diamond';

export interface TopicDisplay {
  topicId: string;
  shape: NodeShape;
  position: { x: number; y: number };
  size: { width: number; height: number };
  backgroundColor: string;
  textColor: string;
}

// 4) 接続表示テーブル (永続履歴対象外)
export type LineStyle = 'solid' | 'dashed' | 'dotted';
export type LineRouting = 'straight' | 'step' | 'bezier'; // 直線、カギ線、曲線

export interface ConnectionDisplay {
  connectionId: string;
  style: LineStyle;
  routing: LineRouting;
  color: string;
  strokeWidth: number;
}

// 5) 変更履歴テーブル (永続化)
export type OperationType = 'create' | 'update' | 'delete' | 'map_create' | 'map_save_as';

export interface HistoryRecord {
  id: string;
  targetTable: 'topic' | 'connection' | 'custom_lists' | 'mindmap';
  user: string;
  timestamp: string;
  operation: OperationType;
  changedColumn?: string;
  newData?: any;
}

// 6) テンポラリ変更履歴テーブル (Undo/Redo用)
export interface TempHistoryRecord {
  id: string;
  targetTable: 'topic' | 'connection' | 'topic_display' | 'connection_display' | 'custom_lists';
  user: string;
  timestamp: string;
  operation: OperationType;
  changedColumn?: string;
  previousData?: any;
  newData?: any;
}

// 7+) リスト/マイルストーンマスター定義
export interface ListItem {
  id: string;
  label: string;
  color?: string;
}

export interface MilestoneItem {
  id: string;
  label: string;
  parentId: string | null;
  dueDate?: string;
  children?: MilestoneItem[];
}

export interface CustomListMaster {
  id: string;
  name: string;
  type: 'list' | 'milestone';
  items: ListItem[] | MilestoneItem[];
}

// 全体ドキュメント構造
export interface MindMapDocument {
  meta: {
    id: string;
    title: string;
    createdAt: string;
    updatedAt: string;
    version: string;
  };
  schema: {
    topicColumns: ColumnDefinition[];
    connectionColumns: ColumnDefinition[];
  };
  topics: Topic[];
  connections: Connection[];
  topicDisplays: TopicDisplay[];
  connectionDisplays: ConnectionDisplay[];
  customLists: CustomListMaster[];
  history: HistoryRecord[];
}