from flask import Blueprint, render_template, jsonify
from .services import process_image

main_blueprint = Blueprint('main', __name__)

@main_blueprint.route('/')
def index():
    return render_template('index.html')

@main_blueprint.route('/api/enhance_image', methods=['POST'])
def enhance_image():
    result = process_image(request)
    if isinstance(result, tuple):
        return jsonify(result[0]), result[1]
    return jsonify(result) 