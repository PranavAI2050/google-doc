require('dotenv').config();

const express = require('express');
const { google } = require('googleapis');

const app = express();
const PORT = process.env.PORT || 3000;

// Load service account from environment variable
const SERVICE_ACCOUNT_KEY = JSON.parse(process.env.SERVICE_ACCOUNT_KEY);

// Scopes for Docs + Drive
const SCOPES = [
  'https://www.googleapis.com/auth/documents',
  'https://www.googleapis.com/auth/drive'
];

// Endpoint to clean Google Doc
app.get('/clean-doc', async (req, res) => {
  try {
    const { documentId } = req.query;
    if (!documentId) {
      return res.status(400).json({ error: 'Missing documentId query parameter' });
    }

    const auth = new google.auth.GoogleAuth({
      credentials: SERVICE_ACCOUNT_KEY,
      scopes: SCOPES
    });

    const authClient = await auth.getClient();
    const docs = google.docs({ version: 'v1', auth: authClient });

    // Fetch document
    const docRes = await docs.documents.get({ documentId });
    const content = docRes.data.body.content || [];

    // Extract text
    let textContent = '';
    for (const c of content) {
      if (c.paragraph) {
        for (const e of c.paragraph.elements || []) {
          textContent += e.textRun?.content || '';
        }
      }
    }

    if (textContent.trim()) {
      const lastElement = content[content.length - 1];
      const endIndex = lastElement.endIndex || 1;

      // Clear document
      await docs.documents.batchUpdate({
        documentId,
        requestBody: {
          requests: [
            {
              deleteContentRange: {
                range: {
                  startIndex: 1,
                  endIndex: endIndex - 1
                }
              }
            }
          ]
        }
      });

      res.json({
        message: 'Document cleared',
        previousContent: textContent
      });
    } else {
      res.json({ message: 'Document is empty' });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
