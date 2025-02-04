export class DownloadHistory {
  static STORAGE_KEY = 'downloadHistory';

  static getHistory() {
    return JSON.parse(localStorage.getItem(this.STORAGE_KEY) || '[]');
  }

  static addRecord(filename, imageData, metadata) {
    const history = this.getHistory();
    const newRecord = {
      id: Date.now(),
      filename,
      imageData,
      metadata,
      timestamp: new Date().toISOString()
    };
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify([newRecord, ...history]));
  }

  static removeRecord(id) {
    const history = this.getHistory().filter(record => record.id !== id);
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(history));
  }
} 