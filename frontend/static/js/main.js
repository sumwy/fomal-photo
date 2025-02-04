import { CameraManager } from './modules/camera.js';
import { ImageProcessor } from './modules/imageProcessor.js';
import { CropTool } from './modules/cropTool.js';
import { DownloadHandler } from './modules/downloadHandler.js';

class App {
  constructor() {
    this.video = document.getElementById('camera-preview');
    this.camera = new CameraManager(this.video);
    this.cropTool = new CropTool(
      document.getElementById('crop-overlay'),
      document.getElementById('crop-box'),
      this.video.parentElement
    );
    
    this.#bindElements();
    this.#setupEventListeners();
    this.state = {
      currentImage: null,
      thumbnails: [],
      processing: false
    };
  }

  #bindElements() {
    this.elements = {
      captureButton: document.getElementById('capture-button'),
      resetButton: document.getElementById('reset-button'),
      popupDownloadButton: document.getElementById('popup-download'),
      originalPhoto: document.getElementById('original-photo'),
      thumbnailList: document.getElementById('thumbnail-list'),
      loadingOverlay: document.getElementById('loading-overlay'),
      downloadHistoryList: document.getElementById('download-history-list'),
      originalPhotoContainer: document.getElementById('original-photo-container')
    };
  }

  #setupEventListeners() {
    this.elements.captureButton.addEventListener('click', async () => {
      await this.captureAndProcessImage();
    });
    this.elements.resetButton.addEventListener('click', () => this.#handleReset());
    const cropButton = document.getElementById('crop-button');
    if (cropButton) {
      cropButton.addEventListener('click', () => this.cropTool.toggle());
    }
    this.elements.popupDownloadButton.addEventListener('click', (e) => {
      e.preventDefault();
      this.#handleDownload().catch(error => {
        console.error('Download error:', error);
        this.showError(error.message);
      });
    });
  }

  async #initialize() {
    const success = await this.camera.initialize();
    if (!success) this.showError('카메라 초기화 실패');

    // localStorage에서 이전 데이터 불러오기
    const savedImage = localStorage.getItem('currentImage');
    const savedThumbnails = JSON.parse(localStorage.getItem('thumbnails') || '[]');
    
    if (savedImage) {
      this.state.currentImage = savedImage;
      this.state.thumbnails = savedThumbnails;
      this.#updateUI();
      this.hidePopup();
    }
    
    // 리셋 버튼 핸들러 수정
    this.elements.resetButton.addEventListener('click', () => {
      // 사진 목록 및 이미지 저장 데이터 모두 삭제
      this.state.currentImage = null;
      this.state.thumbnails = [];
      localStorage.removeItem('currentImage');
      localStorage.removeItem('thumbnails');
      
      // UI 초기화: 촬영 이미지와 썸네일 목록 모두 삭제
      this.elements.originalPhoto.src = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==';
      this.elements.originalPhoto.style.transform = '';
      this.#updateUI();
      // 팝업 닫기 (필요 시)
      this.hidePopup();
    });
  }

  #saveToStorage() {
    localStorage.setItem('currentImage', this.state.currentImage);
    localStorage.setItem('thumbnails', JSON.stringify(this.state.thumbnails));
  }

  #handleReset() {
    // this.camera.shutdown(); // 카메라를 종료하지 않습니다.
    this.state.currentImage = null;
    this.state.thumbnails = [];
    this.elements.originalPhoto.src = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==';
  }

  async #handleDownload() {
    if (!this.state.currentImage) {
      throw new Error('저장된 이미지가 없습니다');
    }
    await DownloadHandler.download(
      this.state.currentImage, 
      `driver_license_${Date.now()}.jpg`
    );
  }

  #updateUI() {
    if (this.state.currentImage) {
      this.elements.originalPhoto.src = this.state.currentImage;
      this.elements.originalPhoto.style.transform = '';
    }
    
    this.#updateThumbnailList();
  }

  #updateThumbnailList() {
    const thumbnailList = this.elements.thumbnailList;
    thumbnailList.innerHTML = '';
    
    this.state.thumbnails.forEach(imageData => {
      const thumbnailItem = document.createElement('li');
      thumbnailItem.className = 'thumbnail-item';
      
      const img = new Image();
      img.src = imageData;
      img.onclick = () => {
        this.#updatePhotoDisplay(imageData);
      };
      
      thumbnailItem.appendChild(img);
      thumbnailList.appendChild(thumbnailItem);
    });
  }

  #addThumbnail(imageData) {
    const MAX_THUMBNAILS = 5;
    const thumbnailList = this.elements.thumbnailList;
    
    // 기존 썸네일 개수 제한
    while (thumbnailList.children.length >= MAX_THUMBNAILS) {
      thumbnailList.removeChild(thumbnailList.lastElementChild);
    }

    const thumbnailItem = document.createElement('li');
    thumbnailItem.className = 'thumbnail-item';
    
    const thumbnailImage = new Image();
    thumbnailImage.src = imageData;
    thumbnailImage.onload = () => {
      thumbnailImage.style.transform = '';
      thumbnailImage.style.cursor = 'pointer';
      thumbnailImage.title = '클릭하여 원본 보기';
    };
    
    thumbnailImage.addEventListener('click', () => {
      this.#updatePhotoDisplay(imageData);
    });

    thumbnailItem.appendChild(thumbnailImage);
    thumbnailList.prepend(thumbnailItem);
  }

  #updatePhotoDisplay(imageData) {
    this.elements.originalPhoto.src = imageData;
    this.elements.originalPhoto.style.transform = '';
    this.showPopup();
    
    // 현재 이미지 업데이트
    this.state.currentImage = imageData;
    localStorage.setItem('currentImage', imageData);
  }

  #updateMainDisplay() {
    this.#updateUI();
    this.elements.originalPhotoContainer.style.display = 'block';
  }

  // ... 나머지 헬퍼 메서드 구현

  // public 메서드로 변경하여 외부에서 접근 가능하도록
  updateMainDisplay() {
    this.#updateUI();
  }

  // public 메서드 추가하여 외부에서 초기화를 호출하도록 함
  async initialize() {
    await this.#initialize();
  }

  // 추가: 오류 메시지 표시를 위한 showError() 메서드
  showError(message) {
    alert(message);
  }

  // 팝업 보이기: 모달 오버레이 형태로 전환
  showPopup() {
    this.elements.originalPhotoContainer.style.display = 'flex';
    this.elements.originalPhotoContainer.classList.add('popup-visible');
  }

  // 팝업 숨기기
  hidePopup() {
    this.elements.originalPhotoContainer.style.display = 'none';
    this.elements.originalPhotoContainer.classList.remove('popup-visible');
  }

  // 새로운 캡처 및 백엔드 보정 호출 메서드 추가
  async captureAndProcessImage() {
    try {
      this.state.processing = true;
      this.elements.loadingOverlay.style.display = 'flex';
      
      // 비디오 프레임 캡처 (ImageProcessor.captureFrame 활용)
      const rawImageData = ImageProcessor.captureFrame(this.video);
      
      // 백엔드 보정 API 호출 (모든 옵션은 기본 true로 적용)
      const result = await ImageProcessor.enhanceImage(rawImageData);
      
      if (result && result.enhanced_image) {
        console.log('Enhanced image received:', result.enhanced_image);
        // 보정된 이미지 상태 업데이트
        this.state.currentImage = result.enhanced_image;
        this.state.thumbnails.unshift(result.enhanced_image);
        
        // 로컬 스토리지 저장
        this.#saveToStorage();
        
        // UI 갱신 및 팝업 표시
        this.#updateUI();
        this.showPopup();
      } else {
        this.showError('보정된 이미지가 없습니다.');
      }
    } catch (error) {
      console.error('Capture and process error:', error);
      this.showError(error.message);
    } finally {
      this.state.processing = false;
      this.elements.loadingOverlay.style.display = 'none';
    }
  }
}

// 기존 DOMContentLoaded 리스너는 script.js에서 처리하므로 삭제하거나 주석 처리

export default App; 