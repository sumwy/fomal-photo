/**
 * Worker 기반 이미지 처리 관리 클래스
 * 이미지 압축 및 처리를 위한 웹 워커를 관리합니다.
 */

export class WorkerManager {
  /**
   * 워커 매니저 생성자
   */
  constructor() {
    this.worker = null;
    this.callbacks = new Map();
    this.requestIdCounter = 0;
    this.isWorkerSupported = this._checkWorkerSupport();
    
    // 성능 통계 추적
    this.stats = {
      totalProcessed: 0,
      totalCompressed: 0,
      processingTimes: [],
      compressionTimes: [],
      errors: 0
    };
    
    // 디버그 모드
    this.debugMode = false;
    
    this.status = {
      current: '대기 중',
      type: 'info' // 'info', 'error', 'success'
    };
    this.progress = 0; // 0-100
    
    if (this.isWorkerSupported) {
      this._initWorker();
    } else {
      console.warn('Web Worker가 지원되지 않습니다. 메인 스레드에서 처리합니다.');
    }
  }
  
  /**
   * Web Worker 지원 여부 확인
   * @private
   * @returns {boolean} Worker 지원 여부
   */
  _checkWorkerSupport() {
    return typeof Worker !== 'undefined';
  }
  
  /**
   * Worker 초기화
   * @private
   */
  _initWorker() {
    try {
      this.worker = new Worker('/static/js/modules/imageWorker.js', { type: 'module' });
      
      // 메시지 핸들러 등록
      this.worker.onmessage = (event) => this._handleWorkerMessage(event);
      
      // 에러 핸들러 등록
      this.worker.onerror = (error) => {
        console.error('Worker 오류:', error);
        this._notifyAllCallbacks({
          success: false,
          error: '이미지 처리 워커에서 오류가 발생했습니다.'
        });
      };
      
      console.log('이미지 처리 Worker가 초기화되었습니다.');
    } catch (error) {
      console.error('Worker 초기화 실패:', error);
      this.isWorkerSupported = false;
    }
  }
  
  /**
   * Worker 종료
   */
  terminate() {
    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
      this.callbacks.clear();
      console.log('Worker가 종료되었습니다.');
    }
  }
  
  /**
   * Worker 메시지 처리
   * @private
   * @param {MessageEvent} event - Worker로부터 받은 메시지 이벤트
   */
  _handleWorkerMessage(event) {
    const { type, data } = event.data;
    const requestId = data?.requestId;
    
    switch (type) {
      case 'compress_result':
        // 압축 결과 처리
        this._executeCallback(requestId, null, data.imageData);
        break;
        
      case 'process_result':
        // 이미지 처리 결과 처리
        this._executeCallback(requestId, null, data.result);
        break;
        
      case 'error':
        // 오류 처리
        this._executeCallback(requestId, new Error(data.error));
        break;
        
      default:
        console.warn('알 수 없는 Worker 메시지:', type);
    }
  }
  
  /**
   * 새 요청 ID 생성
   * @private
   * @returns {number} 요청 ID
   */
  _generateRequestId() {
    return ++this.requestIdCounter;
  }
  
  /**
   * 콜백 등록
   * @private
   * @param {number} requestId - 요청 ID
   * @param {Function} callback - 콜백 함수
   */
  _registerCallback(requestId, callback) {
    if (typeof callback === 'function') {
      this.callbacks.set(requestId, callback);
    }
  }
  
  /**
   * 콜백 실행 및 삭제
   * @private
   * @param {number} requestId - 요청 ID
   * @param {Error} error - 오류 객체 (있는 경우)
   * @param {*} result - 처리 결과
   */
  _executeCallback(requestId, error, result) {
    if (this.callbacks.has(requestId)) {
      const callback = this.callbacks.get(requestId);
      this.callbacks.delete(requestId);
      callback(error, result);
    }
  }
  
  /**
   * 모든 콜백에 오류 알림
   * @private
   * @param {Object} errorObj - 오류 객체
   */
  _notifyAllCallbacks(errorObj) {
    for (const [requestId, callback] of this.callbacks.entries()) {
      callback(new Error(errorObj.error || '알 수 없는 오류'), null);
      this.callbacks.delete(requestId);
    }
  }
  
  /**
   * 상태 메시지 업데이트
   * @param {string} message - 상태 메시지
   * @param {string} type - 메시지 타입 (info, error, success)
   */
  updateStatus(message, type = 'info') {
    this.status.current = message;
    this.status.type = type;
    
    // 상태 변경 이벤트 발생
    const event = new CustomEvent('workerStatusUpdate', {
      detail: { message, type }
    });
    document.dispatchEvent(event);
    
    // 로깅
    console.log(`[워커 상태] ${message}`);
  }
  
  /**
   * 진행률 업데이트
   * @param {number} percent - 진행률 (0-100)
   */
  updateProgress(percent) {
    this.progress = Math.max(0, Math.min(100, percent));
    
    // 진행률 변경 이벤트 발생
    const event = new CustomEvent('workerProgressUpdate', {
      detail: { percent: this.progress }
    });
    document.dispatchEvent(event);
    
    // 로딩 인디케이터 업데이트
    const progressBar = document.querySelector('.loading-progress .progress-bar');
    if (progressBar) {
      progressBar.style.width = `${this.progress}%`;
    }
  }
  
  /**
   * 디버그 모드 설정
   * @param {boolean} enabled - 활성화 여부
   */
  setDebugMode(enabled) {
    this.debugMode = enabled;
    console.log(`워커 디버그 모드: ${enabled ? '활성화' : '비활성화'}`);
  }
  
  /**
   * 성능 통계 정보 가져오기
   * @returns {Object} 성능 통계 정보
   */
  getPerformanceStats() {
    const calcAverage = (arr) => arr.length > 0 ? 
      arr.reduce((sum, val) => sum + val, 0) / arr.length : 0;
    
    return {
      totalProcessed: this.stats.totalProcessed,
      totalCompressed: this.stats.totalCompressed,
      avgProcessingTime: calcAverage(this.stats.processingTimes),
      avgCompressionTime: calcAverage(this.stats.compressionTimes),
      errors: this.stats.errors,
      isWorkerSupported: this.isWorkerSupported,
      pendingRequests: this.callbacks.size
    };
  }
  
  /**
   * 성능 통계 초기화
   */
  resetStats() {
    this.stats = {
      totalProcessed: 0,
      totalCompressed: 0,
      processingTimes: [],
      compressionTimes: [],
      errors: 0
    };
    console.log('성능 통계가 초기화되었습니다.');
  }
  
  /**
   * 이미지 데이터 압축
   * @param {string} imageData - 압축할 이미지 데이터 URL
   * @param {Object} options - 압축 옵션
   * @returns {Promise<string>} 압축된 이미지 데이터
   */
  compressImage(imageData, options = {}) {
    const startTime = performance.now();
    
    return new Promise((resolve, reject) => {
      // Worker 미지원 시 대체 처리
      if (!this.isWorkerSupported || !this.worker) {
        console.warn('Worker를 사용할 수 없습니다. 압축을 건너뜁니다.');
        this.stats.errors++;
        resolve(imageData);
        return;
      }
      
      // 요청 ID 생성
      const requestId = this._generateRequestId();
      
      // 콜백 등록
      this._registerCallback(requestId, (error, result) => {
        if (error) {
          this.stats.errors++;
          reject(error);
        } else {
          const endTime = performance.now();
          const processingTime = endTime - startTime;
          
          this.stats.totalCompressed++;
          this.stats.compressionTimes.push(processingTime);
          
          if (this.debugMode) {
            console.log(`이미지 압축 완료: ${processingTime.toFixed(2)}ms`);
          }
          
          resolve(result);
        }
      });
      
      // Worker에 메시지 전송
      this.worker.postMessage({
        type: 'compress',
        data: {
          imageData,
          options,
          requestId
        }
      });
    });
  }
  
  /**
   * 이미지 처리 요청
   * @param {string} imageData - 이미지 데이터 (base64)
   * @param {Object} options - 처리 옵션
   * @returns {Promise<string>} 처리된 이미지 데이터
   */
  async processImage(imageData, options = {}) {
    this.updateStatus('요청 준비 중...');
    
    try {
      // 이미지 데이터 검증
      if (!imageData) {
        throw new Error('이미지 데이터가 비어 있습니다.');
      }
      
      // 로딩 표시 업데이트
      this.updateStatus('요청 전송 중...');
      
      // FormData 객체 생성
      const formData = new FormData();
      formData.append('image', imageData);
      
      // 각 옵션을 개별적으로 추가 (JSON.stringify 사용하지 않음)
      formData.append('adjust_face_position', options.adjustFacePosition !== false ? 'true' : 'false');
      formData.append('remove_background', options.removeBackground !== false ? 'true' : 'false');
      formData.append('upscale', options.upscale !== false ? 'true' : 'false');
      formData.append('skin_smoothing', options.skinSmoothing !== false ? 'true' : 'false');
      formData.append('eye_enhance', options.eyeEnhance !== false ? 'true' : 'false');
      formData.append('sharpness_enhance', options.sharpnessEnhance !== false ? 'true' : 'false');
      
      // 진행률 표시 업데이트
      this.updateProgress(10);
      
      // 요청 전송
      const response = await fetch('/process_image', {
        method: 'POST',
        body: formData,
        headers: {
          'X-Requested-With': 'XMLHttpRequest'
        }
      });
      
      // 실패한 응답 처리
      if (!response.ok) {
        let errorMessage = `서버 오류 (${response.status})`;
        
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorData.message || errorMessage;
        } catch (e) {
          // JSON 파싱 실패 시 텍스트로 시도
          try {
            errorMessage = await response.text();
          } catch (textError) {
            // 텍스트 읽기도 실패하면 기본 오류 메시지 사용
          }
        }
        
        throw new Error(errorMessage);
      }
      
      // 진행률 표시 업데이트
      this.updateProgress(70);
      this.updateStatus('응답 처리 중...');
      
      // 응답 처리
      const result = await response.json();
      
      if (!result.enhanced_image) {
        throw new Error('서버에서 처리된 이미지를 반환하지 않았습니다.');
      }
      
      // 진행률 표시 업데이트
      this.updateProgress(90);
      this.updateStatus('이미지 처리 완료');
      
      // 메타데이터 로깅
      if (result.metadata) {
        console.log('이미지 처리 메타데이터:', result.metadata);
        
        // 처리 시간 로깅
        if (result.metadata.processing_time) {
          console.log(`서버 처리 시간: ${result.metadata.processing_time.toFixed(2)}초`);
        }
      }
      
      // 완료 표시
      this.updateProgress(100);
      setTimeout(() => this.updateStatus('대기 중'), 1000);
      
      return result.enhanced_image;
    } catch (error) {
      console.error('이미지 처리 요청 오류:', error);
      
      // 오류 메시지 표시
      this.updateStatus('오류 발생', 'error');
      this.updateProgress(0);
      
      if (error.name === 'AbortError' || error.message.includes('timeout')) {
        throw new Error('이미지 처리 요청 시간이 초과되었습니다. 인터넷 연결을 확인하고 다시 시도해주세요.');
      } else if (error.name === 'TypeError' && error.message.includes('Failed to fetch')) {
        throw new Error('서버 연결에 실패했습니다. 인터넷 연결을 확인하고 다시 시도해주세요.');
      } else {
        throw error;
      }
    }
  }
}

// 싱글톤 인스턴스 생성
export const workerManager = new WorkerManager(); 