from flask import Flask
from .routes import main_blueprint
# advanced_face_enhancement 를 services에서 사용하므로 필요 시 가져오세요.
# from .services import advanced_face_enhancement  

app = Flask(__name__,
            template_folder='../../frontend/templates',
            static_folder='../../frontend/static')

print(f"Template folder: {app.template_folder}")
print(f"Static folder: {app.static_folder}")

app.register_blueprint(main_blueprint)

if __name__ == '__main__':
    app.run(debug=True, port=5001)  # 포트 번호를 setup.sh와 일치시킴 