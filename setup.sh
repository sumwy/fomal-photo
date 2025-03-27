#!/bin/bash

# 디렉토리 생성
mkdir -p backend/src
mkdir -p frontend/{templates,static/css,static/js,static/images,uploads}

# 가상 환경 설정
python -m venv venv
source venv/bin/activate

# 기본 의존성 설치
echo "기본 의존성 패키지 설치 중..."
pip install Flask==3.0.2 Pillow==10.2.0 opencv-python==4.9.0.80 numpy==1.26.4 python-dotenv==1.0.1 rembg onnxruntime

# 나머지 의존성 설치
echo "나머지 의존성 설치 중..."
pip install -r backend/requirements.txt || echo "일부 패키지 설치에 실패했습니다."

# Flask 앱 실행 (개발 모드)
echo "Flask 애플리케이션 실행 중..."
cd "$(dirname "$0")"
PYTHONPATH="$(pwd)" python backend/src/app.py 