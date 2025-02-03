#!/bin/bash

# 디렉토리 생성
mkdir -p backend/src
mkdir -p frontend/{templates,static/css,static/js,static/images,uploads}

# 가상 환경 설정
python -m venv venv
source venv/bin/activate

# 의존성 설치
pip install -r backend/requirements.txt

# Flask 앱 실행 (개발 모드)
export FLASK_APP=backend/src/app.py
export FLASK_ENV=development
flask run --host=0.0.0.0 --port=5001 