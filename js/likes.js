// Likes = 👍 reactions on one GitHub Discussion per theme.
// index.json carries counts refreshed by the deploy workflow; signed-in users get live counts.
import { gql, signedIn } from './auth.js';

const FRAGMENT = `... on Discussion { id reactionGroups { content viewerHasReacted reactors { totalCount } } }`;

function read(node) {
  const g = (node.reactionGroups || []).find((x) => x.content === 'THUMBS_UP');
  return { count: g ? g.reactors.totalCount : 0, mine: g ? g.viewerHasReacted : false };
}

// Returns { [discussionId]: { count, mine } }
export async function fetchLikes(ids) {
  const out = {};
  if (!signedIn() || !ids.length) return out;
  for (let i = 0; i < ids.length; i += 100) {
    const chunk = ids.slice(i, i + 100);
    const data = await gql(`query($ids: [ID!]!) { nodes(ids: $ids) { ${FRAGMENT} } }`, { ids: chunk });
    for (const n of data.nodes) if (n && n.id) out[n.id] = read(n);
  }
  return out;
}

export async function setLike(discussionId, like) {
  const m = like ? 'addReaction' : 'removeReaction';
  const data = await gql(`mutation($id: ID!) { ${m}(input: { subjectId: $id, content: THUMBS_UP }) { subject { ${FRAGMENT} } } }`, { id: discussionId });
  return read(data[m].subject);
}
