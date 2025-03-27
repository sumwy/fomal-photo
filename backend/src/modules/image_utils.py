"""
이미지 유틸리티 기능을 제공하는 모듈 (인코딩, 디코딩 등)
"""

import base64
import io
import cv2
import numpy as np
from PIL import Image
from typing import Dict, Any, Union, Tuple

def decode_image(image_data: str) -> Image.Image:
    """
    Base64 인코딩된 이미지 데이터를 PIL Image 객체로 변환합니다.
    
    Args:
        image_data: Base64 인코딩된 이미지 데이터 문자열
        
    Returns:
        PIL Image 객체
        
    Raises:
        ValueError: 이미지 디코딩에 실패한 경우
    """
    try:
        # Base64 데이터 추출
        if image_data.startswith('data:'):
            image_data = image_data.split(',')[1]
        
        # 바이트로 디코딩
        image_bytes = base64.b64decode(image_data)
        
        # PIL Image로 변환
        image = Image.open(io.BytesIO(image_bytes))
        return image
    except Exception as e:
        raise ValueError(f"이미지 디코딩 실패: {e}")

def encode_image(image_pil: Image.Image, format: str = "JPEG", quality: int = 95) -> str:
    """
    PIL Image 객체를 Base64 인코딩된 문자열로 변환합니다.
    
    Args:
        image_pil: PIL Image 객체
        format: 이미지 형식 (기본값: "JPEG")
        quality: 이미지 품질 (기본값: 95)
        
    Returns:
        Base64 인코딩된 이미지 데이터 문자열
    """
    try:
        buffered = io.BytesIO()
        image_pil.save(buffered, format=format, quality=quality, optimize=True)
        return base64.b64encode(buffered.getvalue()).decode('utf-8')
    except Exception as e:
        print(f"이미지 인코딩 실패: {e}")
        return ""

def pil_to_cv2(image_pil: Image.Image) -> np.ndarray:
    """
    PIL Image 객체를 OpenCV 이미지로 변환합니다.
    
    Args:
        image_pil: PIL Image 객체
        
    Returns:
        OpenCV 형식의 이미지
    """
    try:
        # PIL -> numpy array -> OpenCV
        return cv2.cvtColor(np.array(image_pil), cv2.COLOR_RGB2BGR)
    except Exception as e:
        print(f"PIL에서 OpenCV로 변환 실패: {e}")
        return np.array([])

def cv2_to_pil(image_cv: np.ndarray) -> Image.Image:
    """
    OpenCV 이미지를 PIL Image 객체로 변환합니다.
    
    Args:
        image_cv: OpenCV 형식의 이미지
        
    Returns:
        PIL Image 객체
    """
    try:
        # OpenCV -> numpy array -> PIL
        return Image.fromarray(cv2.cvtColor(image_cv, cv2.COLOR_BGR2RGB))
    except Exception as e:
        print(f"OpenCV에서 PIL로 변환 실패: {e}")
        return Image.new("RGB", (1, 1), (255, 255, 255)) 