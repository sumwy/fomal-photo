@echo off
setlocal enabledelayedexpansion

echo 포말 포토(Fomal Photo) 실행 스크립트
echo =====================================
echo 이 스크립트는 포말 포토 애플리케이션의 백엔드를 실행합니다.
echo.

:: 기본 포트 설정
set PORT=5001

:: 명령줄 인수 파싱
set ARGS=%*
for %%i in (%ARGS%) do (
    if "%%i"=="-p" (
        set GET_PORT=1
    ) else if defined GET_PORT (
        set PORT=%%i
        set GET_PORT=
    )
)

:: 프로젝트 루트 디렉토리로 이동
cd /d "%~dp0"

:: 가상 환경 확인 및 활성화
if not exist venv (
    echo 가상 환경이 없습니다. 새로 생성합니다...
    python -m venv venv
    
    echo 가상 환경을 활성화합니다...
    call venv\Scripts\activate.bat
    
    echo 의존성 패키지를 설치합니다...
    pip install Flask==3.0.2 Pillow==10.2.0 opencv-python==4.9.0.80 numpy==1.26.4 python-dotenv==1.0.1 rembg onnxruntime
    pip install -r backend/requirements.txt
) else (
    echo 가상 환경을 활성화합니다...
    call venv\Scripts\activate.bat
)

:: 실행 환경 변수 설정
set FLASK_APP=backend/src/app.py
set FLASK_ENV=development

:: 백엔드 서버 실행
echo 백엔드 서버를 포트 %PORT%에서 실행합니다...
echo 애플리케이션 주소: http://localhost:%PORT%
echo 종료하려면 Ctrl+C를 누르세요.
python backend/src/app.py --port %PORT%

endlocal 