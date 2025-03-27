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
    
    // 로딩 시작 시 진행 바 초기화
    if (show) {
      const progressBar = document.querySelector('.loading-progress .progress-bar');
      if (progressBar) {
        progressBar.style.width = '0%';
      }
    }
  }
}

/**
 * 토스트 메시지를 표시합니다.
 * @param {string} message - 표시할 메시지
 * @param {string} type - 메시지 종류 ('success' 또는 'error')
 * @param {number} duration - 표시 시간(ms)
 */
export function showToast(message, type = 'info', duration = 3000) {
  const toastElement = document.getElementById('toast-message');
  
  if (!toastElement) {
    console.error('토스트 메시지 요소를 찾을 수 없습니다.');
    return;
  }
  
  // 기존 타이머 제거
  if (toastElement._timeoutId) {
    clearTimeout(toastElement._timeoutId);
  }
  
  // 유형별 아이콘 결정
  let icon = '';
  toastElement.className = 'toast-message'; // 클래스 초기화
  
  switch (type) {
    case 'success':
      icon = '<i class="fas fa-check-circle"></i> ';
      toastElement.classList.add('toast-success');
      break;
    case 'error':
      icon = '<i class="fas fa-exclamation-circle"></i> ';
      toastElement.classList.add('toast-error');
      break;
    case 'warning':
      icon = '<i class="fas fa-exclamation-triangle"></i> ';
      toastElement.classList.add('toast-warning');
      break;
    case 'info':
    default:
      icon = '<i class="fas fa-info-circle"></i> ';
      toastElement.classList.add('toast-info');
      break;
  }
  
  // 메시지 설정
  toastElement.innerHTML = icon + message;
  
  // 토스트 애니메이션 처리
  toastElement.classList.add('show');
  
  // 일정 시간 후 토스트 메시지 숨김
  toastElement._timeoutId = setTimeout(() => {
    toastElement.classList.remove('show');
  }, duration);
}

/**
 * 원본 사진 컨테이너를 표시하거나 숨깁니다.
 * @param {boolean} show - true면 표시, false면 숨김
 * @param {string} imageUrl - 표시할 이미지 URL (표시할 때만 필요)
 */
export function toggleOriginalPhotoContainer(show, imageUrl = null) {
  const container = document.getElementById('original-photo-container');
  if (container) {
    if (show && imageUrl) {
      const img = document.getElementById('original-photo');
      if (img) {
        img.src = imageUrl;
        img.onload = () => {
          // 이미지 로드 후 애니메이션을 위한 클래스 추가
          container.classList.add('appear');
        };
      }
      container.style.display = 'flex';
    } else {
      container.classList.remove('appear');
      container.style.display = 'none';
    }
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
  for (const id of elementIds) {
    if (!document.getElementById(id)) {
      console.error(`필수 요소가 없습니다: #${id}`);
      return false;
    }
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

/**
 * 애니메이션 효과 적용
 * @param {HTMLElement} element - 효과를 적용할 요소
 * @param {string} animationClass - 적용할 애니메이션 클래스
 * @param {number} duration - 애니메이션 지속 시간 (밀리초)
 */
export function animateElement(element, animationClass, duration = 1000) {
  if (!element) return;
  
  element.classList.add(animationClass);
  
  setTimeout(() => {
    element.classList.remove(animationClass);
  }, duration);
}

/**
 * 화면 전환 애니메이션
 * @param {HTMLElement} fromElement - 전환 전 요소
 * @param {HTMLElement} toElement - 전환 후 요소
 * @param {string} transition - 전환 방식 ('fade', 'slide-left', 'slide-right')
 */
export function transitionScreens(fromElement, toElement, transition = 'fade') {
  if (!fromElement || !toElement) return;
  
  // 전환 클래스 초기화
  fromElement.classList.remove('screen-exit', 'slide-left-exit', 'slide-right-exit');
  toElement.classList.remove('screen-enter', 'slide-left-enter', 'slide-right-enter');
  
  // 현재 스크린 숨기기 전환
  switch (transition) {
    case 'slide-left':
      fromElement.classList.add('slide-left-exit');
      break;
    case 'slide-right':
      fromElement.classList.add('slide-right-exit');
      break;
    case 'fade':
    default:
      fromElement.classList.add('screen-exit');
      break;
  }
  
  // 다음 스크린 표시 준비
  toElement.style.display = 'block';
  
  // 다음 스크린 표시 전환
  setTimeout(() => {
    switch (transition) {
      case 'slide-left':
        toElement.classList.add('slide-left-enter');
        break;
      case 'slide-right':
        toElement.classList.add('slide-right-enter');
        break;
      case 'fade':
      default:
        toElement.classList.add('screen-enter');
        break;
    }
    
    // 전환 완료 후 이전 스크린 숨김
    setTimeout(() => {
      fromElement.style.display = 'none';
    }, 300);
  }, 50);
}

/**
 * 이미지 해상도 정보 형식화
 * @param {number} width - 이미지 너비
 * @param {number} height - 이미지 높이
 * @returns {string} 형식화된 해상도 문자열
 */
export function formatResolution(width, height) {
  return `${width} × ${height}`;
}

/**
 * 파일 크기 형식화
 * @param {number} bytes - 파일 크기 (바이트)
 * @returns {string} 형식화된 크기 문자열
 */
export function formatFileSize(bytes) {
  if (bytes < 1024) {
    return bytes + ' B';
  } else if (bytes < 1024 * 1024) {
    return (bytes / 1024).toFixed(1) + ' KB';
  } else {
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  }
}

/**
 * 카메라 상태 업데이트
 * @param {HTMLElement} statusElement - 상태 표시 요소
 * @param {string} status - 상태 메시지
 * @param {string} type - 상태 유형 (normal, warning, error)
 */
export function updateStatus(statusElement, status, type = 'normal') {
  if (!statusElement) return;
  
  // 상태 유형별 스타일 클래스 제거
  statusElement.classList.remove('status-normal', 'status-warning', 'status-error');
  
  // 상태 메시지 및 유형 설정
  statusElement.textContent = status;
  statusElement.classList.add(`status-${type}`);
}

/**
 * 폼 유효성 검사 오류 표시
 * @param {HTMLElement} inputElement - 입력 요소
 * @param {string} message - 오류 메시지
 * @param {boolean} isValid - 유효한지 여부
 */
export function showInputValidation(inputElement, message, isValid) {
  if (!inputElement) return;
  
  // 유효성 클래스 제거
  inputElement.classList.remove('input-valid', 'input-invalid');
  
  // 기존 오류 메시지 제거
  const parent = inputElement.parentElement;
  const existingError = parent.querySelector('.input-error-message');
  if (existingError) {
    parent.removeChild(existingError);
  }
  
  if (isValid) {
    // 유효한 경우
    inputElement.classList.add('input-valid');
  } else {
    // 유효하지 않은 경우
    inputElement.classList.add('input-invalid');
    
    // 오류 메시지 요소 생성
    const errorElement = document.createElement('div');
    errorElement.className = 'input-error-message';
    errorElement.textContent = message;
    
    // 오류 메시지 추가
    parent.appendChild(errorElement);
  }
}

/**
 * 모달 대화상자 표시
 * @param {string} title - 제목
 * @param {string} message - 메시지
 * @param {function} onConfirm - 확인 버튼 콜백
 * @param {function} onCancel - 취소 버튼 콜백
 */
export function showModal(title, message, onConfirm, onCancel = null) {
  // 기존 모달 제거
  let modalContainer = document.querySelector('.modal-container');
  if (modalContainer) {
    document.body.removeChild(modalContainer);
  }
  
  // 모달 컨테이너 생성
  modalContainer = document.createElement('div');
  modalContainer.className = 'modal-container';
  
  const modalContent = document.createElement('div');
  modalContent.className = 'modal-content';
  
  // 제목
  const titleElement = document.createElement('h3');
  titleElement.className = 'modal-title';
  titleElement.textContent = title;
  
  // 메시지
  const messageElement = document.createElement('p');
  messageElement.className = 'modal-message';
  messageElement.textContent = message;
  
  // 버튼 컨테이너
  const buttonContainer = document.createElement('div');
  buttonContainer.className = 'modal-buttons';
  
  // 확인 버튼
  const confirmButton = document.createElement('button');
  confirmButton.className = 'modal-button confirm-button';
  confirmButton.textContent = '확인';
  confirmButton.addEventListener('click', () => {
    document.body.removeChild(modalContainer);
    if (onConfirm) onConfirm();
  });
  
  // 모달 구성
  buttonContainer.appendChild(confirmButton);
  
  // 취소 버튼이 필요한 경우
  if (onCancel) {
    const cancelButton = document.createElement('button');
    cancelButton.className = 'modal-button cancel-button';
    cancelButton.textContent = '취소';
    cancelButton.addEventListener('click', () => {
      document.body.removeChild(modalContainer);
      onCancel();
    });
    buttonContainer.insertBefore(cancelButton, confirmButton);
  }
  
  // 모달 구성 요소 추가
  modalContent.appendChild(titleElement);
  modalContent.appendChild(messageElement);
  modalContent.appendChild(buttonContainer);
  modalContainer.appendChild(modalContent);
  
  // 모달 표시
  document.body.appendChild(modalContainer);
  
  // 모달 등장 애니메이션
  setTimeout(() => {
    modalContainer.classList.add('show');
    modalContent.classList.add('show');
  }, 10);
}

/**
 * 툴팁 표시
 * @param {HTMLElement} element - 툴팁을 표시할 요소
 * @param {string} text - 툴팁 텍스트
 * @param {string} position - 툴팁 위치 ('top', 'bottom', 'left', 'right')
 */
export function showTooltip(element, text, position = 'top') {
  if (!element) return;
  
  // 기존 툴팁 제거
  const existingTooltip = document.querySelector('.tooltip-popup');
  if (existingTooltip) {
    document.body.removeChild(existingTooltip);
  }
  
  // 툴팁 요소 생성
  const tooltip = document.createElement('div');
  tooltip.className = `tooltip-popup tooltip-${position}`;
  tooltip.textContent = text;
  
  // 요소 위치 계산
  const rect = element.getBoundingClientRect();
  
  // 위치별 좌표 설정
  switch (position) {
    case 'top':
      tooltip.style.left = rect.left + rect.width / 2 + 'px';
      tooltip.style.top = rect.top - 8 + 'px';
      break;
    case 'bottom':
      tooltip.style.left = rect.left + rect.width / 2 + 'px';
      tooltip.style.top = rect.bottom + 8 + 'px';
      break;
    case 'left':
      tooltip.style.left = rect.left - 8 + 'px';
      tooltip.style.top = rect.top + rect.height / 2 + 'px';
      break;
    case 'right':
      tooltip.style.left = rect.right + 8 + 'px';
      tooltip.style.top = rect.top + rect.height / 2 + 'px';
      break;
  }
  
  // 툴팁 표시
  document.body.appendChild(tooltip);
  
  // 툴팁 등장 애니메이션
  setTimeout(() => {
    tooltip.classList.add('show');
  }, 10);
  
  // 일정 시간 후 툴팁 제거
  setTimeout(() => {
    tooltip.classList.remove('show');
    setTimeout(() => {
      if (tooltip.parentNode) {
        document.body.removeChild(tooltip);
      }
    }, 300);
  }, 3000);
}

/**
 * 모바일 기기 감지
 * @returns {boolean} 모바일 기기면 true, 아니면 false
 */
export function isMobileDevice() {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}

/**
 * 탭 전환 UI 처리
 * @param {HTMLElement} tabContainer - 탭 컨테이너 요소
 * @param {HTMLElement} contentContainer - 콘텐츠 컨테이너 요소
 * @param {number} tabIndex - 활성화할 탭 인덱스
 */
export function switchTab(tabContainer, contentContainer, tabIndex) {
  if (!tabContainer || !contentContainer) return;
  
  // 탭 버튼 요소들
  const tabButtons = tabContainer.querySelectorAll('.tab-button');
  
  // 탭 콘텐츠 요소들
  const tabContents = contentContainer.querySelectorAll('.tab-content');
  
  // 인덱스 범위 확인
  if (tabIndex < 0 || tabIndex >= tabButtons.length) return;
  
  // 모든 탭 비활성화
  tabButtons.forEach(button => button.classList.remove('active'));
  tabContents.forEach(content => content.classList.remove('active'));
  
  // 선택한 탭 활성화
  tabButtons[tabIndex].classList.add('active');
  tabContents[tabIndex].classList.add('active');
}

/**
 * 사용자 인터페이스 관련 유틸리티 함수 모음
 */
const UI = {
    /**
     * Toast 메시지를 표시합니다.
     * @param {string} message - 표시할 메시지
     * @param {string} type - 메시지 타입 (success, error, info, warning)
     * @param {number} duration - 표시 시간 (밀리초)
     */
    showToast: function(message, type = 'info', duration = 3000) {
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.textContent = message;
        
        document.body.appendChild(toast);
        
        // 애니메이션 효과를 위해 setTimeout 사용
        setTimeout(() => {
            toast.classList.add('show');
        }, 10);
        
        // 지정된 시간 후 toast 제거
        setTimeout(() => {
            toast.classList.remove('show');
            toast.addEventListener('transitionend', () => {
                document.body.removeChild(toast);
            });
        }, duration);
    },
    
    /**
     * 버튼에 활성화 상태를 토글합니다.
     * @param {HTMLElement} button - 대상 버튼 엘리먼트
     * @param {boolean} isActive - 활성화 상태 여부
     */
    toggleButtonActive: function(button, isActive) {
        if (isActive) {
            button.classList.add('active');
        } else {
            button.classList.remove('active');
        }
    },
    
    /**
     * 요소에 로딩 스피너를 표시하거나 제거합니다.
     * @param {HTMLElement} element - 대상 엘리먼트
     * @param {boolean} isLoading - 로딩 중 여부
     */
    toggleLoading: function(element, isLoading) {
        if (!element) return;
        
        if (isLoading) {
            element.classList.add('loading');
            const spinner = document.createElement('div');
            spinner.className = 'spinner';
            element.appendChild(spinner);
        } else {
            element.classList.remove('loading');
            const spinner = element.querySelector('.spinner');
            if (spinner) {
                element.removeChild(spinner);
            }
        }
    },
    
    /**
     * 시각적 피드백 효과를 제공합니다.
     * @param {HTMLElement} element - 대상 엘리먼트
     * @param {string} effect - 효과 이름 (pulse, shake, flash)
     * @param {number} duration - 효과 지속 시간 (밀리초)
     */
    applyEffect: function(element, effect = 'pulse', duration = 500) {
        if (!element) return;
        
        element.classList.add(effect);
        
        setTimeout(() => {
            element.classList.remove(effect);
        }, duration);
    },
    
    /**
     * 요소를 부드럽게 표시하거나 숨깁니다.
     * @param {HTMLElement} element - 대상 엘리먼트
     * @param {boolean} isVisible - 표시 여부
     * @param {number} duration - 애니메이션 지속 시간 (밀리초)
     */
    toggleVisibility: function(element, isVisible, duration = 300) {
        if (!element) return;
        
        if (isVisible) {
            // transition을 위한 초기 투명도 설정
            element.style.opacity = '0';
            element.style.display = 'block';
            
            // 강제 리플로우
            element.offsetHeight;
            
            // 트랜지션 설정 및 opacity 변경
            element.style.transition = `opacity ${duration}ms ease`;
            element.style.opacity = '1';
        } else {
            element.style.transition = `opacity ${duration}ms ease`;
            element.style.opacity = '0';
            
            // 트랜지션 완료 후 display none 설정
            setTimeout(() => {
                element.style.display = 'none';
            }, duration);
        }
    },
    
    /**
     * 오디오 효과음을 재생합니다.
     * @param {string} sound - 오디오 파일 이름 (확장자 제외)
     * @param {number} volume - 볼륨 (0.0 ~ 1.0)
     */
    playSound: function(sound = 'shutter', volume = 0.5) {
        // 사용 가능한 오디오 파일 경로 매핑
        const sounds = {
            shutter: '/static/audio/shutter.mp3'
        };
        
        if (!sounds[sound]) {
            console.warn(`Sound "${sound}" not found`);
            return;
        }
        
        const audio = new Audio(sounds[sound]);
        audio.volume = Math.min(Math.max(volume, 0), 1); // 볼륨 범위 제한: 0.0 ~ 1.0
        
        // 오디오 재생 준비 후 재생
        audio.addEventListener('canplaythrough', () => {
            audio.play().catch(err => {
                console.warn('Failed to play sound:', err);
            });
        }, { once: true });
        
        // 오류 핸들링
        audio.addEventListener('error', (e) => {
            console.error('Error loading sound:', e);
        }, { once: true });
    }
};

export default UI; 