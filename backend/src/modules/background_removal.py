"""
배경 제거와 관련된 기능을 제공하는 모듈
"""

from PIL import Image, ImageOps, ImageFilter, ImageEnhance
from rembg import remove
from typing import Any, Tuple
import numpy as np

def remove_background(image_pil: Image.Image, bg_color: Tuple[int, int, int] = (255, 255, 255)) -> Image.Image:
    """
    rembg 라이브러리를 사용하여 이미지의 배경을 제거하고 흰색 배경으로 대체합니다.
    
    Args:
        image_pil: PIL 형식의 이미지
        bg_color: 배경색 RGB 값 (기본값: 흰색)
        
    Returns:
        배경이 제거된 이미지 (흰색 배경)
    """
    try:
        # 이미지 크기 저장
        width, height = image_pil.size
        
        # 배경 제거 (향상된 모델 사용)
        output = remove(image_pil, alpha_matting=True, alpha_matting_foreground_threshold=240)
        
        # 새 흰색 배경 생성
        background = Image.new("RGBA", output.size, (*bg_color, 255))
        
        # 약간의 그림자 효과 추가 (선택 사항)
        shadow = Image.new("RGBA", output.size, (0, 0, 0, 0))
        shadow_width = 3
        
        # 알파 채널에서 마스크 추출
        alpha = output.split()[3]
        
        # 마스크 테두리 개선
        alpha = alpha.filter(ImageFilter.SMOOTH)
        
        # 전경과 배경 합성
        result = Image.alpha_composite(background, output)
        
        # 결과를 RGB로 변환
        result_rgb = result.convert("RGB")
        
        # 이미지 테두리 주변 선명도 향상
        enhancer = ImageEnhance.Sharpness(result_rgb)
        result_rgb = enhancer.enhance(1.2)
        
        # 약간의 대비 추가로 주체 강조
        contrast = ImageEnhance.Contrast(result_rgb)
        result_rgb = contrast.enhance(1.1)
        
        return result_rgb
    except Exception as e:
        print(f"배경 제거 중 오류 발생: {e}")
        return image_pil 