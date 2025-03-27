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

def enhance_skin(image_cv: np.ndarray, strength: int = 13) -> np.ndarray:
    """
    피부를 부드럽게 처리합니다.
    
    Args:
        image_cv: OpenCV 형식의 이미지
        strength: 강도 (기본값: 13)
        
    Returns:
        피부가 부드럽게 처리된 이미지
    """
    try:
        # 기본 양방향 필터 적용
        blurred = cv2.bilateralFilter(image_cv, strength, 75, 75)
        
        # 추가적인 피부 부드럽게 처리
        denoise = cv2.fastNlMeansDenoisingColored(blurred, None, 10, 10, 7, 21)
        
        return denoise
    except Exception as e:
        print(f"피부 향상 중 오류 발생: {e}")
        return image_cv

def enhance_eyes(image_cv: np.ndarray, alpha: float = 1.2, beta: float = 25) -> np.ndarray:
    """
    눈 부분을 강조합니다.
    
    Args:
        image_cv: OpenCV 형식의 이미지
        alpha: 대비 계수 (기본값: 1.2)
        beta: 밝기 조절 (기본값: 25)
        
    Returns:
        눈이 강조된 이미지
    """
    try:
        # 얼굴 감지 캐스케이드 로드
        face_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_frontalface_default.xml')
        eye_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_eye.xml')
        
        # 결과 이미지 복사
        result_image = image_cv.copy()
        
        # 그레이스케일 이미지 변환 (얼굴/눈 감지용)
        gray = cv2.cvtColor(image_cv, cv2.COLOR_BGR2GRAY)
        
        # 얼굴 감지
        faces = face_cascade.detectMultiScale(gray, 1.3, 5)
        
        # 얼굴 영역 내에서 눈 감지 및 강조
        for (x, y, w, h) in faces:
            roi_gray = gray[y:y+h, x:x+w]
            roi_color = result_image[y:y+h, x:x+w]
            
            # 눈 감지
            eyes = eye_cascade.detectMultiScale(roi_gray)
            
            # 눈 영역만 강조
            for (ex, ey, ew, eh) in eyes:
                eye_roi = roi_color[ey:ey+eh, ex:ex+ew]
                roi_color[ey:ey+eh, ex:ex+ew] = cv2.addWeighted(eye_roi, alpha, np.zeros(eye_roi.shape, eye_roi.dtype), 0, beta)
        
        # 눈 감지에 실패했거나 눈이 없는 경우, 전체 이미지에 약한 강조 적용
        if len(faces) == 0:
            result_image = cv2.addWeighted(image_cv, alpha, np.zeros(image_cv.shape, image_cv.dtype), 0, beta)
            
        return result_image
    except Exception as e:
        print(f"눈 향상 중 오류 발생: {e}")
        return image_cv

def enhance_sharpness(image_pil: Image.Image, factor: float = 1.8) -> Image.Image:
    """
    이미지의 선명도를 개선합니다.
    
    Args:
        image_pil: PIL 형식의 이미지
        factor: 선명도 증가 계수 (기본값: 1.8)
        
    Returns:
        선명도가 개선된 이미지
    """
    try:
        # 선명도 향상
        enhancer = ImageEnhance.Sharpness(image_pil)
        sharper_image = enhancer.enhance(factor)
        
        # 추가로 약간의 대비 향상
        contrast_enhancer = ImageEnhance.Contrast(sharper_image)
        final_image = contrast_enhancer.enhance(1.2)
        
        return final_image
    except Exception as e:
        print(f"선명도 향상 중 오류 발생: {e}")
        return image_pil 