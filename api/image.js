export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { driveFileId, driveApiKey } = req.body;

  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const cloudKey = process.env.CLOUDINARY_API_KEY;
  const cloudSecret = process.env.CLOUDINARY_API_SECRET;

  if (!cloudName || !cloudKey || !cloudSecret) {
    return res.status(500).json({ error: 'Cloudinary not configured. Add CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET to Vercel env vars.' });
  }

  if (!driveFileId || !driveApiKey) {
    return res.status(400).json({ error: 'Missing driveFileId or driveApiKey' });
  }

  try {
    // Step 1: Download full-res image from Google Drive
    const driveUrl = 'https://www.googleapis.com/drive/v3/files/' + driveFileId + '?alt=media&key=' + driveApiKey;
    const driveResp = await fetch(driveUrl);
    if (!driveResp.ok) {
      return res.status(400).json({ error: 'Failed to download from Drive: ' + driveResp.status });
    }

    const contentType = driveResp.headers.get('content-type') || 'image/jpeg';
    const imageBuffer = Buffer.from(await driveResp.arrayBuffer());

    // Step 2: Upload to Cloudinary
    const timestamp = Math.floor(Date.now() / 1000);
    const folder = 'stump-pros';

    // Generate signature
    const crypto = await import('crypto');
    const signStr = 'folder=' + folder + '&timestamp=' + timestamp + cloudSecret;
    const signature = crypto.createHash('sha1').update(signStr).digest('hex');

    // Build multipart form
    const boundary = '----CloudinaryBoundary' + Date.now();
    const parts = [];

    // Add fields
    const fields = {
      api_key: cloudKey,
      timestamp: String(timestamp),
      signature: signature,
      folder: folder,
    };

    for (const [key, value] of Object.entries(fields)) {
      parts.push(
        '--' + boundary + '\r\n' +
        'Content-Disposition: form-data; name="' + key + '"\r\n\r\n' +
        value + '\r\n'
      );
    }

    // Add file
    const ext = contentType.includes('png') ? 'png' : contentType.includes('webp') ? 'webp' : 'jpg';
    parts.push(
      '--' + boundary + '\r\n' +
      'Content-Disposition: form-data; name="file"; filename="photo.' + ext + '"\r\n' +
      'Content-Type: ' + contentType + '\r\n\r\n'
    );

    const bodyParts = [
      Buffer.from(parts.join('')),
      imageBuffer,
      Buffer.from('\r\n--' + boundary + '--\r\n'),
    ];
    const body = Buffer.concat(bodyParts);

    const cloudResp = await fetch('https://api.cloudinary.com/v1_1/' + cloudName + '/image/upload', {
      method: 'POST',
      headers: {
        'Content-Type': 'multipart/form-data; boundary=' + boundary,
        'Content-Length': String(body.length),
      },
      body: body,
    });

    const cloudData = await cloudResp.json();

    if (!cloudResp.ok || !cloudData.secure_url) {
      return res.status(400).json({ error: 'Cloudinary upload failed: ' + (cloudData.error?.message || JSON.stringify(cloudData)) });
    }

    return res.status(200).json({
      // Insert transformation into Cloudinary URL: max 4000px wide, auto quality, auto format
      // This keeps it under Instagram's 5000px and 8MB limits
      url: cloudData.secure_url.replace('/upload/', '/upload/c_limit,w_4000,q_auto/'),
      width: cloudData.width,
      height: cloudData.height,
    });
  } catch (error) {
    console.error('Image proxy error:', error);
    return res.status(500).json({ error: 'Image proxy failed: ' + error.message });
  }
}
