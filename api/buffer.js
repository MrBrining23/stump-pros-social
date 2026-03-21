export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { action, token, text, channelId, dueAt, imageUrl, service } = req.body;

  if (!token) {
    return res.status(400).json({ error: 'Missing Buffer API token' });
  }

  const headers = {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer ' + token,
  };

  try {
    // Get channels (replaces old "profiles")
    if (action === 'channels') {
      const query = `
        query GetChannels {
          account {
            organizations {
              id
              channels {
                id
                name
                service
                isDisconnected
              }
            }
          }
        }
      `;
      const resp = await fetch('https://api.buffer.com', {
        method: 'POST',
        headers,
        body: JSON.stringify({ query }),
      });
      const data = await resp.json();
      if (data.errors) {
        return res.status(400).json({ error: data.errors[0]?.message || 'GraphQL error' });
      }
      // Flatten channels from all organizations
      const channels = [];
      const orgs = data.data?.account?.organizations || [];
      for (const org of orgs) {
        for (const ch of (org.channels || [])) {
          if (!ch.isDisconnected) {
            channels.push({
              id: ch.id,
              name: ch.name,
              service: ch.service,
              organizationId: org.id,
            });
          }
        }
      }
      return res.status(200).json({ channels });
    }

    // Create a post
    if (action === 'create') {
      let assetsBlock = '';
      if (imageUrl) {
        const escapedUrl = imageUrl.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
        assetsBlock = `, assets: { images: [{ url: "${escapedUrl}" }] }`;
      }

      const escapedText = text.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n');

      // Platform-specific metadata
      let metadataBlock = '';
      if (service === 'facebook') {
        metadataBlock = ', metadata: { facebook: { type: post } }';
      } else if (service === 'instagram') {
        metadataBlock = ', metadata: { instagram: { type: post, shouldShareToFeed: true } }';
      } else if (service === 'googlebusiness') {
        metadataBlock = ', metadata: { google: { type: whats_new } }';
      }

      const query = `
        mutation CreatePost {
          createPost(input: {
            text: "${escapedText}",
            channelId: "${channelId}",
            schedulingType: automatic,
            mode: customScheduled,
            dueAt: "${dueAt}"
            ${metadataBlock}
            ${assetsBlock}
          }) {
            ... on PostActionSuccess {
              post {
                id
                text
              }
            }
            ... on MutationError {
              message
            }
          }
        }
      `;

      const resp = await fetch('https://api.buffer.com', {
        method: 'POST',
        headers,
        body: JSON.stringify({ query }),
      });
      const data = await resp.json();

      if (data.errors) {
        return res.status(400).json({ error: data.errors[0]?.message || 'GraphQL error' });
      }

      const result = data.data?.createPost;
      if (result?.post) {
        return res.status(200).json({ success: true, postId: result.post.id });
      } else if (result?.message) {
        return res.status(400).json({ error: result.message });
      }

      return res.status(400).json({ error: 'Unknown response', raw: data });
    }

    return res.status(400).json({ error: 'Unknown action: ' + action });
  } catch (error) {
    console.error('Buffer API error:', error);
    return res.status(500).json({ error: 'Buffer API failed: ' + error.message });
  }
}
