// 카메라 초기화 및 스트림 관리
export class CameraManager {
  constructor(videoElement) {
    this.video = videoElement;
    this.stream = null;
    this.constraints = { 
      video: { 
        width: { ideal: 1280 }, 
        height: { ideal: 720 },
        facingMode: 'environment' 
      } 
    };
  }

  async initialize() {
    try {
      this.stream = await navigator.mediaDevices.getUserMedia(this.constraints);
      this.video.srcObject = this.stream;
      await this.video.play();
      return true;
    } catch (error) {
      this.handleCameraError(error);
      return false;
    }
  }

  shutdown() {
    this.stream?.getTracks().forEach(track => {
      track.stop();
      track.enabled = false;
    });
    this.video.srcObject = null;
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