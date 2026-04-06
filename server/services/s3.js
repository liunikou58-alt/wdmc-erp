const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// 環境變數讀取
const AWS_ACCESS_KEY_ID = process.env.AWS_ACCESS_KEY_ID;
const AWS_SECRET_ACCESS_KEY = process.env.AWS_SECRET_ACCESS_KEY;
const AWS_REGION = process.env.AWS_REGION || 'ap-northeast-1';
const AWS_S3_BUCKET = process.env.AWS_S3_BUCKET;

// 狀態檢查
const isS3Configured = Boolean(AWS_ACCESS_KEY_ID && AWS_SECRET_ACCESS_KEY && AWS_S3_BUCKET);

let s3Client = null;
if (isS3Configured) {
  s3Client = new S3Client({
    region: AWS_REGION,
    credentials: {
      accessKeyId: AWS_ACCESS_KEY_ID,
      secretAccessKey: AWS_SECRET_ACCESS_KEY,
    }
  });
  console.log('[S3 Service] 已啟用 AWS S3 檔案上傳模式');
} else {
  console.log('[S3 Service] ⚠️ 尚未設定 AWS 金鑰，目前使用「本機儲存 Fallback 模式」');
}

/**
 * 檔案上傳服務 (優先嘗試上傳 S3，失敗或未設定時退回 Local)
 * @param {Buffer} buffer 檔案二進位資料
 * @param {string} originalFilename 原始檔名
 * @param {string} category 檔案分類
 * @returns {Promise<string>} 檔案存取路徑(URL 或 相對路徑)
 */
async function uploadFile(buffer, originalFilename, category = 'general') {
  const ext = path.extname(originalFilename);
  const randomName = crypto.randomBytes(16).toString('hex') + ext;
  const s3Key = `wdmc-erp/${category}/${Date.now()}_${randomName}`;

  if (isS3Configured) {
    try {
      const command = new PutObjectCommand({
        Bucket: AWS_S3_BUCKET,
        Key: s3Key,
        Body: buffer,
        // 設定 MIME Type 可視需求補充 mime 庫，這裡簡單處理
        ContentType: 'application/octet-stream' 
      });
      await s3Client.send(command);
      // 組裝 S3 URL (適用於公開 Bucket)
      return `https://${AWS_S3_BUCKET}.s3.${AWS_REGION}.amazonaws.com/${s3Key}`;
    } catch (err) {
      console.error('[S3 Service] S3 上傳失敗，退回本地模式', err);
      // 失敗時繼續執行下方本地模式
    }
  }

  // Fallback: Local Storage
  const DATA_DIR = path.join(__dirname, '..', '..', '..', 'data', 'uploads', category);
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  const localFileName = Date.now().toString() + '_' + originalFilename.replace(/\\s+/g, '_');
  const localPath = path.join(DATA_DIR, localFileName);
  fs.writeFileSync(localPath, buffer);
  
  return `/api/files/download/${category}/${localFileName}`;
}

module.exports = {
  isS3Configured,
  uploadFile
};
