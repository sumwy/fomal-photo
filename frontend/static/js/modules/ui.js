/**
 * UI 요소 관리 모듈
 * 사용자 인터페이스 관련 컴포넌트 및 기능을 관리합니다.
 */

/**
 * 로딩 인디케이터를 표시하거나 숨깁니다.
 * @param {boolean} show - true면 표시, false면 숨김
 */
export function showLoading(show = true) {
  const loadingOverlay = document.getElementById('loading-overlay');
  if (loadingOverlay) {
    loadingOverlay.style.display = show ? 'flex' : 'none';
  }
}

/**
 * 토스트 메시지를 표시합니다.
 * @param {string} message - 표시할 메시지
 * @param {string} type - 메시지 종류 ('success' 또는 'error')
 * @param {number} duration - 표시 시간(ms)
 */
export function showToast(message, type = 'success', duration = 3000) {
  // 토스트 메시지 컨테이너가 없으면 생성합니다.
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    container.style.position = 'fixed';
    container.style.top = '20px';
    container.style.right = '20px';
    container.style.zIndex = '3000';
    document.body.appendChild(container);
  }

  const toast = document.createElement('div');
  toast.className = 'toast ' + (type === 'error' ? 'toast-error' : 'toast-success');
  toast.innerText = message;
  
  // 기본 스타일
  toast.style.backgroundColor = type === 'error' ? '#dc3545' : '#28a745';
  toast.style.color = '#fff';
  toast.style.padding = '10px 20px';
  toast.style.marginBottom = '10px';
  toast.style.borderRadius = '4px';
  toast.style.boxShadow = '0 2px 6px rgba(0,0,0,0.3)';

  container.appendChild(toast);
  setTimeout(() => { 
    toast.style.opacity = '0';
    toast.style.transition = 'opacity 0.3s ease';
    setTimeout(() => container.removeChild(toast), 300);
  }, duration);
}

/**
 * 원본 사진 컨테이너를 표시하거나 숨깁니다.
 * @param {boolean} show - true면 표시, false면 숨김
 * @param {string} imageUrl - 표시할 이미지 URL (표시할 때만 필요)
 */
export function toggleOriginalPhotoContainer(show, imageUrl = null) {
  const container = document.getElementById('original-photo-container');
  if (!container) return;

  if (show && imageUrl) {
    const originalPhoto = document.getElementById('original-photo');
    if (originalPhoto) {
      originalPhoto.src = imageUrl;
    }
    container.style.display = 'block';
  } else {
    container.style.display = 'none';
  }
}

/**
 * 가이드라인을 토글합니다.
 * @param {HTMLElement} guidelineElement - 가이드라인 요소
 * @returns {boolean} 가이드라인 표시 상태
 */
export function toggleGuidelines(guidelineElement) {
  if (!guidelineElement) return false;
  
  const isVisible = guidelineElement.style.display !== 'none';
  guidelineElement.style.display = isVisible ? 'none' : 'block';
  return !isVisible;
}

/**
 * DOM 요소가 존재하는지 확인합니다.
 * @param {Array<string>} elementIds - 확인할 요소 ID 배열
 * @returns {boolean} 모든 요소가 존재하면 true
 */
export function checkRequiredElements(elementIds) {
  const missingElements = elementIds.filter(id => !document.getElementById(id));
  
  if (missingElements.length > 0) {
    console.error('필수 요소를 찾을 수 없습니다:', missingElements);
    return false;
  }
  
  return true;
}

/**
 * 썸네일 아이템을 생성합니다.
 * @param {string} imageData - 이미지 데이터 URL
 * @param {Function} onDownload - 다운로드 버튼 클릭 시 콜백
 * @returns {HTMLElement} 생성된 썸네일 아이템 요소
 */
export function createThumbnailItem(imageData, onDownload) {
  const thumbnailItem = document.createElement('div');
  thumbnailItem.className = 'thumbnail-item';
  
  const thumbnailImage = document.createElement('img');
  thumbnailImage.src = imageData;
  thumbnailImage.alt = '처리된 사진';
  
  const downloadButton = document.createElement('button');
  downloadButton.className = 'thumbnail-download';
  downloadButton.innerHTML = '<i class="fas fa-download"></i>';
  downloadButton.addEventListener('click', () => onDownload(imageData));

  thumbnailItem.appendChild(thumbnailImage);
  thumbnailItem.appendChild(downloadButton);
  
  return thumbnailItem;
}

/**
 * 에러 메시지를 표시합니다.
 * @param {string} message - 표시할 에러 메시지
 * @param {boolean} useAlert - true면 alert, false면 toast 사용
 */
export function showError(message, useAlert = false) {
  if (useAlert) {
    alert(message);
  } else {
    showToast(message, 'error');
  }
} 