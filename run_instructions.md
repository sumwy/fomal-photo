# 포말 포토(Fomal Photo) 실행 가이드

이 문서는 포말 포토 프로젝트의 백엔드와 프론트엔드를 실행하는 방법을 설명합니다.

## 사전 요구사항

- Python 3.8 이상
- pip (Python 패키지 관리자)
- 가상 환경 도구 (venv)

## 환경 설정

### 1. 가상 환경 설정

```bash
# 가상 환경 생성
python -m venv venv

# 가상 환경 활성화
# Windows
venv\Scripts\activate
# macOS/Linux
source venv/bin/activate
```

### 2. 의존성 설치

```bash
# 기본 의존성 설치
pip install Flask==3.0.2 Pillow==10.2.0 opencv-python==4.9.0.80 numpy==1.26.4 python-dotenv==1.0.1 rembg onnxruntime

# 백엔드 의존성 설치
pip install -r backend/requirements.txt
```

## 백엔드 실행

```bash
# 프로젝트 루트 디렉토리에서 실행
# 기본 포트(5001)로 실행
python backend/src/app.py

# 특정 포트로 실행
python backend/src/app.py --port 5002
```

백엔드 서버는 기본적으로 http://localhost:5001 에서 접근 가능합니다.

## 프론트엔드 접속

프론트엔드는 별도의 실행 과정 없이 백엔드 서버를 통해 제공됩니다. 
백엔드 서버가 실행되면 자동으로 프론트엔드 파일들을 제공합니다.

웹 브라우저에서 다음 URL로 접속하세요:
- http://localhost:5001 (기본 포트 사용 시)
- http://localhost:5002 (포트 5002로 실행 시)

## 전체 애플리케이션 한 번에 실행 (setup.sh 사용)

프로젝트 루트 디렉토리에 있는 setup.sh 스크립트를 사용하여 모든 설정과 실행을 자동화할 수 있습니다.

```bash
# macOS/Linux에서 실행
bash setup.sh

# 또는 실행 권한 부여 후 실행
chmod +x setup.sh
./setup.sh
```

## 도커를 사용한 실행

도커가 설치되어 있다면 다음 명령어로 애플리케이션을 실행할 수 있습니다:

```bash
# 도커 컨테이너 빌드 및 실행
docker-compose up -d
```

앱은 http://localhost:5001 에서 접근 가능합니다.

## 사용 방법

1. 웹 브라우저에서 애플리케이션 접속
2. 카메라 접근 권한 요청 시 '허용' 클릭
3. 사진 촬영: '사진 촬영' 버튼 클릭 또는 스페이스바 
4. 다시 찍기: '다시 찍기' 버튼 클릭 또는 'R' 키 
5. 가이드라인 토글: '가이드라인' 버튼 클릭 또는 'G' 키 
6. 카메라 전환: '카메라 전환' 버튼 클릭 또는 'S' 키 
7. 처리된 사진은 '다운로드' 버튼으로 저장 가능

## 주의사항

- 카메라 사용을 위해 브라우저의 카메라 접근 권한이 필요합니다.
- 일부 기능(배경 제거 등)은 처음 실행 시 모델을 다운로드하므로 시간이 소요될 수 있습니다. 