// 카메라 초기화 및 스트림 관리
import { ImageProcessor } from './imageProcessor.js';

export class CameraManager {
  constructor(videoElement) {
    this.video = videoElement;
    this.stream = null;
    this.constraints = { 
      video: { 
        width: { ideal: 1280 }, 
        height: { ideal: 720 },
        facingMode: 'user' // 전면 카메라를 기본값으로 설정
      } 
    };
    this.guidelineCanvas = null;
    this.guidelineCtx = null;
    this.showGuidelines = true;
  }

  async initialize() {
    try {
      this.stream = await navigator.mediaDevices.getUserMedia(this.constraints);
      this.video.srcObject = this.stream;
      await this.video.play();
      
      // 가이드라인 캔버스 초기화
      this.initGuidelineCanvas();
      
      return true;
    } catch (error) {
      this.handleCameraError(error);
      return false;
    }
  }

  initGuidelineCanvas() {
    // 기존 캔버스가 있으면 제거
    if (this.guidelineCanvas) {
      this.guidelineCanvas.remove();
    }
    
    // 새 캔버스 생성
    this.guidelineCanvas = document.createElement('canvas');
    this.guidelineCanvas.className = 'guideline-canvas';
    this.guidelineCanvas.style.position = 'absolute';
    this.guidelineCanvas.style.top = '0';
    this.guidelineCanvas.style.left = '0';
    this.guidelineCanvas.style.width = '100%';
    this.guidelineCanvas.style.height = '100%';
    this.guidelineCanvas.style.pointerEvents = 'none';
    
    // 비디오 컨테이너에 캔버스 추가
    const container = this.video.parentElement;
    container.appendChild(this.guidelineCanvas);
    
    // 캔버스 크기 설정
    this.resizeGuidelineCanvas();
    
    // 가이드라인 그리기
    this.drawGuidelines();
    
    // 비디오 크기 변경 시 캔버스 크기도 조정
    window.addEventListener('resize', () => this.resizeGuidelineCanvas());
  }
  
  resizeGuidelineCanvas() {
    if (!this.guidelineCanvas) return;
    
    const container = this.video.parentElement;
    const rect = container.getBoundingClientRect();
    
    this.guidelineCanvas.width = rect.width;
    this.guidelineCanvas.height = rect.height;
    
    // 크기 변경 후 가이드라인 다시 그리기
    this.drawGuidelines();
  }
  
  drawGuidelines() {
    if (!this.guidelineCanvas || !this.showGuidelines) return;
    
    const canvas = this.guidelineCanvas;
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;
    
    // 캔버스 초기화
    ctx.clearRect(0, 0, width, height);
    
    // 가이드라인 스타일 설정
    ctx.strokeStyle = 'rgba(0, 150, 255, 0.7)';
    ctx.lineWidth = 2;
    
    // 사진 규격 표시 (3.5cm x 4.5cm 비율)
    const aspectRatio = 3.5 / 4.5;
    let photoWidth, photoHeight;
    
    if (width / height > aspectRatio) {
      // 화면이 더 넓은 경우
      photoHeight = height * 0.8;
      photoWidth = photoHeight * aspectRatio;
    } else {
      // 화면이 더 좁은 경우
      photoWidth = width * 0.8;
      photoHeight = photoWidth / aspectRatio;
    }
    
    const photoX = (width - photoWidth) / 2;
    const photoY = (height - photoHeight) / 2;
    
    // 사진 영역 테두리
    ctx.beginPath();
    ctx.rect(photoX, photoY, photoWidth, photoHeight);
    ctx.stroke();
    
    // 얼굴 위치 가이드라인 - 중앙 세로선만 표시
    const centerLine = photoX + photoWidth / 2;
    
    // 중앙 세로선
    ctx.beginPath();
    ctx.moveTo(centerLine, photoY);
    ctx.lineTo(centerLine, photoY + photoHeight);
    ctx.stroke();
    
    // 간단한 텍스트 안내
    ctx.fillStyle = 'rgba(0, 150, 255, 0.9)';
    ctx.font = '14px Arial';
    ctx.fillText('3.5cm x 4.5cm', photoX + 5, photoY + 20);
  }
  
  toggleGuidelines() {
    this.showGuidelines = !this.showGuidelines;
    if (this.showGuidelines) {
      this.drawGuidelines();
    } else if (this.guidelineCanvas) {
      const ctx = this.guidelineCanvas.getContext('2d');
      ctx.clearRect(0, 0, this.guidelineCanvas.width, this.guidelineCanvas.height);
    }
    return this.showGuidelines;
  }

  shutdown() {
    this.stream?.getTracks().forEach(track => {
      track.stop();
      track.enabled = false;
    });
    this.video.srcObject = null;
    
    // 가이드라인 캔버스 제거
    if (this.guidelineCanvas) {
      this.guidelineCanvas.remove();
      this.guidelineCanvas = null;
    }
  }

  handleCameraError(error) {
    console.error('Camera Error:', error);
    const errorMap = {
      'NotAllowedError': '카메라 접근 권한이 필요합니다',
      'NotFoundError': '사용 가능한 카메라를 찾을 수 없습니다',
      'default': '카메라 초기화에 실패했습니다'
    };
    alert(errorMap[error.name] || errorMap.default);
  }
} 