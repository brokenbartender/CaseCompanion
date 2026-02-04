
declare const google: any;

export interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
}

export const driveService = {
  accessToken: null as string | null,
  apiKey: null as string | null,

  init: async () => {
    return new Promise<void>((resolve, reject) => {
      let attempts = 0;
      const checkGSI = setInterval(() => {
        attempts++;
        if (typeof google !== 'undefined' && google.accounts && google.accounts.oauth2) {
          clearInterval(checkGSI);
          resolve();
        }
        if (attempts > 50) {
          clearInterval(checkGSI);
          reject(new Error("GSI Core Failure: Google Identity script is being blocked."));
        }
      }, 100);
    });
  },

  extractFolderId: (urlOrId: string): string => {
    if (!urlOrId) return '';
    const cleanUrl = urlOrId.split('?')[0].split('#')[0];
    const folderRegex = /\/folders\/([a-zA-Z0-9_-]+)/;
    const match = cleanUrl.match(folderRegex);
    if (match && match[1]) return match[1];
    const idParamRegex = /[?&]id=([a-zA-Z0-9_-]+)/;
    const idMatch = urlOrId.match(idParamRegex);
    if (idMatch && idMatch[1]) return idMatch[1];
    return urlOrId.replace('Search: ', '').trim(); 
  },

  authenticate: async (clientId: string): Promise<string> => {
    if (!clientId) throw new Error("Client ID required.");
    return new Promise((resolve, reject) => {
      try {
        const tokenClient = google.accounts.oauth2.initTokenClient({
          client_id: clientId,
          scope: 'https://www.googleapis.com/auth/drive.readonly',
          callback: (response: any) => {
            if (response.error) {
              reject(new Error(response.error_description || response.error));
              return;
            }
            driveService.accessToken = response.access_token;
            resolve(response.access_token);
          }
        });
        tokenClient.requestAccessToken({ prompt: 'select_account' });
      } catch (err: any) {
        reject(new Error("Handshake Initialization Failure: " + err.message));
      }
    });
  },

  findFolderByName: async (name: string): Promise<string | null> => {
    const query = encodeURIComponent(`name = '${name}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`);
    const url = `https://www.googleapis.com/drive/v3/files?q=${query}&fields=files(id, name)`;
    
    const headers: any = {};
    if (driveService.accessToken) {
      headers['Authorization'] = `Bearer ${driveService.accessToken}`;
    } else {
      throw new Error('Drive access token required.');
    }

    const response = await fetch(url, { headers });
    const data = await response.json();
    return data.files && data.files.length > 0 ? data.files[0].id : null;
  },

  listFiles: async (folderId: string): Promise<DriveFile[]> => {
    const query = encodeURIComponent(`'${folderId}' in parents and trashed = false`);
    const fields = 'files(id, name, mimeType)';
    const url = `https://www.googleapis.com/drive/v3/files?q=${query}&fields=${fields}`;
    
    const headers: any = {};
    if (driveService.accessToken) {
      headers['Authorization'] = `Bearer ${driveService.accessToken}`;
    } else {
      throw new Error('Drive access token required.');
    }

    const response = await fetch(url, { headers });
    if (!response.ok) throw new Error("Link Rejected: Folder restricted.");
    const data = await response.json();
    return data.files || [];
  },

  getFileContent: async (fileId: string, mimeType: string): Promise<string> => {
    let url: string;
    const isBinary = mimeType.includes('pdf') || mimeType.includes('image');

    if (mimeType === 'application/vnd.google-apps.document') {
      url = `https://www.googleapis.com/drive/v3/files/${fileId}/export?mimeType=text/plain`;
    } else if (mimeType === 'application/vnd.google-apps.spreadsheet') {
      url = `https://www.googleapis.com/drive/v3/files/${fileId}/export?mimeType=text/csv`;
    } else {
      url = `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`;
    }

    const headers: any = {};
    if (driveService.accessToken) {
      headers['Authorization'] = `Bearer ${driveService.accessToken}`;
    } else {
      throw new Error('Drive access token required.');
    }

    const response = await fetch(url, { headers });
    if (!response.ok) throw new Error("Data Retrieval Interrupted.");

    if (isBinary) {
      const blob = await response.blob();
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
    }
    return await response.text();
  }
};
