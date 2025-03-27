/**
 * 유틸리티 함수 모듈
 * 애플리케이션 전반에서 사용되는 헬퍼 함수들을 제공합니다.
 */

/**
 * 문자열을 HTML 이스케이프하여 XSS 공격을 방지합니다.
 * @param {string} str - 이스케이프할 문자열
 * @returns {string} 이스케이프된 문자열
 */
export function escapeHtml(str) {
  if (!str) return '';
  
  const htmlEscapes = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  };
  
  return str.replace(/[&<>"']/g, match => htmlEscapes[match]);
}

/**
 * base64 인코딩된 이미지 데이터의 유효성을 검사합니다.
 * @param {string} imageData - 검사할 이미지 데이터 URL
 * @returns {boolean} 유효한 이미지 데이터이면 true
 */
export function validateImageData(imageData) {
  // 기본 검증
  if (!imageData || typeof imageData !== 'string') {
    console.error('이미지 데이터가 문자열이 아닙니다.');
    return false;
  }
  
  // 데이터 URL 형식 검사
  if (!imageData.startsWith('data:image/')) {
    console.error('이미지 데이터가 올바른 형식이 아닙니다. data:image/ 로 시작해야 합니다.');
    return false;
  }
  
  try {
    // MIME 타입 및 base64 인코딩 구분자 체크
    const mimeMatch = imageData.match(/^data:(image\/[a-z]+);base64,/);
    if (!mimeMatch) {
      console.error('이미지 데이터의 MIME 타입 또는 base64 구분자가 올바르지 않습니다.');
      return false;
    }
    
    // base64 인코딩 데이터 추출
    const base64Data = imageData.split(',')[1];
    if (!base64Data || base64Data.trim() === '') {
      console.error('base64 인코딩 데이터가 비어 있습니다.');
      return false;
    }
    
    // 최소 길이 검사 (빈 이미지가 아닌지)
    if (base64Data.length < 100) {
      console.error('이미지 데이터가 너무 작습니다. 유효한 이미지가 아닐 수 있습니다.');
      return false;
    }
    
    // base64 문자 유효성 검사
    const validBase64Regex = /^[A-Za-z0-9+/=]+$/;
    if (!validBase64Regex.test(base64Data)) {
      console.error('base64 인코딩 데이터에 유효하지 않은 문자가 포함되어 있습니다.');
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('이미지 데이터 검증 중 오류 발생:', error);
    return false;
  }
}

/**
 * 폼 입력의 유효성을 검사합니다.
 * @param {string} input - 검사할 입력 문자열
 * @param {Object} options - 검사 옵션
 * @param {number} [options.minLength] - 최소 길이
 * @param {number} [options.maxLength] - 최대 길이
 * @param {RegExp} [options.pattern] - 패턴 검사
 * @returns {boolean} 유효한 입력이면 true
 */
export function validateInput(input, options = {}) {
  if (input === undefined || input === null) {
    return false;
  }
  
  const { minLength, maxLength, pattern } = options;
  
  // 문자열로 변환
  const str = String(input);
  
  // 길이 검사
  if (minLength !== undefined && str.length < minLength) {
    return false;
  }
  
  if (maxLength !== undefined && str.length > maxLength) {
    return false;
  }
  
  // 패턴 검사
  if (pattern && !pattern.test(str)) {
    return false;
  }
  
  return true;
}

/**
 * API 요청에 보안 헤더를 추가합니다.
 * @param {Object} headers - 요청 헤더 객체
 * @returns {Object} 보안 헤더가 추가된 헤더 객체
 */
export function addSecurityHeaders(headers = {}) {
  return {
    ...headers,
    'X-Requested-With': 'XMLHttpRequest',
    'Accept': 'application/json',
    'Content-Type': 'application/json'
  };
}

/**
 * CSRF 토큰을 가져와 요청 헤더에 추가합니다.
 * @returns {Object} CSRF 토큰이 포함된 헤더 객체
 */
export function getCsrfHeaders() {
  const metaToken = document.querySelector('meta[name="csrf-token"]');
  const csrfToken = metaToken ? metaToken.getAttribute('content') : '';
  
  return {
    'X-CSRF-Token': csrfToken
  };
}

/**
 * 안전한 API 호출을 위한 fetch 래퍼 함수
 * @param {string} url - API 엔드포인트 URL
 * @param {Object} options - fetch 옵션
 * @returns {Promise<Object>} API 응답
 */
export async function secureFetch(url, options = {}) {
  const defaultOptions = {
    credentials: 'same-origin',
    headers: {
      ...addSecurityHeaders(options.headers),
      ...getCsrfHeaders()
    },
    timeout: 30000, // 기본 30초 타임아웃
    retries: 2,     // 기본 재시도 횟수
    retryDelay: 1000 // 재시도 간 지연시간 (ms)
  };
  
  const {
    timeout,
    retries,
    retryDelay,
    ...fetchOptions
  } = {
    ...defaultOptions,
    ...options,
    headers: {
      ...defaultOptions.headers,
      ...(options.headers || {})
    }
  };
  
  // FormData 객체인 경우 headers를 조정 (Content-Type은 자동으로 설정됨)
  if (fetchOptions.body instanceof FormData) {
    delete fetchOptions.headers['Content-Type'];
    console.log('FormData 감지: Content-Type 헤더 자동 설정 사용');
  }
  
  // URL 없이 상대 경로만 제공된 경우 호스트 경로 추가
  const fullUrl = url.startsWith('http') ? url : window.location.origin + (url.startsWith('/') ? url : '/' + url);
  
  // 디버그 로깅 추가
  console.log(`API 요청: ${fullUrl}`);
  console.log('요청 옵션:', { 
    method: fetchOptions.method || 'GET',
    headers: fetchOptions.headers,
    credentials: fetchOptions.credentials,
    body: fetchOptions.body ? '(데이터 있음)' : undefined 
  });
  
  // 함수화하여 재시도 로직 구현
  async function tryFetch(retriesLeft) {
    const startTime = performance.now();
    
    try {
      // 타임아웃을 위한 Promise.race 사용
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);
      
      // 기존 신호를 사용하면서 새 신호를 결합
      const signal = options.signal
        ? composeAbortSignals(options.signal, controller.signal)
        : controller.signal;
      
      const response = await fetch(fullUrl, {
        ...fetchOptions,
        signal
      });
      
      // 타임아웃 클리어
      clearTimeout(timeoutId);
      
      // 요청 시간 로깅
      const requestTime = performance.now() - startTime;
      console.log(`API 응답 (${Math.round(requestTime)}ms): ${fullUrl} - 상태 ${response.status}`);
      
      // 서버 오류(5xx)이고 재시도 횟수가 남아있으면 재시도
      if (response.status >= 500 && retriesLeft > 0) {
        console.warn(`서버 오류 (${response.status}), ${retriesLeft}회 재시도 남음...`);
        await new Promise(resolve => setTimeout(resolve, retryDelay));
        return tryFetch(retriesLeft - 1);
      }
      
      return response;
    } catch (error) {
      // 타임아웃 클리어 (에러 발생 시에도)
      clearTimeout?.timeoutId;
      
      const requestTime = performance.now() - startTime;
      console.error(`API 오류 (${Math.round(requestTime)}ms): ${error.name} - ${error.message}`);
      
      // AbortError가 아니고 재시도 횟수가 남아있으면 재시도
      if (error.name !== 'AbortError' && retriesLeft > 0) {
        console.warn(`네트워크 오류, ${retriesLeft}회 재시도 남음...`);
        await new Promise(resolve => setTimeout(resolve, retryDelay));
        return tryFetch(retriesLeft - 1);
      }
      
      // AbortError를 타임아웃 오류로 변환
      if (error.name === 'AbortError') {
        throw new Error(`API 요청 타임아웃 (${timeout}ms)`);
      }
      
      throw error;
    }
  }
  
  // 초기 시도 실행
  return tryFetch(retries);
}

/**
 * 두 개의 AbortSignal을 결합하여 새로운 AbortSignal을 생성합니다.
 * 두 신호 중 하나라도 abort되면 결합된 신호도 abort됩니다.
 * @param {AbortSignal} signal1 - 첫 번째 AbortSignal
 * @param {AbortSignal} signal2 - 두 번째 AbortSignal
 * @returns {AbortSignal} 결합된 AbortSignal
 */
function composeAbortSignals(signal1, signal2) {
  const controller = new AbortController();
  
  // 이미 abort된 신호가 있는지 확인
  if (signal1.aborted || signal2.aborted) {
    controller.abort();
    return controller.signal;
  }
  
  // 첫 번째 신호에 대한 리스너
  const abortHandler1 = () => controller.abort();
  signal1.addEventListener('abort', abortHandler1);
  
  // 두 번째 신호에 대한 리스너
  const abortHandler2 = () => controller.abort();
  signal2.addEventListener('abort', abortHandler2);
  
  return controller.signal;
}

/**
 * 이미지 데이터의 크기를 확인합니다.
 * @param {string} imageData - base64 인코딩된 이미지 데이터 URL
 * @returns {number} 이미지 데이터 크기(바이트)
 */
export function getImageDataSize(imageData) {
  if (!imageData) return 0;
  
  // 'data:image/jpeg;base64,' 같은 프리픽스 제거
  const base64Data = imageData.split(',')[1] || '';
  
  // base64 인코딩된 데이터 길이를 바이트 크기로 계산
  // (base64는 4글자가 3바이트를 표현)
  return Math.floor((base64Data.length * 3) / 4);
}

/**
 * FormData를 사용하여 이미지 데이터를 API에 전송합니다.
 * @param {string} url - API 엔드포인트 URL
 * @param {string} imageData - 이미지 데이터 URL (base64)
 * @param {Object} options - 이미지 처리 옵션
 * @param {Object} fetchOptions - fetch 옵션
 * @returns {Promise<Object>} API 응답
 */
export async function sendImageToAPI(url, imageData, options = {}, fetchOptions = {}) {
  // 이미지 데이터 유효성 검사
  if (!validateImageData(imageData)) {
    throw new Error('유효하지 않은 이미지 데이터입니다.');
  }
  
  // FormData 객체 생성
  const formData = new FormData();
  
  // 이미지 데이터 추가
  formData.append('image', imageData);
  
  // 옵션 추가 (JSON 문자열로 변환)
  formData.append('options', JSON.stringify(options));
  
  // 기본 API 요청 옵션
  const defaultFetchOptions = {
    method: 'POST',
    body: formData,
    timeout: 60000, // 이미지 처리는 더 긴 타임아웃 사용
  };
  
  // secureFetch를 사용하여 요청
  try {
    console.log('이미지 전송 시작:', url);
    console.log('이미지 크기:', getImageDataSize(imageData));
    console.log('처리 옵션:', options);
    
    const response = await secureFetch(url, {
      ...defaultFetchOptions,
      ...fetchOptions
    });
    
    // 응답 처리
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`이미지 처리 API 오류 (${response.status}): ${errorText}`);
    }
    
    return response.json();
  } catch (error) {
    console.error('이미지 전송 실패:', error);
    throw error;
  }
} 