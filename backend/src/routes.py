from flask import Blueprint, render_template, jsonify, request
from .services import process_image

main_blueprint = Blueprint('main', __name__)

@main_blueprint.route('/')
def index():
    return render_template('index.html')

@main_blueprint.route('/api/enhance_image', methods=['POST'])
def enhance_image():
    # request 처리를 services.py로 위임
    result = process_image(request)
    if isinstance(result, tuple):  # (data, status_code) 형태라면
        return jsonify(result[0]), result[1]
    return jsonify(result) 