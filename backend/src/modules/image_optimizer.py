"""
이미지 최적화 기능을 제공하는 모듈
이미지 크기 조정, 메모리 최적화, 병렬 처리 기능을 제공합니다.
"""

import cv2
import numpy as np
from PIL import Image
import concurrent.futures
from typing import Dict, Any, List, Tuple, Optional, Callable
import io
import gc

def resize_for_processing(image: np.ndarray, max_dimension: int = 1200) -> Tuple[np.ndarray, float]:
    """
    처리 효율성을 위해 이미지 크기 조정 (원본 비율 유지)
    
    Args:
        image: OpenCV 이미지
        max_dimension: 최대 너비 또는 높이
        
    Returns:
        (크기 조정된 이미지, 스케일 비율)
    """
    height, width = image.shape[:2]
    
    # 이미 충분히 작은 경우
    if max(width, height) <= max_dimension:
        return image, 1.0
    
    # 스케일 계산
    scale = max_dimension / max(width, height)
    new_width = int(width * scale)
    new_height = int(height * scale)
    
    # 이미지 리사이징
    resized = cv2.resize(image, (new_width, new_height), interpolation=cv2.INTER_AREA)
    
    return resized, scale

def restore_original_size(image: np.ndarray, original_size: Tuple[int, int]) -> np.ndarray:
    """
    처리된 이미지를 원래 크기로 복원
    
    Args:
        image: 처리된 이미지
        original_size: 원본 크기 (너비, 높이)
        
    Returns:
        복원된 이미지
    """
    return cv2.resize(image, original_size, interpolation=cv2.INTER_CUBIC)

def optimize_image_quality(image_pil: Image.Image, quality: int = 85, format: str = 'JPEG') -> Image.Image:
    """
    이미지 파일 크기를 최적화
    
    Args:
        image_pil: PIL 이미지
        quality: 이미지 품질 (0-100)
        format: 이미지 형식
        
    Returns:
        최적화된 PIL 이미지
    """
    buffer = io.BytesIO()
    image_pil.save(buffer, format=format, quality=quality, optimize=True)
    buffer.seek(0)
    return Image.open(buffer)

def parallel_image_pipeline(image: np.ndarray, process_functions: List[Callable]) -> np.ndarray:
    """
    이미지 처리 파이프라인을 병렬로 실행
    
    Args:
        image: 원본 이미지
        process_functions: 처리 함수 목록
        
    Returns:
        처리된 이미지
    """
    # 처리할 함수가 없거나 하나뿐인 경우
    if not process_functions:
        return image
    elif len(process_functions) == 1:
        return process_functions[0](image)
    
    # 이미지 분할 (4등분)
    height, width = image.shape[:2]
    h_half = height // 2
    w_half = width // 2
    
    # 이미지를 4개 영역으로 분할
    q1 = image[:h_half, :w_half]  # 좌상단
    q2 = image[:h_half, w_half:]  # 우상단
    q3 = image[h_half:, :w_half]  # 좌하단
    q4 = image[h_half:, w_half:]  # 우하단
    
    # 분할한 영역에 병렬 처리 적용
    results = []
    
    with concurrent.futures.ThreadPoolExecutor() as executor:
        futures = []
        
        for quad in [q1, q2, q3, q4]:
            # 각 영역에 전체 처리 파이프라인 적용
            future = executor.submit(apply_pipeline, quad, process_functions)
            futures.append(future)
            
        # 결과 수집
        for future in concurrent.futures.as_completed(futures):
            results.append(future.result())
    
    # 처리된 영역 재결합
    if len(results) == 4:
        top = np.hstack((results[0], results[1]))
        bottom = np.hstack((results[2], results[3]))
        combined = np.vstack((top, bottom))
        return combined
    else:
        # 오류 발생 시 원본 이미지에 순차 처리
        return apply_pipeline(image, process_functions)

def apply_pipeline(image: np.ndarray, process_functions: List[Callable]) -> np.ndarray:
    """
    이미지에 처리 함수 파이프라인 적용
    
    Args:
        image: 입력 이미지
        process_functions: 처리 함수 목록
        
    Returns:
        처리된 이미지
    """
    result = image.copy()
    
    for func in process_functions:
        result = func(result)
        
    return result

def reduce_memory_usage(func: Callable) -> Callable:
    """
    메모리 사용량을 줄이기 위한 데코레이터
    
    Args:
        func: 래핑할 함수
        
    Returns:
        래핑된 함수
    """
    def wrapper(*args, **kwargs):
        try:
            # 함수 실행
            result = func(*args, **kwargs)
            
            # 메모리 정리
            gc.collect()
            
            return result
        except Exception as e:
            gc.collect()
            raise e
    
    return wrapper

def compress_image_data(image_data: str, quality: int = 85) -> str:
    """
    이미지 데이터 압축
    
    Args:
        image_data: base64 인코딩된 이미지 데이터
        quality: 압축 품질 (0-100)
        
    Returns:
        압축된 이미지 데이터
    """
    try:
        # 이미지 데이터에서 헤더 분리
        if ',' in image_data:
            prefix, data = image_data.split(',', 1)
        else:
            prefix = "data:image/jpeg;base64,"
            data = image_data
            
        # base64 데이터를 PIL 이미지로 변환
        import base64
        from PIL import Image
        import io
        
        # 디코딩 및 PIL 이미지로 변환
        image_bytes = base64.b64decode(data)
        image = Image.open(io.BytesIO(image_bytes))
        
        # 압축
        buffer = io.BytesIO()
        image.save(buffer, format="JPEG", quality=quality, optimize=True)
        
        # 다시 base64로 인코딩
        compressed_data = base64.b64encode(buffer.getvalue()).decode('utf-8')
        
        # 헤더와 결합
        return f"{prefix}{compressed_data}"
    except Exception as e:
        print(f"이미지 압축 중 오류: {str(e)}")
        return image_data  # 오류 시 원본 반환 