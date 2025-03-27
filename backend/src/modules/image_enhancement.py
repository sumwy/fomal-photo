"""
이미지 향상 및 품질 개선과 관련된 기능을 제공하는 모듈
"""

import cv2
import numpy as np
from PIL import Image, ImageEnhance
from typing import Tuple, Dict, Any

def upscale_image(image_cv: np.ndarray, scale_factor: float = 2.0) -> np.ndarray:
    """
    이미지 크기를 확대합니다.
    
    Args:
        image_cv: OpenCV 형식의 이미지
        scale_factor: 확대 비율 (기본값: 2.0)
        
    Returns:
        확대된 이미지
    """
    try:
        height, width = image_cv.shape[:2]
        new_height, new_width = int(height * scale_factor), int(width * scale_factor)
        return cv2.resize(image_cv, (new_width, new_height), interpolation=cv2.INTER_CUBIC)
    except Exception as e:
        print(f"이미지 확대 중 오류 발생: {e}")
        return image_cv

def enhance_skin(image_cv: np.ndarray, strength: int = 9) -> np.ndarray:
    """
    피부를 부드럽게 처리합니다.
    
    Args:
        image_cv: OpenCV 형식의 이미지
        strength: 강도 (기본값: 9)
        
    Returns:
        피부가 부드럽게 처리된 이미지
    """
    try:
        return cv2.bilateralFilter(image_cv, strength, 75, 75)
    except Exception as e:
        print(f"피부 향상 중 오류 발생: {e}")
        return image_cv

def enhance_eyes(image_cv: np.ndarray, alpha: float = 1.1, beta: float = 20) -> np.ndarray:
    """
    눈 부분을 강조합니다.
    
    Args:
        image_cv: OpenCV 형식의 이미지
        alpha: 대비 계수 (기본값: 1.1)
        beta: 밝기 조절 (기본값: 20)
        
    Returns:
        눈이 강조된 이미지
    """
    try:
        return cv2.addWeighted(image_cv, alpha, np.zeros(image_cv.shape, image_cv.dtype), 0, beta)
    except Exception as e:
        print(f"눈 향상 중 오류 발생: {e}")
        return image_cv

def enhance_sharpness(image_pil: Image.Image, factor: float = 1.5) -> Image.Image:
    """
    이미지의 선명도를 개선합니다.
    
    Args:
        image_pil: PIL 형식의 이미지
        factor: 선명도 증가 계수 (기본값: 1.5)
        
    Returns:
        선명도가 개선된 이미지
    """
    try:
        enhancer = ImageEnhance.Sharpness(image_pil)
        return enhancer.enhance(factor)
    except Exception as e:
        print(f"선명도 향상 중 오류 발생: {e}")
        return image_pil 