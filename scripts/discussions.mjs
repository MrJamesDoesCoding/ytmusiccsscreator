// Makes sure every theme has a GitHub Discussion (its 👍 reactions are the theme's likes)
// and returns { [themeId]: { discussionId, discussionNumber, likes } }.
// Runs inside GitHub Actions with GITHUB_TOKEN (needs "discussions: write").
const MARK = /<!--\s*theme-id:\s*([a-z0-9-]+)\s*-->/;

async function gql(token, query, variables) {
  const res = await fetch('https://api.github.com/graphql', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', 'User-Agent': 'ytm-theme-build' },
    body: JSON.stringify({ query, variables }),
  });
  const data = await res.json();
  if (data.errors) throw new Error(data.errors.map((e) => e.message).join('; '));
  return data.data;
}

export async function syncDiscussions(themes, { token, repository, categoryName, siteUrl }) {
  const [owner, name] = repository.split('/');
  const head = await gql(token, `query($owner:String!,$name:String!){ repository(owner:$owner,name:$name){ id hasDiscussionsEnabled discussionCategories(first:50){ nodes{ id name } } } }`, { owner, name });
  const repo = head.repository;
  if (!repo.hasDiscussionsEnabled) { console.warn('! Discussions are turned off for this repo, so likes are disabled.'); return {}; }
  const cats = repo.discussionCategories.nodes;
  const cat = cats.find((c) => c.name.toLowerCase() === categoryName.toLowerCase())
    || cats.find((c) => c.name === 'Announcements');
  if (!cat) { console.warn(`! No "${categoryName}" discussion category found, so likes are disabled.`); return {}; }

  const found = {};
  let after = null;
  do {
    const d = await gql(token, `query($owner:String!,$name:String!,$cat:ID!,$after:String){ repository(owner:$owner,name:$name){ discussions(first:100, categoryId:$cat, after:$after){ pageInfo{ hasNextPage endCursor } nodes{ id number body reactionGroups{ content reactors{ totalCount } } } } } }`, { owner, name, cat: cat.id, after });
    const page = d.repository.discussions;
    for (const n of page.nodes) {
      const m = MARK.exec(n.body || '');
      if (!m) continue;
      const g = n.reactionGroups.find((x) => x.content === 'THUMBS_UP');
      found[m[1]] = { discussionId: n.id, discussionNumber: n.number, likes: g ? g.reactors.totalCount : 0 };
    }
    after = page.pageInfo.hasNextPage ? page.pageInfo.endCursor : null;
  } while (after);

  for (const t of themes) {
    if (found[t.id]) continue;
    const body = `**${t.name}** by ${t.author || 'anonymous'}\n\n${t.description || ''}\n\nReact with 👍 to like this theme. It shows up as a like in the [gallery](${siteUrl}).\n\n<!-- theme-id: ${t.id} -->`;
    const c = await gql(token, `mutation($repo:ID!,$cat:ID!,$title:String!,$body:String!){ createDiscussion(input:{repositoryId:$repo, categoryId:$cat, title:$title, body:$body}){ discussion{ id number } } }`, { repo: repo.id, cat: cat.id, title: `${t.name} (${t.id})`, body });
    found[t.id] = { discussionId: c.createDiscussion.discussion.id, discussionNumber: c.createDiscussion.discussion.number, likes: 0 };
    console.log(`+ created discussion #${found[t.id].discussionNumber} for ${t.id}`);
  }
  return found;
}
