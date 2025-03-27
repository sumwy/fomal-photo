# backend/src/__init__.py

# 이 파일은 backend/src 디렉토리를 Python 패키지로 만듭니다.
# 내용이 비어 있어도 괜찮습니다. 

# 패키지 초기화 파일
from flask import Flask

def create_app():
    app = Flask(__name__,
                template_folder='../../frontend/templates',
                static_folder='../../frontend/static')
    
    from .routes import main_blueprint
    app.register_blueprint(main_blueprint)
    
    return app 