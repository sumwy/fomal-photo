/**
 * 이미지 처리를 위한 Web Worker
 * 
 * 이미지 처리 작업을 메인 스레드에서 분리하여 UI가 차단되지 않도록 합니다.
 * 이 워커는 이미지 압축, 전처리, 서버 통신 작업을 담당합니다.
 */

// 워커 내에서 사용할 유틸리티 함수들
const workerUtils = {
  /**
   * 이미지 압축
   * @param {string} imageData - 이미지 데이터 URL
   * @param {Object} options - 압축 옵션
   * @returns {Promise<string>} 압축된 이미지 데이터 URL
   */
  compressImage: async function(imageData, options = {}) {
    const { maxWidth = 1200, maxHeight = 1200, quality = 0.85 } = options;

    return new Promise((resolve, reject) => {
      try {
        // 이미지 로드
        const img = new Image();
        img.onload = () => {
          // 원본 치수
          let width = img.width;
          let height = img.height;
          
          // 필요한 경우 크기 조정
          if (width > maxWidth || height > maxHeight) {
            const ratio = Math.min(maxWidth / width, maxHeight / height);
            width = Math.floor(width * ratio);
            height = Math.floor(height * ratio);
          }
          
          // 캔버스 생성 및 이미지 그리기
          const canvas = new OffscreenCanvas(width, height);
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);
          
          // 이미지 압축
          canvas.convertToBlob({ type: 'image/jpeg', quality })
            .then(blob => {
              // Blob을 데이터 URL로 변환
              const reader = new FileReader();
              reader.onloadend = () => resolve(reader.result);
              reader.onerror = () => reject(new Error('이미지 압축 중 오류 발생'));
              reader.readAsDataURL(blob);
            })
            .catch(reject);
        };
        
        img.onerror = () => {
          reject(new Error('이미지 로드 실패'));
        };
        
        img.src = imageData;
      } catch (error) {
        reject(error);
      }
    });
  },
  
  /**
   * 서버에 이미지 처리 요청 전송
   * @param {string} url - 서버 엔드포인트
   * @param {string} imageData - 이미지 데이터
   * @param {Object} options - 처리 옵션
   * @returns {Promise<Object>} 서버 응답
   */
  processImageOnServer: async function(url, imageData, options = {}) {
    try {
      // FormData 객체 생성
      const formData = new FormData();
      formData.append('image', imageData);
      
      // 옵션 추가
      for (const [key, value] of Object.entries(options)) {
        formData.append(key, typeof value === 'boolean' ? value.toString() : value);
      }
      
      // 서버 요청
      const response = await fetch(url, {
        method: 'POST',
        body: formData,
        credentials: 'same-origin',
        headers: {
          'X-Requested-With': 'XMLHttpRequest'
        }
      });
      
      if (!response.ok) {
        throw new Error(`서버 오류: ${response.status} ${response.statusText}`);
      }
      
      return await response.json();
    } catch (error) {
      throw error;
    }
  }
};

// Worker 메시지 핸들러
self.addEventListener('message', async (event) => {
  try {
    const { type, data } = event.data;
    
    switch (type) {
      case 'compress':
        // 이미지 압축
        const compressed = await workerUtils.compressImage(
          data.imageData, 
          data.options
        );
        self.postMessage({
          type: 'compress_result',
          data: { imageData: compressed, requestId: data.requestId }
        });
        break;
        
      case 'process':
        // 이미지 압축 후 서버에 처리 요청
        const optimizedImage = await workerUtils.compressImage(
          data.imageData, 
          data.compressionOptions || { quality: 0.9 }
        );
        
        const result = await workerUtils.processImageOnServer(
          data.url || '/process_image',
          optimizedImage,
          data.processingOptions || {}
        );
        
        self.postMessage({
          type: 'process_result',
          data: { result, requestId: data.requestId }
        });
        break;
        
      default:
        self.postMessage({
          type: 'error',
          data: { error: '알 수 없는 작업 유형', requestId: data?.requestId }
        });
    }
  } catch (error) {
    self.postMessage({
      type: 'error',
      data: { error: error.message, requestId: event.data?.data?.requestId }
    });
  }
}); 