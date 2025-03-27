# 기본 이미지로 Python 3.9 사용
FROM python:3.9-slim

# 작업 디렉토리 설정
WORKDIR /app

# 시스템 패키지 설치
RUN apt-get update && apt-get install -y \
    build-essential \
    cmake \
    libopenblas-dev \
    liblapack-dev \
    libgl1-mesa-glx \
    libglib2.0-0 \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# 필요한 Python 패키지 설치
COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# 프로젝트 파일 복사
COPY backend/ /app/backend/
COPY frontend/ /app/frontend/

# 환경 변수 설정
ENV PYTHONPATH=/app
ENV FLASK_APP=backend/src/app.py
ENV FLASK_DEBUG=0

# 포트 노출
EXPOSE 5001

# 애플리케이션 실행
CMD ["python", "backend/src/app.py"] 