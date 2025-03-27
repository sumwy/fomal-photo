/**
 * 카메라 초기화 및 관리 클래스
 */
export class CameraManager {
  /**
   * 카메라 매니저 생성자
   * @param {HTMLVideoElement} videoElement - 카메라 피드를 표시할 비디오 요소
   */
  constructor(videoElement) {
    this.videoElement = videoElement;
    this.stream = null;
    this.currentFacingMode = 'user'; // 'user' 또는 'environment'
    this.currentDeviceId = null;
    this.availableDevices = [];
    this.canvasElement = null;
    this.canvasContext = null;
    this.guidelineVisible = true;
    this.isInitialized = false;
    this.debugMode = false;
    this.lastError = null;
    this.connectionHistory = [];
    this.initAttempts = 0; // 초기화 시도 횟수 추가
    
    // 비디오 제약 조건
    this.constraints = {
      video: {
        facingMode: this.currentFacingMode,
        width: { ideal: 1280 },
        height: { ideal: 720 },
        frameRate: { ideal: 30 }
      }
    };
    
    // 상태 이벤트 처리
    this._setupEventListeners();
    
    // 통계 정보
    this.stats = {
      initCount: 0,
      errorCount: 0,
      switchCount: 0,
      resizeCount: 0,
      frameDrops: 0
    };
  }
  
  /**
   * 이벤트 리스너 설정
   * @private
   */
  _setupEventListeners() {
    if (this.videoElement) {
      this.videoElement.addEventListener('loadedmetadata', () => {
        this._logDebug('비디오 메타데이터 로드됨', {
          width: this.videoElement.videoWidth,
          height: this.videoElement.videoHeight
        });
        
        // 가이드라인 캔버스 초기화
        this._initGuidelineCanvas();
        
        // 상태 업데이트 이벤트 발생
        const event = new CustomEvent('cameraReady', {
          detail: { 
            width: this.videoElement.videoWidth, 
            height: this.videoElement.videoHeight
          }
        });
        document.dispatchEvent(event);
      });
      
      this.videoElement.addEventListener('error', (e) => {
        const error = e.target.error || new Error('비디오 요소 오류');
        this._logDebug('비디오 요소 오류 발생', { error });
        this.lastError = error;
        this.stats.errorCount++;
        
        // 상태 업데이트 이벤트 발생
        const event = new CustomEvent('cameraError', {
          detail: { error, message: error.message || '비디오 요소 오류' }
        });
        document.dispatchEvent(event);
      });
      
      // 비디오 재생 준비 이벤트
      this.videoElement.addEventListener('canplay', () => {
        this._logDebug('비디오 재생 준비됨 (canplay 이벤트)');
      });
      
      // 비디오 재생 시작 이벤트
      this.videoElement.addEventListener('playing', () => {
        this._logDebug('비디오 재생 시작됨 (playing 이벤트)', {
          width: this.videoElement.videoWidth,
          height: this.videoElement.videoHeight,
          paused: this.videoElement.paused
        });
        
        if (this.videoElement.videoWidth > 0) {
          // 가이드라인 캔버스 초기화 (재생 시작 시에도 초기화)
          this._initGuidelineCanvas();
        }
      });
      
      // 비디오 프레임 드랍 감지
      if ('requestVideoFrameCallback' in HTMLVideoElement.prototype) {
        let lastFrameTime = 0;
        const monitorFrames = (now, metadata) => {
          if (lastFrameTime) {
            const frameInterval = now - lastFrameTime;
            // 프레임 간격이 너무 크면 프레임 드랍으로 간주
            if (frameInterval > 50) { // 20fps 미만인 경우
              this.stats.frameDrops++;
              this._logDebug('비디오 프레임 드랍 감지', { 
                interval: frameInterval,
                droppedFrames: this.stats.frameDrops
              });
            }
          }
          lastFrameTime = now;
          
          if (this.videoElement) {
            this.videoElement.requestVideoFrameCallback(monitorFrames);
          }
        };
        
        this.videoElement.requestVideoFrameCallback(monitorFrames);
      }
    }
  }
  
  /**
   * 디버그 로그 출력
   * @param {string} message - 로그 메시지
   * @param {Object} data - 추가 데이터
   * @private
   */
  _logDebug(message, data = {}) {
    if (this.debugMode) {
      const timestamp = new Date().toISOString();
      console.log(`[카메라] ${timestamp} - ${message}`, data);
      
      // 연결 기록 추가
      if (message.includes('초기화') || message.includes('오류') || message.includes('스트림')) {
        this.connectionHistory.push({
          timestamp,
          message,
          data
        });
        
        // 기록 크기 제한 (최대 50개)
        if (this.connectionHistory.length > 50) {
          this.connectionHistory.shift();
        }
      }
    }
  }
  
  /**
   * 디버그 모드 설정
   * @param {boolean} enabled - 활성화 여부
   */
  setDebugMode(enabled) {
    this.debugMode = enabled;
    this._logDebug(`디버그 모드 ${enabled ? '활성화' : '비활성화'}`);
  }
  
  /**
   * 디버그 정보 가져오기
   * @returns {Object} 디버그 정보
   */
  getDebugInfo() {
    return {
      initialized: this.isInitialized,
      facingMode: this.currentFacingMode,
      deviceId: this.currentDeviceId,
      availableDevices: this.availableDevices.length,
      constraints: this.constraints,
      videoSize: this.videoElement ? {
        width: this.videoElement.videoWidth,
        height: this.videoElement.videoHeight
      } : null,
      stats: this.stats,
      lastError: this.lastError,
      connectionHistory: this.connectionHistory,
      userAgent: navigator.userAgent,
      initAttempts: this.initAttempts
    };
  }
  
  /**
   * 카메라 초기화
   * @returns {Promise<boolean>} 초기화 성공 여부
   */
  async initialize() {
    console.log('%c[카메라] 초기화 시작', 'background: #2196F3; color: white; padding: 2px 5px; border-radius: 3px;');
    
    try {
      this.initAttempts++;
      
      // 브라우저 호환성 체크
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        console.error('%c[카메라] 이 브라우저는 미디어 장치를 지원하지 않습니다.', 'background: #F44336; color: white; padding: 2px 5px; border-radius: 3px;');
        throw new Error('미디어 장치 API를 지원하지 않는 브라우저입니다.');
      }
      
      console.log('%c[카메라] 브라우저 호환성 체크 통과', 'color: #4CAF50;');
      
      // 이미 스트림이 있으면 정리
      if (this.stream) {
        console.log('[카메라] 기존 스트림 정리 중...');
        this.shutdown();
      }
      
      // 브라우저 감지
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || 
                   (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
      const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
      const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      
      console.log(`%c[카메라] 환경 감지: iOS=${isIOS}, Safari=${isSafari}, Mobile=${isMobile}`, 'color: #FF9800;');
      
      // iOS Safari에서는 간소화된 제약 조건 사용
      if (isIOS) {
        console.log('%c[카메라] iOS 장치 감지됨, 특수 처리 적용', 'color: #FF9800;');
        // iOS에서 더 간단한 제약 조건으로 시작
        this.constraints = {
          video: {
            facingMode: this.currentFacingMode,
            width: { ideal: 640 },
            height: { ideal: 480 }
          }
        };
      }
      
      // 재시도 중이고 모바일 기기인 경우 더 간단한 제약 조건 사용
      if (this.initAttempts > 1 && isMobile) {
        console.log('%c[카메라] 재시도용 간소화된 제약 조건 사용', 'color: #FF9800;');
        this.constraints = {
          video: {
            facingMode: this.currentFacingMode,
            width: { ideal: 640 },
            height: { ideal: 480 }
          }
        };
      }
      
      // HTTPS 확인
      const isSecureContext = window.isSecureContext || 
                             location.protocol === 'https:' || 
                             location.hostname === 'localhost' ||
                             location.hostname === '127.0.0.1';
                             
      if (!isSecureContext) {
        console.error('%c[카메라] 보안 컨텍스트가 아닙니다! 카메라는 HTTPS 또는 localhost에서만 작동합니다.', 'background: #F44336; color: white;');
        throw new Error('카메라는 보안 컨텍스트(HTTPS 또는 localhost)에서만 사용 가능합니다.');
      }
      
      // 미디어 장치 제약 조건 설정
      const constraints = this.constraints;
      console.log('%c[카메라] 스트림 요청 중...', 'color: #2196F3;', constraints);
      
      // 카메라 접근 권한 요청 및 스트림 가져오기
      let stream;
      try {
        console.log('[카메라] navigator.mediaDevices.getUserMedia 호출 시작');
        stream = await navigator.mediaDevices.getUserMedia(constraints);
        console.log('%c[카메라] getUserMedia 호출 성공!', 'color: #4CAF50;');
      } catch (mediaError) {
        console.error('%c[카메라] 첫 번째 시도 실패:', 'background: #F44336; color: white; padding: 2px 5px; border-radius: 3px;', mediaError);
        
        // 실패한 경우 더 간단한 제약 조건으로 재시도
        if (mediaError.name === 'OverconstrainedError' || mediaError.name === 'NotReadableError') {
          console.log('%c[카메라] 더 간단한 제약 조건으로 재시도 중...', 'color: #FF9800;');
          const simpleConstraints = { video: true };
          console.log('[카메라] 간소화된 제약조건:', simpleConstraints);
          try {
            stream = await navigator.mediaDevices.getUserMedia(simpleConstraints);
            console.log('%c[카메라] 간소화된 제약조건으로 성공!', 'color: #4CAF50;');
          } catch (retryError) {
            console.error('%c[카메라] 간소화된 제약조건으로도 실패:', 'background: #F44336; color: white;', retryError);
            throw retryError;
          }
        } else {
          throw mediaError; // 다른 오류는 다시 throw
        }
      }
      
      this.stream = stream;
      console.log('%c[카메라] 스트림 획득 성공, 트랙 정보 확인 중...', 'color: #4CAF50;');
      
      // 비디오 트랙 정보 로깅
      const videoTrack = stream.getVideoTracks()[0];
      if (videoTrack) {
        const settings = videoTrack.getSettings();
        console.log('%c[카메라] 비디오 트랙 설정:', 'color: #4CAF50;', {
          width: settings.width,
          height: settings.height,
          deviceId: settings.deviceId ? settings.deviceId.substring(0, 5) + '...' : '없음',
          facingMode: settings.facingMode || '미지정'
        });
        
        // 사용 가능한 디바이스 ID 저장
        if (settings.deviceId) {
          this.currentDeviceId = settings.deviceId;
        }
        
        // 현재 facingMode 업데이트
        if (settings.facingMode) {
          this.currentFacingMode = settings.facingMode;
        }
      } else {
        console.warn('%c[카메라] 비디오 트랙이 없습니다!', 'color: #FF9800;');
      }
      
      // 비디오 요소에 스트림 연결
      if (this.videoElement) {
        console.log('[카메라] 비디오 요소에 스트림 연결 중...');
        
        // 기존 srcObject 정리
        if (this.videoElement.srcObject) {
          this.videoElement.srcObject = null;
        }
        
        // 새 스트림 연결
        this.videoElement.srcObject = this.stream;
        
        // iOS 사파리에서 자동 재생을 위한 설정
        this.videoElement.setAttribute('playsinline', 'true');
        this.videoElement.setAttribute('muted', 'true');
        this.videoElement.muted = true;
        
        // 비디오 요소 상태 확인
        console.log('[카메라] 비디오 요소 현재 상태:', {
          'readyState': this.videoElement.readyState,
          'paused': this.videoElement.paused,
          'ended': this.videoElement.ended,
          'srcObject': !!this.videoElement.srcObject
        });
        
        // 비디오 재생을 위한 약속 생성
        try {
          console.log('[카메라] 비디오 재생 시도 중...');
          const playPromise = this.videoElement.play();
          
          // 재생 약속이 있으면 처리
          if (playPromise !== undefined) {
            try {
              await playPromise;
              console.log('%c[카메라] 비디오 재생 시작됨', 'color: #4CAF50;');
            } catch (playError) {
              console.error('%c[카메라] 비디오 재생 오류:', 'background: #F44336; color: white; padding: 2px 5px; border-radius: 3px;', playError);
              
              // 자동 재생 정책 오류 처리
              if (playError.name === 'NotAllowedError' || 
                  playError.message.includes('user activation') ||
                  playError.message.includes('interaction')) {
                console.log('%c[카메라] 자동 재생 실패, 사용자 제스처가 필요합니다', 'color: #FF9800;');
                
                // 사용자 제스처 요청 이벤트 발생
                const event = new CustomEvent('cameraPlaybackError', {
                  detail: { 
                    error: playError, 
                    requiresUserGesture: true, 
                    message: '카메라 활성화를 위해 화면을 터치해주세요'
                  }
                });
                document.dispatchEvent(event);
                
                // iOS에서는 사용자 제스처 요구 시 일단 초기화 성공으로 간주
                if (isIOS) {
                  console.log('%c[카메라] iOS 장치에서는 제스처 요구를 초기화 성공으로 간주', 'color: #FF9800;');
                } else {
                  throw new Error('비디오 재생을 위해 사용자 제스처가 필요합니다');
                }
              } else {
                throw playError;
              }
            }
          } else {
            console.log('[카메라] 비디오 재생 약속이 정의되지 않음, 재생 상태 확인 필요');
            
            // 타이머로 재생 상태 확인
            setTimeout(() => {
              if (this.videoElement && this.videoElement.paused) {
                console.warn('[카메라] 재생이 시작되지 않음, 수동으로 재생 시도');
                this.videoElement.play().catch(err => {
                  console.error('[카메라] 수동 재생 시도 실패:', err);
                });
              }
            }, 500);
          }
        } catch (videoError) {
          console.error('[카메라] 비디오 처리 중 오류:', videoError);
          throw videoError;
        }
      } else {
        console.error('%c[카메라] 비디오 요소가 없습니다', 'background: #F44336; color: white; padding: 2px 5px; border-radius: 3px;');
        throw new Error('비디오 요소가 없습니다');
      }
      
      // 초기화 완료 표시
      this.isInitialized = true;
      this.stats.initCount++;
      
      // 카메라 상태 이벤트 발생
      const readyEvent = new CustomEvent('cameraReady', {
        detail: { stream }
      });
      document.dispatchEvent(readyEvent);
      
      console.log('%c[카메라] 초기화 완료', 'background: #4CAF50; color: white; padding: 2px 5px; border-radius: 3px;');
      return true;
    } catch (error) {
      console.error('%c[카메라] 초기화 오류:', 'background: #F44336; color: white; padding: 2px 5px; border-radius: 3px;', error);
      this.isInitialized = false;
      this.lastError = error;
      this.stats.errorCount++;
      
      // 오류 유형에 따른 메시지 생성
      let errorMessage = '';
      switch (error.name) {
        case 'NotAllowedError':
          errorMessage = '카메라 접근 권한이 거부되었습니다. 브라우저 설정에서 권한을 허용해주세요.';
          break;
        case 'NotFoundError':
          errorMessage = '카메라를 찾을 수 없습니다. 카메라가 연결되어 있는지 확인하세요.';
          break;
        case 'NotReadableError':
          errorMessage = '카메라에 접근할 수 없습니다. 다른 앱이 카메라를 사용 중인지 확인하세요.';
          break;
        case 'OverconstrainedError':
          errorMessage = '카메라가 요청한 설정을 지원하지 않습니다.';
          break;
        case 'AbortError':
          errorMessage = '카메라 접근이 중단되었습니다.';
          break;
        case 'TypeError':
          errorMessage = '잘못된 제약 조건이 지정되었습니다.';
          break;
        default:
          errorMessage = `카메라 오류: ${error.message}`;
      }
      
      // 오류 이벤트 발생
      const errorEvent = new CustomEvent('cameraError', {
        detail: { error, message: errorMessage }
      });
      document.dispatchEvent(errorEvent);
      
      throw error;
    }
  }
  
  /**
   * 사용 가능한 미디어 장치 열거
   * @private
   * @returns {Promise<Array>} 사용 가능한 비디오 장치
   */
  async _enumerateDevices() {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      this.availableDevices = devices.filter(device => device.kind === 'videoinput');
      
      this._logDebug('사용 가능한 카메라 장치', { 
        count: this.availableDevices.length,
        devices: this.availableDevices.map(d => ({
          deviceId: d.deviceId ? d.deviceId.substring(0, 8) + '...' : 'none',
          label: d.label || '이름 없음'
        }))
      });
      
      return this.availableDevices;
    } catch (error) {
      this._logDebug('장치 열거 오류', { error });
      throw error;
    }
  }
  
  /**
   * 카메라 스트림 요청
   * @private
   * @returns {Promise<MediaStream>} 미디어 스트림
   */
  async _requestCameraStream() {
    this._logDebug('카메라 스트림 요청', { constraints: this.constraints });
    
    try {
      // 이전 스트림이 있으면 정리
      if (this.stream) {
        this.shutdown();
      }
      
      // 새 스트림 요청
      const stream = await navigator.mediaDevices.getUserMedia(this.constraints);
      
      // 현재 사용 중인 장치 정보 업데이트
      const videoTrack = stream.getVideoTracks()[0];
      if (videoTrack) {
        const settings = videoTrack.getSettings();
        this.currentDeviceId = settings.deviceId;
        
        // facingMode가 설정에 있으면 업데이트
        if (settings.facingMode) {
          this.currentFacingMode = settings.facingMode;
        }
        
        this._logDebug('스트림 설정 정보', { 
          width: settings.width,
          height: settings.height,
          frameRate: settings.frameRate,
          facingMode: settings.facingMode || this.currentFacingMode,
          deviceId: settings.deviceId ? settings.deviceId.substring(0, 8) + '...' : 'none'
        });
      }
      
      return stream;
    } catch (error) {
      // 오류 처리 상세화
      let errorMsg = '';
      
      switch (error.name) {
        case 'NotAllowedError':
          errorMsg = '카메라 접근 권한이 거부되었습니다';
          break;
        case 'NotFoundError':
          errorMsg = '카메라를 찾을 수 없습니다';
          break;
        case 'NotReadableError':
          errorMsg = '카메라에 접근할 수 없습니다 (다른 앱이 사용 중일 수 있음)';
          break;
        case 'OverconstrainedError':
          errorMsg = '카메라가 요청한 설정을 지원하지 않습니다';
          break;
        case 'SecurityError':
          errorMsg = '보안 정책으로 인해 카메라 접근이 차단되었습니다';
          break;
        case 'AbortError':
          errorMsg = '카메라 스트림 요청이 중단되었습니다';
          break;
        default:
          errorMsg = `카메라 오류: ${error.message}`;
      }
      
      this._logDebug('스트림 요청 오류', { 
        name: error.name, 
        message: error.message,
        errorDetail: errorMsg
      });
      
      error.userMessage = errorMsg;
      throw error;
    }
  }
  
  /**
   * 종료 및 자원 정리
   */
  shutdown() {
    console.log('[카메라] 자원 정리 중...');
    
    try {
      // 스트림 있으면 모든 트랙 중지
      if (this.stream) {
        const tracks = this.stream.getTracks();
        console.log(`[카메라] ${tracks.length}개 트랙 중지 중...`);
        
        tracks.forEach(track => {
          console.log(`[카메라] 트랙 중지: ${track.kind}, 상태: ${track.readyState}`);
          try {
            track.stop();
            console.log(`[카메라] 트랙 중지 성공: ${track.kind}`);
          } catch (trackError) {
            console.error(`[카메라] 트랙 중지 오류 (${track.kind}):`, trackError);
          }
        });
        
        // 스트림 참조 제거
        this.stream = null;
      }
      
      // 비디오 요소 초기화
      if (this.videoElement) {
        console.log('[카메라] 비디오 요소 초기화...');
        
        try {
          // 비디오 일시 중지
          if (!this.videoElement.paused) {
            this.videoElement.pause();
          }
          
          // srcObject 초기화
          this.videoElement.srcObject = null;
          
          console.log('[카메라] 비디오 요소 초기화 완료');
        } catch (videoError) {
          console.error('[카메라] 비디오 요소 초기화 오류:', videoError);
        }
      }
      
      // 가이드라인 캔버스 제거
      this._removeGuidelineCanvas();
      
      // 초기화 상태 리셋
      this.isInitialized = false;
      
      console.log('[카메라] 자원 정리 완료');
    } catch (error) {
      console.error('[카메라] 정리 중 오류:', error);
    }
  }
  
  /**
   * 가이드라인 캔버스 제거
   * @private
   */
  _removeGuidelineCanvas() {
    try {
      if (this.canvasElement && this.canvasElement.parentNode) {
        console.log('[카메라] 가이드라인 캔버스 제거...');
        this.canvasElement.parentNode.removeChild(this.canvasElement);
        this.canvasElement = null;
        this.canvasContext = null;
      }
    } catch (error) {
      console.error('[카메라] 가이드라인 캔버스 제거 중 오류:', error);
    }
  }

  /**
   * 가이드라인 캔버스 초기화
   * @private
   */
  _initGuidelineCanvas() {
    try {
      if (!this.videoElement) return;
      
      // 이미 존재하는 캔버스 제거
      this._removeGuidelineCanvas();
      
      // 새 캔버스 생성
      this.canvasElement = document.createElement('canvas');
      this.canvasElement.className = 'guideline-canvas';
      this.canvasElement.style.position = 'absolute';
      this.canvasElement.style.top = '0';
      this.canvasElement.style.left = '0';
      this.canvasElement.style.width = '100%';
      this.canvasElement.style.height = '100%';
      this.canvasElement.style.pointerEvents = 'none'; // 클릭 이벤트 통과
      
      // 비디오 컨테이너에 캔버스 추가
      const container = this.videoElement.parentNode;
      if (container) {
        container.appendChild(this.canvasElement);
        
        // 비디오 크기로 캔버스 크기 설정
        const videoWidth = this.videoElement.videoWidth || this.videoElement.clientWidth;
        const videoHeight = this.videoElement.videoHeight || this.videoElement.clientHeight;
        
        this.canvasElement.width = videoWidth;
        this.canvasElement.height = videoHeight;
        
        // 캔버스 컨텍스트 가져오기
        this.canvasContext = this.canvasElement.getContext('2d');
        
        // 가이드라인 그리기
        if (this.guidelineVisible) {
          this.drawGuidelines();
        }
      } else {
        console.warn('[카메라] 비디오 컨테이너를 찾을 수 없습니다.');
      }
    } catch (error) {
      console.error('[카메라] 가이드라인 캔버스 초기화 오류:', error);
    }
  }

  /**
   * 가이드라인 그리기
   */
  drawGuidelines() {
    try {
      if (!this.canvasContext || !this.canvasElement) {
        return;
      }
      
      // 캔버스 초기화
      this.canvasContext.clearRect(0, 0, this.canvasElement.width, this.canvasElement.height);
      
      if (!this.guidelineVisible) {
        return;
      }
      
      // 캔버스 크기
      const width = this.canvasElement.width;
      const height = this.canvasElement.height;
      
      // 얼굴 영역 가이드라인 (세로 70-80%)
      const faceHeight = height * 0.75; // 세로 75%
      const faceWidth = faceHeight * 0.8; // 가로는 세로의 80%
      
      // 가이드라인 위치
      const centerX = width / 2;
      const centerY = height / 2;
      const faceLeft = centerX - faceWidth / 2;
      const faceTop = centerY - faceHeight / 2;
      
      // 스타일 설정
      this.canvasContext.strokeStyle = 'rgba(255, 255, 255, 0.7)';
      this.canvasContext.lineWidth = 2;
      this.canvasContext.setLineDash([5, 5]); // 점선
      
      // 얼굴 영역 사각형
      this.canvasContext.beginPath();
      this.canvasContext.rect(faceLeft, faceTop, faceWidth, faceHeight);
      this.canvasContext.stroke();
      
      // 중앙 십자선
      this.canvasContext.beginPath();
      this.canvasContext.moveTo(centerX, centerY - 10);
      this.canvasContext.lineTo(centerX, centerY + 10);
      this.canvasContext.moveTo(centerX - 10, centerY);
      this.canvasContext.lineTo(centerX + 10, centerY);
      this.canvasContext.stroke();
      
      // 텍스트 스타일
      this.canvasContext.setLineDash([]); // 실선으로 복원
      this.canvasContext.font = '12px Arial';
      this.canvasContext.fillStyle = 'rgba(255, 255, 255, 0.9)';
      
      // 안내 텍스트
      this.canvasContext.fillText('얼굴이 사각형 안에 위치하도록 조정하세요', faceLeft, faceTop - 10);
    } catch (error) {
      console.error('[카메라] 가이드라인 그리기 오류:', error);
    }
  }

  /**
   * 가이드라인 토글
   */
  toggleGuidelines() {
    this.guidelineVisible = !this.guidelineVisible;
    if (this.canvasContext && this.canvasElement) {
      if (this.guidelineVisible) {
        this.drawGuidelines();
      } else {
        this.canvasContext.clearRect(0, 0, this.canvasElement.width, this.canvasElement.height);
      }
    }
    return this.guidelineVisible;
  }

  /**
   * 카메라 전환 (전면/후면)
   * @returns {Promise<boolean>} 전환 성공 여부
   */
  async switchCamera() {
    try {
      this._logDebug('카메라 전환 시도', { 현재: this.currentFacingMode });
      this.stats.switchCount++;
      
      // 현재 스트림 중지
      this.shutdown();
      
      // 전면/후면 모드 전환
      this.currentFacingMode = this.currentFacingMode === 'user' ? 'environment' : 'user';
      
      // 제약 조건 업데이트
      this.constraints.video = {
        ...this.constraints.video,
        facingMode: this.currentFacingMode
      };
      
      // 초기화 시도 횟수 리셋
      this.initAttempts = 0;
      
      // 카메라 다시 초기화
      const success = await this.initialize();
      
      this._logDebug('카메라 전환 결과', { 
        success, 
        facingMode: this.currentFacingMode 
      });
      
      return success;
    } catch (error) {
      this._logDebug('카메라 전환 오류', { error });
      
      // 원래 모드로 복원 시도
      this.currentFacingMode = this.currentFacingMode === 'user' ? 'environment' : 'user';
      this.constraints.video.facingMode = this.currentFacingMode;
      
      try {
        await this.initialize();
      } catch (restoreError) {
        this._logDebug('원래 모드로 복원 실패', { error: restoreError });
      }
      
      throw error;
    }
  }

  /**
   * 카메라 해상도 설정
   * @param {number} width - 너비
   * @param {number} height - 높이
   * @returns {Promise<boolean>} 설정 성공 여부
   */
  async setResolution(width, height) {
    try {
      this._logDebug('해상도 변경 시도', { width, height });
      this.stats.resizeCount++;
      
      // 현재 제약 조건 유지하면서 해상도만 업데이트
      this.constraints.video = {
        ...this.constraints.video,
        width: { ideal: width },
        height: { ideal: height }
      };
      
      // 카메라 다시 초기화
      return await this.initialize();
    } catch (error) {
      this._logDebug('해상도 변경 오류', { error });
      throw error;
    }
  }
}