/**
 * 디버그 및 성능 모니터링 모듈
 * 개발 모드에서만 사용되는 디버그 도구입니다.
 */

import { workerManager } from './workerManager.js';

export class DebugManager {
  constructor() {
    this.isDebugMode = false;
    this.debugPanel = null;
    this.stats = null;
    
    // URL 매개변수로 디버그 모드 활성화 확인
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.has('debug') || localStorage.getItem('debug_mode') === 'true') {
      this.enableDebugMode();
    }
  }
  
  /**
   * 디버그 모드 활성화
   * @returns {boolean} 활성화 여부
   */
  enableDebugMode() {
    try {
      this.isDebugMode = true;
      localStorage.setItem('debug_mode', 'true');
      
      // 워커 매니저의 디버그 모드도 활성화
      workerManager.setDebugMode(true);
      
      // 디버그 패널 생성
      this._createDebugPanel();
      
      // 디버그 정보 업데이트 인터벌 설정
      this.intervalId = setInterval(() => this._updateDebugInfo(), 1000);
      
      console.log('디버그 모드가 활성화되었습니다.');
      return true;
    } catch (error) {
      console.error('디버그 모드 활성화 실패:', error);
      return false;
    }
  }
  
  /**
   * 디버그 모드 비활성화
   */
  disableDebugMode() {
    this.isDebugMode = false;
    localStorage.removeItem('debug_mode');
    
    // 워커 매니저의 디버그 모드도 비활성화
    workerManager.setDebugMode(false);
    
    // 디버그 패널 제거
    if (this.debugPanel && this.debugPanel.parentNode) {
      this.debugPanel.parentNode.removeChild(this.debugPanel);
      this.debugPanel = null;
    }
    
    // 업데이트 인터벌 제거
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    
    console.log('디버그 모드가 비활성화되었습니다.');
  }
  
  /**
   * 디버그 패널 생성
   * @private
   */
  _createDebugPanel() {
    // 이미 있으면 제거
    if (this.debugPanel) {
      this.debugPanel.parentNode.removeChild(this.debugPanel);
    }
    
    // 패널 생성
    this.debugPanel = document.createElement('div');
    this.debugPanel.id = 'debug-panel';
    this.debugPanel.style.position = 'fixed';
    this.debugPanel.style.right = '10px';
    this.debugPanel.style.bottom = '10px';
    this.debugPanel.style.width = '300px';
    this.debugPanel.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
    this.debugPanel.style.color = '#fff';
    this.debugPanel.style.padding = '10px';
    this.debugPanel.style.borderRadius = '5px';
    this.debugPanel.style.fontFamily = 'monospace';
    this.debugPanel.style.fontSize = '12px';
    this.debugPanel.style.zIndex = '9999';
    this.debugPanel.style.overflowY = 'auto';
    this.debugPanel.style.maxHeight = '300px';
    
    // 헤더
    const header = document.createElement('div');
    header.style.display = 'flex';
    header.style.justifyContent = 'space-between';
    header.style.marginBottom = '10px';
    
    const title = document.createElement('h3');
    title.textContent = '🔧 디버그 패널';
    title.style.margin = '0';
    title.style.fontSize = '14px';
    
    // 닫기 버튼
    const closeBtn = document.createElement('button');
    closeBtn.textContent = '×';
    closeBtn.style.background = 'none';
    closeBtn.style.border = 'none';
    closeBtn.style.color = '#fff';
    closeBtn.style.fontSize = '16px';
    closeBtn.style.cursor = 'pointer';
    closeBtn.onclick = () => this.disableDebugMode();
    
    header.appendChild(title);
    header.appendChild(closeBtn);
    
    // 통계 컨테이너
    this.stats = document.createElement('div');
    
    // 버튼 컨테이너
    const buttonContainer = document.createElement('div');
    buttonContainer.style.marginTop = '10px';
    
    // 통계 초기화 버튼
    const resetBtn = document.createElement('button');
    resetBtn.textContent = '통계 초기화';
    resetBtn.style.background = '#555';
    resetBtn.style.color = '#fff';
    resetBtn.style.border = 'none';
    resetBtn.style.padding = '5px 10px';
    resetBtn.style.borderRadius = '3px';
    resetBtn.style.marginRight = '5px';
    resetBtn.style.cursor = 'pointer';
    resetBtn.onclick = () => {
      workerManager.resetStats();
      this._updateDebugInfo();
    };
    
    // 캐시 초기화 버튼
    const clearCacheBtn = document.createElement('button');
    clearCacheBtn.textContent = '캐시 초기화';
    clearCacheBtn.style.background = '#555';
    clearCacheBtn.style.color = '#fff';
    clearCacheBtn.style.border = 'none';
    clearCacheBtn.style.padding = '5px 10px';
    clearCacheBtn.style.borderRadius = '3px';
    clearCacheBtn.style.cursor = 'pointer';
    clearCacheBtn.onclick = () => {
      this._clearServerCache();
    };
    
    buttonContainer.appendChild(resetBtn);
    buttonContainer.appendChild(clearCacheBtn);
    
    // 패널에 요소 추가
    this.debugPanel.appendChild(header);
    this.debugPanel.appendChild(this.stats);
    this.debugPanel.appendChild(buttonContainer);
    
    // 문서에 패널 추가
    document.body.appendChild(this.debugPanel);
  }
  
  /**
   * 디버그 정보 업데이트
   * @private
   */
  _updateDebugInfo() {
    if (!this.stats) return;
    
    // 워커 매니저 통계 가져오기
    const perfStats = workerManager.getPerformanceStats();
    
    // 메모리 사용량
    const memoryInfo = window.performance && window.performance.memory 
      ? window.performance.memory 
      : null;
    
    // HTML 생성
    let html = `
      <div style="margin-bottom: 5px;">
        <strong>Worker 상태:</strong> ${perfStats.isWorkerSupported ? '활성화' : '비활성화'}
      </div>
      <div style="margin-bottom: 5px;">
        <strong>이미지 처리:</strong> ${perfStats.totalProcessed}회
      </div>
      <div style="margin-bottom: 5px;">
        <strong>이미지 압축:</strong> ${perfStats.totalCompressed}회
      </div>
      <div style="margin-bottom: 5px;">
        <strong>평균 처리 시간:</strong> ${perfStats.avgProcessingTime.toFixed(2)}ms
      </div>
      <div style="margin-bottom: 5px;">
        <strong>평균 압축 시간:</strong> ${perfStats.avgCompressionTime.toFixed(2)}ms
      </div>
      <div style="margin-bottom: 5px;">
        <strong>에러 횟수:</strong> ${perfStats.errors}
      </div>
      <div style="margin-bottom: 5px;">
        <strong>대기 요청:</strong> ${perfStats.pendingRequests}
      </div>
    `;
    
    // 메모리 정보가 있으면 추가
    if (memoryInfo) {
      const mbUsed = Math.round(memoryInfo.usedJSHeapSize / (1024 * 1024));
      const mbTotal = Math.round(memoryInfo.totalJSHeapSize / (1024 * 1024));
      const mbLimit = Math.round(memoryInfo.jsHeapSizeLimit / (1024 * 1024));
      
      html += `
        <div style="margin-top: 10px; border-top: 1px solid #555; padding-top: 5px;">
          <strong>메모리 사용량:</strong> ${mbUsed}MB / ${mbTotal}MB (한도: ${mbLimit}MB)
        </div>
      `;
    }
    
    this.stats.innerHTML = html;
  }
  
  /**
   * 서버 캐시 초기화
   * @private
   */
  async _clearServerCache() {
    try {
      const response = await fetch('/api/cache', {
        method: 'DELETE',
        headers: {
          'X-Requested-With': 'XMLHttpRequest'
        }
      });
      
      const result = await response.json();
      
      if (result.success) {
        console.log('서버 캐시가 초기화되었습니다.');
        this._updateDebugInfo();
      } else {
        console.error('서버 캐시 초기화 실패:', result.error);
      }
    } catch (error) {
      console.error('서버 캐시 초기화 요청 중 오류:', error);
    }
  }
  
  /**
   * 디버그 로그 출력
   * @param {string} message - 로그 메시지
   * @param {Object} data - 관련 데이터
   */
  log(message, data = null) {
    if (!this.isDebugMode) return;
    
    if (data) {
      console.log(`[디버그] ${message}`, data);
    } else {
      console.log(`[디버그] ${message}`);
    }
  }
  
  /**
   * 성능 측정 시작
   * @param {string} label - 측정 레이블
   */
  startMeasure(label) {
    if (!this.isDebugMode) return;
    
    performance.mark(`${label}-start`);
  }
  
  /**
   * 성능 측정 종료 및 결과 출력
   * @param {string} label - 측정 레이블
   */
  endMeasure(label) {
    if (!this.isDebugMode) return;
    
    performance.mark(`${label}-end`);
    performance.measure(label, `${label}-start`, `${label}-end`);
    
    const entries = performance.getEntriesByName(label);
    if (entries.length > 0) {
      console.log(`[성능] ${label}: ${entries[0].duration.toFixed(2)}ms`);
    }
    
    // 마크 제거
    performance.clearMarks(`${label}-start`);
    performance.clearMarks(`${label}-end`);
    performance.clearMeasures(label);
  }
}

// 싱글톤 인스턴스 생성
export const debugManager = new DebugManager(); 