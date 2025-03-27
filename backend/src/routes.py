from flask import Blueprint, request, jsonify, render_template
import os
import sys

# 현재 디렉토리를 Python 경로에 추가
current_dir = os.path.dirname(os.path.abspath(__file__))
sys.path.append(current_dir)

# 서비스 모듈 import
from services import process_image

main_blueprint = Blueprint('main', __name__)

@main_blueprint.route('/')
def index():
    return render_template('index.html')

@main_blueprint.route('/api/enhance_image', methods=['POST'])
def enhance_image():
    try:
        result = process_image(request)
        if isinstance(result, tuple):
            return jsonify(result[0]), result[1]
        return jsonify(result)
    except Exception as e:
        return jsonify({'error': str(e)}), 500 