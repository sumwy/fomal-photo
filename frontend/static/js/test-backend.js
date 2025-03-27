/**
 * 백엔드 연결 테스트
 * 카메라 연결 후 백엔드 API 테스트를 수행합니다.
 */
(function() {
  // 백엔드 서버 URL
  const API_URL = window.location.protocol + '//' + window.location.host;
  
  // 상태 플래그
  let backendChecked = false;
  let testInProgress = false;
  
  // 초기화
  function init() {
    console.log('백엔드 테스트 스크립트 로드됨');
    
    // 카메라가 초기화된 후 일정 시간 후 백엔드 연결 테스트 시작
    // 이벤트 리스너를 통해 카메라 준비 상태 감지
    watchCameraStatus();
  }
  
  // 카메라 상태 감시
  function watchCameraStatus() {
    // 카메라 상태 요소 관찰
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'attributes' || mutation.type === 'childList') {
          const statusBadge = document.querySelector('.camera-status .status-badge');
          if (statusBadge && statusBadge.textContent.includes('준비됨') && !backendChecked) {
            backendChecked = true;
            
            // 카메라가 준비되면 3초 후 백엔드 연결 테스트 시작
            setTimeout(() => {
              console.log('카메라 준비 감지, 백엔드 연결 테스트 시작...');
              testBackendConnection();
            }, 3000);
          }
        }
      });
    });
    
    // 카메라 상태 배지 관찰 시작
    const statusBadge = document.querySelector('.camera-status .status-badge');
    if (statusBadge) {
      observer.observe(statusBadge, { 
        attributes: true, 
        childList: true,
        subtree: true,
        characterData: true
      });
    } else {
      // 카메라 상태 배지가 없으면 일정 시간 후 그냥 테스트 시작
      setTimeout(() => {
        console.log('카메라 상태 요소를 찾을 수 없음, 백엔드 연결 테스트 시작...');
        testBackendConnection();
      }, 5000);
    }
  }

  // 백엔드 서버 연결 테스트
  async function testBackendConnection() {
    if (testInProgress) return;
    testInProgress = true;
    
    try {
      console.log('백엔드 서버 상태 확인 중...');
      
      // 서버 상태 확인
      const response = await fetch(`${API_URL}/status`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log('백엔드 서버 연결 성공:', data);
        
        // 서버 연결이 성공하면 이미지 처리 API 테스트
        testImageProcessingAPI();
      } else {
        console.error('백엔드 서버 응답 오류:', response.status);
        showToast('백엔드 서버에 연결할 수 없습니다.', 'error');
      }
    } catch (error) {
      console.error('백엔드 연결 테스트 실패:', error);
      showToast('백엔드 서버에 연결할 수 없습니다.', 'error');
    } finally {
      testInProgress = false;
    }
  }

  // 이미지 처리 API 테스트
  async function testImageProcessingAPI() {
    try {
      console.log('이미지 처리 API 테스트 중...');
      
      // 테스트용 간단한 이미지 데이터 생성 (1x1 투명 픽셀)
      const testImageData = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
      
      // FormData 생성
      const formData = new FormData();
      formData.append('image', testImageData);
      // 각 옵션을 개별적으로 추가
      formData.append('adjust_face_position', 'false');
      formData.append('remove_background', 'false');
      formData.append('upscale', 'false');
      
      // 이미지 처리 API 호출
      const response = await fetch(`${API_URL}/process_image`, {
        method: 'POST',
        body: formData,
        headers: {
          'X-Requested-With': 'XMLHttpRequest'
        }
      });
      
      if (response.ok) {
        console.log('이미지 처리 API 테스트 성공');
        showToast('백엔드 서버 연결 및 이미지 처리 API 테스트 성공', 'success');
      } else {
        const errorData = await response.json();
        console.error('이미지 처리 API 오류:', errorData);
        showToast('이미지 처리 API 테스트 실패', 'error');
      }
    } catch (error) {
      console.error('이미지 처리 API 테스트 실패:', error);
      showToast('이미지 처리 API 테스트 실패', 'error');
    }
  }

  // 토스트 메시지 표시 함수
  function showToast(message, type = 'info') {
    // 기존 메시지 함수 사용 시도
    if (window.showToast) {
      window.showToast(message, type);
      return;
    }
    
    // UI 모듈 토스트 사용 시도
    if (window.UI && window.UI.showToast) {
      window.UI.showToast(message, type);
      return;
    }
    
    // 위 방법이 모두 실패하면 콘솔에만 출력
    console.log(`[${type.toUpperCase()}] ${message}`);
  }

  // 문서 로드 완료 시 초기화
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})(); 