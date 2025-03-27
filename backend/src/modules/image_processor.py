"""
이미지 처리를 총괄하는 메인 모듈
모든 이미지 처리 단계를 조합하여 실행합니다.
"""

import cv2
import numpy as np
from PIL import Image
from typing import Dict, Any, Optional, Union, List, Callable
import time
import logging

# 모듈 가져오기 (상대 경로로 수정)
from .face_detection import adjust_face_position
from .background_removal import remove_background
from .image_enhancement import (
    upscale_image, enhance_skin, enhance_eyes, enhance_sharpness
)
from .image_utils import (
    decode_image, encode_image, pil_to_cv2, cv2_to_pil
)
from .image_cache import memoize_image_processing, image_cache
from .image_optimizer import (
    resize_for_processing, restore_original_size, 
    optimize_image_quality, parallel_image_pipeline,
    reduce_memory_usage, compress_image_data
)

# 로깅 설정
logger = logging.getLogger(__name__)

@memoize_image_processing
@reduce_memory_usage
def process_image(image_data: str, options: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
    """
    이미지 데이터를 처리하여 증명사진으로 변환합니다.
    
    Args:
        image_data: Base64 인코딩된 이미지 데이터
        options: 처리 옵션
            - adjust_face_position (bool): 얼굴 위치 보정 여부
            - remove_background (bool): 배경 제거 여부
            - upscale (bool): 이미지 확대 여부
            - skin_smoothing (bool): 피부 보정 여부
            - eye_enhance (bool): 눈 강조 여부
            - sharpness_enhance (bool): 선명도 개선 여부
            - use_parallel (bool): 병렬 처리 사용 여부
            - optimize_size (bool): 크기 최적화 여부
            - compression_quality (int): 압축 품질 (0-100)
            
    Returns:
        처리 결과를 담은 딕셔너리
            - enhanced_image: 처리된 이미지 (Base64)
            - metadata: 이미지 메타데이터
            
    Raises:
        ValueError: 이미지 데이터가 유효하지 않은 경우
    """
    try:
        start_time = time.time()
        logger.info("이미지 처리 시작")
        
        # 옵션이 None이면 빈 딕셔너리로 초기화
        if options is None:
            options = {}
            
        # 이미지 데이터 검증
        if not image_data:
            raise ValueError('이미지 데이터가 유효하지 않습니다')
            
        # base64 데이터 형식 확인 및 처리
        if not isinstance(image_data, str):
            raise ValueError('이미지 데이터는 문자열이어야 합니다')
            
        # 이미지 디코딩
        if not image_data.startswith('data:image'):
            image_data = f'data:image/jpeg;base64,{image_data}'
            
        # 처리 전 이미지 압축 (옵션에 따라)
        if options.get('optimize_size', True):
            quality = options.get('compression_quality', 85)
            image_data = compress_image_data(image_data, quality)
        
        # 이미지 디코딩
        image_pil = decode_image(image_data)
        
        # 처리 옵션 기본값 설정
        options.setdefault('adjust_face_position', True)
        options.setdefault('remove_background', True)
        options.setdefault('upscale', True)
        options.setdefault('skin_smoothing', True)
        options.setdefault('eye_enhance', True)
        options.setdefault('sharpness_enhance', True)
        options.setdefault('use_parallel', True)
        
        # PIL 이미지를 OpenCV로 변환
        image_cv = pil_to_cv2(image_pil)
        
        # 원본 크기 저장
        original_size = (image_cv.shape[1], image_cv.shape[0])
        
        # 처리 효율성을 위해 크기 조정
        image_cv, scale = resize_for_processing(image_cv)
        
        # 처리 함수 구성
        process_functions = []
        
        if options.get('adjust_face_position'):
            process_functions.append(adjust_face_position)
            
        if options.get('skin_smoothing'):
            process_functions.append(enhance_skin)
            
        if options.get('eye_enhance'):
            process_functions.append(enhance_eyes)
        
        # 이미지 처리 - 일반 또는 병렬
        if options.get('use_parallel') and len(process_functions) > 1:
            # 병렬 처리
            image_cv = parallel_image_pipeline(image_cv, process_functions)
        else:
            # 순차 처리
            for func in process_functions:
                image_cv = func(image_cv)
        
        # 업스케일링
        if options.get('upscale'):
            scale_factor = options.get('scale_factor', 2.0)
            image_cv = upscale_image(image_cv, scale_factor)
        
        # 원본 크기로 복원 (스케일이 1.0이 아닌 경우)
        if scale != 1.0:
            image_cv = restore_original_size(image_cv, original_size)
            
        # OpenCV 이미지를 PIL로 변환
        image_pil = cv2_to_pil(image_cv)
        
        # 배경 제거 (이 작업은 병렬화하지 않음)
        if options.get('remove_background'):
            image_pil = remove_background(image_pil)
            
        # 선명도 개선
        if options.get('sharpness_enhance'):
            factor = options.get('sharpness_factor', 1.5)
            image_pil = enhance_sharpness(image_pil, factor)
        
        # 이미지 품질 최적화
        if options.get('optimize_size', True):
            quality = options.get('compression_quality', 90)
            image_pil = optimize_image_quality(image_pil, quality)
            
        # 결과 인코딩
        encoded_image = encode_image(
            image_pil, 
            format="JPEG", 
            quality=options.get('compression_quality', 90)
        )
        
        processing_time = time.time() - start_time
        logger.info(f"이미지 처리 완료: {processing_time:.2f}초")
        
        return {
            'enhanced_image': encoded_image,
            'metadata': {
                'format': 'JPEG',
                'dimensions': image_pil.size,
                'size': len(encoded_image),
                'processing_time': processing_time
            }
        }

    except Exception as e:
        logger.error(f"이미지 처리 중 오류 발생: {str(e)}")
        raise Exception(f"이미지 처리 중 오류 발생: {str(e)}")

def clear_image_cache():
    """
    이미지 캐시 초기화
    """
    image_cache.clear()
    logger.info("이미지 캐시 초기화됨")
    
def get_cache_stats():
    """
    캐시 상태 통계 반환
    """
    import os
    
    try:
        cache_dir = image_cache.cache_dir
        cache_files = [f for f in os.listdir(cache_dir) if f.endswith('.pkl')]
        cache_size = sum(os.path.getsize(os.path.join(cache_dir, f)) for f in cache_files)
        
        return {
            'cache_count': len(cache_files),
            'cache_size_bytes': cache_size,
            'cache_size_mb': cache_size / (1024 * 1024)
        }
    except Exception as e:
        logger.error(f"캐시 통계 조회 중 오류: {str(e)}")
        return {
            'error': str(e)
        }

# 추가 함수들은 유지
def apply_beauty_filter(image, strength=0.5):
    """
    뷰티 필터 스텁 함수 - 향후 구현을 위한 자리 표시자
    """
    return image

def apply_color_filter(image, filter_type='natural'):
    """
    색상 필터 스텁 함수 - 향후 구현을 위한 자리 표시자
    """
    return image

def adjust_contrast(image, contrast_factor=1.15):
    """
    대비 조절 스텁 함수 - 향후 구현을 위한 자리 표시자
    """
    return image 