"""
배경 제거와 관련된 기능을 제공하는 모듈
"""

from PIL import Image
from rembg import remove
from typing import Any

def remove_background(image_pil: Image.Image) -> Image.Image:
    """
    rembg 라이브러리를 사용하여 이미지의 배경을 제거합니다.
    
    Args:
        image_pil: PIL 형식의 이미지
        
    Returns:
        배경이 제거된 이미지 (흰색 배경)
    """
    try:
        # 배경 제거
        output = remove(image_pil)
        
        # 투명 배경을 흰색으로 변경
        background = Image.new("RGBA", output.size, (255, 255, 255, 255))
        output = Image.alpha_composite(background.convert("RGBA"), output)
        
        return output.convert("RGB")
    except Exception as e:
        print(f"배경 제거 중 오류 발생: {e}")
        return image_pil 