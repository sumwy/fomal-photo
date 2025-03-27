import os
import sys
import base64
import re
import logging
from typing import Dict, Any, Optional, Union
from datetime import datetime

# 현재 디렉토리와 부모 디렉토리를 Python 경로에 추가
current_dir = os.path.dirname(os.path.abspath(__file__))
parent_dir = os.path.dirname(current_dir)
sys.path.insert(0, current_dir)
sys.path.insert(0, parent_dir)

from flask import Flask, Blueprint, request, jsonify, render_template, send_from_directory, abort
from flask_cors import CORS
from werkzeug.middleware.proxy_fix import ProxyFix

# 기존 services.py 대신 모듈화된 image_processor 가져오기
from modules.image_processor import process_image, clear_image_cache, get_cache_stats

# 로깅 설정 (디버그 레벨로 변경)
logging.basicConfig(
    level=logging.DEBUG,  # INFO에서 DEBUG로 변경
    format='%(asctime)s - %(levelname)s - [%(filename)s:%(lineno)d] - %(message)s',  # 파일명과 라인 번호 추가
    handlers=[
        logging.StreamHandler(),
        logging.FileHandler('backend_debug.log')  # 파일로도 로그 저장
    ]
)
logger = logging.getLogger(__name__)

# 시작 로그 추가
logger.info("===== 포말 포토 백엔드 서버 시작 =====")

app = Flask(__name__, 
            static_folder='../../frontend/static',
            template_folder='../../frontend/templates')

# 보안 관련 헤더 추가를 위한 미들웨어
@app.after_request
def add_security_headers(response):
    # XSS 방지
    response.headers['X-XSS-Protection'] = '1; mode=block'
    # MIME 스니핑 방지
    response.headers['X-Content-Type-Options'] = 'nosniff'
    # iframe 사용 제한
    response.headers['X-Frame-Options'] = 'SAMEORIGIN'
    # HSTS 설정 (HTTPS 강제)
    # response.headers['Strict-Transport-Security'] = 'max-age=31536000; includeSubDomains'
    # 컨텐츠 보안 정책
    response.headers['Content-Security-Policy'] = "default-src 'self'; img-src 'self' data:; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline' https://cdnjs.cloudflare.com https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com;"
    # 리퍼러 정책
    response.headers['Referrer-Policy'] = 'same-origin'
    return response

# CORS 설정
CORS(app, resources={r"/*": {"origins": ["http://localhost:5001", "https://fomal-photo.com"]}})

# 신뢰할 수 있는.
app.wsgi_app = ProxyFix(app.wsgi_app, x_for=1, x_proto=1, x_host=1)

main_blueprint = Blueprint('main', __name__)

@main_blueprint.route('/')
def index():
    return render_template('index.html')

@main_blueprint.route('/status', methods=['GET'])
def status():
    """서버 상태 확인 엔드포인트"""
    try:
        return jsonify({
            'success': True,
            'status': 'ok',
            'timestamp': str(datetime.now()),
            'server_info': {
                'name': 'Fomal Photo Backend',
                'version': '1.0.0'
            }
        })
    except Exception as e:
        logger.error(f"Error in status endpoint: {str(e)}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

# 이미지 검증 유틸리티 함수
def validate_image_data(image_data: Optional[str]) -> bool:
    """
    이미지 데이터의 유효성을 검사합니다.
    
    Args:
        image_data: base64로 인코딩된 이미지 데이터
        
    Returns:
        bool: 유효한 이미지인 경우 True, 그렇지 않으면 False
    """
    if not image_data:
        logger.warning("Empty image data received")
        return False
    
    # 디버그 정보 로깅
    logger.debug(f"Validating image data, length: {len(image_data)}")
    logger.debug(f"Image data starts with: {image_data[:30]}")
    
    # data:image/ 형식이 맞는지 확인
    if 'data:image/' in image_data:
        try:
            # 데이터가 base64 형식인지 확인
            if ',' in image_data:
                # 'data:image/jpeg;base64,' 같은 prefix 제거
                img_format = image_data.split(';')[0].split('/')[1]
                logger.debug(f"Image format detected: {img_format}")
                image_data = image_data.split(',')[1]
            
            # base64 디코딩 시도
            decoded_data = base64.b64decode(image_data)
            
            # 최소 크기 검증 (빈 이미지가 아닌지)
            if len(decoded_data) < 10:  # 더 작은 값으로 변경
                logger.warning(f"Image too small: {len(decoded_data)} bytes")
                return False
                
            # 최대 크기 검증 (10MB)
            if len(decoded_data) > 10 * 1024 * 1024:
                logger.warning(f"Image too large: {len(decoded_data)} bytes")
                return False
                
            logger.debug(f"Image validation successful: {len(decoded_data)} bytes")
            return True
        except Exception as e:
            logger.error(f"Image validation error: {str(e)}")
            return False
    else:
        logger.warning("Invalid image format: missing 'data:image/' prefix")
        return False

@main_blueprint.route('/process_image', methods=['POST'])
def process_image_route():
    try:
        # 이미지 데이터 가져오기
        image_data = request.form.get('image')
        
        # 이미지 데이터 검증
        if not validate_image_data(image_data):
            logger.warning("Invalid image data received")
            return jsonify({
                'success': False,
                'error': '유효하지 않은 이미지 데이터입니다.'
            }), 400
        
        # 이미지 데이터에서 base64 부분만 추출
        if image_data and ',' in image_data:
            image_data = image_data.split(',')[1]
        
        # 이미지 처리 옵션 직접 가져오기
        options = {
            'adjust_face_position': request.form.get('adjust_face_position', 'true').lower() == 'true',
            'remove_background': request.form.get('remove_background', 'true').lower() == 'true',
            'upscale': request.form.get('upscale', 'true').lower() == 'true',
            'skin_smoothing': request.form.get('skin_smoothing', 'true').lower() == 'true',
            'eye_enhance': request.form.get('eye_enhance', 'true').lower() == 'true',
            'sharpness_enhance': request.form.get('sharpness_enhance', 'true').lower() == 'true',
            'use_parallel': request.form.get('use_parallel', 'true').lower() == 'true',
            'optimize_size': request.form.get('optimize_size', 'true').lower() == 'true'
        }
        
        # 품질 설정 (선택적)
        if 'compression_quality' in request.form:
            try:
                quality = int(request.form.get('compression_quality'))
                if 1 <= quality <= 100:
                    options['compression_quality'] = quality
            except ValueError:
                pass  # 변환 실패 시 기본값 사용
        
        # 디버그 로그 추가
        logger.debug(f"Processing image with options: {options}")
        
        # 이미지 처리 - 이제 모듈화된 process_image 함수 사용
        result = process_image(image_data, options)
        
        # 처리된 이미지 반환
        return jsonify({
            'success': True,
            'enhanced_image': result['enhanced_image'],
            'metadata': result.get('metadata', {})
        })
    except Exception as e:
        logger.error(f"Error processing image: {str(e)}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@main_blueprint.route('/api/enhance_image', methods=['POST'])
def enhance_image():
    try:
        # 요청 본문 검증
        if not request.is_json:
            return jsonify({
                'success': False,
                'error': '요청 본문은 JSON 형식이어야 합니다.'
            }), 400
            
        # 이미지 데이터 가져오기
        image_data = request.json.get('image_data')
        
        # 이미지 데이터 검증
        if not validate_image_data(image_data):
            logger.warning("Invalid image data received in API call")
            return jsonify({
                'success': False,
                'error': '유효하지 않은 이미지 데이터입니다.'
            }), 400
        
        # 옵션 검증
        options = request.json.get('options', {})
        if not isinstance(options, dict):
            return jsonify({
                'success': False,
                'error': '옵션은 객체 형식이어야 합니다.'
            }), 400
        
        # 성능 옵션 추가
        if 'performance_options' in request.json:
            perf_options = request.json.get('performance_options', {})
            if isinstance(perf_options, dict):
                # 병렬 처리 설정
                if 'use_parallel' in perf_options:
                    options['use_parallel'] = bool(perf_options.get('use_parallel'))
                
                # 크기 최적화 설정
                if 'optimize_size' in perf_options:
                    options['optimize_size'] = bool(perf_options.get('optimize_size'))
                
                # 압축 품질 설정
                if 'compression_quality' in perf_options:
                    quality = perf_options.get('compression_quality')
                    if isinstance(quality, int) and 1 <= quality <= 100:
                        options['compression_quality'] = quality
        
        # 이미지 처리 - 이제 모듈화된 process_image 함수 사용
        result = process_image(image_data, options)
        
        # 처리된 이미지와 메타데이터 반환
        return jsonify({
            'success': True,
            'enhanced_image': result['enhanced_image'],
            'metadata': result.get('metadata', {})
        })
    except Exception as e:
        logger.error(f"Error enhancing image: {str(e)}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@main_blueprint.route('/static/<path:path>')
def serve_static(path):
    # 경로 검증 - 디렉토리 트래버설 공격 방지
    if '..' in path:
        logger.warning(f"Potential directory traversal attempt detected: {path}")
        abort(403)
    
    # 허용된 파일 확장자만 접근 가능
    allowed_extensions = ['.js', '.css', '.jpg', '.jpeg', '.png', '.gif', '.svg', '.ico', '.woff', '.woff2']
    if not any(path.lower().endswith(ext) for ext in allowed_extensions):
        logger.warning(f"Access to unauthorized file type: {path}")
        abort(403)
        
    return send_from_directory(app.static_folder, path)

# 캐시 관리 API 추가
@main_blueprint.route('/api/cache', methods=['GET', 'DELETE'])
def manage_cache():
    try:
        # GET 요청: 캐시 상태 조회
        if request.method == 'GET':
            stats = get_cache_stats()
            return jsonify({
                'success': True,
                'cache_stats': stats
            })
        
        # DELETE 요청: 캐시 초기화
        elif request.method == 'DELETE':
            clear_image_cache()
            return jsonify({
                'success': True,
                'message': '캐시가 성공적으로 초기화되었습니다.'
            })
            
    except Exception as e:
        logger.error(f"Cache management error: {str(e)}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

# 블루프린트 등록
app.register_blueprint(main_blueprint)

# 404 오류 핸들러
@app.errorhandler(404)
def page_not_found(e):
    return jsonify({"success": False, "error": "페이지를 찾을 수 없습니다."}), 404

# 500 오류 핸들러
@app.errorhandler(500)
def internal_server_error(e):
    return jsonify({"success": False, "error": "서버 내부 오류가 발생했습니다."}), 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5001, debug=True) 