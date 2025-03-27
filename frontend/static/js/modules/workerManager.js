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
   * 디버그 모드 설정
   * @param {boolean} enabled - 활성화 여부
   */
  setDebugMode(enabled) {
    this.debugMode = enabled;
    console.log(`Worker 디버그 모드가 ${enabled ? '활성화' : '비활성화'}되었습니다.`);
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
   * 이미지 처리 (압축 및 서버 처리)
   * @param {string} imageData - 처리할 이미지 데이터 URL
   * @param {Object} options - 처리 옵션
   * @returns {Promise<Object>} 처리 결과
   */
  processImage(imageData, options = {}) {
    const startTime = performance.now();
    
    return new Promise((resolve, reject) => {
      // Worker 미지원 시 대체 처리
      if (!this.isWorkerSupported || !this.worker) {
        console.warn('Worker를 사용할 수 없습니다. 기본 처리를 사용합니다.');
        
        // 폼 데이터 생성
        const formData = new FormData();
        formData.append('image', imageData);
        
        // 옵션 추가
        for (const [key, value] of Object.entries(options.processingOptions || {})) {
          formData.append(key, typeof value === 'boolean' ? value.toString() : value);
        }
        
        // 서버 요청
        fetch(options.url || '/process_image', {
          method: 'POST',
          body: formData,
          credentials: 'same-origin',
          headers: {
            'X-Requested-With': 'XMLHttpRequest'
          }
        })
        .then(response => {
          if (!response.ok) {
            throw new Error(`서버 오류: ${response.status}`);
          }
          return response.json();
        })
        .then(result => {
          const endTime = performance.now();
          const processingTime = endTime - startTime;
          
          this.stats.totalProcessed++;
          this.stats.processingTimes.push(processingTime);
          
          if (this.debugMode) {
            console.log(`이미지 처리 완료 (Worker 미사용): ${processingTime.toFixed(2)}ms`);
          }
          
          resolve(result);
        })
        .catch(error => {
          this.stats.errors++;
          reject(error);
        });
        
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
          
          this.stats.totalProcessed++;
          this.stats.processingTimes.push(processingTime);
          
          if (this.debugMode) {
            console.log(`이미지 처리 완료 (Worker 사용): ${processingTime.toFixed(2)}ms`);
            console.log('처리 옵션:', options.processingOptions);
            console.log('결과 메타데이터:', result.metadata);
          }
          
          resolve(result);
        }
      });
      
      // Worker에 메시지 전송
      this.worker.postMessage({
        type: 'process',
        data: {
          imageData,
          url: options.url || '/process_image',
          compressionOptions: options.compressionOptions || { quality: 0.9 },
          processingOptions: options.processingOptions || {},
          requestId
        }
      });
    });
  }
}

// 싱글톤 인스턴스 생성
export const workerManager = new WorkerManager(); 