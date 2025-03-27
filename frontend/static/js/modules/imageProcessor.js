// 이미지 처리 및 보정 기능
export class ImageProcessor {
  static captureFrame(videoElement, options = {}) {
    const { width = 350, height = 450 } = options;
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    
    const ctx = canvas.getContext('2d');
    this.#drawVideoFrame(ctx, videoElement, canvas);
    return canvas.toDataURL('image/jpeg', 0.95);
  }

  static #drawVideoFrame(ctx, video, canvas) {
    const videoAspect = video.videoWidth / video.videoHeight;
    const canvasAspect = canvas.width / canvas.height;
    
    let [drawWidth, drawHeight] = [video.videoWidth, video.videoHeight];
    let [startX, startY] = [0, 0];

    if (videoAspect > canvasAspect) {
      drawWidth = video.videoHeight * canvasAspect;
      startX = (video.videoWidth - drawWidth) / 2;
    } else {
      drawHeight = video.videoWidth / canvasAspect;
      startY = (video.videoHeight - drawHeight) / 2;
    }

    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.translate(canvas.width, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(video, startX, startY, drawWidth, drawHeight, 0, 0, canvas.width, canvas.height);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
  }

  // 표준 사진 규격 가이드라인 그리기 - 최소화된 버전
  static drawPhotoGuideLines(canvas) {
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;
    
    // 가이드라인 스타일 설정
    ctx.strokeStyle = 'rgba(0, 150, 255, 0.7)';
    ctx.lineWidth = 1;
    
    // 중앙 위치 가이드라인
    const centerLine = width / 2;
    
    // 중앙 세로선만 그리기
    ctx.beginPath();
    ctx.moveTo(centerLine, 0);
    ctx.lineTo(centerLine, height);
    ctx.stroke();
    
    // 사진 규격 표시
    ctx.fillStyle = 'rgba(0, 150, 255, 0.9)';
    ctx.font = '12px Arial';
    ctx.fillText('3.5cm x 4.5cm', 5, 15);
    
    return canvas;
  }
  
  // 얼굴 위치 자동 보정 함수
  static adjustFacePosition(imageData, options = {}) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = 350;  // 표준 면허 사진 가로 크기
        canvas.height = 450; // 표준 면허 사진 세로 크기
        
        const ctx = canvas.getContext('2d');
        
        // 배경색 설정 (흰색)
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // 이미지 그리기
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        
        // 가이드라인 그리기 (옵션에 따라)
        if (options.showGuideLines) {
          this.drawPhotoGuideLines(canvas);
        }
        
        resolve(canvas.toDataURL('image/jpeg', 0.95));
      };
      
      img.onerror = () => {
        reject(new Error('이미지 로드 실패'));
      };
      
      img.src = imageData;
    });
  }

  static async enhanceImage(imageData, options) {
    try {
      console.log('Sending image data to backend for enhancement...');
      
      // 얼굴 위치 자동 보정 (옵션에 따라)
      if (options.adjustFacePosition) {
        imageData = await this.adjustFacePosition(imageData, {
          showGuideLines: options.showGuideLines || false
        });
      }
      
      const response = await fetch('/api/enhance_image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          image_data: imageData,
          options: {
            remove_background: true, // 배경 제거 강제 적용
            ...options
          }
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '서버 오류가 발생했습니다');
      }
      
      const data = await response.json();
      
      return {
        enhanced_image: data.enhanced_image,
        metadata: data.metadata
      };

    } catch (error) {
      console.error('Image enhancement error:', error);
      throw new Error(`이미지 처리 실패: ${error.message}`);
    }
  }
} 