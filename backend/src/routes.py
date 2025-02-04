from flask import Blueprint, render_template, jsonify, request
from .services import process_image

main_blueprint = Blueprint('main', __name__)

@main_blueprint.route('/')
def index():
    return render_template('index.html')

@main_blueprint.route('/api/enhance_image', methods=['POST'])
def enhance_image():
    # 클라이언트의 요청(request)를 process_image 함수로 위임하여 처리
    result = process_image(request)
    if isinstance(result, tuple):  # (data, status_code) 형태라면
        return jsonify(result[0]), result[1]
    return jsonify(result) 