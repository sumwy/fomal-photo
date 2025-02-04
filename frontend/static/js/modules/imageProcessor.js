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

  static async enhanceImage(imageData, options) {
    try {
      console.log('Sending image data to backend for enhancement...');
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
      console.log('Response status:', response.status);
      const data = await response.json();
      console.log('Backend response data:', data);
      if (!response.ok) throw new Error(data.error || 'Unknown error');
      
      return {
        enhanced_image: data.enhanced_image,
        metadata: data.metadata
      };

    } catch (error) {
      throw new Error(`이미지 처리 실패: ${error.message}`);
    }
  }
} 