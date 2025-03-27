/**
 * 디버그 관리자 클래스
 * 개발 및 디버깅을 위한 유틸리티를 제공합니다.
 */
class DebugManager {
  constructor() {
    this.isEnabled = false;
    this.logs = [];
    this.maxLogs = 100;
    this.startTime = Date.now();
    this.markers = {};
    this.measurements = {};
  }

  /**
   * 디버그 모드 활성화 (약식 메소드)
   */
  enable() {
    this.enableDebugMode();
  }

  /**
   * 디버그 모드 활성화
   */
  enableDebugMode() {
    this.isEnabled = true;
    this.startTime = Date.now();
    console.log('디버그 모드 활성화됨');
    
    // 디버그 모드 클래스를 body에 추가
    document.body.classList.add('debug-mode');
    
    // 콘솔 메소드 오버라이드 (원본 저장)
    this.originalConsole = {
      log: console.log,
      warn: console.warn,
      error: console.error,
      info: console.info
    };
    
    // 로그 캡처를 위한 오버라이드
    console.log = (...args) => {
      this.captureLog('log', ...args);
      this.originalConsole.log(...args);
    };
    
    console.warn = (...args) => {
      this.captureLog('warn', ...args);
      this.originalConsole.warn(...args);
    };
    
    console.error = (...args) => {
      this.captureLog('error', ...args);
      this.originalConsole.error(...args);
    };
    
    console.info = (...args) => {
      this.captureLog('info', ...args);
      this.originalConsole.info(...args);
    };
    
    // 오류 이벤트 리스너 추가
    window.addEventListener('error', this.handleGlobalError.bind(this));
    window.addEventListener('unhandledrejection', this.handleUnhandledRejection.bind(this));
    
    // MediaDevices 오류 모니터링
    this.monitorMediaDevices();
    
    this.log('디버그 모드 초기화 완료');
  }
  
  /**
   * 디버그 모드 비활성화
   */
  disableDebugMode() {
    if (!this.isEnabled) return;
    
    // 원래 콘솔 메소드 복원
    if (this.originalConsole) {
      console.log = this.originalConsole.log;
      console.warn = this.originalConsole.warn;
      console.error = this.originalConsole.error;
      console.info = this.originalConsole.info;
    }
    
    // 이벤트 리스너 제거
    window.removeEventListener('error', this.handleGlobalError.bind(this));
    window.removeEventListener('unhandledrejection', this.handleUnhandledRejection.bind(this));
    
    // 디버그 모드 클래스 제거
    document.body.classList.remove('debug-mode');
    
    this.isEnabled = false;
    console.log('디버그 모드 비활성화됨');
  }

  /**
   * 로그 캡처
   * @param {string} level - 로그 레벨
   * @param  {...any} args - 로그 인자
   */
  captureLog(level, ...args) {
    if (!this.isEnabled) return;
    
    // 로그 객체 생성
    const log = {
      timestamp: new Date(),
      timeOffset: Date.now() - this.startTime,
      level,
      message: args.map(arg => this.formatLogArgument(arg)).join(' ')
    };
    
    // 로그 저장
    this.logs.push(log);
    
    // 최대 로그 수 제한
    if (this.logs.length > this.maxLogs) {
      this.logs.shift();
    }
  }
  
  /**
   * 로그 인자 형식화
   * @param {any} arg - 로그 인자
   * @returns {string} 형식화된 문자열
   */
  formatLogArgument(arg) {
    if (arg === null) return 'null';
    if (arg === undefined) return 'undefined';
    
    if (typeof arg === 'object') {
      try {
        return JSON.stringify(arg);
      } catch (e) {
        return String(arg);
      }
    }
    
    return String(arg);
  }
  
  /**
   * 전역 오류 핸들러
   * @param {ErrorEvent} event - 오류 이벤트
   */
  handleGlobalError(event) {
    if (!this.isEnabled) return;
    
    this.captureLog('error', `[전역 오류] ${event.message}`, `(${event.filename}:${event.lineno}:${event.colno})`);
  }
  
  /**
   * 처리되지 않은 Promise 거부 핸들러
   * @param {PromiseRejectionEvent} event - Promise 거부 이벤트
   */
  handleUnhandledRejection(event) {
    if (!this.isEnabled) return;
    
    this.captureLog('error', '[미처리 Promise 거부]', event.reason);
  }
  
  /**
   * MediaDevices API 모니터링
   */
  monitorMediaDevices() {
    if (!this.isEnabled) return;
    
    // 원본 메소드 저장
    const originalGetUserMedia = navigator.mediaDevices && navigator.mediaDevices.getUserMedia;
    const originalEnumerateDevices = navigator.mediaDevices && navigator.mediaDevices.enumerateDevices;
    
    if (originalGetUserMedia) {
      // getUserMedia 오버라이드
      navigator.mediaDevices.getUserMedia = async (constraints) => {
        this.log(`[MediaDevices] getUserMedia 호출됨`, constraints);
        
        // 시간 측정 시작
        this.timeStart('getUserMedia');
        
        try {
          // 권한 상태 확인 시도
          try {
            const permissions = await navigator.permissions.query({ name: 'camera' });
            this.log(`[MediaDevices] 카메라 권한 상태: ${permissions.state}`);
          } catch (permError) {
            this.log(`[MediaDevices] 권한 확인 불가: ${permError.message}`);
          }
          
          const stream = await originalGetUserMedia.call(navigator.mediaDevices, constraints);
          const elapsed = this.timeEnd('getUserMedia');
          
          // 트랙 정보 수집
          const videoTracks = stream.getVideoTracks();
          const trackDetails = videoTracks.map(track => {
            const settings = track.getSettings();
            return {
              label: track.label,
              id: track.id,
              enabled: track.enabled,
              muted: track.muted,
              readyState: track.readyState,
              settings: {
                width: settings.width,
                height: settings.height,
                aspectRatio: settings.aspectRatio,
                frameRate: settings.frameRate,
                facingMode: settings.facingMode
              }
            };
          });
          
          this.log(`[MediaDevices] getUserMedia 성공 (${elapsed}ms)`, {
            tracks: stream.getTracks().length,
            videoTracks: videoTracks.length,
            audioTracks: stream.getAudioTracks().length,
            trackDetails
          });
          
          // 트랙 종료 이벤트 모니터링
          videoTracks.forEach(track => {
            track.addEventListener('ended', () => {
              this.log(`[MediaDevices] 비디오 트랙 종료됨: ${track.label}`);
            });
            
            track.addEventListener('mute', () => {
              this.log(`[MediaDevices] 비디오 트랙 음소거됨: ${track.label}`);
            });
            
            track.addEventListener('unmute', () => {
              this.log(`[MediaDevices] 비디오 트랙 음소거 해제됨: ${track.label}`);
            });
          });
          
          return stream;
        } catch (error) {
          this.timeEnd('getUserMedia');
          
          // 오류 정보 수집
          const errorInfo = {
            name: error.name,
            message: error.message,
            stack: error.stack,
            constraints: JSON.stringify(constraints)
          };
          
          // 더 자세한 오류 분석
          let errorDetail = '';
          if (error.name === 'NotAllowedError') {
            errorDetail = '카메라 접근 권한이 거부됨';
          } else if (error.name === 'NotFoundError') {
            errorDetail = '적합한 카메라 장치를 찾을 수 없음';
          } else if (error.name === 'NotReadableError') {
            errorDetail = '카메라가 사용 중이거나 접근 불가';
          } else if (error.name === 'OverconstrainedError') {
            errorDetail = `요청한 제약조건을 만족하지 못함: ${error.constraint || '알 수 없음'}`;
          } else if (error.name === 'TypeError') {
            errorDetail = '잘못된 제약조건 지정';
          } else {
            errorDetail = '알 수 없는 오류';
          }
          
          this.log(`[MediaDevices] getUserMedia 실패: ${errorDetail}`, errorInfo);
          throw error;
        }
      };
    }
    
    if (originalEnumerateDevices) {
      // enumerateDevices 오버라이드
      navigator.mediaDevices.enumerateDevices = async () => {
        this.log(`[MediaDevices] enumerateDevices 호출됨`);
        try {
          const devices = await originalEnumerateDevices.call(navigator.mediaDevices);
          const deviceInfo = {
            total: devices.length,
            videoinput: devices.filter(d => d.kind === 'videoinput').length,
            audioinput: devices.filter(d => d.kind === 'audioinput').length,
            audiooutput: devices.filter(d => d.kind === 'audiooutput').length
          };
          this.log(`[MediaDevices] enumerateDevices 성공`, deviceInfo);
          return devices;
        } catch (error) {
          this.log(`[MediaDevices] enumerateDevices 실패`, error.name, error.message);
          throw error;
        }
      };
    }
  }
  
  /**
   * 간단한 로그 메소드
   * @param  {...any} args - 로그 인자
   */
  log(...args) {
    if (!this.isEnabled) return;
    this.captureLog('log', ...args);
    this.originalConsole.log(...args);
  }
  
  /**
   * 시간 측정 시작
   * @param {string} name - 마커 이름
   */
  timeStart(name) {
    if (!this.isEnabled) return;
    this.markers[name] = Date.now();
    this.log(`[시간측정 시작] ${name}`);
  }
  
  /**
   * 시간 측정 종료
   * @param {string} name - 마커 이름
   * @returns {number} 경과 시간 (ms)
   */
  timeEnd(name) {
    if (!this.isEnabled) return 0;
    
    if (!this.markers[name]) {
      this.log(`[시간측정 오류] 마커가 없음: ${name}`);
      return 0;
    }
    
    const elapsed = Date.now() - this.markers[name];
    this.log(`[시간측정 종료] ${name}: ${elapsed}ms`);
    delete this.markers[name];
    return elapsed;
  }
  
  /**
   * 브라우저 및 시스템 정보 수집
   * @returns {Object} 정보 객체
   */
  collectBrowserInfo() {
    const info = {
      userAgent: navigator.userAgent,
      platform: navigator.platform,
      vendor: navigator.vendor,
      language: navigator.language,
      cookieEnabled: navigator.cookieEnabled,
      doNotTrack: navigator.doNotTrack,
      hardwareConcurrency: navigator.hardwareConcurrency,
      screenWidth: window.screen.width,
      screenHeight: window.screen.height,
      viewportWidth: window.innerWidth,
      viewportHeight: window.innerHeight,
      devicePixelRatio: window.devicePixelRatio,
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      mediaDevices: {
        supported: !!(navigator.mediaDevices),
        getUserMediaSupported: !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia),
        enumerateDevicesSupported: !!(navigator.mediaDevices && navigator.mediaDevices.enumerateDevices)
      }
    };
    
    // WebRTC 지원 여부
    try {
      info.webRTCSupported = !!(window.RTCPeerConnection || window.webkitRTCPeerConnection || window.mozRTCPeerConnection);
    } catch (e) {
      info.webRTCSupported = false;
    }
    
    return info;
  }
  
  /**
   * 카메라 디버그 도구 추가
   * @param {CameraManager} cameraManager - 카메라 관리자 인스턴스
   */
  setupCameraDebugTools(cameraManager) {
    if (!this.isEnabled || !cameraManager) return;
    
    this.log('카메라 디버그 도구 설정');
    
    // 디버그 정보 표시 요소 생성
    if (!document.querySelector('.debug-panel')) {
      const debugPanel = document.createElement('div');
      debugPanel.className = 'debug-panel';
      debugPanel.innerHTML = `
        <div class="debug-header">카메라 디버그 패널</div>
        <div class="debug-content">
          <div class="debug-camera-state"></div>
          <div class="debug-actions">
            <button class="debug-btn" id="debug-refresh-devices">장치 새로고침</button>
            <button class="debug-btn" id="debug-force-retry">카메라 재시도</button>
            <button class="debug-btn" id="debug-switch-camera">카메라 전환</button>
          </div>
        </div>
      `;
      document.body.appendChild(debugPanel);
      
      // 장치 새로고침 버튼 이벤트
      document.getElementById('debug-refresh-devices').addEventListener('click', async () => {
        this.log('[디버그 도구] 장치 새로고침 클릭');
        try {
          const devices = await navigator.mediaDevices.enumerateDevices();
          const videoDevices = devices.filter(device => device.kind === 'videoinput');
          this.log(`[디버그 도구] 장치 새로고침 완료: ${videoDevices.length}개의 카메라 감지됨`);
          
          // 카메라 상태 표시 업데이트
          const stateElement = document.querySelector('.debug-camera-state');
          if (stateElement) {
            stateElement.innerHTML = `<p>감지된 카메라: ${videoDevices.length}개</p>`;
            videoDevices.forEach((device, index) => {
              stateElement.innerHTML += `<p>카메라 ${index+1}: ${device.label || '(이름 없음)'}</p>`;
            });
          }
        } catch (error) {
          this.log(`[디버그 도구] 장치 새로고침 오류`, error.name, error.message);
        }
      });
      
      // 카메라 재시도 버튼 이벤트
      document.getElementById('debug-force-retry').addEventListener('click', () => {
        this.log('[디버그 도구] 카메라 강제 재시도');
        cameraManager.shutdown();
        cameraManager.initAttempts = 0;
        cameraManager.initialize();
      });
      
      // 카메라 전환 버튼 이벤트
      document.getElementById('debug-switch-camera').addEventListener('click', () => {
        this.log('[디버그 도구] 카메라 강제 전환');
        cameraManager.switchCamera();
      });
    }
  }
  
  /**
   * 디버그 로그 저장 및 다운로드
   */
  downloadLogs() {
    if (!this.isEnabled) return;
    
    const browserInfo = this.collectBrowserInfo();
    
    // 로그 데이터 객체 생성
    const logData = {
      timestamp: new Date().toISOString(),
      browserInfo,
      logs: this.logs
    };
    
    // JSON으로 변환
    const jsonString = JSON.stringify(logData, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    
    // 다운로드 링크 생성 및 클릭
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `camera-debug-logs-${new Date().toISOString().replace(/:/g, '-')}.json`;
    a.click();
    
    // URL 객체 해제
    URL.revokeObjectURL(url);
    
    this.log('디버그 로그 다운로드됨');
  }

  /**
   * 성능 측정 시작
   * @param {string} name - 측정 이름
   */
  startMeasure(name) {
    if (!this.isEnabled) return;
    
    this.measurements[name] = {
      startTime: performance.now(),
      name: name
    };
    
    console.log(`[성능측정] ${name} 시작`);
    
    // Performance API 사용
    if (window.performance && performance.mark) {
      performance.mark(`${name}-start`);
    }
  }
  
  /**
   * 성능 측정 종료
   * @param {string} name - 측정 이름
   * @returns {number} 소요 시간(ms)
   */
  endMeasure(name) {
    if (!this.isEnabled || !this.measurements[name]) return 0;
    
    const endTime = performance.now();
    const measurement = this.measurements[name];
    const duration = endTime - measurement.startTime;
    
    // 측정 결과 저장
    measurement.endTime = endTime;
    measurement.duration = duration;
    
    console.log(`[성능측정] ${name} 종료: ${duration.toFixed(2)}ms`);
    
    // Performance API 사용
    if (window.performance && performance.mark && performance.measure) {
      performance.mark(`${name}-end`);
      try {
        performance.measure(name, `${name}-start`, `${name}-end`);
      } catch (e) {
        console.warn(`Performance API 측정 오류: ${e.message}`);
      }
    }
    
    return duration;
  }
}

// 싱글톤 인스턴스 생성
export const debugManager = new DebugManager(); 