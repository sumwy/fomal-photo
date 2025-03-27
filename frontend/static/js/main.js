import { CameraManager } from './modules/camera.js';
import { ImageProcessor } from './modules/imageProcessor.js';
import { CropTool } from './modules/cropTool.js';
import { DownloadHandler } from './modules/downloadHandler.js';
import * as UI from './modules/ui.js';
import { validateImageData, secureFetch, getImageDataSize } from './modules/utils.js';
import { workerManager } from './modules/workerManager.js';
import { debugManager } from './modules/debug.js';

/**
 * 메인 애플리케이션 클래스
 * 전체 애플리케이션 로직과 상태를 관리합니다.
 */
export default class App {
  constructor() {
    // 상태 데이터
    this.state = {
      capturedImageData: null,
      editedImageData: null,
      isProcessing: false
    };
    
    // 컴포넌트 인스턴스 초기화
    this.downloadHandler = new DownloadHandler();
    this.imageProcessor = new ImageProcessor();
    
    // DOM 로드 완료 후 초기화
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => this.initialize());
    } else {
      this.initialize();
    }
  }

  /**
   * 애플리케이션 초기화
   */
  async initialize() {
    try {
      // 필수 요소 확인
      const requiredElements = [
        'camera-preview', 
        'capture-button', 
        'original-photo-container', 
        'original-photo', 
        'thumbnail-list'
      ];
      
      if (!UI.checkRequiredElements(requiredElements)) {
        UI.showError('필수 요소가 없어 앱을 초기화할 수 없습니다.', true);
        return;
      }
      
      // 카메라 초기화
      const video = document.getElementById('camera-preview');
      this.cameraManager = new CameraManager(video);
      await this.cameraManager.initialize();
      
      // CropTool 초기화
      const cropOverlay = document.getElementById('crop-overlay');
      const cropBox = document.getElementById('crop-box');
      const cameraContainer = document.querySelector('.camera-container');
      
      if (cropOverlay && cropBox && cameraContainer) {
        this.cropTool = new CropTool(cropOverlay, cropBox, cameraContainer);
      }
      
      // 이벤트 리스너 설정
      this.setupEventListeners();
      
      // 페이지 언로드 시 정리 함수 호출
      window.addEventListener('beforeunload', () => this.cleanup());
      
      console.log('앱 초기화 완료');
    } catch (error) {
      console.error('앱 초기화 실패:', error);
      UI.showError('앱 초기화에 실패했습니다: ' + error.message);
    }
  }

  /**
   * 이벤트 리스너 설정
   */
  setupEventListeners() {
    // 촬영 버튼
    const captureButton = document.getElementById('capture-button');
    if (captureButton) {
      captureButton.addEventListener('click', () => this.captureAndProcessImage());
    }
    
    // 카메라 전환 버튼
    const switchCameraButton = document.getElementById('switch-camera');
    if (switchCameraButton) {
      switchCameraButton.addEventListener('click', () => this.switchCamera());
    }
    
    // 가이드라인 토글 버튼
    const toggleGuidelinesButton = document.getElementById('toggle-guidelines-button');
    if (toggleGuidelinesButton && this.cameraManager) {
      toggleGuidelinesButton.addEventListener('click', () => {
        this.cameraManager.toggleGuidelines();
      });
    }
    
    // 다시 촬영 버튼
    const resetButton = document.getElementById('reset-button');
    if (resetButton) {
      resetButton.addEventListener('click', () => {
        UI.toggleOriginalPhotoContainer(false);
        this.state.capturedImageData = null;
      });
    }
    
    // 팝업 닫기 버튼
    const popupCloseButton = document.getElementById('popup-close');
    if (popupCloseButton) {
      popupCloseButton.addEventListener('click', () => {
        UI.toggleOriginalPhotoContainer(false);
      });
    }
    
    // 팝업 다운로드 버튼
    const popupDownloadButton = document.getElementById('popup-download');
    if (popupDownloadButton) {
      popupDownloadButton.addEventListener('click', () => {
        if (this.state.editedImageData) {
          this.downloadHandler.downloadImage(this.state.editedImageData);
        }
      });
    }
  }

  /**
   * 이미지 캡처 및 처리
   */
  captureAndProcessImage() {
    const video = document.getElementById('camera-preview');
    if (!video) {
      UI.showError('카메라 미리보기를 찾을 수 없습니다.');
      return;
    }
    
    try {
      // 임시 캔버스 생성
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = video.videoWidth || 640;
      tempCanvas.height = video.videoHeight || 480;
      const context = tempCanvas.getContext('2d');
      
      // 전면 카메라 사용 시 이미지 반전 확인
      const isFrontCamera = this.cameraManager?.constraints?.video?.facingMode === 'user';
      
      if (isFrontCamera) {
        // 전면 카메라일 경우 이미지 수평 반전 처리
        context.translate(tempCanvas.width, 0);
        context.scale(-1, 1);
      }
      
      // 비디오 프레임 캡처
      context.drawImage(video, 0, 0, tempCanvas.width, tempCanvas.height);
      const imageData = tempCanvas.toDataURL('image/jpeg');
      
      // 이미지 데이터 유효성 검사
      if (!validateImageData(imageData)) {
        UI.showError('유효하지 않은 이미지 데이터입니다.');
        return;
      }
      
      // 이미지 크기 제한 (10MB)
      const imageSize = getImageDataSize(imageData);
      if (imageSize > 10 * 1024 * 1024) {
        UI.showError('이미지 크기가 너무 큽니다 (최대 10MB).');
        return;
      }
      
      // 상태 업데이트
      this.state.capturedImageData = imageData;
      
      // 이미지 처리 진행
      this.processImage(imageData);
    } catch (error) {
      console.error('이미지 캡처 중 오류:', error);
      UI.showError('이미지 캡처에 실패했습니다.');
    }
  }
  
  /**
   * 이미지 처리
   * @param {string} imageData - 이미지 데이터 URL
   */
  async processImage(imageData) {
    try {
      // 디버그: 이미지 처리 시작 측정
      debugManager.startMeasure('image-processing');
      
      // 이미지 유효성 재검증
      if (!validateImageData(imageData)) {
        throw new Error('유효하지 않은 이미지 데이터입니다.');
      }
      
      // 처리 중 상태로 설정
      this.state.isProcessing = true;
      UI.showLoading(true);
      
      // 원본 사진 표시
      UI.toggleOriginalPhotoContainer(true, imageData);
      
      // 처리 옵션 설정
      const processingOptions = {
        adjust_face_position: true,
        remove_background: true,
        upscale: true,
        skin_smoothing: true,
        eye_enhance: true,
        sharpness_enhance: true,
        use_parallel: true,
        optimize_size: true
      };
      
      // 성능 옵션 설정
      const performanceOptions = {
        compression_quality: 85
      };
      
      // WorkerManager를 사용하여 이미지 처리
      const responseData = await workerManager.processImage(imageData, {
        url: '/process_image',
        processingOptions,
        compressionOptions: {
          quality: 0.85,
          maxWidth: 1200,
          maxHeight: 1200
        }
      });
      
      if (responseData.success) {
        // 처리된 이미지 유효성 검사
        if (!validateImageData(responseData.processed_image)) {
          throw new Error('서버에서 반환된 이미지가 유효하지 않습니다.');
        }
        
        // 처리된 이미지 저장 및 표시
        this.state.editedImageData = responseData.processed_image;
        this.displayProcessedImage(responseData.processed_image);
        
        // 처리 시간 정보가 있으면 표시
        if (responseData.metadata && responseData.metadata.processing_time) {
          UI.showToast(`이미지 처리 완료 (${responseData.metadata.processing_time.toFixed(2)}초)`);
          debugManager.log('서버 처리 시간', responseData.metadata.processing_time);
        } else {
          UI.showToast('이미지 처리가 완료되었습니다.');
        }
      } else {
        throw new Error(responseData.error || '알 수 없는 오류');
      }
      
      // 디버그: 이미지 처리 종료 측정
      debugManager.endMeasure('image-processing');
    } catch (error) {
      console.error('이미지 처리 중 오류:', error);
      UI.showError('이미지 처리에 실패했습니다: ' + error.message);
    } finally {
      // 상태 복원
      this.state.isProcessing = false;
      UI.showLoading(false);
    }
  }
  
  /**
   * 처리된 이미지 표시
   * @param {string} imageData - 처리된 이미지 데이터 URL
   */
  displayProcessedImage(imageData) {
    // 이미지 데이터 유효성 검사
    if (!validateImageData(imageData)) {
      UI.showError('유효하지 않은 이미지 데이터입니다.');
      return;
    }
    
    // 썸네일 목록에 추가
    const thumbnailList = document.getElementById('thumbnail-list');
    if (thumbnailList) {
      const thumbnailItem = UI.createThumbnailItem(
        imageData, 
        (imgData) => this.downloadHandler.downloadImage(imgData)
      );
      thumbnailList.appendChild(thumbnailItem);
    }
    
    // 원본 사진 컨테이너 숨기기
    UI.toggleOriginalPhotoContainer(false);
  }
  
  /**
   * 카메라 전환
   */
  async switchCamera() {
    if (!this.cameraManager) {
      UI.showError('카메라 관리자가 초기화되지 않았습니다.');
      return;
    }
    
    try {
      // 현재 사용 중인 카메라 모드 확인
      const currentFacingMode = this.cameraManager.constraints.video.facingMode;
      
      // 반대 모드로 전환
      const newFacingMode = currentFacingMode === 'user' ? 'environment' : 'user';
      
      // 카메라 매니저의 constraints 업데이트
      this.cameraManager.constraints.video.facingMode = newFacingMode;
      
      // 기존 스트림 종료
      this.cameraManager.shutdown();
      
      // 새 설정으로 카메라 다시 초기화
      await this.cameraManager.initialize();
      
      UI.showToast(`카메라를 ${newFacingMode === 'user' ? '전면' : '후면'}으로 전환했습니다.`);
    } catch (error) {
      console.error('카메라 전환 중 오류:', error);
      UI.showError('카메라 전환에 실패했습니다.');
    }
  }

  /**
   * 앱 종료 시 정리
   */
  cleanup() {
    // 카메라 관리자 종료
    if (this.cameraManager) {
      this.cameraManager.shutdown();
    }
    
    // Worker 종료
    workerManager.terminate();
    
    // 이벤트 리스너 제거 등 추가 정리 작업
    console.log('앱 정리 완료');
  }
} 