# 운전면허 사진 가이드 웹 애플리케이션

## 프로젝트 소개

본 프로젝트는 웹 브라우저에서 운전면허 사진을 촬영할 수 있도록 가이드라인을 제공하고, 사진 촬영 기능을 제공하는 웹 애플리케이션입니다. HTML, CSS, JavaScript로 개발되었으며, 웹 표준 기술을 사용하여 카메라 접근 및 이미지 캡처 기능을 구현했습니다.

## 주요 기능

*   **카메라 접근 및 화면 표시:** WebRTC API를 사용하여 웹 브라우저에서 카메라에 접근하고, 실시간 카메라 미리보기 화면을 제공합니다.
*   **운전면허 사진 가이드라인 표시:**  캔버스 또는 CSS를 사용하여 운전면허 사진 규정에 맞는 가이드라인을 화면에 표시하여 사용자가 사진 구도를 잡도록 돕습니다.
*   **사진 촬영 기능:**  "사진 촬영" 버튼을 클릭하면 현재 카메라 화면을 캡처하여 화면에 표시합니다.
*   **이미지 보정 기능:** 밝기와 대비를 조절하고, 사진을 회전할 수 있는 기능을 제공합니다.
*   **다운로드 기능:** 보정된 이미지를 다운로드할 수 있는 기능을 제공합니다.

## 파일 구성

*   `index.html`: 웹 페이지의 구조를 정의하는 HTML 파일입니다. 카메라 미리보기, 가이드라인, 사진 촬영 버튼, 결과 이미지 표시 영역 등을 포함합니다.
*   `image_adjustment.png`: 이미지 보정 기능을 설명하는 스크린샷 (추가 예정)
*   `style.css`: 웹 페이지의 디자인을 담당하는 CSS 파일입니다. 레이아웃, 색상, 글꼴 등 웹 페이지의 시각적 스타일을 정의합니다.
*   `script.js`: 웹 페이지의 동작을 제어하는 JavaScript 파일입니다. 카메라 접근, 화면 표시, 사진 촬영, 가이드라인 그리기 등의 기능을 구현합니다.
*   `README.md`: 프로젝트에 대한 설명, 사용 방법, 파일 안내 등을 제공하는 Markdown 파일입니다. (현재 파일)

## 업데이트된 사용 방법

1. 저장소 복제
```bash
git clone https://github.com/your-repo/운전면허_사진_가이드.git
cd 운전면허_사진_가이드
```

2. 의존성 설치 및 실행
```bash
chmod +x setup.sh
./setup.sh
```

3. 브라우저에서 접속

## 추가 개발 계획 (향후 업데이트 예정)

*   **배경 제거 기능:** 촬영된 사진에서 배경을 자동으로 제거하는 기능 추가 (JavaScript 라이브러리 또는 서버 API 활용).
*   **사진 보정 기능:** 밝기, 대비, 색상 조정 등 기본적인 사진 보정 기능 추가 (Canvas API 또는 JavaScript 라이브러리 활용).
*   **운전면허 사진 규격 자동 확인:** 촬영된 사진이 운전면허 사진 규격에 맞는지 자동으로 확인하는 기능 추가.
*   **다운로드 기능:** 촬영 및 보정 완료된 사진을 사용자가 다운로드할 수 있도록 기능 추가.

## 참고

*   본 프로젝트는 웹 표준 기술을 기반으로 개발되었으므로, 최신 웹 브라우저 (Chrome, Firefox, Safari 등)에서 정상적으로 작동합니다.
*   카메라 접근 권한이 필요하며, HTTPS 환경에서 실행하는 것을 권장합니다 (일부 브라우저 정책).

## 문의

프로젝트 관련 문의사항이나 개선 제안이 있으시면 언제든지 연락 주세요.

[thspade@gmail.com](mailto:thspade@gmail.com)
