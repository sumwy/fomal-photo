"""
얼굴 인식과 관련된 기능을 제공하는 모듈
"""

import cv2
import numpy as np
from typing import Tuple, Dict, Any, Optional

def detect_face(image_cv: np.ndarray) -> Tuple[bool, Optional[Tuple[int, int, int, int]]]:
    """
    OpenCV의 Haar Cascade를 사용하여 이미지에서 얼굴을 감지합니다.
    
    Args:
        image_cv: OpenCV 형식의 이미지
        
    Returns:
        검출 여부(bool)와 검출된 경우 (x, y, w, h) 튜플, 검출되지 않은 경우 None
    """
    try:
        # 그레이스케일로 변환
        gray = cv2.cvtColor(image_cv, cv2.COLOR_BGR2GRAY)
        
        # 얼굴 감지기 로드
        face_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_frontalface_default.xml')
        
        # 얼굴 감지
        faces = face_cascade.detectMultiScale(gray, 1.1, 4)
        
        if len(faces) == 0:
            return False, None
        
        # 첫 번째 얼굴 반환 (가장 큰 얼굴 선택 로직 추가 가능)
        return True, tuple(faces[0])
    
    except Exception as e:
        print(f"얼굴 감지 중 오류 발생: {e}")
        return False, None

def adjust_face_position(image_cv: np.ndarray) -> np.ndarray:
    """
    이미지에서 얼굴 위치를 감지하고 표준 사진 규격에 맞게 위치를 조정합니다.
    
    Args:
        image_cv: OpenCV 형식의 이미지
        
    Returns:
        조정된 이미지
    """
    # 얼굴 감지
    face_detected, face_rect = detect_face(image_cv)
    
    if not face_detected:
        print("얼굴이 감지되지 않았습니다.")
        return image_cv
    
    # 얼굴 위치 정보
    x, y, w, h = face_rect
    
    # 얼굴 중심점 계산
    face_center_x = x + w // 2
    face_center_y = y + h // 2
    
    # 이미지 중심점 계산
    height, width = image_cv.shape[:2]
    image_center_x = width // 2
    image_center_y = height // 2
    
    # 이동해야 할 거리 계산
    x_shift = image_center_x - face_center_x
    
    # 표준 사진에서 눈 위치는 상단에서 약 32-36% 위치에 있어야 함
    ideal_eye_position_y = int(height * 0.34)  # 34%가 눈 위치의 중간값
    
    # 눈 위치 추정 (얼굴 상단에서 약 20% 아래)
    eye_y = y + int(h * 0.2)
    
    # 눈 위치를 이상적인 위치로 이동하기 위한 y축 이동 거리
    y_shift = ideal_eye_position_y - eye_y
    
    # 이동 행렬 생성
    translation_matrix = np.float32([[1, 0, x_shift], [0, 1, y_shift]])
    
    # 이미지 이동
    adjusted_image = cv2.warpAffine(image_cv, translation_matrix, (width, height), 
                                 borderMode=cv2.BORDER_CONSTANT, borderValue=(255, 255, 255))
    
    return adjusted_image 