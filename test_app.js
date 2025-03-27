const puppeteer = require('puppeteer');
const fs = require('fs');

// 테스트 함수 - 애플리케이션 기본 기능 확인
async function testApp() {
  console.log('테스트 시작: 포멀 포토 앱 기능 검증');
  
  // 브라우저 실행
  const browser = await puppeteer.launch({
    headless: false, // GUI 모드로 실행 (테스트 과정을 시각적으로 확인)
    args: [
      '--use-fake-ui-for-media-stream', // 카메라 권한 자동 허용
      '--allow-file-access-from-files',
      '--use-fake-device-for-media-stream' // 가상 카메라 사용
    ],
    defaultViewport: { width: 1280, height: 800 }
  });
  
  try {
    // 새 페이지 열기
    const page = await browser.newPage();
    
    // 페이지 로드
    console.log('페이지 로드 중...');
    await page.goto('http://localhost:8000/templates/index.html', { waitUntil: 'networkidle2', timeout: 60000 });
    console.log('페이지 로드 완료');
    
    // 스크린샷 찍기
    await page.screenshot({ path: 'initial_load.png' });
    console.log('초기 페이지 스크린샷 저장됨: initial_load.png');
    
    // 5초 대기 (카메라 초기화를 위한 시간)
    console.log('카메라 초기화 대기 중...');
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    // DOM 내용 확인
    const htmlContent = await page.content();
    fs.writeFileSync('page_content.html', htmlContent);
    console.log('페이지 HTML 내용이 page_content.html 파일에 저장됨');
    
    // 페이지 타이틀 확인
    const title = await page.title();
    console.log('페이지 제목:', title);
    
    // 페이지의 모든 버튼 확인
    const buttons = await page.$$('button');
    console.log(`페이지에서 ${buttons.length}개의 버튼 발견`);
    
    // 페이지의 모든 이미지 확인
    const images = await page.$$('img');
    console.log(`페이지에서 ${images.length}개의 이미지 발견`);
    
    // 요소들이 제대로 로드되었는지 확인
    const requiredElements = [
      'camera-preview',
      'capture-button',
      'toggle-guidelines-button',
      'switch-camera'
    ];
    
    for (const element of requiredElements) {
      const exists = await page.$(`#${element}`);
      if (exists) {
        console.log(`✓ 요소 확인됨: #${element}`);
      } else {
        console.error(`✗ 요소를 찾을 수 없음: #${element}`);
      }
    }
    
    // 가이드라인 토글 버튼이 있으면 클릭
    const guidelineButton = await page.$('#toggle-guidelines-button');
    if (guidelineButton) {
      console.log('가이드라인 토글 버튼 테스트...');
      await guidelineButton.click();
      await page.screenshot({ path: 'guideline_toggled.png' });
      console.log('가이드라인 토글 스크린샷 저장됨: guideline_toggled.png');
    } else {
      console.log('가이드라인 토글 버튼을 찾을 수 없어 테스트를 건너뜁니다.');
    }
    
    // 카메라 전환 버튼이 있으면 클릭
    const switchCameraButton = await page.$('#switch-camera');
    if (switchCameraButton) {
      console.log('카메라 전환 버튼 테스트...');
      await switchCameraButton.click();
      console.log('카메라 전환 대기 중...');
      await new Promise(resolve => setTimeout(resolve, 2000));
      await page.screenshot({ path: 'camera_switched.png' });
      console.log('카메라 전환 스크린샷 저장됨: camera_switched.png');
    } else {
      console.log('카메라 전환 버튼을 찾을 수 없어 테스트를 건너뜁니다.');
    }
    
    // 캡처 버튼이 있으면 클릭
    const captureButton = await page.$('#capture-button');
    if (captureButton) {
      console.log('캡처 버튼 테스트...');
      await captureButton.click();
      
      // 이미지 처리 대기
      console.log('이미지 처리 대기 중...');
      await new Promise(resolve => setTimeout(resolve, 10000));
      
      // 이미지 처리 결과 확인
      const originalPhotoContainer = await page.$('#original-photo-container');
      if (originalPhotoContainer) {
        const isVisible = await page.evaluate(el => {
          return window.getComputedStyle(el).display !== 'none';
        }, originalPhotoContainer);
        
        if (isVisible) {
          console.log('✓ 이미지 처리 결과가 표시됨');
          await page.screenshot({ path: 'image_processed.png' });
          console.log('처리된 이미지 스크린샷 저장됨: image_processed.png');
        } else {
          console.error('✗ 이미지 처리 결과가 표시되지 않음');
        }
      }
    } else {
      console.log('캡처 버튼을 찾을 수 없어 테스트를 건너뜁니다.');
    }
    
    // 콘솔 로그 수집
    console.log('브라우저 콘솔 로그 수집...');
    const logEntries = [];
    
    // 네트워크 요청 모니터링
    const networkRequests = [];
    page.on('request', request => {
      networkRequests.push(`[${request.method()}] ${request.url()}`);
    });
    
    page.on('response', response => {
      const status = response.status();
      if (status >= 400) {
        console.error(`네트워크 오류: ${response.url()} (${status})`);
      }
    });
    
    // 콘솔 메시지 이벤트 리스너
    page.on('console', message => {
      const text = message.text();
      logEntries.push(`[${message.type()}] ${text}`);
      
      // 오류 메시지 출력
      if (message.type() === 'error' || text.includes('오류')) {
        console.error(`브라우저 콘솔 오류: ${text}`);
      }
    });
    
    // 로그 파일로 저장
    fs.writeFileSync('browser_console.log', logEntries.join('\n'));
    console.log('브라우저 콘솔 로그가 browser_console.log 파일에 저장됨');
    
    // 네트워크 요청 로그 저장
    fs.writeFileSync('network_requests.log', networkRequests.join('\n'));
    console.log('네트워크 요청 로그가 network_requests.log 파일에 저장됨');
    
    console.log('테스트 완료!');
  } catch (error) {
    console.error('테스트 중 오류 발생:', error);
  } finally {
    // 5초 후 브라우저 닫기 (스크린샷 확인 시간)
    console.log('5초 후 브라우저가 닫힙니다...');
    await new Promise(resolve => setTimeout(resolve, 5000));
    await browser.close();
  }
}

// 테스트 실행
testApp().catch(console.error); 