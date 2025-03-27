#!/bin/bash

# 스크립트 설명
echo "포말 포토(Fomal Photo) 실행 스크립트"
echo "====================================="
echo "이 스크립트는 포말 포토 애플리케이션의 백엔드를 실행합니다."
echo

# 기본 포트 설정
PORT=5001

# 명령줄 인수 파싱
while getopts ":p:" opt; do
  case ${opt} in
    p )
      PORT=$OPTARG
      ;;
    \? )
      echo "잘못된 옵션: -$OPTARG" 1>&2
      echo "사용법: $0 [-p 포트번호]" 1>&2
      exit 1
      ;;
    : )
      echo "옵션 -$OPTARG에 인수가 필요합니다." 1>&2
      exit 1
      ;;
  esac
done

# 프로젝트 루트 디렉토리로 이동
cd "$(dirname "$0")"
BASEDIR=$(pwd)

# 가상 환경 확인 및 활성화
if [ ! -d "venv" ]; then
  echo "가상 환경이 없습니다. 새로 생성합니다..."
  python -m venv venv
  
  echo "가상 환경을 활성화합니다..."
  source venv/bin/activate
  
  echo "의존성 패키지를 설치합니다..."
  pip install Flask==3.0.2 Pillow==10.2.0 opencv-python==4.9.0.80 numpy==1.26.4 python-dotenv==1.0.1 rembg onnxruntime
  pip install -r backend/requirements.txt
else
  echo "가상 환경을 활성화합니다..."
  source venv/bin/activate
fi

# 실행 환경 변수 설정
export FLASK_APP=backend/src/app.py
export FLASK_ENV=development

# 서버 상태 확인
if lsof -i:$PORT > /dev/null 2>&1; then
  echo "포트 $PORT는 이미 사용 중입니다. 다른 포트를 지정해주세요."
  echo "사용법: $0 -p [포트번호]"
  exit 1
fi

# 백엔드 서버 실행
echo "백엔드 서버를 포트 $PORT에서 실행합니다..."
echo "애플리케이션 주소: http://localhost:$PORT"
echo "종료하려면 Ctrl+C를 누르세요."
python backend/src/app.py --port $PORT 