import type { Topic, Connection } from '../types/mindmap'; // パスは適宜調整してください

/**
 * 対象のトピックがルート（最上位：親を持たない）であるかどうかを判定します。
 * @param topicId - 判定対象のトピックID
 * @param connections - 全体の接続（Connection）配列
 * @returns 親となる接続が存在しない（流入するエッジがない）場合は true
 */
export const isRoot = (topicId: string, connections: Connection[]): boolean => {
  // targetTopicId に指定されている＝誰かから指されている（親がいる）場合は false
  const hasParent = connections.some((conn) => conn.targetTopicId === topicId);
  return !hasParent;
};

/**
 * 全体の接続情報から、指定されたトピックの親トピック配列（または単一の親）を取得します。
 * @param topicId - 親を探したい対象のトピックID
 * @param topics - 全体のトピック（Topic）配列
 * @param connections - 全体の接続（Connection）配列
 * @returns 親トピックの配列（通常は1つですが、複数親を持つグラフ構造も考慮）
 */
export const getParentTopics = (
  topicId: string,
  topics: Topic[],
  connections: Connection[]
): Topic[] => {
  // targetTopicId が自トピックであるコネクションを抽出
  const incomingConnections = connections.filter((conn) => conn.targetTopicId === topicId);
  const parentIds = incomingConnections.map((conn) => conn.sourceTopicId);

  return topics.filter((t) => parentIds.includes(t.id));
};

/**
 * 指定されたトピックの「直近の親トピック」を1つだけ取得します（ツリー構造を前提とする場合）。
 * @param topicId - 親を探したい対象のトピックID
 * @param topics - 全体のトピック（Topic）配列
 * @param connections - 全体の接続（Connection）配列
 * @returns 親トピック、またはルートの場合は null
 */
export const getParentTopic = (
  topicId: string,
  topics: Topic[],
  connections: Connection[]
): Topic | null => {
  const parents = getParentTopics(topicId, topics, connections);
  return parents.length > 0 ? parents[0] : null;
};