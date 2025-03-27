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
  if (!imageData || typeof imageData !== 'string') {
    return false;
  }
  
  // 데이터 URL 형식 검사
  if (!imageData.startsWith('data:image/')) {
    return false;
  }
  
  // base64 인코딩 검사
  const base64Regex = /^data:image\/[a-z]+;base64,[A-Za-z0-9+/=]+$/;
  if (!base64Regex.test(imageData)) {
    return false;
  }
  
  // 최소 길이 검사 (빈 이미지가 아닌지)
  if (imageData.length < 100) {
    return false;
  }
  
  return true;
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
    }
  };
  
  const mergedOptions = {
    ...defaultOptions,
    ...options,
    headers: {
      ...defaultOptions.headers,
      ...(options.headers || {})
    }
  };
  
  try {
    const response = await fetch(url, mergedOptions);
    
    if (!response.ok) {
      throw new Error(`HTTP error ${response.status}: ${response.statusText}`);
    }
    
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      return await response.json();
    }
    
    return await response.text();
  } catch (error) {
    console.error('API 요청 실패:', error);
    throw error;
  }
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