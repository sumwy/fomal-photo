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
      isProcessing: false,
      thumbnails: [],
      enhancementOptions: {
        skinSmoothing: true,
        eyeEnhance: true,
        sharpnessEnhance: true,
        bgRemoval: true
      },
      currentFilter: 'standard' // 기본 필터
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
        UI.showToast('필수 요소가 없어 앱을 초기화할 수 없습니다.', 'error');
        return;
      }
      
      // 카메라 초기화
      const video = document.getElementById('camera-preview');
      this.cameraManager = new CameraManager(video);
      await this.cameraManager.initialize();
      
      // 카메라 상태 변경
      this.updateCameraStatus('준비완료');
      
      // 이벤트 리스너 설정
      this.setupEventListeners();
      
      // 강화 옵션 이벤트 리스너 설정
      this.setupEnhancementOptions();
      
      // 키보드 단축키 설정
      this.setupKeyboardShortcuts();
      
      // 페이지 언로드 시 정리 함수 호출
      window.addEventListener('beforeunload', () => this.cleanup());
      
      // 로컬 스토리지에서 이전 썸네일 로드
      this.loadThumbnailsFromStorage();
      
      // 토스트 메시지 표시
      UI.showToast('카메라가 준비되었습니다.', 'success');
      
      console.log('앱 초기화 완료');
    } catch (error) {
      console.error('앱 초기화 실패:', error);
      UI.showToast('앱 초기화에 실패했습니다: ' + error.message, 'error');
      this.updateCameraStatus('오류 발생', 'error');
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
    
    // 필터 토글 버튼
    const filterToggle = document.querySelector('.filter-toggle');
    if (filterToggle) {
      filterToggle.addEventListener('click', () => this.toggleFilterOptions());
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
          UI.showToast('이미지가 다운로드되었습니다.', 'success');
        }
      });
    }
    
    // 팝업 공유 버튼
    const popupShareButton = document.getElementById('popup-share');
    if (popupShareButton) {
      popupShareButton.addEventListener('click', () => {
        this.shareImage();
      });
    }
    
    // 모두 지우기 버튼
    const clearAllButton = document.getElementById('clear-all');
    if (clearAllButton) {
      clearAllButton.addEventListener('click', () => {
        this.clearAllThumbnails();
      });
    }
    
    // 갤러리 버튼
    const galleryButton = document.querySelector('.gallery-button');
    if (galleryButton) {
      galleryButton.addEventListener('click', () => {
        this.showGallery();
      });
    }
    
    // 키보드 단축키 도움말 닫기 버튼
    const closeShortcutsButton = document.querySelector('.close-shortcuts');
    if (closeShortcutsButton) {
      closeShortcutsButton.addEventListener('click', () => {
        document.querySelector('.keyboard-shortcuts').style.display = 'none';
      });
    }
  }
  
  /**
   * 강화 옵션 설정
   */
  setupEnhancementOptions() {
    // 피부 보정 옵션
    const skinSmoothingOption = document.getElementById('option-skin-smoothing');
    if (skinSmoothingOption) {
      skinSmoothingOption.addEventListener('change', (e) => {
        this.state.enhancementOptions.skinSmoothing = e.target.checked;
      });
    }
    
    // 눈 강조 옵션
    const eyeEnhanceOption = document.getElementById('option-eye-enhance');
    if (eyeEnhanceOption) {
      eyeEnhanceOption.addEventListener('change', (e) => {
        this.state.enhancementOptions.eyeEnhance = e.target.checked;
      });
    }
    
    // 선명도 향상 옵션
    const sharpnessOption = document.getElementById('option-sharpness');
    if (sharpnessOption) {
      sharpnessOption.addEventListener('change', (e) => {
        this.state.enhancementOptions.sharpnessEnhance = e.target.checked;
      });
    }
    
    // 배경 제거 옵션
    const bgRemovalOption = document.getElementById('option-bg-removal');
    if (bgRemovalOption) {
      bgRemovalOption.addEventListener('change', (e) => {
        this.state.enhancementOptions.bgRemoval = e.target.checked;
      });
    }
  }

  /**
   * 키보드 단축키 설정
   */
  setupKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
      // 현재 입력 필드에 포커스된 경우 단축키 무시
      if (document.activeElement.tagName === 'INPUT' || 
          document.activeElement.tagName === 'TEXTAREA') {
        return;
      }
      
      switch (e.key) {
        case ' ': // 스페이스바
          e.preventDefault();
          this.captureAndProcessImage();
          break;
        case 'r':
        case 'R':
          if (document.getElementById('original-photo-container').style.display !== 'none') {
            UI.toggleOriginalPhotoContainer(false);
          }
          break;
        case 'g':
        case 'G':
          if (this.cameraManager) {
            this.cameraManager.toggleGuidelines();
          }
          break;
        case 's':
        case 'S':
          this.switchCamera();
          break;
        case 'Escape':
          if (document.getElementById('original-photo-container').style.display !== 'none') {
            UI.toggleOriginalPhotoContainer(false);
          } else if (document.querySelector('.keyboard-shortcuts').style.display !== 'none') {
            document.querySelector('.keyboard-shortcuts').style.display = 'none';
          }
          break;
        case 'h':
        case 'H': // 도움말 표시
          document.querySelector('.keyboard-shortcuts').style.display = 
            document.querySelector('.keyboard-shortcuts').style.display === 'none' ? 'flex' : 'none';
          break;
      }
    });
  }
  
  /**
   * 필터 옵션 토글
   */
  toggleFilterOptions() {
    // 여기서 필터 옵션 UI를 표시할 수 있습니다.
    UI.showToast('이 기능은 곧 제공될 예정입니다.', 'info');
  }

  /**
   * 이미지 캡처 및 처리
   */
  captureAndProcessImage() {
    const video = document.getElementById('camera-preview');
    if (!video) {
      UI.showToast('카메라 미리보기를 찾을 수 없습니다.', 'error');
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
      
      // 카메라 셔터 효과음 재생
      this.playShutterSound();
      
      // 이미지 데이터 유효성 검사
      if (!validateImageData(imageData)) {
        UI.showToast('유효하지 않은 이미지 데이터입니다.', 'error');
        return;
      }
      
      // 이미지 크기 제한 (10MB)
      const imageSize = getImageDataSize(imageData);
      if (imageSize > 10 * 1024 * 1024) {
        UI.showToast('이미지 크기가 너무 큽니다 (최대 10MB).', 'error');
        return;
      }
      
      // 상태 업데이트
      this.state.capturedImageData = imageData;
      
      // 이미지 처리 진행
      this.processImage(imageData);
    } catch (error) {
      console.error('이미지 캡처 중 오류:', error);
      UI.showToast('이미지 캡처에 실패했습니다.', 'error');
    }
  }
  
  /**
   * 셔터 효과음 재생
   */
  playShutterSound() {
    try {
      // UI 모듈의 playSound 함수 사용
      import('./modules/ui.js').then(module => {
        const UI = module.default;
        UI.playSound('shutter', 0.5);
      }).catch(error => {
        console.error('UI 모듈 로드 실패:', error);
        // 폴백: 직접 오디오 재생
        const audio = new Audio('/static/audio/shutter.mp3');
        audio.play();
      });
    } catch (error) {
      console.error('효과음 재생 실패:', error);
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
      
      // 강화 옵션 적용
      const processingOptions = {
        adjust_face_position: true,
        remove_background: this.state.enhancementOptions.bgRemoval,
        upscale: true,
        skin_smoothing: this.state.enhancementOptions.skinSmoothing,
        eye_enhance: this.state.enhancementOptions.eyeEnhance,
        sharpness_enhance: this.state.enhancementOptions.sharpnessEnhance,
        use_parallel: true,
        optimize_size: true
      };
      
      // 성능 옵션 설정
      const performanceOptions = {
        compression_quality: 85
      };
      
      // 로딩 진행 상태 업데이트
      this.updateLoadingProgress(10);
      
      // WorkerManager를 사용하여 이미지 처리
      const responseData = await workerManager.processImage(imageData, {
        url: '/process_image',
        processingOptions,
        compressionOptions: {
          quality: 0.85,
          maxWidth: 1200,
          maxHeight: 1200
        },
        onProgress: (progress) => {
          // 진행 상황 업데이트 (10% ~ 90%)
          this.updateLoadingProgress(10 + (progress * 80));
        }
      });
      
      // 로딩 진행 상태 업데이트
      this.updateLoadingProgress(90);
      
      if (responseData.success) {
        // 처리된 이미지 유효성 검사
        if (!validateImageData(responseData.processed_image)) {
          throw new Error('서버에서 반환된 이미지가 유효하지 않습니다.');
        }
        
        // 처리된 이미지 저장 및 표시
        this.state.editedImageData = responseData.processed_image;
        this.displayProcessedImage(responseData.processed_image);
        
        // 이미지 메타데이터 표시
        this.updateImageMetadata(responseData.processed_image);
        
        // 썸네일 추가
        this.addThumbnail(responseData.processed_image);
        
        // 처리 시간 정보가 있으면 표시
        if (responseData.metadata && responseData.metadata.processing_time) {
          UI.showToast(`이미지 처리 완료 (${responseData.metadata.processing_time.toFixed(2)}초)`, 'success');
          debugManager.log('서버 처리 시간', responseData.metadata.processing_time);
        } else {
          UI.showToast('이미지 처리가 완료되었습니다.', 'success');
        }
        
        // 로딩 진행 상태 완료
        this.updateLoadingProgress(100);
      } else {
        throw new Error(responseData.error || '이미지 처리 실패');
      }
    } catch (error) {
      console.error('이미지 처리 중 오류:', error);
      UI.showToast('이미지 처리에 실패했습니다: ' + error.message, 'error');
    } finally {
      // 로딩 인디케이터 숨기기
      UI.showLoading(false);
      this.state.isProcessing = false;
      
      // 디버그: 이미지 처리 종료 측정
      debugManager.endMeasure('image-processing');
    }
  }
  
  /**
   * 로딩 진행 상태 업데이트
   * @param {number} percent - 진행률 (0-100)
   */
  updateLoadingProgress(percent) {
    const progressBar = document.querySelector('.loading-progress .progress-bar');
    if (progressBar) {
      progressBar.style.width = `${percent}%`;
    }
  }
  
  /**
   * 이미지 메타데이터 업데이트
   * @param {string} imageData - 이미지 데이터 URL
   */
  updateImageMetadata(imageData) {
    // 이미지 해상도 및 크기 계산
    const img = new Image();
    img.onload = () => {
      const resolutionEl = document.getElementById('photo-resolution');
      const sizeEl = document.getElementById('photo-size');
      
      if (resolutionEl) {
        resolutionEl.textContent = `${img.width} x ${img.height} px`;
      }
      
      if (sizeEl) {
        const sizeInKB = Math.round(getImageDataSize(imageData) / 1024);
        sizeEl.textContent = `${sizeInKB} KB`;
      }
    };
    img.src = imageData;
  }

  /**
   * 썸네일 추가
   * @param {string} imageData - 이미지 데이터 URL
   */
  addThumbnail(imageData) {
    const thumbnailList = document.getElementById('thumbnail-list');
    const thumbnailId = `thumbnail-${Date.now()}`;
    
    if (thumbnailList) {
      // 새 썸네일 생성
      const li = document.createElement('li');
      li.setAttribute('data-id', thumbnailId);
      
      const img = document.createElement('img');
      img.src = imageData;
      img.alt = '촬영 사진';
      
      // 썸네일 클릭 이벤트
      img.addEventListener('click', () => {
        this.showImage(imageData);
      });
      
      li.appendChild(img);
      thumbnailList.appendChild(li);
      
      // 썸네일 배열에 추가
      this.state.thumbnails.push({
        id: thumbnailId,
        data: imageData,
        timestamp: Date.now()
      });
      
      // 로컬 스토리지에 저장
      this.saveThumbnailsToStorage();
      
      // 썸네일 카운트 업데이트
      this.updateThumbnailCount();
    }
  }
  
  /**
   * 모든 썸네일 제거
   */
  clearAllThumbnails() {
    if (confirm('모든 사진을 삭제하시겠습니까?')) {
      const thumbnailList = document.getElementById('thumbnail-list');
      if (thumbnailList) {
        thumbnailList.innerHTML = '';
      }
      
      this.state.thumbnails = [];
      localStorage.removeItem('thumbnails');
      
      // 썸네일 카운트 업데이트
      this.updateThumbnailCount();
      
      UI.showToast('모든 사진이 삭제되었습니다.', 'info');
    }
  }
  
  /**
   * 썸네일 카운트 업데이트
   */
  updateThumbnailCount() {
    const countElement = document.getElementById('photo-count');
    if (countElement) {
      countElement.textContent = this.state.thumbnails.length;
    }
  }
  
  /**
   * 썸네일을 로컬 스토리지에 저장
   */
  saveThumbnailsToStorage() {
    try {
      // 최대 10개까지만 저장 (최신순)
      const recentThumbnails = this.state.thumbnails
        .sort((a, b) => b.timestamp - a.timestamp)
        .slice(0, 10);
      
      localStorage.setItem('thumbnails', JSON.stringify(recentThumbnails));
    } catch (error) {
      console.error('썸네일 저장 실패:', error);
    }
  }
  
  /**
   * 로컬 스토리지에서 썸네일 로드
   */
  loadThumbnailsFromStorage() {
    try {
      const storedThumbnails = localStorage.getItem('thumbnails');
      if (storedThumbnails) {
        this.state.thumbnails = JSON.parse(storedThumbnails);
        
        // 썸네일 표시
        this.state.thumbnails.forEach(thumbnail => {
          this.addThumbnailToDOM(thumbnail.id, thumbnail.data);
        });
        
        // 썸네일 카운트 업데이트
        this.updateThumbnailCount();
      }
    } catch (error) {
      console.error('썸네일 로드 실패:', error);
    }
  }
  
  /**
   * 썸네일을 DOM에 추가
   * @param {string} id - 썸네일 ID
   * @param {string} imageData - 이미지 데이터 URL
   */
  addThumbnailToDOM(id, imageData) {
    const thumbnailList = document.getElementById('thumbnail-list');
    
    if (thumbnailList) {
      const li = document.createElement('li');
      li.setAttribute('data-id', id);
      
      const img = document.createElement('img');
      img.src = imageData;
      img.alt = '촬영 사진';
      
      // 썸네일 클릭 이벤트
      img.addEventListener('click', () => {
        this.showImage(imageData);
      });
      
      li.appendChild(img);
      thumbnailList.appendChild(li);
    }
  }
  
  /**
   * 이미지 표시
   * @param {string} imageData - 이미지 데이터 URL
   */
  showImage(imageData) {
    if (imageData) {
      UI.toggleOriginalPhotoContainer(true, imageData);
      this.state.editedImageData = imageData;
      this.updateImageMetadata(imageData);
    }
  }
  
  /**
   * 이미지 공유
   */
  shareImage() {
    if (!this.state.editedImageData) {
      UI.showToast('공유할 이미지가 없습니다.', 'error');
      return;
    }
    
    if (navigator.share) {
      // 이미지를 Blob으로 변환
      fetch(this.state.editedImageData)
        .then(res => res.blob())
        .then(blob => {
          const file = new File([blob], "증명사진.jpg", { type: "image/jpeg" });
          navigator.share({
            title: '증명사진',
            text: 'FomalPix로 만든 증명사진입니다.',
            files: [file]
          })
          .then(() => UI.showToast('이미지가 공유되었습니다.', 'success'))
          .catch(error => {
            console.error('공유 실패:', error);
            UI.showToast('이미지 공유에 실패했습니다.', 'error');
          });
        });
    } else {
      UI.showToast('공유 기능이 지원되지 않는 브라우저입니다.', 'warning');
      // 다운로드 대안 제공
      this.downloadHandler.downloadImage(this.state.editedImageData);
    }
  }

  /**
   * 처리된 이미지 표시
   * @param {string} imageData - 이미지 데이터 URL
   */
  displayProcessedImage(imageData) {
    const originalPhoto = document.getElementById('original-photo');
    if (originalPhoto) {
      originalPhoto.src = imageData;
    }
  }

  /**
   * 카메라 전환
   */
  async switchCamera() {
    if (this.state.isProcessing) {
      UI.showToast('이미지 처리 중입니다. 잠시 후 다시 시도해주세요.', 'warning');
      return;
    }
    
    try {
      UI.showToast('카메라 전환 중...', 'info');
      this.updateCameraStatus('전환 중...');
      
      await this.cameraManager.switchCamera();
      
      UI.showToast('카메라가 전환되었습니다.', 'success');
      this.updateCameraStatus('준비완료');
    } catch (error) {
      console.error('카메라 전환 중 오류:', error);
      UI.showToast('카메라 전환에 실패했습니다.', 'error');
      this.updateCameraStatus('오류', 'error');
    }
  }
  
  /**
   * 카메라 상태 업데이트
   * @param {string} status - 상태 메시지
   * @param {string} type - 상태 유형 (default, error)
   */
  updateCameraStatus(status, type = 'default') {
    const statusBadge = document.querySelector('.status-badge');
    if (statusBadge) {
      // 이전 클래스 제거
      statusBadge.classList.remove('status-error', 'status-ready');
      
      // 메시지 및 아이콘 업데이트
      let icon = 'fa-video';
      if (type === 'error') {
        statusBadge.classList.add('status-error');
        icon = 'fa-exclamation-circle';
      } else if (status === '준비완료') {
        statusBadge.classList.add('status-ready');
        icon = 'fa-check-circle';
      }
      
      statusBadge.innerHTML = `<i class="fas ${icon}"></i> ${status}`;
    }
  }
  
  /**
   * 갤러리 표시
   */
  showGallery() {
    if (this.state.thumbnails.length === 0) {
      UI.showToast('저장된 사진이 없습니다.', 'info');
      return;
    }
    
    // 가장 최근 이미지 표시
    const latestThumbnail = this.state.thumbnails[0];
    if (latestThumbnail) {
      this.showImage(latestThumbnail.data);
    }
  }

  /**
   * 정리 함수
   */
  cleanup() {
    // 카메라 정리
    if (this.cameraManager) {
      this.cameraManager.cleanup();
    }
    
    // 썸네일 로컬 스토리지에 저장
    this.saveThumbnailsToStorage();
    
    // 워커 정리
    workerManager.cleanup();
    
    console.log('앱 정리 완료');
  }
} 