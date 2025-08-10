const { google } = require('googleapis');

// Path to your service account key file
const SERVICE_ACCOUNT_FILE = 'service_account.json';

// Scopes for Docs + Drive
const SCOPES = [
  'https://www.googleapis.com/auth/documents',
  'https://www.googleapis.com/auth/drive'
];

// Load credentials
const auth = new google.auth.GoogleAuth({
  keyFile: SERVICE_ACCOUNT_FILE,
  scopes: SCOPES
});

// Main function
async function run() {
  const authClient = await auth.getClient();
  const docs = google.docs({ version: 'v1', auth: authClient });

  const DOCUMENT_ID = '1NVmJJ112anRQsp7aC1MunD0ZnrDCutfCHpMHc0p6pSg';

  // Fetch document structure
  const res = await docs.documents.get({ documentId: DOCUMENT_ID });
  const content = res.data.body.content || [];

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
    console.log('Document is not empty. Contents:');
    console.log(textContent);

    // Get the actual end index from the last structural element
    const lastElement = content[content.length - 1];
    const endIndex = lastElement.endIndex || 1;

    // Clear document without removing the trailing newline
    await docs.documents.batchUpdate({
      documentId: DOCUMENT_ID,
      requestBody: {
        requests: [
          {
            deleteContentRange: {
              range: {
                startIndex: 1,
                endIndex: endIndex - 1 // avoid deleting final newline
              }
            }
          }
        ]
      }
    });

    console.log('Document cleared.');
  } else {
    console.log('Document is empty.');
  }
}

run().catch(console.error);
